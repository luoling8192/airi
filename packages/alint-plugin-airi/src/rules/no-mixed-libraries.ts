import type { PackageImport } from '../imports'

import { readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

import { defineRule } from '@alint-js/core'
import { formatOutputLanguageInstruction, generateStructured } from '@alint-js/core/structured-output'
import { x } from 'tinyexec'
import { array, description, object, optional, pipe, string } from 'valibot'

import { extractPackageImports } from '../imports'

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|vue)$/

const INSTRUCTION = `
You review which external packages a monorepo imports.
Find groups of packages that solve the same problem, where the repository can standardize on one of them.

Report a group only when every member is a general-purpose library for the same job, and code that uses one member can use another member instead.
Typical jobs: schema validation, key-value storage, HTTP client, ID generation, mutex, dependency injection, color math, date formatting, archive handling, logging.

Do not report these cases:
- Packages that work together, such as a framework with its plugin, adapter, or type package.
- Packages that each serve a different runtime or a different product, when the workspace list shows that separation.
- Build tools, lint tools, test tools, and bundler plugins.
- Packages from one family that ship as separate modules, such as \`@xsai/*\` or \`@pixi/*\`.

For each group, name the canonical package. Prefer a package from the preferred list. If no member is preferred, prefer the member that most files import.
List each other member as an alternative, with one sentence that tells why the canonical package can replace it.
`.trim()

const groupsSchema = pipe(
  object({
    groups: array(object({
      alternatives: array(object({
        name: pipe(string(), description('Package name, exactly as listed.')),
        reason: pipe(string(), description('One sentence. Why the canonical package can replace this package.')),
      })),
      canonical: pipe(string(), description('Package name, exactly as listed.')),
      purpose: pipe(string(), description('The shared job, in a few lowercase words.')),
    })),
  }),
  description('Report the groups of overlapping packages. Report an empty list if there are none.'),
)

const optionsSchema = optional(object({
  /** Sets of packages that are allowed to coexist. A group inside one set is not reported. */
  allow: optional(array(array(string())), []),
  /** Packages that the repository has chosen. One of them becomes the canonical member of its group. */
  preferred: optional(array(string()), []),
}), {})

/** `server/apps/api/src/x.ts` -> `server/apps/api`, `packages/ui/src/x.ts` -> `packages/ui`. */
function workspaceOf(filePath: string): string {
  const segments = filePath.split('/')
  return segments.slice(0, segments[0] === 'server' ? 3 : 2).join('/')
}

function formatUsage(usage: Map<string, Map<string, PackageImport[]>>): string {
  return [...usage]
    .sort(([, a], [, b]) => b.size - a.size)
    .map(([name, files]) => {
      const workspaces = new Map<string, number>()
      for (const filePath of files.keys())
        workspaces.set(workspaceOf(filePath), (workspaces.get(workspaceOf(filePath)) ?? 0) + 1)

      const top = [...workspaces]
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([workspace, count]) => `${workspace} ${count}`)
      return `${name}: ${files.size} files (${top.join(', ')})`
    })
    .join('\n')
}

/**
 * Reports imports of a library when the repository also uses another library for the same job.
 *
 * The usage index covers every tracked source file, so the result is the same for a full run and
 * for a run on changed files only. Diagnostics go only to the files that the run lints.
 */
export const noMixedLibraries = defineRule({
  // The verdict depends on every tracked file, not only on the linted target.
  cache: false,
  create: (ctx) => {
    const [{ allow, preferred }] = ctx.options

    return {
      async onTargetProject(project) {
        const tracked = await x('git', ['ls-files'], { nodeOptions: { cwd: ctx.cwd }, throwOnError: true })

        /** package name -> repository-relative file path -> imports in that file */
        const usage = new Map<string, Map<string, PackageImport[]>>()
        for (const filePath of tracked.stdout.split('\n')) {
          if (!SOURCE_FILE.test(filePath))
            continue

          for (const found of extractPackageImports(await readFile(resolve(ctx.cwd, filePath), 'utf8'))) {
            // Workspace packages and type-only packages are not library choices.
            if (found.name.startsWith('@proj-airi/') || found.name.startsWith('@types/'))
              continue

            const files = usage.get(found.name) ?? new Map<string, PackageImport[]>()
            files.set(filePath, [...files.get(filePath) ?? [], found])
            usage.set(found.name, files)
          }
        }

        const { groups } = await generateStructured({
          createMessages: retryFeedback => [
            {
              content: [INSTRUCTION, formatOutputLanguageInstruction(ctx.outputLanguage)].filter(Boolean).join('\n\n'),
              role: 'system',
            },
            ...(retryFeedback ? [{ content: retryFeedback, role: 'user' as const }] : []),
            {
              content: `Preferred packages: ${preferred.join(', ') || 'none'}\n\nPackages, with the number of importing files and the top workspaces:\n${formatUsage(usage)}`,
              role: 'user',
            },
          ],
          logger: ctx.logger,
          metering: ctx.metering,
          model: await ctx.model(),
          operation: 'no-mixed-libraries-judge',
          schema: groupsSchema,
          signal: ctx.signal,
        })

        const linted = new Set(project.files.map(file => relative(ctx.cwd, resolve(ctx.cwd, file.path))))

        for (const group of groups) {
          const members = [group.canonical, ...group.alternatives.map(alternative => alternative.name)]
          // The model can invent a package name. Without a usage record there is nothing to report.
          if (members.some(name => !usage.has(name)))
            continue
          if (allow.some(allowed => members.every(name => allowed.includes(name))))
            continue

          const canonical = members.find(name => preferred.includes(name)) ?? group.canonical
          for (const alternative of group.alternatives) {
            if (alternative.name === canonical)
              continue

            for (const [filePath, imports] of usage.get(alternative.name)!) {
              if (!linted.has(filePath))
                continue

              for (const found of imports) {
                ctx.report({
                  filePath: resolve(ctx.cwd, filePath),
                  loc: { start: { column: 1, line: found.line } },
                  message: `\`${alternative.name}\` duplicates \`${canonical}\` (${group.purpose}). \`${canonical}\` has ${usage.get(canonical)!.size} importing files and \`${alternative.name}\` has ${usage.get(alternative.name)!.size}. ${alternative.reason}`,
                })
              }
            }
          }
        }
      },
    }
  },
  options: [optionsSchema],
})

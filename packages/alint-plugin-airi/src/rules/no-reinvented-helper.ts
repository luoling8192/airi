import { defineRule } from '@alint-js/core'
import { formatOutputLanguageInstruction, generateStructured } from '@alint-js/core/structured-output'
import { array, description, object, picklist, pipe, string } from 'valibot'

import * as moeruStd from '@moeru/std'
import * as esToolkit from 'es-toolkit'

/** The general utility libraries that the root `AGENTS.md` selects, with their export names. */
const LIBRARY_EXPORTS = {
  '@moeru/std': Object.keys(moeruStd),
  'es-toolkit': Object.keys(esToolkit),
}

/** A longer function body owns policy of its own and is not a utility clone. */
const MAX_BODY_STATEMENTS = 6

const INSTRUCTION = `
You review small local functions in a TypeScript repository.
The repository already depends on the utility libraries listed below.
Find each function that reimplements one export of these libraries.

Report a function only when all of these are true:
- The function is a general utility. It has no domain logic, and it does not read module state.
- One listed export has the same behavior for the inputs that this function accepts.
- A caller can replace the function with that export and keep the result.

Do not report a function that adds a type guard, a default, an error message, or a domain rule that the export does not have.
Do not report a function that already calls the export.
Use an export name exactly as listed. If you are not sure that the export exists, do not report.

${Object.entries(LIBRARY_EXPORTS).map(([library, names]) => `Exports of \`${library}\`:\n${names.join(', ')}`).join('\n\n')}
`.trim()

const findingsSchema = pipe(
  object({
    findings: array(object({
      exportName: pipe(string(), description('Export name, exactly as listed.')),
      functionName: pipe(string(), description('Name of the local function, exactly as given.')),
      library: picklist(Object.keys(LIBRARY_EXPORTS) as (keyof typeof LIBRARY_EXPORTS)[]),
      reason: pipe(string(), description('One sentence. Why the export has the same behavior.')),
    })),
  }),
  description('Report the functions that reimplement a library export. Report an empty list if there are none.'),
)

function bodyStatementsOf(metadata: unknown): number | undefined {
  if (typeof metadata !== 'object' || metadata == null || !('function' in metadata))
    return undefined

  const info = metadata.function
  if (typeof info !== 'object' || info == null || !('bodyStatements' in info) || typeof info.bodyStatements !== 'number')
    return undefined
  return info.bodyStatements
}

/** Reports a small local function when `es-toolkit` or `@moeru/std` already exports the same utility. */
export const noReinventedHelper = defineRule({
  cacheKey: INSTRUCTION,
  create: ctx => ({
    async onTargetFile(target) {
      const candidates = (await ctx.src.extract(target.file.path)).filter((candidate) => {
        const bodyStatements = bodyStatementsOf(candidate.metadata)
        return candidate.kind === 'function' && candidate.name != null && bodyStatements != null && bodyStatements <= MAX_BODY_STATEMENTS
      })
      if (candidates.length === 0)
        return

      const { findings } = await generateStructured({
        createMessages: retryFeedback => [
          {
            content: [INSTRUCTION, formatOutputLanguageInstruction(ctx.outputLanguage)].filter(Boolean).join('\n\n'),
            role: 'system',
          },
          ...(retryFeedback ? [{ content: retryFeedback, role: 'user' as const }] : []),
          {
            content: candidates.map(candidate => `Function \`${candidate.name}\`:\n${candidate.text}`).join('\n\n'),
            role: 'user',
          },
        ],
        logger: ctx.logger,
        metering: ctx.metering,
        model: await ctx.model(),
        operation: 'no-reinvented-helper-judge',
        schema: findingsSchema,
        signal: ctx.signal,
      })

      for (const finding of findings) {
        const candidate = candidates.find(item => item.name === finding.functionName)
        // The model can invent a function or an export. Both must exist before the report.
        if (candidate == null || !LIBRARY_EXPORTS[finding.library].includes(finding.exportName))
          continue

        ctx.report({
          filePath: target.file.path,
          loc: candidate.loc ?? target.loc,
          message: `\`${candidate.name}\` reimplements \`${finding.exportName}\` from \`${finding.library}\`. ${finding.reason}`,
        })
      }
    },
  }),
  languages: 'any',
})

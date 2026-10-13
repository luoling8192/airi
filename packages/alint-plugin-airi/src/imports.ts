import { isBuiltin } from 'node:module'

export interface PackageImport {
  line: number
  name: string
}

const IMPORT_SPECIFIER = /\b(?:from|import|require)\s*(?:\(\s*)?(['"])([^'"\n]+)\1/g

/**
 * Normalizes an import specifier to the name of the external package that owns it.
 *
 * @example
 * packageNameFrom('@vueuse/core/index')
 * // => '@vueuse/core'
 * packageNameFrom('./local')
 * // => undefined
 */
export function packageNameFrom(specifier: string): string | undefined {
  // Relative paths, path aliases, and scheme imports such as `node:` or `virtual:` name no package.
  if (!/^(?:@[\w.-]+\/)?[a-z][\w.-]*(?:\/|$)/i.test(specifier) || isBuiltin(specifier))
    return undefined

  const segments = specifier.split('/')
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0]
}

/** Lists each external package that the source text imports, with the 1-based line of the import. */
export function extractPackageImports(text: string): PackageImport[] {
  const imports: PackageImport[] = []
  let line = 1
  let scanned = 0

  for (const match of text.matchAll(IMPORT_SPECIFIER)) {
    const name = packageNameFrom(match[2])
    if (name == null)
      continue

    for (; scanned < match.index; scanned++) {
      if (text[scanned] === '\n')
        line++
    }
    imports.push({ line, name })
  }

  return imports
}

import { describe, expect, it } from 'vitest'

import { extractPackageImports, packageNameFrom } from './imports'

describe('packageNameFrom', () => {
  it('keeps the scope and drops the subpath', () => {
    expect(packageNameFrom('@vueuse/core/index')).toBe('@vueuse/core')
    expect(packageNameFrom('es-toolkit/compat')).toBe('es-toolkit')
    expect(packageNameFrom('colorjs.io')).toBe('colorjs.io')
  })

  it('returns undefined for a specifier that names no external package', () => {
    for (const specifier of ['./local', '../up', '~/alias', '@/alias', '#internal', 'node:fs', 'fs', 'virtual:uno.css'])
      expect(packageNameFrom(specifier)).toBeUndefined()
  })
})

describe('extractPackageImports', () => {
  it('reads static, side-effect, dynamic, and require imports with their lines', () => {
    const text = [
      'import { z } from \'zod\'',
      'import \'uno.css\'',
      'import { local } from \'./local\'',
      'export * from "valibot"',
      'const forage = await import(\'localforage\')',
      'const ws = require(\'ws\')',
    ].join('\n')

    expect(extractPackageImports(text)).toEqual([
      { line: 1, name: 'zod' },
      { line: 2, name: 'uno.css' },
      { line: 4, name: 'valibot' },
      { line: 5, name: 'localforage' },
      { line: 6, name: 'ws' },
    ])
  })
})

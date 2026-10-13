# `@proj-airi/alint-plugin-airi`

Model-backed `alint` rules for dependency use in the AIRI monorepo.

## What It Does

- `airi/no-mixed-libraries` reports an import of a library when the repository also uses another library for the same job.
- `airi/no-reinvented-helper` reports a small local function when `es-toolkit` or `@moeru/std` already exports the same utility.

### `airi/no-mixed-libraries`

The rule runs one time for each `alint` run.

1. It reads the imports of every tracked source file from `git ls-files`. Vue files are included.
2. It sends the package names and their file counts to the model. The model groups the packages that do the same job.
3. It drops each group that names an unknown package, and each group that the `allow` option covers.
4. It reports each import of a non-canonical package, only in the files that the run lints.

Options:

| Option | Default | Description |
| --- | --- | --- |
| `preferred` | `[]` | Packages that the repository has chosen. A preferred package becomes the canonical member of its group. |
| `allow` | `[]` | Sets of packages that can coexist, for example `[['hono', 'h3']]`. |

### `airi/no-reinvented-helper`

The rule runs one time for each linted file that has a named function of six statements or fewer.
It sends these functions and the export names of the two libraries to the model.
It drops each finding that names an unknown function or an unknown export.

## How To Use It

The root `alint.config.ts` enables both rules.

```ts
import airiPlugin from '@proj-airi/alint-plugin-airi'

import { defineConfig } from '@alint-js/cli'

export default defineConfig([
  {
    files: ['**/*.ts'],
    plugins: { airi: airiPlugin },
    rules: { 'airi/no-reinvented-helper': 'warn' },
  },
  {
    plugins: { airi: airiPlugin },
    rules: { 'airi/no-mixed-libraries': ['warn', { preferred: ['valibot'] }] },
  },
])
```

Put `airi/no-mixed-libraries` in a config item that has no `files` and no `directories`.
`alint` gives the project target only to such an item.

Run the rules on changed files:

```sh
pnpm exec alint --dirty
```

## When To Use It

- Use it to review a change that adds an import or a utility function.
- Use it to find the libraries that a migration can remove.

## When Not To Use It

- Do not use it as a CI gate. A model makes the decision, and two runs can give different results.
- Do not use it to ban a known library. Use ESLint `no-restricted-imports` for that.
- Do not use it to find unused dependencies. Use `pnpm knip` for that.

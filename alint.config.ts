import jsPlugin from '@alint-js/plugin-js'
import airiPlugin from '@proj-airi/alint-plugin-airi'

import { defineConfig } from '@alint-js/cli'

export default defineConfig([
  {
    extends: ['js/recommended'],
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}'],
    plugins: {
      airi: airiPlugin,
      js: jsPlugin,
    },
    ignores: ['**/node_modules/**'],
    rules: {
      'airi/no-reinvented-helper': 'warn',
    },
  },
  // alint gives the project target only to a config item that has no `files` and no `directories`.
  {
    plugins: {
      airi: airiPlugin,
    },
    rules: {
      'airi/no-mixed-libraries': ['warn', {
        // The root `AGENTS.md` selects these packages.
        preferred: ['@moeru/eventa', '@moeru/std', 'es-toolkit', 'injeca', 'unstorage', 'valibot'],
      }],
    },
  },
])

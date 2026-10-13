import { definePlugin } from '@alint-js/core'

import { noMixedLibraries } from './rules/no-mixed-libraries'
import { noReinventedHelper } from './rules/no-reinvented-helper'

export default definePlugin({
  rules: {
    'no-mixed-libraries': noMixedLibraries,
    'no-reinvented-helper': noReinventedHelper,
  },
})

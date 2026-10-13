/**
 * Formats a count in a compact form, for example `1.5K` or `24M`.
 *
 * Use when:
 * - A character card shows a counter or a price in a small space
 *
 * Returns:
 * - `'0'` when the value is not a number
 */
export function formatCount(value: number | string) {
  const num = typeof value === 'string' ? Number.parseInt(value) : value
  if (Number.isNaN(num))
    return '0'

  const units = [
    { suffix: 'Q', value: 1_000_000_000_000_000 },
    { suffix: 'T', value: 1_000_000_000_000 },
    { suffix: 'B', value: 1_000_000_000 },
    { suffix: 'M', value: 1_000_000 },
    { suffix: 'K', value: 1_000 },
  ]

  for (const unit of units) {
    if (num >= unit.value) {
      const scaled = num / unit.value
      const digits = scaled >= 10 ? 0 : 1
      return `${Number(scaled.toFixed(digits))}${unit.suffix}`
    }
  }

  return num.toString()
}

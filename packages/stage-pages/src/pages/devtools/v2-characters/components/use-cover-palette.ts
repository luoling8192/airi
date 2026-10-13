import type { MaybeRefOrGetter } from 'vue'

import { computedAsync } from '@vueuse/core'
import { Vibrant } from 'node-vibrant/browser'
import { toValue } from 'vue'

/**
 * Extracts frame colors from a cover image, ordered from light to dark.
 *
 * Use when:
 * - A card decoration must match the colors of its cover
 *
 * Returns:
 * - An empty list until the extraction completes
 * - The muted swatches when the image has fewer than two vibrant swatches, for example a mostly white cover
 */
export function useCoverPalette(coverUrl: MaybeRefOrGetter<string>) {
  return computedAsync(async () => {
    const palette = await new Vibrant(toValue(coverUrl)).getPalette()
    const vibrant = [palette.LightVibrant, palette.Vibrant, palette.DarkVibrant].flatMap(swatch => swatch ? [swatch.hex] : [])
    if (vibrant.length >= 2)
      return vibrant

    return [palette.LightMuted, palette.Muted, palette.DarkMuted].flatMap(swatch => swatch ? [swatch.hex] : [])
  }, [])
}

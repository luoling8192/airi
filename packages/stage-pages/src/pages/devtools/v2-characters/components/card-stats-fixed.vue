<script setup lang="ts">
import type { CharacterGridItem } from '@proj-airi/stage-ui/components'

import { formatCount } from '@proj-airi/stage-ui/components'

defineProps<{
  character: CharacterGridItem
  /** Uses light text for a surface that is dark in both color modes. */
  onDark?: boolean
}>()

const emit = defineEmits<{
  bookmark: [id: string]
  like: [id: string]
}>()
</script>

<template>
  <div :class="['flex items-center gap-3']">
    <button
      type="button"
      aria-label="Bookmark"
      :class="[
        'flex items-center gap-1 text-xs',
        'transition duration-200 ease-in-out active:scale-90',
        character.bookmarked
          ? (onDark ? 'text-amber-300' : 'text-amber-500')
          : (onDark ? 'text-white/75 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'),
      ]"
      @click="emit('bookmark', character.id)"
    >
      <div :class="[character.bookmarked ? 'i-solar-star-bold' : 'i-solar-star-linear', 'text-base']" />
      <span>{{ formatCount(character.bookmarks) }}</span>
    </button>
    <button
      type="button"
      aria-label="Like"
      :class="[
        'flex items-center gap-1 text-xs',
        'transition duration-200 ease-in-out active:scale-90',
        character.liked
          ? (onDark ? 'text-rose-400' : 'text-rose-500')
          : (onDark ? 'text-white/75 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'),
      ]"
      @click="emit('like', character.id)"
    >
      <div :class="[character.liked ? 'i-solar-heart-bold' : 'i-solar-heart-outline', 'text-base']" />
      <span>{{ formatCount(character.likes) }}</span>
    </button>
  </div>
</template>

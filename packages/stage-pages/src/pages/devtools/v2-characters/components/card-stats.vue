<script setup lang="ts">
import type { CharacterGridItem } from '@proj-airi/stage-ui/components'

import { formatCount } from '@proj-airi/stage-ui/components'
import { GhostButton } from '@proj-airi/ui'

defineProps<{
  character: CharacterGridItem
}>()

const emit = defineEmits<{
  bookmark: [id: string]
  like: [id: string]
}>()
</script>

<template>
  <div :class="['flex items-center']">
    <GhostButton size="sm" aria-label="Bookmark" @click="emit('bookmark', character.id)">
      <div
        :class="[
          character.bookmarked ? 'i-solar-star-bold' : 'i-solar-star-linear',
          'text-base inline-block',
          character.bookmarked ? 'text-amber-500 dark:text-amber-400' : 'text-neutral-400',
        ]"
      />
      <span
        :class="[
          'text-xs',
          character.bookmarked ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-500 dark:text-neutral-400',
        ]"
      >
        {{ formatCount(character.bookmarks) }}
      </span>
    </GhostButton>
    <GhostButton size="sm" aria-label="Like" @click="emit('like', character.id)">
      <div
        :class="[
          character.liked ? 'i-solar-heart-bold' : 'i-solar-heart-outline',
          'text-base inline-block',
          character.liked ? 'text-rose-500 dark:text-rose-400' : 'text-neutral-400',
        ]"
      />
      <span
        :class="[
          'text-xs',
          character.liked ? 'text-rose-500 dark:text-rose-400' : 'text-neutral-500 dark:text-neutral-400',
        ]"
      >
        {{ formatCount(character.likes) }}
      </span>
    </GhostButton>
  </div>
</template>

<script setup lang="ts">
import type { CharacterGridItem } from '@proj-airi/stage-ui/components'

import { formatCount } from '@proj-airi/stage-ui/components'

import CardStatsFixed from './card-stats-fixed.vue'

defineProps<{
  character: CharacterGridItem
}>()

const emit = defineEmits<{
  bookmark: [id: string]
  chat: [id: string]
  like: [id: string]
}>()
</script>

<template>
  <article
    :class="[
      'group relative flex flex-col gap-2 rounded-sm p-3 font-cute',
      'bg-white shadow-md',
      'odd:-rotate-2 even:rotate-2',
      'transition duration-300 ease-out',
      'hover:z-1 hover:rotate-0 hover:scale-105 hover:shadow-xl',
    ]"
  >
    <div :class="['absolute left-1/2 h-5 w-20 -top-2 -translate-x-1/2 -rotate-3', 'bg-amber-200/85']" />

    <div :class="['relative aspect-square w-full overflow-hidden', 'bg-primary-100']">
      <img
        :src="character.coverUrl"
        :alt="character.name"
        :class="['absolute inset-0 h-full w-full object-cover object-top']"
      >
      <div
        :class="[
          'absolute right-2 top-2 rotate-6',
          'flex items-center gap-1 rounded-full px-2 py-1',
          'text-xs font-bold text-neutral-900',
          'bg-amber-300',
        ]"
      >
        <div :class="['i-tabler:coins text-sm']" />
        <span>{{ formatCount(character.priceCredit) }}</span>
      </div>
    </div>

    <div :class="['truncate text-lg font-bold text-neutral-900']">
      {{ character.name }}
    </div>
    <div :class="['line-clamp-2 min-h-8 flex-1 text-xs leading-4 text-neutral-500']">
      {{ character.tagline }}
    </div>
    <div :class="['flex items-center justify-between gap-2']">
      <CardStatsFixed
        :character="character"
        @bookmark="emit('bookmark', $event)"
        @like="emit('like', $event)"
      />
      <button
        type="button"
        :class="[
          'flex items-center gap-1 rounded-full px-3 py-1.5 -rotate-3',
          'text-xs font-bold text-white',
          'bg-neutral-900 hover:rotate-0 hover:bg-primary-500 active:scale-95',
          'transition duration-200 ease-in-out',
        ]"
        @click="emit('chat', character.id)"
      >
        <div :class="['i-ph:chat-circle-dots-bold']" />
        <span>Chat</span>
      </button>
    </div>
  </article>
</template>

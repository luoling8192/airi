<script setup lang="ts">
import type { CharacterGridItem } from '@proj-airi/stage-ui/components'

import { formatCount } from '@proj-airi/stage-ui/components'

import CardStatsFixed from './card-stats-fixed.vue'

defineProps<{
  character: CharacterGridItem
  index: number
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
      'group relative h-96 overflow-hidden rounded-lg -skew-x-6',
      'bg-primary-500 dark:bg-primary-600',
      'transition duration-300 ease-out',
      'hover:z-1 hover:-translate-y-3 hover:bg-primary-400 hover:shadow-xl',
    ]"
  >
    <div :class="['absolute inset-0 skew-x-6 scale-120']">
      <img
        :src="character.coverUrl"
        :alt="character.name"
        :class="[
          'h-full w-full object-cover',
          'saturate-50 transition duration-300 ease-out',
          'group-hover:saturate-100',
        ]"
      >
    </div>

    <div :class="['absolute right-3 top-1 text-6xl font-black italic leading-none', 'text-white/35']">
      {{ String(index + 1).padStart(2, '0') }}
    </div>

    <div :class="['absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3', 'bg-neutral-950/85']">
      <div :class="['skew-x-6 flex items-baseline justify-between gap-2']">
        <div :class="['min-w-0 truncate pr-1.5 text-lg font-black italic uppercase text-white']">
          {{ character.name }}
        </div>
        <div :class="['flex shrink-0 items-center gap-1 text-xs font-bold text-amber-300']">
          <div :class="['i-tabler:coins text-sm']" />
          <span>{{ formatCount(character.priceCredit) }}</span>
        </div>
      </div>
      <div :class="['skew-x-6 truncate text-xs text-white/70']">
        {{ character.tagline || '???' }}
      </div>
      <div :class="['skew-x-6 flex items-center justify-between gap-2']">
        <CardStatsFixed
          on-dark
          :character="character"
          @bookmark="emit('bookmark', $event)"
          @like="emit('like', $event)"
        />
        <button
          type="button"
          :class="[
            'flex items-center gap-1 -skew-x-12 px-3 py-1',
            'text-xs font-black italic uppercase text-neutral-950',
            'bg-white hover:bg-amber-300 active:scale-95',
            'transition duration-200 ease-in-out',
          ]"
          @click="emit('chat', character.id)"
        >
          <span :class="['skew-x-12']">Chat</span>
          <div :class="['i-ph:play-fill skew-x-12']" />
        </button>
      </div>
    </div>
  </article>
</template>

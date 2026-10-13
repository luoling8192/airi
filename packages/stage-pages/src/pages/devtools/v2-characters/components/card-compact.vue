<script setup lang="ts">
import type { CharacterGridItem } from '@proj-airi/stage-ui/components'

import { formatCount } from '@proj-airi/stage-ui/components'
import { Button } from '@proj-airi/ui'

import CardStats from './card-stats.vue'

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
      'flex items-center gap-3 rounded-2xl p-2',
      'bg-neutral-50 dark:bg-neutral-900',
      'border-2 border-solid border-neutral-100 dark:border-neutral-800',
      'transition duration-200 ease-in-out',
      'hover:border-neutral-200 dark:hover:border-neutral-700',
    ]"
  >
    <div :class="['relative h-20 w-20 shrink-0 overflow-hidden rounded-xl', 'bg-neutral-100 dark:bg-neutral-800']">
      <img
        :src="character.coverUrl"
        :alt="character.name"
        :class="['absolute left-0 top-0 w-full origin-top scale-180']"
      >
    </div>

    <div :class="['min-w-0 flex flex-1 flex-col gap-1']">
      <div :class="['flex items-baseline gap-2']">
        <div :class="['min-w-0 truncate text-sm font-semibold', 'text-neutral-900 dark:text-neutral-100']">
          {{ character.name }}
        </div>
        <div :class="['flex shrink-0 items-center gap-1 text-xs', 'text-neutral-500 dark:text-neutral-400']">
          <div :class="['i-tabler:coins text-sm']" />
          <span>{{ formatCount(character.priceCredit) }}</span>
        </div>
      </div>
      <div :class="['truncate text-xs', 'text-neutral-500 dark:text-neutral-400']">
        {{ character.tagline }}
      </div>
      <CardStats
        :class="['-ml-2']"
        :character="character"
        @bookmark="emit('bookmark', $event)"
        @like="emit('like', $event)"
      />
    </div>

    <Button
      size="sm"
      shape="circle"
      variant="primary"
      icon="i-ph:chat-circle-dots-bold"
      aria-label="Chat"
      @click="emit('chat', character.id)"
    />
  </article>
</template>

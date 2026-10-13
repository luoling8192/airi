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
      'group flex flex-col gap-2 rounded-3xl p-2',
      'bg-primary-50 dark:bg-primary-950/40',
    ]"
  >
    <div :class="['relative aspect-square w-full overflow-hidden rounded-2xl', 'bg-primary-100 dark:bg-primary-900/50']">
      <img
        :src="character.coverUrl"
        :alt="character.name"
        :class="[
          'absolute inset-0 h-full w-full object-cover object-top',
          'transition duration-300 ease-in-out',
          'group-hover:scale-105',
        ]"
      >
    </div>

    <div :class="['flex flex-1 flex-col gap-2 px-2 pb-1']">
      <div :class="['flex items-baseline justify-between gap-2']">
        <div :class="['min-w-0 truncate text-base font-semibold', 'text-primary-900 dark:text-primary-100']">
          {{ character.name }}
        </div>
        <div :class="['flex shrink-0 items-center gap-1 text-xs', 'text-primary-700 dark:text-primary-300']">
          <div :class="['i-tabler:coins text-sm']" />
          <span>{{ formatCount(character.priceCredit) }}</span>
        </div>
      </div>
      <div :class="['line-clamp-2 min-h-8 flex-1 text-xs leading-4', 'text-primary-900/70 dark:text-primary-100/70']">
        {{ character.tagline }}
      </div>
      <div :class="['flex items-center justify-between gap-2']">
        <CardStats
          :class="['-ml-2']"
          :character="character"
          @bookmark="emit('bookmark', $event)"
          @like="emit('like', $event)"
        />
        <Button
          size="sm"
          shape="rounded"
          color="primary"
          variant="primary"
          icon="i-ph:plus-bold"
          label="Chat"
          @click="emit('chat', character.id)"
        />
      </div>
    </div>
  </article>
</template>

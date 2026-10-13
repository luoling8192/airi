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
      'group flex flex-col rounded-3xl p-2 font-cute',
      'bg-white dark:bg-neutral-900',
      'border-2 border-solid border-neutral-200 dark:border-neutral-700',
      'transition duration-300 ease-out',
      'hover:-translate-y-1 hover:rotate-1 hover:shadow-lg',
    ]"
  >
    <div
      :class="[
        'relative aspect-[4/5] w-full overflow-hidden rounded-2xl',
        'bg-gradient-to-b from-primary-100 to-neutral-50',
        'dark:from-primary-900/60 dark:to-neutral-900',
      ]"
    >
      <img
        :src="character.coverUrl"
        :alt="character.name"
        :class="['absolute inset-0 h-full w-full object-cover']"
      >
      <div
        :class="[
          'absolute left-2 top-2',
          'flex items-center gap-1 rounded-full px-2 py-1',
          'text-xs font-bold',
          'bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100',
        ]"
      >
        <div :class="['i-tabler:coins text-sm']" />
        <span>{{ formatCount(character.priceCredit) }}</span>
      </div>
    </div>

    <div
      :class="[
        'relative mx-auto max-w-[90%] -mt-4',
        'flex items-center gap-2 rounded-full py-1 pl-1 pr-3',
        'bg-white dark:bg-neutral-900',
        'border-2 border-solid border-neutral-200 dark:border-neutral-700',
      ]"
    >
      <img
        v-if="character.characterAvatarUrl"
        :src="character.characterAvatarUrl"
        alt=""
        :class="['h-6 w-6 shrink-0 rounded-full object-cover']"
      >
      <div :class="['min-w-0 truncate text-sm font-bold', 'text-neutral-900 dark:text-neutral-100']">
        {{ character.name }}
      </div>
    </div>

    <div :class="['flex flex-1 flex-col gap-2 px-2 pb-1 pt-2']">
      <div :class="['line-clamp-2 min-h-8 flex-1 text-center text-xs leading-4', 'text-neutral-500 dark:text-neutral-400']">
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
          variant="primary"
          icon="i-ph:plus-bold"
          label="Chat"
          @click="emit('chat', character.id)"
        />
      </div>
    </div>
  </article>
</template>

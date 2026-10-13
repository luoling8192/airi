<script setup lang="ts">
import type { CharacterGridItem } from '@proj-airi/stage-ui/components'

import { formatCount } from '@proj-airi/stage-ui/components'

withDefaults(defineProps<{
  character: CharacterGridItem
  /**
   * Sets the treatment behind the text.
   * - `gradient`: a translucent gradient over the cover
   * - `blur`: the gradient, with the cover blurred behind it
   * - `solid`: an opaque base
   *
   * @default 'gradient'
   */
  scrim?: 'gradient' | 'blur' | 'solid'
}>(), {
  scrim: 'gradient',
})

const emit = defineEmits<{
  bookmark: [id: string]
  chat: [id: string]
  like: [id: string]
}>()
</script>

<template>
  <article
    :class="[
      'group relative aspect-[3/4] overflow-hidden rounded-3xl',
      'bg-neutral-100 dark:bg-neutral-800',
    ]"
  >
    <img
      :src="character.coverUrl"
      :alt="character.name"
      :class="[
        'absolute inset-0 h-full w-full object-cover',
        'transition duration-500 ease-out',
        'group-hover:scale-105',
      ]"
    >

    <div
      :class="[
        'absolute left-3 top-3',
        'flex items-center gap-1 rounded-full px-2 py-1',
        'text-xs font-medium text-white',
        'bg-neutral-950/60',
      ]"
    >
      <div :class="['i-tabler:coins text-sm']" />
      <span>{{ formatCount(character.priceCredit) }}</span>
    </div>

    <div
      v-if="scrim === 'blur'"
      :class="[
        'absolute inset-x-0 bottom-0 h-3/5',
        'backdrop-blur-[4px]',
        '[mask-image:linear-gradient(to_top,black_55%,transparent)]',
      ]"
    />
    <div
      v-if="scrim !== 'solid'"
      :class="['absolute inset-x-0 bottom-0 h-3/5', 'bg-gradient-to-t from-neutral-950/95 via-neutral-950/60 to-transparent']"
    />
    <div
      :class="[
        'absolute inset-x-0 bottom-0',
        'flex flex-col gap-2 p-4',
        scrim === 'solid' ? 'pt-12 bg-gradient-to-t from-neutral-950 from-75% to-transparent' : '',
        'text-white',
      ]"
    >
      <div :class="['truncate text-xl font-semibold']">
        {{ character.name }}
      </div>
      <div :class="['line-clamp-2 text-xs leading-4 text-white/75']">
        {{ character.tagline }}
      </div>
      <div :class="['mt-1 flex items-center justify-between gap-2']">
        <div :class="['flex items-center gap-3']">
          <button
            type="button"
            aria-label="Bookmark"
            :class="[
              'flex items-center gap-1 text-xs',
              'transition duration-200 ease-in-out',
              character.bookmarked ? 'text-amber-300' : 'text-white/75 hover:text-white',
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
              'transition duration-200 ease-in-out',
              character.liked ? 'text-rose-400' : 'text-white/75 hover:text-white',
            ]"
            @click="emit('like', character.id)"
          >
            <div :class="[character.liked ? 'i-solar-heart-bold' : 'i-solar-heart-outline', 'text-base']" />
            <span>{{ formatCount(character.likes) }}</span>
          </button>
        </div>
        <button
          type="button"
          :class="[
            'flex items-center gap-1 rounded-full px-3 py-1.5',
            'text-xs font-medium text-neutral-900',
            'bg-white hover:bg-neutral-200 active:scale-95',
            'transition duration-200 ease-in-out',
          ]"
          @click="emit('chat', character.id)"
        >
          <div :class="['i-ph:plus-bold']" />
          <span>Chat</span>
        </button>
      </div>
    </div>
  </article>
</template>

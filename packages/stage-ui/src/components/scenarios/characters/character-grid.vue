<script setup lang="ts">
import { Button, GhostButton } from '@proj-airi/ui'

import coverImage from '../../menu/relu.avif'

import { formatCount } from './format-count'

export interface CharacterGridItem {
  id: string
  name: string
  tagline: string
  coverUrl: string
  characterAvatarUrl?: string
  coverBackgroundUrl?: string
  usedBy: number
  interactions: number
  likes: number
  bookmarks: number
  liked: boolean
  bookmarked: boolean
  priceCredit: string
}

defineProps<{
  characters: CharacterGridItem[]
}>()

const emit = defineEmits<{
  bookmark: [id: string]
  chat: [id: string]
  like: [id: string]
}>()
</script>

<template>
  <div :class="['w-full']">
    <div :class="['mt-10 grid gap-6', 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5']">
      <article
        v-for="character in characters"
        :key="character.id"
        :class="[
          'group relative aspect-[3/4] overflow-hidden rounded-3xl',
          'bg-neutral-100 dark:bg-neutral-800',
        ]"
      >
        <img
          v-if="character.coverBackgroundUrl"
          :src="character.coverBackgroundUrl"
          alt=""
          :class="['absolute inset-0 h-full w-full object-cover']"
        >
        <img
          :src="character.coverUrl || coverImage"
          :alt="character.name"
          :class="[
            'absolute inset-0 h-full w-full object-cover',
            'transition duration-500 ease-out',
            'group-hover:scale-105',
          ]"
        >
        <!-- The blur removes cover details behind the text. The mask fades its top edge. -->
        <div
          :class="[
            'absolute inset-x-0 bottom-0 h-3/5',
            'backdrop-blur-[4px]',
            '[mask-image:linear-gradient(to_top,black_55%,transparent)]',
          ]"
        />
        <div :class="['absolute inset-x-0 bottom-0 h-3/5', 'bg-gradient-to-t from-neutral-950/95 via-neutral-950/60 to-transparent']" />

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
        <button
          type="button"
          :class="[
            'absolute right-3 top-3',
            'h-7 w-7',
            'flex items-center justify-center',
            'rounded-lg',
            'text-white',
            'bg-neutral-950/60 hover:bg-neutral-950/75 active:bg-neutral-950/90',
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
            'transition duration-200 ease-in-out',
          ]"
          aria-label="Options for character"
        >
          <div :class="['i-solar-menu-dots-bold inline-block']" />
        </button>

        <!-- The scrim is dark in both color modes, so the controls on it always use their dark-mode colors. -->
        <div :class="['dark absolute inset-x-0 bottom-0', 'flex flex-col gap-2 p-4', 'text-white']">
          <div :class="['truncate text-xl font-semibold']">
            {{ character.name }}
          </div>
          <div :class="['line-clamp-2 text-xs leading-4 text-white/75']">
            {{ character.tagline }}
          </div>
          <div :class="['mt-1 flex items-center justify-between gap-2']">
            <div :class="['flex items-center -ml-2']">
              <GhostButton size="sm" aria-label="Bookmark" @click="emit('bookmark', character.id)">
                <div
                  :class="[
                    character.bookmarked ? 'i-solar-star-bold text-amber-300' : 'i-solar-star-linear text-white/75',
                    'text-base inline-block',
                  ]"
                />
                <span :class="['text-xs', character.bookmarked ? 'text-amber-300' : 'text-white/75']">
                  {{ formatCount(character.bookmarks) }}
                </span>
              </GhostButton>
              <GhostButton size="sm" aria-label="Like" @click="emit('like', character.id)">
                <div
                  :class="[
                    character.liked ? 'i-solar-heart-bold text-rose-400' : 'i-solar-heart-outline text-white/75',
                    'text-base inline-block',
                  ]"
                />
                <span :class="['text-xs', character.liked ? 'text-rose-400' : 'text-white/75']">
                  {{ formatCount(character.likes) }}
                </span>
              </GhostButton>
            </div>
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
    </div>
  </div>
</template>

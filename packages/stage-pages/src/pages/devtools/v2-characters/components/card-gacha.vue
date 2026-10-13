<script setup lang="ts">
import type { CharacterGridItem } from '@proj-airi/stage-ui/components'

import { formatCount } from '@proj-airi/stage-ui/components'
import { Button } from '@proj-airi/ui'
import { computed } from 'vue'

import CardStatsFixed from './card-stats-fixed.vue'

import { useCoverPalette } from './use-cover-palette'

const props = defineProps<{
  character: CharacterGridItem
  /** Puts the text on an opaque base. The default is a translucent gradient over the cover. */
  solidBase?: boolean
  /** Colors the frame with the cover palette. The default is the theme palette. */
  imageColors?: boolean
}>()

const emit = defineEmits<{
  bookmark: [id: string]
  chat: [id: string]
  like: [id: string]
}>()

const coverPalette = useCoverPalette(() => props.character.coverUrl)

const frameStyle = computed(() => props.imageColors && coverPalette.value.length >= 2
  ? { backgroundImage: `linear-gradient(to bottom right, ${coverPalette.value.join(', ')})` }
  : undefined)
</script>

<template>
  <article
    :class="[
      'group relative aspect-[3/4] rounded-2xl p-1',
      'bg-gradient-to-br from-primary-300 via-complementary-300 to-primary-500',
      'transition duration-300 ease-out',
      'hover:-translate-y-2 hover:-rotate-1 hover:shadow-xl',
    ]"
    :style="frameStyle"
  >
    <div :class="['relative h-full w-full overflow-hidden rounded-xl', 'bg-neutral-900']">
      <div :class="['absolute top-0 h-full w-3/4 -left-1/4 -skew-x-12', 'bg-primary-500/25']" />
      <div :class="['absolute top-0 h-full w-1/6 right-1/6 -skew-x-12', 'bg-complementary-400/15']" />
      <img
        :src="character.coverUrl"
        :alt="character.name"
        :class="[
          'absolute inset-0 h-full w-full object-cover',
          'transition duration-500 ease-out',
          'group-hover:scale-110',
        ]"
      >
      <div
        :class="[
          'pointer-events-none absolute inset-y-0 w-1/2 -left-full -skew-x-12',
          'bg-gradient-to-r from-transparent via-white/30 to-transparent',
          'transition-all duration-700 ease-out',
          'group-hover:left-full',
        ]"
      />

      <div
        :class="[
          'absolute top-3 -left-1 -skew-x-12',
          'py-1 pl-4 pr-3',
          'bg-amber-400 text-neutral-950',
        ]"
      >
        <div :class="['flex items-center gap-1 skew-x-12 text-xs font-black italic']">
          <div :class="['i-tabler:coins text-sm']" />
          <span>{{ formatCount(character.priceCredit) }}</span>
        </div>
      </div>

      <div
        v-if="!solidBase"
        :class="['absolute inset-x-0 bottom-0 h-1/2', 'bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent']"
      />
      <div
        :class="[
          'absolute inset-x-0 bottom-0',
          'flex flex-col gap-2 pb-3',
          solidBase ? 'pt-12 bg-gradient-to-t from-neutral-950 from-65% to-transparent' : '',
        ]"
      >
        <div :class="['max-w-[90%] self-start -ml-2 -skew-x-12', 'py-1 pl-6 pr-4', 'bg-primary-500']">
          <div :class="['skew-x-12 truncate pr-1.5 text-base font-black italic uppercase tracking-wide text-white']">
            {{ character.name }}
          </div>
        </div>
        <div :class="['line-clamp-2 min-h-8 px-3 text-xs leading-4 text-white/75']">
          {{ character.tagline }}
        </div>
        <div :class="['flex items-center justify-between gap-2 px-3']">
          <CardStatsFixed
            on-dark
            :character="character"
            @bookmark="emit('bookmark', $event)"
            @like="emit('like', $event)"
          />
          <Button
            size="sm"
            shape="parallelogram"
            color="primary"
            variant="primary"
            icon="i-ph:play-fill"
            label="Chat"
            @click="emit('chat', character.id)"
          />
        </div>
      </div>
    </div>
  </article>
</template>

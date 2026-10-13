<script setup lang="ts">
import type { CharacterGridItem } from '@proj-airi/stage-ui/components'

import { CharacterGrid } from '@proj-airi/stage-ui/components'
import { Button, SelectTab, useTheme } from '@proj-airi/ui'
import { computed, onUnmounted, ref, useTemplateRef, watch } from 'vue'

import CardCollectible from './components/card-collectible.vue'
import CardCompact from './components/card-compact.vue'
import CardGacha from './components/card-gacha.vue'
import CardPoster from './components/card-poster.vue'
import CardSelect from './components/card-select.vue'
import CardSnapshot from './components/card-snapshot.vue'
import CardTinted from './components/card-tinted.vue'

const characterAvatarUrl = new URL('../../../../../stage-ui/src/assets/live2d/models/hiyori/preview.png', import.meta.url).href

function solidCover(color: string) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 4"><rect width="3" height="4" fill="${color}"/></svg>`)}`
}

// Images in `./local-covers/` replace the built-in covers. The folder is not tracked, so each developer can test with private art.
const localCoverUrls = Object.values(import.meta.glob<string>('./local-covers/*.{png,jpg,jpeg,webp,avif}', { eager: true, query: '?url', import: 'default' }))

// Each mock stresses a different axis: script, text length, cover color, and cover shape.
const characters = ref<CharacterGridItem[]>([
  {
    name: 'ReLU',
    tagline: 'A curious digital companion.',
    coverUrl: new URL('../../../../../stage-ui/src/components/menu/relu.avif', import.meta.url).href,
    priceCredit: '0',
    likes: 12,
    bookmarks: 3,
  },
  {
    name: '日和',
    tagline: '元气满满的话痨，随时准备和你一起规划下一次旅行，也会在你加班的深夜提醒你早点休息。',
    coverUrl: characterAvatarUrl,
    priceCredit: '120',
    likes: 1_530,
    bookmarks: 420,
  },
  {
    name: '星見アリス',
    tagline: '静かな図書館で本を読むのが好き。たまに毒舌。',
    coverUrl: new URL('../../../../../stage-ui/src/assets/vrm/models/AvatarSample-A/preview.png', import.meta.url).href,
    priceCredit: '15000',
    likes: 2_400_000,
    bookmarks: 98_000,
  },
  {
    name: '하늘',
    tagline: '노래하면서 일하는 걸 좋아해요.',
    coverUrl: new URL('../../../../../stage-ui/src/assets/vrm/models/AvatarSample-B/preview.png', import.meta.url).href,
    priceCredit: '5',
    likes: 0,
    bookmarks: 0,
  },
  {
    name: 'ليلى',
    tagline: 'رفيقة فضولية تحب الحكايات الطويلة والشاي الساخن.',
    coverUrl: new URL('../../../../../stage-ui/src/assets/backgrounds/cozy-tea-corner-in-pastel-hues.avif', import.meta.url).href,
    priceCredit: '999',
    likes: 999,
    bookmarks: 1_000,
  },
  {
    name: 'Seraphina von Lichtenstein the Third',
    tagline: 'This tagline is long on purpose. It shows how the card clamps the text, and how the footer buttons keep their position below it.',
    coverUrl: new URL('../../../../../stage-ui/src/assets/backgrounds/cute-streaming-room-with-pastel-decor.avif', import.meta.url).href,
    priceCredit: '2500000',
    likes: 76,
    bookmarks: 12,
  },
  {
    name: '白龙·霜月',
    tagline: '通体雪白的龙娘，用来测试浅色封面上的文字。',
    coverUrl: solidCover('#ffffff'),
    priceCredit: '300',
    likes: 4_200,
    bookmarks: 880,
  },
  {
    name: 'Donaudampfschifffahrtskapitänin',
    tagline: '',
    coverUrl: solidCover('#0a0a0a'),
    priceCredit: '42',
    likes: 7,
    bookmarks: 1,
  },
].map((params, index) => ({
  ...params,
  id: `mock-character-${index}`,
  coverUrl: localCoverUrls.length > 0 ? localCoverUrls[index % localCoverUrls.length] : params.coverUrl,
  characterAvatarUrl,
  usedBy: 0,
  interactions: 0,
  liked: false,
  bookmarked: false,
})))

const defaultGridClass = 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

const variants = [
  { key: 'gacha-gradient', title: 'E. Gacha, gradient scrim', component: CardGacha, gridClass: defaultGridClass },
  { key: 'gacha-solid', title: 'E. Gacha, solid base', component: CardGacha, props: { solidBase: true }, gridClass: defaultGridClass },
  { key: 'gacha-image', title: 'E. Gacha, frame from cover colors', component: CardGacha, props: { imageColors: true }, gridClass: defaultGridClass },
  { key: 'select', title: 'F. Select', component: CardSelect, gridClass: 'px-6 gap-3! grid-cols-2 md:grid-cols-3 lg:grid-cols-5' },
  { key: 'snapshot', title: 'G. Snapshot', component: CardSnapshot, gridClass: defaultGridClass },
  { key: 'poster-gradient', title: 'A. Poster, gradient scrim', component: CardPoster, gridClass: defaultGridClass },
  { key: 'poster-blur', title: 'A. Poster, blurred scrim', component: CardPoster, props: { scrim: 'blur' }, gridClass: defaultGridClass },
  { key: 'poster-solid', title: 'A. Poster, solid base', component: CardPoster, props: { scrim: 'solid' }, gridClass: defaultGridClass },
  { key: 'tinted', title: 'B. Tinted', component: CardTinted, gridClass: defaultGridClass },
  { key: 'collectible', title: 'C. Collectible', component: CardCollectible, gridClass: defaultGridClass },
  { key: 'compact', title: 'D. Compact', component: CardCompact, gridClass: 'sm:grid-cols-2 xl:grid-cols-3' },
]

const selectedVariant = ref('all')
const variantOptions = [
  { label: 'All', value: 'all' },
  { label: 'Current', value: 'current' },
  ...variants.map(variant => ({ label: variant.title, value: variant.key })),
]
const visibleVariants = computed(() => variants.filter(variant => selectedVariant.value === 'all' || selectedVariant.value === variant.key))
const showCurrent = computed(() => selectedVariant.value === 'all' || selectedVariant.value === 'current')

const { isDark, toggleDark } = useTheme()

// The hue applies to the document root, as the theme setting does, so every derived chroma variable follows it.
const selectedHue = ref('current')
const hueOptions = [
  { label: 'Current', value: 'current' },
  { label: 'Red', value: '20' },
  { label: 'Amber', value: '75' },
  { label: 'Green', value: '150' },
  { label: 'Violet', value: '300' },
  { label: 'Pink', value: '350' },
]
const initialHue = document.documentElement.style.getPropertyValue('--chromatic-hue')

function applyHue(hue: string) {
  if (hue)
    document.documentElement.style.setProperty('--chromatic-hue', hue)
  else
    document.documentElement.style.removeProperty('--chromatic-hue')
}

watch(selectedHue, hue => applyHue(hue === 'current' ? initialHue : hue))
onUnmounted(() => applyHue(initialHue))

const coverInput = useTemplateRef<HTMLInputElement>('coverInput')

function applyCustomCovers() {
  const urls = Array.from(coverInput.value?.files ?? [], file => URL.createObjectURL(file))
  if (urls.length === 0)
    return

  characters.value.forEach((character, index) => {
    character.coverUrl = urls[index % urls.length]
  })
}

function toggleBookmark(id: string) {
  const character = characters.value.find(item => item.id === id)
  if (!character)
    return

  character.bookmarked = !character.bookmarked
  character.bookmarks += character.bookmarked ? 1 : -1
}

function toggleLike(id: string) {
  const character = characters.value.find(item => item.id === id)
  if (!character)
    return

  character.liked = !character.liked
  character.likes += character.liked ? 1 : -1
}
</script>

<template>
  <div :class="['flex flex-col gap-12 pb-12']">
    <div :class="['flex flex-col gap-3 text-sm', 'text-neutral-500 dark:text-neutral-400']">
      <div :class="['flex flex-wrap items-center gap-3']">
        <span :class="['w-16 shrink-0']">Variant</span>
        <SelectTab v-model="selectedVariant" :options="variantOptions" size="xs" tab-space="compact" />
      </div>
      <div :class="['flex flex-wrap items-center gap-3']">
        <span :class="['w-16 shrink-0']">Hue</span>
        <SelectTab v-model="selectedHue" :options="hueOptions" size="xs" tab-space="compact" />
        <Button
          size="sm"
          :icon="isDark ? 'i-solar:moon-bold' : 'i-solar:sun-bold'"
          :label="isDark ? 'Dark' : 'Light'"
          @click="toggleDark()"
        />
      </div>
      <label :class="['flex flex-wrap items-center gap-3']">
        <span :class="['w-16 shrink-0']">Covers</span>
        <input
          ref="coverInput"
          type="file"
          accept="image/*"
          multiple
          :class="['text-xs']"
          @change="applyCustomCovers"
        >
      </label>
    </div>

    <section v-if="showCurrent">
      <h2 :class="['text-sm font-medium', 'text-neutral-500 dark:text-neutral-400']">
        Current
      </h2>
      <CharacterGrid
        :characters="characters"
        @bookmark="toggleBookmark"
        @like="toggleLike"
      />
    </section>

    <section v-for="variant in visibleVariants" :key="variant.key" :class="['flex flex-col gap-4']">
      <h2 :class="['text-sm font-medium', 'text-neutral-500 dark:text-neutral-400']">
        {{ variant.title }}
      </h2>
      <div :class="['grid gap-6', variant.gridClass]">
        <component
          :is="variant.component"
          v-for="(character, index) in characters"
          :key="character.id"
          :character="character"
          :index="index"
          v-bind="variant.props"
          @bookmark="toggleBookmark"
          @like="toggleLike"
        />
      </div>
    </section>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  title: V2 Characters
  subtitleKey: tamagotchi.settings.devtools.title
</route>

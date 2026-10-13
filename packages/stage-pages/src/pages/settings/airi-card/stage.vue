<script setup lang="ts">
import type { AiriCard } from '@proj-airi/stage-ui/stores/modules/airi-card'

import { Live2DScene } from '@proj-airi/stage-ui-live2d'
import { ThreeScene } from '@proj-airi/stage-ui-three'
import { useDownload } from '@proj-airi/stage-ui/composables/download'
import { exportAiriCardPackage } from '@proj-airi/stage-ui/services/airi-card-import-export'
import { DisplayModelFormat, useDisplayModelsStore } from '@proj-airi/stage-ui/stores/display-models'
import { useAiriCardStore } from '@proj-airi/stage-ui/stores/modules/airi-card'
import { useSettings } from '@proj-airi/stage-ui/stores/settings'
import { BasicButton, Button, DropdownMenu, GhostButton, IconButton } from '@proj-airi/ui'
import { useMouse, useResizeObserver } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { DropdownMenuItem } from 'reka-ui'
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import CardEditor from './components/CardEditor.vue'
import DeleteCardDialog from './components/DeleteCardDialog.vue'
import UnsavedChangesDialog from './components/UnsavedChangesDialog.vue'

type Section = 'identity' | 'avatar' | 'brain'

/** The switcher shows this many characters. The menu next to it lists the rest. */
const SWITCHER_LIMIT = 5

const { t } = useI18n()
const router = useRouter()
const cardStore = useAiriCardStore()
const displayModelsStore = useDisplayModelsStore()
const { cards, activeCardId, moduleDefaults } = storeToRefs(cardStore)
const { displayModels } = storeToRefs(displayModelsStore)
const { themeColorsHue, themeColorsHueDynamic } = storeToRefs(useSettings())

const viewedCardId = ref(activeCardId.value)
const openSection = ref<Section | undefined>('identity')
const showDeleteConfirm = ref(false)

/** The panel shows the editor in place of the character details while this is set. */
const editorMode = ref<'edit' | 'create'>()
const editorSection = ref('identity')
const editorDirty = ref(false)
const editorRef = useTemplateRef<InstanceType<typeof CardEditor>>('editor')
const showUnsavedConfirm = ref(false)
/** The action that waits for the user to discard the unsaved changes. */
let afterLeavingEditor: (() => void) | undefined
const panelOpen = computed(() => !!editorMode.value || !!openSection.value)

// TODO: Remove the mock characters with the prototype. They fill the switcher for a design review.
// They live in this page only. The card store and the saved cards do not change.
function mockCard(card: Pick<AiriCard, 'name' | 'description' | 'personality' | 'scenario' | 'greetings'>, modules: Partial<AiriCard['extensions']['airi']['modules']>): AiriCard {
  return {
    ...card,
    version: '1.0.0',
    extensions: {
      airi: {
        modules: {
          consciousness: { provider: '', model: '' },
          speech: { provider: '', model: '', voice_id: '' },
          vision: { provider: '', model: '' },
          ...modules,
        },
        agents: {},
      },
    },
  }
}

const mockCards = ref(new Map<string, AiriCard>(import.meta.env.DEV
  ? [
      ['mock-aoi', mockCard({
        name: 'Aoi',
        description: 'A late-night radio host. She speaks slowly and turns one sentence into a story.\n\nShe reads each letter from a listener one time before she answers it.',
        personality: 'Gentle and patient. She remembers small things that you said weeks ago.',
        scenario: 'One in the morning. The studio has one desk lamp and a cup of cold tea.',
        greetings: ['Good evening. How was your day?', 'You are up late again.'],
      }, {
        consciousness: { provider: 'openrouter-ai', model: 'claude-sonnet-5-5' },
        speech: { provider: 'elevenlabs', model: 'eleven_multilingual_v2', voice_id: 'Myriam' },
        displayModelId: 'preset-vrm-1',
      })],
      ['mock-mika', mockCard({
        name: 'Mika',
        description: 'A code review partner. She sighs at a pull request without tests. Then she writes the tests with you.',
        personality: 'Strict and direct. She is kinder than she sounds.',
        scenario: 'Friday evening. The merge window closes in twenty minutes.',
        greetings: ['No tests, no review. Those are the rules.'],
      }, {
        consciousness: { provider: 'openrouter-ai', model: 'claude-opus-5-5' },
        displayModelId: 'preset-vrm-2',
      })],
      ['mock-hiyori', mockCard({
        name: 'Hiyori',
        description: 'A quiet classmate who reads by the window. She talks more when the topic is a book.',
        personality: 'Shy and curious. She asks one careful question at a time.',
        scenario: 'The library after class. Rain on the window.',
        greetings: ['Oh. Is this seat free?', 'What are you reading?'],
      }, {
        speech: { provider: 'elevenlabs', model: 'eleven_multilingual_v2', voice_id: 'Lily' },
        displayModelId: 'preset-live2d-2',
      })],
      ['mock-nocturne', mockCard({
        name: 'Nocturne',
        description: 'A new character with no avatar. Only the first line exists.',
        greetings: ['...'],
      }, {
        displayModelId: 'mock-missing-model',
      })],
    ]
  : []))
/** The mock character that the review marks as active. A mock character cannot become the real active card. */
const mockActiveCardId = ref<string>()

const allCards = computed(() => new Map([...cards.value, ...mockCards.value]))
const characters = computed(() => [...allCards.value.entries()].map(([id, card]) => ({ id, card })))
const viewedCard = computed(() => allCards.value.get(viewedCardId.value))
const isViewedCardActive = computed(() => viewedCardId.value === (mockActiveCardId.value ?? activeCardId.value))

// A card without its own display model shows the model that every such card inherits.
function displayModelIdOf(card: AiriCard) {
  return card.extensions.airi.modules.displayModelId || moduleDefaults.value?.displayModelId
}

function previewImageOf(card: AiriCard) {
  const id = displayModelIdOf(card)
  return displayModels.value.find(model => model.id === id)?.previewImage
}

const viewedDisplayModelId = computed(() => {
  // A new card has no display model of its own until it is saved, so the stage shows the inherited one.
  if (editorMode.value === 'create')
    return moduleDefaults.value?.displayModelId
  return viewedCard.value ? displayModelIdOf(viewedCard.value) : undefined
})

/** The model on the stage. `src` is an object URL when the model is an imported file. */
const stageModel = shallowRef<{ id: string, src: string, format: DisplayModelFormat, previewImage?: string }>()

watch(viewedDisplayModelId, async (id, _previous, onCleanup) => {
  let superseded = false
  let objectUrl: string | undefined
  onCleanup(() => {
    superseded = true
    if (objectUrl)
      URL.revokeObjectURL(objectUrl)
  })

  const model = id ? await displayModelsStore.getDisplayModel(id) : undefined
  // The user picked another character while the model loaded.
  if (superseded)
    return

  if (!model) {
    stageModel.value = undefined
    return
  }

  if (model.type === 'file')
    objectUrl = URL.createObjectURL(model.file)
  stageModel.value = { id: model.id, src: objectUrl ?? (model.type === 'url' ? model.url : ''), format: model.format, previewImage: model.previewImage }
}, { immediate: true })

const { x: mouseX, y: mouseY } = useMouse()
const cursorPosition = computed(() => ({ x: mouseX.value, y: mouseY.value }))

const sections = computed(() => [
  { id: 'identity' as const, icon: 'i-solar:user-id-linear', label: t('settings.pages.card.stage.identity') },
  { id: 'avatar' as const, icon: 'i-solar:t-shirt-linear', label: t('settings.pages.card.stage.avatar') },
  { id: 'brain' as const, icon: 'i-solar:brain-linear', label: t('settings.pages.card.stage.brain') },
])

const brainRows = computed(() => {
  const modules = viewedCard.value?.extensions.airi.modules
  if (!modules)
    return []

  return [
    { label: t('settings.pages.card.creation.sections.chat'), value: modules.consciousness.model, detail: modules.consciousness.provider },
    { label: t('settings.pages.card.creation.sections.speech'), value: modules.speech.voice_id || modules.speech.model, detail: modules.speech.provider },
    { label: t('settings.pages.card.creation.sections.vision'), value: modules.vision.model, detail: modules.vision.provider },
  ]
})

function toggleSection(section: Section) {
  openSection.value = openSection.value === section ? undefined : section
}

function openEditor(mode: 'edit' | 'create') {
  editorSection.value = 'identity'
  editorDirty.value = false
  editorMode.value = mode
}

function closeEditor() {
  editorMode.value = undefined
  editorDirty.value = false
  openSection.value = openSection.value ?? 'identity'
}

/** Runs `then` after the editor closes. Unsaved changes need a confirmation first. */
function leaveEditor(then: () => void) {
  if (!editorMode.value) {
    then()
    return
  }
  if (editorDirty.value) {
    afterLeavingEditor = then
    showUnsavedConfirm.value = true
    return
  }

  closeEditor()
  then()
}

function discardEditorChanges() {
  closeEditor()
  afterLeavingEditor?.()
  afterLeavingEditor = undefined
}

function handleEditorSaved(payload: { cardId: string, activated: boolean }) {
  if (payload.activated)
    mockActiveCardId.value = undefined
  viewedCardId.value = payload.cardId
  closeEditor()
}

// The rail lists the editor sections while the editor is open, so the editor needs no navigation of its own.
const railItems = computed(() => editorMode.value && editorRef.value
  ? editorRef.value.sections.map(section => ({
      ...section,
      active: editorSection.value === section.id,
      select: () => {
        editorSection.value = section.id
      },
    }))
  : sections.value.map(section => ({
      ...section,
      active: openSection.value === section.id,
      select: () => toggleSection(section.id),
    })))
const barTitle = computed(() => editorMode.value === 'create' ? t('settings.pages.card.create_card') : viewedCard.value?.name)

const pageRef = useTemplateRef<HTMLElement>('page')
const switcherRef = useTemplateRef<HTMLElement>('switcher')
const railRef = useTemplateRef<HTMLElement>('rail')
const railPillRef = useTemplateRef<HTMLElement>('railPill')
const panelContentRef = useTemplateRef<HTMLElement>('panelContent')
const nameRef = useTemplateRef<HTMLElement>('name')

/** Reads a motion variable that the style block of this page defines. */
function motionVariable(name: string) {
  return pageRef.value ? getComputedStyle(pageRef.value).getPropertyValue(name).trim() : ''
}

// The panel keeps the last section while it closes, so the content does not vanish before the panel does.
const shownSection = ref<Section>(openSection.value ?? 'identity')
const panelContentShown = ref(false)

// Texts reveal: the lines enter again for each character and each section.
watch([viewedCardId, openSection, editorMode], async ([, section, mode]) => {
  if (!section || mode)
    return

  shownSection.value = section
  panelContentShown.value = false
  await nextTick()
  // A layout read makes the browser apply the hidden state before the entrance starts.
  panelContentRef.value?.getBoundingClientRect()
  panelContentShown.value = true
}, { immediate: true })

// Tabs sliding: the pill takes the box of the pressed section button.
function moveRailPill(animate: boolean) {
  const pill = railPillRef.value
  const tab = railRef.value?.querySelector<HTMLElement>('[aria-pressed="true"]')
  if (!pill)
    return
  if (!tab) {
    pill.style.opacity = '0'
    return
  }

  const place = () => {
    pill.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`
    pill.style.width = `${tab.offsetWidth}px`
    pill.style.height = `${tab.offsetHeight}px`
    pill.style.opacity = '1'
  }
  // A pill that was hidden has no previous position to travel from.
  if (animate && pill.style.opacity === '1') {
    place()
    return
  }

  const transition = pill.style.transition
  pill.style.transition = 'none'
  place()
  pill.getBoundingClientRect()
  pill.style.transition = transition
}

watch([openSection, editorSection, railItems], () => moveRailPill(true), { flush: 'post' })
onMounted(() => requestAnimationFrame(() => moveRailPill(false)))
// The rail changes width on every frame while its labels expand, and the pill must match it without lag.
useResizeObserver(railRef, () => moveRailPill(false))

// Avatar group hover: the hovered avatar lifts, and its neighbors lift less with distance.
function liftAvatars(activeIndex: number | undefined) {
  const lift = Number.parseFloat(motionVariable('--avatar-lift'))
  const falloff = Number.parseFloat(motionVariable('--avatar-falloff'))
  // The timing function must change before the transform does. The return uses the bouncy curve.
  const timingFunction = motionVariable(activeIndex === undefined ? '--avatar-ease-out' : '--avatar-ease-in')

  switcherRef.value?.querySelectorAll<HTMLElement>('.t-avatar').forEach((avatar, index) => {
    avatar.style.transitionTimingFunction = timingFunction
    if (activeIndex === undefined) {
      avatar.style.setProperty('--shift', '0px')
      avatar.style.setProperty('--scale-active', '1')
      return
    }

    avatar.style.setProperty('--shift', `${(lift * falloff ** Math.abs(index - activeIndex)).toFixed(3)}px`)
    avatar.style.setProperty('--scale-active', index === activeIndex ? motionVariable('--avatar-scale') : '1')
  })
}

// Text states swap: the old name leaves upward, then the new name enters from below.
const shownName = ref(barTitle.value)
watch(barTitle, (name) => {
  const element = nameRef.value
  if (!element) {
    shownName.value = name
    return
  }

  element.classList.add('is-exit')
  setTimeout(async () => {
    shownName.value = name
    await nextTick()
    element.classList.remove('is-exit')
    element.classList.add('is-enter-start')
    element.getBoundingClientRect()
    element.classList.remove('is-enter-start')
  }, Number.parseFloat(motionVariable('--text-swap-dur')))
})

async function pickDisplayModel(displayModelId: string) {
  const card = viewedCard.value
  if (!card)
    return

  const updated: AiriCard = {
    ...card,
    extensions: {
      ...card.extensions,
      airi: { ...card.extensions.airi, modules: { ...card.extensions.airi.modules, displayModelId } },
    },
  }
  if (mockCards.value.has(viewedCardId.value))
    mockCards.value.set(viewedCardId.value, updated)
  else
    await cardStore.updateCard(viewedCardId.value, updated)
}

async function activateViewedCard() {
  if (mockCards.value.has(viewedCardId.value)) {
    mockActiveCardId.value = viewedCardId.value
    return
  }

  mockActiveCardId.value = undefined
  await cardStore.activateCard(viewedCardId.value)
}

async function exportViewedCard() {
  const card = viewedCard.value
  if (!card)
    return

  try {
    useDownload(await exportAiriCardPackage({ card, displayModelsStore }), `${card.name.trim()}.zip`).download()
    toast(t('settings.pages.card.exported'))
  }
  catch (error) {
    console.error('Error exporting card package:', error)
    toast(t('settings.pages.card.export_failed'))
  }
}

async function deleteViewedCard() {
  const removedId = viewedCardId.value
  viewedCardId.value = activeCardId.value === removedId ? 'default' : activeCardId.value
  if (mockCards.value.has(removedId)) {
    mockCards.value.delete(removedId)
    if (mockActiveCardId.value === removedId)
      mockActiveCardId.value = undefined
  }
  else {
    await cardStore.removeCard(removedId)
  }
  showDeleteConfirm.value = false
}

const menuItemClass = [
  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none cursor-pointer',
  'data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-700',
]
</script>

<template>
  <div
    ref="page"
    :class="[
      'character-stage',
      'relative h-100dvh w-full overflow-hidden',
      'bg-neutral-100 text-neutral-800 dark:bg-neutral-950 dark:text-neutral-100',
    ]"
  >
    <!-- The shapes drift behind a frosted layer, so they read as soft light and not as outlines. -->
    <div :class="['pointer-events-none absolute inset-0 overflow-hidden']">
      <div :class="['stage-shape stage-shape--1', 'absolute left-[6%] top-[2%] size-120', 'i-ph:pentagon text-neutral-300 dark:text-neutral-800']" />
      <div :class="['stage-shape stage-shape--2', 'absolute bottom--24 right-[2%] hidden size-110 md:block', 'i-ph:pentagon text-neutral-300 dark:text-neutral-800']" />
      <div :class="['stage-shape stage-shape--3', 'absolute left-[34%] top-[42%] size-64', 'i-ph:pentagon-fill text-primary-300/40 dark:text-primary-700/30']" />
      <div :class="['absolute inset-0 backdrop-blur-md', 'bg-neutral-100/45 dark:bg-neutral-950/45']" />
    </div>

    <!-- The scene keeps its size and only moves, so the canvas does not resize while the panel slides. -->
    <div
      :class="[
        'absolute left-0 top-0 h-[46dvh] w-full md:h-full md:w-[80%]',
        'transition-transform duration-600 ease-out',
        panelOpen ? 'md:translate-x-[-16vw]' : '',
      ]"
    >
      <Live2DScene
        v-if="stageModel?.format === DisplayModelFormat.Live2dZip"
        :key="stageModel.id"
        :model-src="stageModel.src"
        :model-id="stageModel.id"
        :cursor-position="cursorPosition"
        :theme-colors-hue="themeColorsHue"
        :theme-colors-hue-dynamic="themeColorsHueDynamic"
      />
      <ThreeScene
        v-else-if="stageModel?.format === DisplayModelFormat.VRM"
        :key="stageModel.id"
        :model-src="stageModel.src"
        :model-id="stageModel.id"
        :cursor-position="cursorPosition"
      />
      <div v-else :class="['h-full flex items-end justify-center']">
        <img v-if="stageModel?.previewImage" :src="stageModel.previewImage" :alt="viewedCard?.name" :class="['max-h-[80%] rounded-3xl object-contain']">
        <div v-else :class="['mb-[20dvh] size-60 text-neutral-300 dark:text-neutral-800', 'i-solar:ghost-smile-bold-duotone']" />
      </div>
    </div>

    <div :class="['absolute left-4 top-4 z-10 flex gap-1.5']">
      <IconButton
        icon="i-solar:arrow-left-linear"
        :aria-label="t('settings.pages.card.back')"
        :class="['size-8 rounded-full bg-white text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300']"
        @click="leaveEditor(() => router.back())"
      />
    </div>

    <!-- Switcher -->
    <div
      ref="switcher"
      :class="[
        'absolute left-1/2 top-0 z-10 translate-x--1/2 md:left-[61%]',
        'h-16 flex items-center gap-2.5 rounded-b-11 px-8 md:h-18 md:px-11',
        'bg-white dark:bg-neutral-900',
      ]"
    >
      <div
        v-for="(character, index) in characters.slice(0, SWITCHER_LIMIT)"
        :key="character.id"
        :class="['t-avatar', 'flex shrink-0']"
        @mouseenter="liftAvatars(index)"
        @mouseleave="liftAvatars(undefined)"
      >
        <button
          type="button"
          :title="character.card.name"
          :aria-label="character.card.name"
          :aria-pressed="character.id === viewedCardId"
          :class="[
            'aspect-square shrink-0 overflow-hidden rounded-full p-0',
            'bg-neutral-100 dark:bg-neutral-800',
            'outline-2 outline-offset-3 outline-solid transition-all duration-300 ease-out',
            character.id === viewedCardId
              ? 'size-11 outline-primary-500 md:size-13'
              : 'size-8 opacity-70 outline-transparent hover:opacity-100 md:size-9',
          ]"
          @click="leaveEditor(() => { viewedCardId = character.id })"
        >
          <img v-if="previewImageOf(character.card)" :src="previewImageOf(character.card)" alt="" :class="['size-full scale-150 object-cover object-top']">
          <div v-else :class="['size-full scale-60 text-neutral-400', 'i-solar:ghost-smile-bold-duotone']" />
        </button>
      </div>

      <DropdownMenu align="end">
        <template #trigger>
          <IconButton
            icon="i-solar:add-circle-linear"
            :aria-label="t('settings.pages.card.create_card')"
            :class="['size-8 shrink-0 rounded-full text-lg text-neutral-500 dark:text-neutral-400']"
          />
        </template>
        <DropdownMenuItem
          v-for="character in characters.slice(SWITCHER_LIMIT)"
          :key="character.id"
          :class="menuItemClass"
          @select="leaveEditor(() => { viewedCardId = character.id })"
        >
          {{ character.card.name }}
        </DropdownMenuItem>
        <DropdownMenuItem :class="menuItemClass" @select="leaveEditor(() => openEditor('create'))">
          <div :class="['i-solar:add-square-linear']" />
          {{ t('settings.pages.card.create_card') }}
        </DropdownMenuItem>
      </DropdownMenu>
    </div>

    <!-- Sections -->
    <nav
      ref="rail"
      :class="[
        't-rail',
        'absolute z-20 flex gap-0.5 rounded-5.5 p-1',
        'left-1/2 top-[calc(46dvh-1.25rem)] translate-x--1/2',
        'md:left-4 md:top-1/2 md:translate-x-0 md:translate-y--1/2 md:flex-col',
        'bg-neutral-200 dark:bg-neutral-800',
      ]"
    >
      <span ref="railPill" aria-hidden="true" :class="['t-tabs-pill', 'rounded-4.5 bg-white dark:bg-neutral-950']" />
      <BasicButton
        v-for="item in railItems"
        :key="item.id"
        :icon="item.icon"
        size="unset"
        :aria-pressed="item.active"
        :class="[
          't-tab',
          'justify-start rounded-4.5 px-2.5 py-1.75 text-sm font-medium',
          item.active
            ? 'text-primary-700 dark:text-primary-300'
            : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100',
        ]"
        @click="item.select()"
      >
        <span :class="['t-rail-label']"><span>{{ item.label }}</span></span>
      </BasicButton>
    </nav>

    <!-- Panel -->
    <aside
      :data-open="panelOpen ? 'true' : 'false'"
      :class="[
        't-panel-slide',
        'absolute bottom-0 right-0 top-[46dvh] z-10 w-full overflow-y-auto',
        'rounded-t-7.5 md:top-25 md:w-[56.5%] md:rounded-tr-0',
        'bg-white dark:bg-neutral-900',
      ]"
    >
      <CardEditor
        v-if="editorMode"
        ref="editor"
        :key="editorMode === 'edit' ? viewedCardId : 'create'"
        v-model:dirty="editorDirty"
        embedded
        :card-id="editorMode === 'edit' ? viewedCardId : undefined"
        :initial-section="editorSection"
        @saved="handleEditorSaved"
        @update:section="editorSection = $event"
      />
      <div
        v-else-if="viewedCard"
        ref="panelContent"
        :key="`${viewedCardId}:${shownSection}`"
        :class="['t-stagger', { 'is-shown': panelContentShown }, 'px-5 pb-28 pt-11 md:px-14 md:pb-14']"
      >
        <template v-if="shownSection === 'identity'">
          <h1 :class="['t-stagger-line', 'text-3xl font-bold tracking-tight md:text-4xl']">
            {{ viewedCard.name }}
          </h1>
          <div :class="['t-stagger-line t-stagger-line--2', 'mt-1.5 text-sm text-neutral-500 dark:text-neutral-400']">
            v{{ viewedCard.version }}
          </div>
          <p :class="['t-stagger-line t-stagger-line--3', 'mt-8 max-w-[60ch] whitespace-pre-line text-[15px] text-neutral-600 leading-relaxed dark:text-neutral-300']">
            {{ viewedCard.description }}
          </p>
          <template v-for="(field, index) in [{ label: t('settings.pages.card.personality'), value: viewedCard.personality }, { label: t('settings.pages.card.scenario'), value: viewedCard.scenario }]" :key="field.label">
            <section v-if="field.value" :class="[`t-stagger-line t-stagger-line--${index + 4}`, 'mt-8 max-w-[60ch]']">
              <h2 :class="['mb-1.5 text-sm text-neutral-500 dark:text-neutral-400']">
                {{ field.label }}
              </h2>
              <p :class="['whitespace-pre-line text-[15px] text-neutral-600 leading-relaxed dark:text-neutral-300']">
                {{ field.value }}
              </p>
            </section>
          </template>
          <section v-if="viewedCard.greetings?.length" :class="['t-stagger-line t-stagger-line--6', 'mt-8 max-w-[60ch]']">
            <h2 :class="['mb-1.5 text-sm text-neutral-500 dark:text-neutral-400']">
              {{ t('settings.pages.card.stage.greetings') }}
            </h2>
            <p v-for="greeting in viewedCard.greetings" :key="greeting" :class="['text-[15px] text-neutral-600 leading-relaxed dark:text-neutral-300']">
              {{ greeting }}
            </p>
          </section>
        </template>

        <template v-else-if="shownSection === 'avatar'">
          <h1 :class="['t-stagger-line', 'text-3xl font-bold tracking-tight md:text-4xl']">
            {{ t('settings.pages.card.stage.avatar') }}
          </h1>
          <div :class="['t-stagger-line t-stagger-line--2', 'mt-8']">
            <div :class="['grid grid-cols-2 gap-4 lg:grid-cols-4 sm:grid-cols-3']">
              <button
                v-for="model in displayModels"
                :key="model.id"
                type="button"
                :aria-pressed="model.id === viewedDisplayModelId"
                :class="['group grid gap-2 text-left']"
                @click="pickDisplayModel(model.id)"
              >
                <div
                  :class="[
                    'aspect-[4/5] overflow-hidden rounded-4.5 bg-neutral-100 dark:bg-neutral-800',
                    'outline-2 outline-offset-3 outline-solid transition-transform duration-300 ease-out group-hover:translate-y--1',
                    model.id === viewedDisplayModelId ? 'outline-primary-500' : 'outline-transparent',
                  ]"
                >
                  <img v-if="model.previewImage" :src="model.previewImage" alt="" :class="['size-full object-cover object-top']">
                </div>
                <div :class="['truncate text-sm font-medium']">
                  {{ model.name }}
                </div>
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="shownSection === 'brain'">
          <h1 :class="['t-stagger-line', 'text-3xl font-bold tracking-tight md:text-4xl']">
            {{ t('settings.pages.card.stage.brain') }}
          </h1>
          <dl :class="['t-stagger-line t-stagger-line--2', 'mt-7 max-w-140']">
            <div
              v-for="row in brainRows"
              :key="row.label"
              :class="['grid grid-cols-[6rem_minmax(0,1fr)] min-h-15 items-center gap-4 border-b border-neutral-100 px-1 py-2 dark:border-neutral-800']"
            >
              <dt :class="['text-sm text-neutral-500 dark:text-neutral-400']">
                {{ row.label }}
              </dt>
              <dd v-if="row.value" :class="['min-w-0']">
                <div :class="['truncate font-medium']">
                  {{ row.value }}
                </div>
                <div :class="['truncate text-xs text-neutral-500 dark:text-neutral-400']">
                  {{ row.detail }}
                </div>
              </dd>
              <dd v-else :class="['text-neutral-500 dark:text-neutral-400']">
                {{ t('settings.pages.card.creation.inherit_global_settings') }}
              </dd>
            </div>
          </dl>
        </template>
      </div>
    </aside>

    <!-- Name bar -->
    <div
      v-if="viewedCard || editorMode"
      :class="[
        'absolute bottom-3.5 left-1/2 z-20 translate-x--1/2 md:bottom-7',
        'transition-all duration-600 ease-out',
        panelOpen ? 'md:left-[24%]' : 'md:left-[40%]',
        'min-w-85 flex items-center gap-1.5 rounded-full py-2 pl-6 pr-2',
        'bg-white/75 shadow-lg backdrop-blur-lg dark:bg-neutral-900/75',
      ]"
    >
      <div ref="name" :class="['t-text-swap', 'whitespace-nowrap text-[17px] font-semibold tracking-tight']">
        {{ shownName }}
      </div>
      <template v-if="editorMode">
        <div :class="['mr-auto flex items-center gap-1.5 whitespace-nowrap pl-2 text-[13px] text-neutral-500 dark:text-neutral-400']">
          <template v-if="editorDirty">
            <div :class="['size-1.75 rounded-full bg-amber-500']" />
            {{ t('settings.pages.card.unsaved.badge') }}
          </template>
        </div>
        <GhostButton :label="t('settings.pages.card.close')" @click="leaveEditor(() => {})" />
        <Button
          :label="t('settings.pages.card.save')"
          :color="editorMode === 'edit' && isViewedCardActive ? 'primary' : 'neutral'"
          :variant="editorMode === 'edit' && isViewedCardActive ? 'primary' : 'secondary'"
          shape="rounded"
          :disabled="editorRef?.isSaving"
          @click="editorRef?.save(false)"
        />
        <Button
          v-if="!(editorMode === 'edit' && isViewedCardActive)"
          :label="t('settings.pages.card.save_and_activate')"
          color="primary"
          variant="primary"
          shape="rounded"
          :disabled="editorRef?.isSaving"
          @click="editorRef?.save(true)"
        />
      </template>
      <div v-if="!editorMode" :class="['mr-auto flex items-center gap-1.5 whitespace-nowrap pl-2 text-[13px] text-neutral-500 dark:text-neutral-400']">
        <template v-if="isViewedCardActive">
          <div :class="['size-1.75 rounded-full bg-primary-500']" />
          {{ t('settings.pages.card.active') }}
        </template>
      </div>
      <Button
        v-if="!editorMode && !isViewedCardActive"
        :label="t('settings.pages.card.activate')"
        color="primary"
        variant="primary"
        shape="rounded"
        @click="activateViewedCard"
      />
      <GhostButton
        v-if="!editorMode"
        :label="t('settings.pages.card.edit_card')"
        :disabled="mockCards.has(viewedCardId)"
        @click="openEditor('edit')"
      />
      <DropdownMenu v-if="!editorMode" align="end" side="top">
        <template #trigger>
          <IconButton icon="i-solar:menu-dots-bold" :aria-label="t('settings.pages.card.stage.more')" :class="['size-8 rounded-full']" />
        </template>
        <DropdownMenuItem :class="menuItemClass" @select="exportViewedCard">
          <div :class="['i-solar:download-minimalistic-linear']" />
          {{ t('settings.pages.card.export') }}
        </DropdownMenuItem>
        <DropdownMenuItem v-if="viewedCardId !== 'default'" :class="[menuItemClass, 'text-red-500']" @select="showDeleteConfirm = true">
          <div :class="['i-solar:trash-bin-trash-linear']" />
          {{ t('settings.pages.card.delete') }}
        </DropdownMenuItem>
      </DropdownMenu>
    </div>

    <DeleteCardDialog
      v-model="showDeleteConfirm"
      :card-name="viewedCard?.name"
      @confirm="deleteViewedCard"
      @cancel="showDeleteConfirm = false"
    />
    <UnsavedChangesDialog
      v-model="showUnsavedConfirm"
      @discard="discardEditorChanges"
      @cancel="afterLeavingEditor = undefined"
    />
  </div>
</template>

<style scoped>
/*
 * Motion from the transitions.dev snippets: panel reveal, texts reveal, tabs sliding,
 * avatar group hover, and text states swap. The variables stay on the page root,
 * because no other page uses them yet.
 */
.character-stage {
  --panel-open-dur: 400ms;
  --panel-close-dur: 350ms;
  --panel-translate-y: 100px;
  --panel-blur: 2px;
  --panel-ease: cubic-bezier(0.22, 1, 0.36, 1);

  --stagger-dur: 500ms;
  --stagger-distance: 12px;
  --stagger-stagger: 40ms;
  --stagger-blur: 3px;
  --stagger-ease: cubic-bezier(0.22, 1, 0.36, 1);

  --resize-dur: 300ms;
  --resize-ease: cubic-bezier(0.22, 1, 0.36, 1);

  --tabs-dur: 250ms;
  --tabs-ease: cubic-bezier(0.22, 1, 0.36, 1);

  --avatar-lift: -4px;
  --avatar-dur: 320ms;
  --avatar-scale: 1.05;
  --avatar-falloff: 0.45;
  --avatar-ease-in: cubic-bezier(0.22, 1, 0.36, 1);
  --avatar-ease-out: cubic-bezier(0.34, 3.85, 0.64, 1);

  --text-swap-dur: 150ms;
  --text-swap-translate-y: 4px;
  --text-swap-blur: 2px;
  --text-swap-ease: ease-in-out;
}

.stage-shape {
  animation: stage-drift var(--drift-dur) ease-in-out infinite alternate;
  will-change: transform;
}
.stage-shape--1 { --drift-dur: 46s; --drift-x: 6vw; --drift-y: 5vh; --drift-from: -8deg; --drift-to: 28deg; }
.stage-shape--2 { --drift-dur: 58s; --drift-x: -7vw; --drift-y: -6vh; --drift-from: 14deg; --drift-to: -22deg; }
.stage-shape--3 { --drift-dur: 38s; --drift-x: -9vw; --drift-y: 8vh; --drift-from: 0deg; --drift-to: 60deg; }
@keyframes stage-drift {
  from { transform: translate3d(0, 0, 0) rotate(var(--drift-from)); }
  to { transform: translate3d(var(--drift-x), var(--drift-y), 0) rotate(var(--drift-to)); }
}

.t-panel-slide {
  transform: translateY(var(--panel-translate-y));
  opacity: 0;
  filter: blur(var(--panel-blur));
  pointer-events: none;
  transition:
    transform var(--panel-close-dur) var(--panel-ease),
    opacity var(--panel-close-dur) var(--panel-ease),
    filter var(--panel-close-dur) var(--panel-ease);
  will-change: transform, opacity, filter;
}
.t-panel-slide[data-open='true'] {
  transform: translateY(0);
  opacity: 1;
  filter: blur(0);
  pointer-events: auto;
  transition:
    transform var(--panel-open-dur) var(--panel-ease),
    opacity var(--panel-open-dur) var(--panel-ease),
    filter var(--panel-open-dur) var(--panel-ease);
}

.t-stagger-line {
  display: block;
  opacity: 0;
  transform: translateY(var(--stagger-distance));
  filter: blur(var(--stagger-blur));
  transition:
    opacity var(--stagger-dur) var(--stagger-ease),
    transform var(--stagger-dur) var(--stagger-ease),
    filter var(--stagger-dur) var(--stagger-ease);
  will-change: transform, opacity, filter;
}
.t-stagger-line--2 { transition-delay: var(--stagger-stagger); }
.t-stagger-line--3 { transition-delay: calc(var(--stagger-stagger) * 2); }
.t-stagger-line--4 { transition-delay: calc(var(--stagger-stagger) * 3); }
.t-stagger-line--5 { transition-delay: calc(var(--stagger-stagger) * 4); }
.t-stagger-line--6 { transition-delay: calc(var(--stagger-stagger) * 5); }

.t-stagger.is-shown .t-stagger-line {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

/* The section rail is vertical on wide screens, so the script writes both axes and both sizes. */
.t-tab {
  position: relative;
  z-index: 1;
  transition: color var(--tabs-dur) var(--tabs-ease);
}
.t-tabs-pill {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  opacity: 0;
  transform: translate(0, 0);
  transition:
    transform var(--tabs-dur) var(--tabs-ease),
    width var(--tabs-dur) var(--tabs-ease),
    height var(--tabs-dur) var(--tabs-ease);
  will-change: transform, width, height;
  z-index: 0;
  pointer-events: none;
}

/*
 * Card resize, on the section rail. A width of `auto` cannot tween, so the label sits in a grid track
 * that grows from 0fr to 1fr. The negative margin removes the gap that the button keeps next to its icon.
 */
.t-rail-label {
  display: grid;
  grid-template-columns: 1fr;
}
.t-rail-label > span {
  min-width: 0;
  overflow: hidden;
  padding-right: 0.25rem;
}
@media (min-width: 768px) {
  .t-rail-label {
    grid-template-columns: 0fr;
    margin-left: -0.5rem;
    opacity: 0;
    transition:
      grid-template-columns var(--resize-dur) var(--resize-ease),
      margin-left var(--resize-dur) var(--resize-ease),
      opacity var(--resize-dur) var(--resize-ease);
    will-change: grid-template-columns, margin-left, opacity;
  }
  .t-rail:hover .t-rail-label,
  .t-rail:has(:focus-visible) .t-rail-label {
    grid-template-columns: 1fr;
    margin-left: 0;
    opacity: 1;
  }
}

.t-avatar {
  transform-origin: center;
  transform: translateY(var(--shift, 0px)) scale(var(--scale-active, 1));
  transition: transform var(--avatar-dur) var(--avatar-ease-in);
  will-change: transform;
}

.t-text-swap {
  display: inline-block;
  transform: translateY(0);
  filter: blur(0);
  opacity: 1;
  transition:
    transform var(--text-swap-dur) var(--text-swap-ease),
    filter var(--text-swap-dur) var(--text-swap-ease),
    opacity var(--text-swap-dur) var(--text-swap-ease);
  will-change: transform, filter, opacity;
}
.t-text-swap.is-exit {
  transform: translateY(calc(var(--text-swap-translate-y) * -1));
  filter: blur(var(--text-swap-blur));
  opacity: 0;
}
.t-text-swap.is-enter-start {
  transform: translateY(var(--text-swap-translate-y));
  filter: blur(var(--text-swap-blur));
  opacity: 0;
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .t-panel-slide,
  .t-stagger-line,
  .t-tabs-pill,
  .t-tab,
  .t-rail-label,
  .t-text-swap {
    transition: none !important;
  }
  .t-avatar {
    transition: none !important;
    transform: none !important;
  }
  .stage-shape {
    animation: none !important;
  }
}
</style>

<route lang="yaml">
meta:
  layout: plain
  titleKey: settings.pages.card.title
</route>

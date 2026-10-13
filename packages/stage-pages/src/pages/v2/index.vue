<script setup lang="ts">
import type { CharacterGridItem } from '@proj-airi/stage-ui/components'

import { CharacterGrid } from '@proj-airi/stage-ui/components'
import { useAuthStore } from '@proj-airi/stage-ui/stores/auth'
import { useCharacterStore } from '@proj-airi/stage-ui/stores/characters'
import { computed, onMounted } from 'vue'

const characterStore = useCharacterStore()
const authStore = useAuthStore()

onMounted(() => {
  characterStore.fetchList(true)
})

const characters = computed<CharacterGridItem[]>(() => Array.from(characterStore.characters.values()).map((char) => {
  const i18n = char.i18n?.[0] || { name: 'Unknown', tagline: '', description: '' }

  return {
    id: char.id,
    name: i18n.name,
    tagline: i18n.tagline || i18n.description,
    characterAvatarUrl: char.characterAvatarUrl,
    coverUrl: char.coverUrl,
    coverBackgroundUrl: char.coverBackgroundUrl,
    usedBy: char.interactionsCount,
    interactions: char.interactionsCount,
    likes: char.likesCount,
    bookmarks: char.bookmarksCount,
    liked: char.likes?.some(l => l.userId === authStore.user?.id) ?? false,
    bookmarked: char.bookmarks?.some(b => b.userId === authStore.user?.id) ?? false,
    priceCredit: char.priceCredit,
  }
}))
</script>

<template>
  <CharacterGrid
    :characters="characters"
    @bookmark="characterStore.bookmark"
    @like="characterStore.like"
  />
</template>

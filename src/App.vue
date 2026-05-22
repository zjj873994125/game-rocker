<script setup lang="ts">
import { onMounted } from 'vue'
import AuthDialog from './components/AuthDialog.vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()

onMounted(() => {
  auth.loadFromStorage()
})
</script>

<template>
  <RouterView />
  <AuthDialog />
</template>

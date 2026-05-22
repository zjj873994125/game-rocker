<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

function openLogin() {
  auth.openAuthDialog('login')
}

async function logout() {
  auth.logout()

  // 编辑器只允许登录用户访问，退出后回到游戏页，避免游客继续停留在编辑状态。
  if (router.currentRoute.value.meta.requiresAuth) {
    await router.push('/')
  }

  ElMessage.success('已退出登录')
}
</script>

<template>
  <div class="auth-status" aria-label="账号状态">
    <template v-if="auth.isLoggedIn">
      <span class="auth-status__user">{{ auth.displayName }}</span>
      <span class="auth-status__role">{{ auth.isSuperAdmin ? '超管' : '玩家' }}</span>
      <button type="button" @click="logout">退出</button>
    </template>

    <template v-else>
      <button type="button" class="auth-status__login" @click="openLogin">请登录</button>
    </template>
  </div>
</template>

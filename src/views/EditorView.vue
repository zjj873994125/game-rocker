<script setup lang="ts">
import AuthStatus from '../components/AuthStatus.vue'
import LevelEditor from '../game/editor/LevelEditor.vue'
</script>

<template>
  <main class="page">
    <section class="game-shell">
      <div class="game-panel">
        <div class="game-topbar">
          <div>
            <p class="eyebrow">开发地图工具</p>
            <h1>关卡编辑器</h1>
          </div>

          <div class="top-actions">
            <div class="route-switch" aria-label="页面切换">
              <RouterLink custom to="/" v-slot="{ href, navigate, isActive }">
                <button type="button" :class="{ active: isActive }" :data-href="href" @click="navigate">游戏</button>
              </RouterLink>
              <RouterLink custom to="/editor" v-slot="{ href, navigate, isActive }">
                <button type="button" :class="{ active: isActive }" :data-href="href" @click="navigate">编辑器</button>
              </RouterLink>
            </div>
            <AuthStatus />
          </div>
        </div>

        <LevelEditor />
      </div>
    </section>
  </main>
</template>

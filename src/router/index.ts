import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'game',
    component: () => import('../views/GameView.vue'),
  },
  {
    path: '/editor',
    name: 'editor',
    meta: { requiresAuth: true },
    component: () => import('../views/EditorView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  auth.loadFromStorage()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    // 游客可以正常玩游戏，但进入编辑器前必须先登录，避免未授权修改地图。
    auth.openAuthDialog('login', to.fullPath)
    return { name: 'game' }
  }

  return true
})

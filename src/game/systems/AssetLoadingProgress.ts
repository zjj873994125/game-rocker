import * as THREE from 'three'

export type AssetLoadingSnapshot = {
  active: boolean
  loaded: number
  total: number
  progress: number
  currentLabel: string
  error: string
}

type AssetTask = {
  label: string
  done: boolean
  error?: string
}

type AssetLoadingListener = (snapshot: AssetLoadingSnapshot) => void

const tasks = new Map<string, AssetTask>()
const listeners = new Set<AssetLoadingListener>()

function createSnapshot(): AssetLoadingSnapshot {
  const taskList = [...tasks.values()]
  const total = taskList.length
  const loaded = taskList.filter((task) => task.done).length
  const activeTask = taskList.find((task) => !task.done)
  const failedTask = taskList.find((task) => task.error)

  return {
    active: total > 0 && loaded < total,
    loaded,
    total,
    progress: total > 0 ? Math.round((loaded / total) * 100) : 100,
    currentLabel: activeTask?.label ?? '',
    error: failedTask?.error ?? '',
  }
}

function notifyListeners() {
  const snapshot = createSnapshot()
  listeners.forEach((listener) => listener(snapshot))
}

function registerTask(key: string, label: string) {
  const current = tasks.get(key)
  if (current?.done) return

  if (tasks.size > 0 && [...tasks.values()].every((task) => task.done)) {
    tasks.clear()
  }

  tasks.set(key, { label, done: false })
  notifyListeners()
}

function finishTask(key: string, error?: unknown) {
  const task = tasks.get(key)
  if (!task || task.done) return

  task.done = true
  if (error) task.error = error instanceof Error ? error.message : String(error)
  notifyListeners()
}

export function subscribeAssetLoading(listener: AssetLoadingListener) {
  listeners.add(listener)
  listener(createSnapshot())

  return () => listeners.delete(listener)
}

export function trackAssetTask<T>(key: string, label: string, promise: Promise<T>) {
  registerTask(key, label)

  return promise
    .then((result) => {
      finishTask(key)
      return result
    })
    .catch((error: unknown) => {
      finishTask(key, error)
      throw error
    })
}

export function createTrackedLoadingManager(label: string) {
  const manager = new THREE.LoadingManager()

  manager.onStart = (url, loaded, total) => {
    registerTask(getLoadingItemKey(url), `${label} ${loaded + 1}/${Math.max(total, 1)}`)
  }
  manager.onProgress = (url, loaded, total) => {
    const key = getLoadingItemKey(url)

    // Three.js 对单个文件没有稳定的总字节数，这里按文件完成数更新整体进度。
    registerTask(key, `${label} ${loaded}/${Math.max(total, 1)}`)
    finishTask(key)
  }
  manager.onError = (url) => {
    finishTask(getLoadingItemKey(url), `${label} 加载失败`)
  }

  return manager
}

function getLoadingItemKey(url: string) {
  return `loader:${url}`
}

import * as THREE from 'three'

export function normalizeAxis(value: number) {
  return THREE.MathUtils.clamp(value / 100, -1, 1)
}

export function length2D(x: number, z: number) {
  return Math.hypot(x, z)
}

export function distance2D(a: THREE.Vector3, b: THREE.Vector3) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

export function clampToMap(position: THREE.Vector3, radius: number) {
  position.x = THREE.MathUtils.clamp(position.x, -radius, radius)
  position.z = THREE.MathUtils.clamp(position.z, -radius, radius)
}

export function randomMapEdgePosition(radius: number) {
  const side = Math.floor(Math.random() * 4)
  const offset = THREE.MathUtils.randFloatSpread(radius * 2)

  if (side === 0) return new THREE.Vector3(offset, 0, -radius)
  if (side === 1) return new THREE.Vector3(radius, 0, offset)
  if (side === 2) return new THREE.Vector3(offset, 0, radius)

  return new THREE.Vector3(-radius, 0, offset)
}

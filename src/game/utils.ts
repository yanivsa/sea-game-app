import type { Vector2 } from './types'

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const distance = (a: Vector2, b: Vector2) =>
  Math.hypot(a.x - b.x, a.y - b.y)

export const normalize = (vector: Vector2) => {
  const len = Math.hypot(vector.x, vector.y) || 1
  return { x: vector.x / len, y: vector.y / len }
}

export const randomRange = (min: number, max: number) =>
  Math.random() * (max - min) + min

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const pick = <T>(values: T[]): T =>
  values[Math.floor(Math.random() * values.length)]

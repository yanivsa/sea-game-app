import type { PlayerState, SuitAgent, Vector2 } from './types'
import { clamp, normalize, randomRange } from './utils'
import { DETECTION_RADIUS } from './constants'

export type SuitBehaviorState = 'patrol' | 'investigate' | 'chase' | 'recover'

export interface SuitBrainUpdate {
  velocity: Vector2
  state: SuitBehaviorState
  stateTimer: number
  anchor: Vector2
  lastKnownPlayer?: Vector2
}

const steerTowards = (current: Vector2, target: Vector2, maxDelta: number) => {
  const desired = normalize({ x: target.x - current.x, y: target.y - current.y })
  return {
    x: clamp(desired.x, -maxDelta, maxDelta),
    y: clamp(desired.y, -maxDelta, maxDelta),
  }
}

export const createSuitAnchor = (position: Vector2): Vector2 => ({
  x: position.x + randomRange(-40, 40),
  y: position.y + randomRange(-40, 40),
})

export const updateSuitBrain = (
  suit: SuitAgent,
  player: PlayerState,
  tideLevel: number,
  deltaMs: number,
): SuitBrainUpdate => {
  let { state = 'patrol', stateTimer = 2000, anchor } = suit
  let lastKnownPlayer = suit.lastKnownPlayer
  const toPlayer = { x: player.position.x - suit.position.x, y: player.position.y - suit.position.y }
  const distanceToPlayer = Math.hypot(toPlayer.x, toPlayer.y)
  const detectionRadius = DETECTION_RADIUS * (player.carryingDevice ? 1.4 : 1)
  const seesPlayer = distanceToPlayer <= detectionRadius

  if (seesPlayer) {
    state = 'chase'
    stateTimer = 1800
    lastKnownPlayer = { ...player.position }
  } else if (state === 'chase' && lastKnownPlayer) {
    state = 'investigate'
    stateTimer = 2500
  } else if (stateTimer <= 0) {
    if (state === 'recover') {
      state = 'patrol'
      anchor = createSuitAnchor(suit.position)
    } else if (state === 'investigate') {
      state = 'patrol'
      anchor = createSuitAnchor(suit.position)
    } else {
      state = 'recover'
      stateTimer = 1500
    }
  }

  let target: Vector2
  switch (state) {
    case 'chase':
      target = player.position
      break
    case 'investigate':
      target = lastKnownPlayer ?? createSuitAnchor(suit.position)
      break
    case 'recover':
      target = anchor ?? suit.position
      break
    default:
      target = anchor ?? createSuitAnchor(suit.position)
      break
  }

  const accel = state === 'chase' ? 0.0022 : 0.0012
  const steering = steerTowards(suit.position, target, accel * deltaMs)
  const tideBonus = state === 'chase' ? tideLevel * 0.001 : 0

  return {
    velocity: {
      x: suit.velocity.x + steering.x + tideBonus,
      y: suit.velocity.y + steering.y + tideBonus,
    },
    state,
    stateTimer: Math.max(0, stateTimer - deltaMs),
    anchor: anchor ?? createSuitAnchor(suit.position),
    lastKnownPlayer,
  }
}

export const MAP_WIDTH = 960
export const MAP_HEIGHT = 520
export const CLIFF_LINE = 160
export const WATER_LINE = 300
export const GAME_DURATION_MS = 15 * 60 * 1000 // 15 minutes -> 15 in-world days
export const MAX_DAYS = 15
export const DEVICE_UNLOCK_DAY = 4

export const PLAYER_SPEED = 0.2
export const PLAYER_SWIM_SPEED = 0.18
export const PLAYER_DIVE_SPEED = 0.15
export const PLAYER_SPRINT_MULTIPLIER = 1.35
export const PLAYER_STAMINA_DRAIN = 0.002
export const PLAYER_TURN_SPEED = 0.0035

export const SUIT_BASE_SPEED = 0.05
export const SUIT_MAX_SPEED = 0.12
export const SUIT_ACCEL = 0.00008
export const SUIT_SPAWN_INTERVAL = 4600
export const MAX_SUIT_COUNT = 14

export const POLICE_ZONE = {
  position: { x: MAP_WIDTH - 90, y: CLIFF_LINE - 30 },
  radius: 50,
}

export const DEVICE_SCAN_RADIUS = 80
export const DEVICE_CAPTURE_RADIUS = 32
export const STRIKE_RADIUS = 46
export const DETECTION_RADIUS = 60

export interface Vector2 {
  x: number
  y: number
}

export type ZoneType = 'sand' | 'water' | 'cliff' | 'police'

export interface SuitAgent {
  id: number
  variant: 'shore' | 'water'
  position: Vector2
  velocity: Vector2
  stunnedMs: number
  heat: number
}

export interface PulsePing {
  id: number
  position: Vector2
  radius: number
  strength: number
  bornAt: number
  type: 'scan' | 'ping'
}

export interface IntelMessage {
  id: number
  tone: 'alert' | 'success' | 'intel'
  content: string
  createdAt: number
}

export interface DeviceState {
  position: Vector2
  depth: 'sand' | 'tidal' | 'reef'
  located: boolean
  retrieved: boolean
  delivered: boolean
  revealHint: number
}

export interface PlayerState {
  name: string
  position: Vector2
  velocity: Vector2
  stamina: number
  focus: number
  integrity: number
  inWater: boolean
  diving: boolean
  scanCooldown: number
  strikeCooldown: number
  gadgetCharge: number
  carryingDevice: boolean
}

export interface ActionFlags {
  strike: boolean
  scan: boolean
  toggleDive: boolean
  sonarPing: boolean
  interact: boolean
}

export interface GameState {
  phase: 'intro' | 'running' | 'won' | 'lost'
  profile: { handle: string }
  clockMs: number
  dayIndex: number
  totalDurationMs: number
  suits: SuitAgent[]
  suitSpawnTimer: number
  pulses: PulsePing[]
  intel: IntelMessage[]
  player: PlayerState
  device: DeviceState
  policeZone: { position: Vector2; radius: number }
  tideLevel: number
  threatLevel: number
  lastTimestamp: number
  reason?: string
  scoreMs?: number
  leaderboard: LeaderboardRecord[]
}

export interface LeaderboardRecord {
  id: string
  username: string
  durationMs: number
  dayCount: number
  createdAt: string
}

export interface InputSnapshot {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  swimUp: boolean
  swimDown: boolean
  sprint: boolean
}

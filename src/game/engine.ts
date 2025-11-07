import {
  CLIFF_LINE,
  DEVICE_CAPTURE_RADIUS,
  DEVICE_SCAN_RADIUS,
  DETECTION_RADIUS,
  GAME_DURATION_MS,
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_DAYS,
  PLAYER_DIVE_SPEED,
  PLAYER_SPEED,
  PLAYER_SPRINT_MULTIPLIER,
  PLAYER_STAMINA_DRAIN,
  PLAYER_SWIM_SPEED,
  POLICE_ZONE,
  STRIKE_RADIUS,
  SUIT_BASE_SPEED,
  SUIT_SPAWN_INTERVAL,
  WATER_LINE,
  MAX_SUIT_COUNT,
  DEVICE_UNLOCK_DAY,
} from './constants'
import type {
  ActionFlags,
  GameState,
  IntelMessage,
  InputSnapshot,
  PlayerState,
  PulsePing,
  Structure,
  StructureKind,
  SuitAgent,
  Vector2,
  ZoneType,
} from './types'
import { clamp, distance, lerp, normalize, pick, randomRange } from './utils'

const nowTime = () =>
  typeof performance !== 'undefined' ? performance.now() : Date.now()

let suitId = 0
let pulseId = 0
let intelId = 0
let structureId = 0

const zoneForY = (y: number): ZoneType => {
  if (y <= CLIFF_LINE) return 'cliff'
  if (y <= WATER_LINE) return 'sand'
  return 'water'
}

const capPlayerBounds = (value: Vector2): Vector2 => ({
  x: clamp(value.x, 40, MAP_WIDTH - 40),
  y: clamp(value.y, CLIFF_LINE - 20, MAP_HEIGHT - 40),
})

const spawnSuit = (variant: 'shore' | 'water'): SuitAgent => ({
  id: ++suitId,
  variant,
  position:
    variant === 'shore'
      ? {
          x: randomRange(80, MAP_WIDTH - 80),
          y: randomRange(CLIFF_LINE + 20, WATER_LINE - 15),
        }
      : {
          x: randomRange(140, MAP_WIDTH - 140),
          y: randomRange(WATER_LINE + 30, MAP_HEIGHT - 50),
        },
  velocity: { x: 0, y: 0 },
  stunnedMs: 0,
  heat: randomRange(0.1, 0.8),
})

const createPulse = (
  position: Vector2,
  type: PulsePing['type'],
  now: number,
): PulsePing => ({
  id: ++pulseId,
  position,
  radius: 20,
  strength: 1,
  bornAt: now,
  type,
})

const createIntel = (
  content: string,
  tone: IntelMessage['tone'],
  now: number,
): IntelMessage => ({
  id: ++intelId,
  content,
  tone,
  createdAt: now,
})

const randomDevice = (): GameState['device'] => ({
  position: {
    x: randomRange(160, MAP_WIDTH - 160),
    y: randomRange(WATER_LINE - 30, WATER_LINE + 90),
  },
  depth: pick(['sand', 'tidal', 'reef']),
  located: false,
  retrieved: false,
  delivered: false,
  revealHint: randomRange(0.18, 0.4),
})

const initialIntel = (now: number) => [
  createIntel('הגעת לחוף הצוק. פנה לחול והישמר מאנשי החליפות.', 'intel', now),
  createIntel('15 דקות = 15 ימים. השאר בשליטה ומצא את האייפון 16.', 'alert', now),
]

const clonePlayer = (player: PlayerState): PlayerState => ({ ...player })

const cloneSuit = (suit: SuitAgent): SuitAgent => ({ ...suit })

const structureDefinitions: {
  kind: StructureKind
  count: number
  zone: { xMin: number; xMax: number; yMin: number; yMax: number }
  size: [number, number]
  height: [number, number]
}[] = [
  {
    kind: 'rock',
    count: 6,
    zone: { xMin: 80, xMax: MAP_WIDTH - 80, yMin: CLIFF_LINE + 40, yMax: WATER_LINE + 30 },
    size: [18, 36],
    height: [30, 60],
  },
  {
    kind: 'lifeguard',
    count: 2,
    zone: { xMin: 120, xMax: MAP_WIDTH - 120, yMin: CLIFF_LINE + 10, yMax: CLIFF_LINE + 80 },
    size: [38, 44],
    height: [90, 110],
  },
  {
    kind: 'flag',
    count: 3,
    zone: { xMin: 120, xMax: MAP_WIDTH - 120, yMin: WATER_LINE - 40, yMax: WATER_LINE + 40 },
    size: [8, 12],
    height: [120, 160],
  },
  {
    kind: 'buoy',
    count: 4,
    zone: { xMin: 160, xMax: MAP_WIDTH - 160, yMin: WATER_LINE + 20, yMax: MAP_HEIGHT - 60 },
    size: [10, 14],
    height: [30, 45],
  },
  {
    kind: 'driftwood',
    count: 4,
    zone: { xMin: 60, xMax: MAP_WIDTH - 60, yMin: WATER_LINE - 50, yMax: WATER_LINE + 70 },
    size: [28, 60],
    height: [10, 20],
  },
]

const generateStructures = (): Structure[] => {
  const structures: Structure[] = []
  structureDefinitions.forEach((def) => {
    for (let i = 0; i < def.count; i += 1) {
      structures.push({
        id: ++structureId,
        kind: def.kind,
        position: {
          x: randomRange(def.zone.xMin, def.zone.xMax),
          y: randomRange(def.zone.yMin, def.zone.yMax),
        },
        size: randomRange(...def.size),
        height: randomRange(...def.height),
      })
    }
  })
  return structures
}

export const createInitialState = (
  handle: string,
  now = nowTime(),
): GameState => {
  const profileHandle = handle?.trim() || 'שומר-הצוק'
  const player: PlayerState = {
    name: profileHandle,
    position: { x: 140, y: WATER_LINE - 40 },
    velocity: { x: 0, y: 0 },
    heading: 0,
    bobPhase: 0,
    sway: 0,
    stamina: 100,
    focus: 100,
    integrity: 100,
    inWater: false,
    diving: false,
    scanCooldown: 0,
    strikeCooldown: 0,
    gadgetCharge: 100,
    carryingDevice: false,
  }

  return {
    phase: handle ? 'running' : 'intro',
    profile: { handle: profileHandle },
    clockMs: GAME_DURATION_MS,
    dayIndex: 1,
    totalDurationMs: GAME_DURATION_MS,
    suits: [],
    suitSpawnTimer: 2000,
    pulses: [],
    intel: initialIntel(now),
    player,
    device: randomDevice(),
    policeZone: POLICE_ZONE,
    tideLevel: 0.5,
    threatLevel: 0.1,
    lastTimestamp: now,
    structures: generateStructures(),
    leaderboard: [],
  }
}

const appendIntel = (
  state: GameState,
  content: string,
  tone: IntelMessage['tone'],
  now: number,
) => {
  const next = [createIntel(content, tone, now), ...state.intel]
  if (next.length > 6) {
    next.pop()
  }
  return next
}

const decayPulses = (pulses: PulsePing[], deltaMs: number) =>
  pulses
    .map((pulse) => ({
      ...pulse,
      radius: pulse.radius + deltaMs * 0.18,
      strength: pulse.strength - deltaMs * 0.0004,
    }))
    .filter((pulse) => pulse.strength > 0)

export const snapshotInputs = (pressed: Set<string>): InputSnapshot => {
  const has = (key: string) => pressed.has(key)

  return {
    forward: has('arrowup') || has('w'),
    backward: has('arrowdown') || has('s'),
    left: has('arrowleft') || has('a'),
    right: has('arrowright') || has('d'),
    swimUp: has('q'),
    swimDown: has('e'),
    sprint: has('shift'),
  }
}

const resolveMovementVector = (input: InputSnapshot): Vector2 => {
  const dir = { x: 0, y: 0 }
  if (input.forward) dir.y -= 1
  if (input.backward) dir.y += 1
  if (input.left) dir.x -= 1
  if (input.right) dir.x += 1
  return dir
}

const resolveSpeed = (player: PlayerState, zone: ZoneType, sprint: boolean) => {
  if (player.diving) return PLAYER_DIVE_SPEED
  if (zone === 'water') return PLAYER_SWIM_SPEED
  let speed = PLAYER_SPEED
  if (sprint && player.stamina > 0) {
    speed *= PLAYER_SPRINT_MULTIPLIER
  }
  return speed
}

const advancePlayer = (
  prev: PlayerState,
  input: InputSnapshot,
  deltaMs: number,
): PlayerState => {
  const next = clonePlayer(prev)
  const movement = resolveMovementVector(input)
  const zone = zoneForY(next.position.y)
  const isTryingToMove = movement.x !== 0 || movement.y !== 0

  const direction = isTryingToMove
    ? normalize(movement)
    : { x: 0, y: 0 }
  const speed = resolveSpeed(next, zone, input.sprint)

  next.position = capPlayerBounds({
    x: next.position.x + direction.x * speed * deltaMs,
    y: next.position.y + direction.y * speed * deltaMs,
  })
  const smoothing = Math.min(1, deltaMs * 0.012)
  next.velocity = {
    x: lerp(next.velocity.x, direction.x * speed, smoothing),
    y: lerp(next.velocity.y, direction.y * speed, smoothing),
  }
  if (isTryingToMove) {
    next.heading = Math.atan2(direction.y, direction.x)
  }
  next.inWater = zoneForY(next.position.y) === 'water'

  const staminaDelta =
    input.sprint && isTryingToMove && !next.diving
      ? -PLAYER_STAMINA_DRAIN * deltaMs
      : PLAYER_STAMINA_DRAIN * 0.6 * deltaMs
  next.stamina = clamp(next.stamina + staminaDelta, 0, 100)

  next.scanCooldown = Math.max(0, next.scanCooldown - deltaMs)
  next.strikeCooldown = Math.max(0, next.strikeCooldown - deltaMs)
  next.gadgetCharge = clamp(
    next.gadgetCharge + deltaMs * 0.01,
    0,
    100,
  )

  const motionEnergy = clamp(
    Math.hypot(next.velocity.x, next.velocity.y) / (PLAYER_SPEED * 2),
    0,
    2,
  )
  if (motionEnergy > 0.02) {
    next.bobPhase = (next.bobPhase + deltaMs * 0.004 * (input.sprint ? 1.7 : 1)) % (Math.PI * 2)
  } else {
    next.bobPhase = lerp(next.bobPhase, 0, 0.05)
  }
  next.sway = Math.sin(next.bobPhase) * (next.inWater ? 6 : 10) * (input.sprint ? 1.2 : 1)

  return next
}

const applyStrike = (
  suits: SuitAgent[],
  player: PlayerState,
): { suits: SuitAgent[]; hit: number } => {
  const updated = suits.map(cloneSuit)
  let hits = 0
  updated.forEach((suit) => {
    if (suit.stunnedMs > 0) return
    if (distance(suit.position, player.position) <= STRIKE_RADIUS) {
      suit.stunnedMs = 2500
      suit.heat += 0.2
      hits += 1
    }
  })
  return { suits: updated, hit: hits }
}

const handleScan = (
  state: GameState,
  now: number,
): { state: GameState; found: boolean } => {
  const next = { ...state }
  next.player = { ...state.player, scanCooldown: 2000 }
  next.pulses = [...state.pulses, createPulse(state.player.position, 'scan', now)]
  const zone = zoneForY(state.player.position.y)
  if (zone !== 'sand') {
    next.intel = appendIntel(
      next,
      'הסורק עובד רק בחול. נסה קרוב יותר לקו המים.',
      'alert',
      now,
    )
    return { state: next, found: false }
  }

  const dist = distance(state.player.position, state.device.position)
  const bonusRadius =
    state.dayIndex <= DEVICE_UNLOCK_DAY ? DEVICE_SCAN_RADIUS * 1.4 : 0

  if (dist <= DEVICE_SCAN_RADIUS + bonusRadius) {
    next.device = {
      ...state.device,
      located: true,
    }
    next.intel = appendIntel(
      next,
      'פענחת את עקבות האייפון! שמור על כיסוי.',
      'success',
      now,
    )
    return { state: next, found: true }
  }

  next.intel = appendIntel(
    next,
    dist < 200
      ? 'קליטה חלקית. אתה חם על המיקום!'
      : 'עדיין אין מגע. המשך לסרוק אזורים אחרים.',
    'intel',
    now,
  )

  return { state: next, found: false }
}

const handleDiveToggle = (state: GameState, now: number): GameState => {
  const next = { ...state, player: { ...state.player } }
  if (!next.player.inWater) {
    next.intel = appendIntel(
      next,
      'צריך להיות בים כדי לצלול.',
      'alert',
      now,
    )
    return next
  }
  next.player.diving = !next.player.diving
  next.intel = appendIntel(
    next,
    next.player.diving
      ? 'צלילה התחילה. היזהר מאנשי החליפות מתחת לפני השטח.'
      : 'חזרת לפני המים.',
    'intel',
    now,
  )
  return next
}

const handlePing = (state: GameState, now: number): GameState => {
  if (state.player.gadgetCharge < 25) {
    return {
      ...state,
      intel: appendIntel(state, 'הרחפן דורש טעינה.', 'alert', now),
    }
  }
  const next = {
    ...state,
    player: { ...state.player, gadgetCharge: state.player.gadgetCharge - 25 },
    pulses: [...state.pulses, createPulse(state.player.position, 'ping', now)],
  }
  const dist = distance(state.player.position, state.device.position)
  const bearing =
    Math.atan2(
      state.device.position.y - state.player.position.y,
      state.device.position.x - state.player.position.x,
    ) *
    (180 / Math.PI)
  next.intel = appendIntel(
    next,
    `הד החזרה ${dist < 160 ? 'חזק' : 'חלש'} בכיוון ${bearing.toFixed(0)}°`,
    dist < 160 ? 'success' : 'intel',
    now,
  )
  return next
}

const resolveDevicePickup = (state: GameState, now: number): GameState => {
  if (state.device.retrieved || !state.device.located) return state
  const dist = distance(state.player.position, state.device.position)
  const reqRadius =
    state.device.depth === 'reef' ? DEVICE_CAPTURE_RADIUS + 15 : DEVICE_CAPTURE_RADIUS
  if (dist <= reqRadius) {
    const next = {
      ...state,
      device: { ...state.device, retrieved: true },
      player: { ...state.player, carryingDevice: true },
    }
    next.intel = appendIntel(
      next,
      'האייפון בידיך! פתח דרך אל תחנת המשטרה.',
      'success',
      now,
    )
    return next
  }
  return state
}

const handleInteract = (state: GameState, now: number): GameState => {
  if (!state.player.carryingDevice) {
    return {
      ...state,
      intel: appendIntel(
        state,
        'אין מה למסור. מצא קודם את האייפון.',
        'alert',
        now,
      ),
    }
  }
  const dist = distance(state.player.position, state.policeZone.position)
  if (dist > state.policeZone.radius) {
    return {
      ...state,
      intel: appendIntel(
        state,
        'התקרב לתחנת המשטרה (הצפון-מזרחית).',
        'alert',
        now,
      ),
    }
  }
  return {
    ...state,
    phase: 'won',
    device: { ...state.device, delivered: true },
    reason: 'העברת את האייפון לתחנת המשטרה!',
    scoreMs: state.totalDurationMs - state.clockMs,
  }
}

const updateSuits = (
  suits: SuitAgent[],
  player: PlayerState,
  deltaMs: number,
): SuitAgent[] =>
  suits
    .map((suit) => {
      const next = cloneSuit(suit)
      if (next.stunnedMs > 0) {
        next.stunnedMs = Math.max(0, next.stunnedMs - deltaMs)
        return next
      }
      const direction = normalize({
        x: player.position.x - next.position.x,
        y: player.position.y - next.position.y,
      })
      const zoneMultiplier = next.variant === 'shore' ? 1 : 0.9
      const speed =
        SUIT_BASE_SPEED *
        zoneMultiplier *
        (1 + next.heat * 0.5 + (player.carryingDevice ? 0.5 : 0))
      next.velocity = { x: direction.x * speed, y: direction.y * speed }
      next.position = capPlayerBounds({
        x: next.position.x + next.velocity.x * deltaMs,
        y: next.position.y + next.velocity.y * deltaMs,
      })
      next.heat = clamp(next.heat + deltaMs * 0.00005, 0, 2)
      return next
    })
    .filter((suit) => suit.position.y >= CLIFF_LINE - 15)

const applySuitPressure = (
  state: GameState,
  suits: SuitAgent[],
  deltaMs: number,
): GameState => {
  let focus = state.player.focus
  let integrity = state.player.integrity
  let threat = state.threatLevel

  suits.forEach((suit) => {
    const distToPlayer = distance(suit.position, state.player.position)
    if (distToPlayer <= DETECTION_RADIUS && suit.stunnedMs <= 0) {
      focus -= 0.01 * deltaMs
      integrity -= 0.003 * deltaMs
      threat += 0.0004 * deltaMs
    }
  })

  return {
    ...state,
    player: {
      ...state.player,
      focus: clamp(focus, 0, 100),
      integrity: clamp(integrity, 0, 100),
    },
    threatLevel: clamp(threat, 0, 1.5),
  }
}

const enforceTide = (state: GameState, now: number): GameState => {
  const tide = 0.5 + 0.35 * Math.sin(now / 90000)
  const next = { ...state, tideLevel: tide }
  if (next.player.diving) {
    next.player = {
      ...next.player,
      focus: clamp(next.player.focus - 0.0015 * tide, 0, 100),
    }
  }
  return next
}

const maybeSpawnSuit = (
  state: GameState,
  now: number,
): { state: GameState; spawned: boolean } => {
  let timer = state.suitSpawnTimer - (state.phase === 'running' ? 16 : 0)
  timer -= state.threatLevel * 10
  if (timer > 0 || state.suits.length >= MAX_SUIT_COUNT) {
    return { state: { ...state, suitSpawnTimer: timer }, spawned: false }
  }
  const variant = Math.random() > 0.4 ? 'shore' : 'water'
  const suits = [...state.suits, spawnSuit(variant)]
  const next = {
    ...state,
    suits,
    suitSpawnTimer: SUIT_SPAWN_INTERVAL * randomRange(0.7, 1.3),
  }
  next.intel = appendIntel(
    next,
    variant === 'shore'
      ? 'איש חליפה חדש פסע על החוף.'
      : 'זוג חליפות צף בים. הישמר!',
    'alert',
    now,
  )
  return { state: next, spawned: true }
}

const processActions = (
  state: GameState,
  actions: ActionFlags,
  now: number,
) => {
  let next = state
  if (actions.strike && state.player.strikeCooldown <= 0) {
    const { suits, hit } = applyStrike(state.suits, state.player)
    next = {
      ...next,
      suits,
      player: { ...state.player, strikeCooldown: 900 },
    }
    if (hit > 0) {
      next.intel = appendIntel(
        next,
        hit > 1
          ? `הדפת ${hit} אנשי חליפות!`
          : 'פגעת במפריע אחד, המשך קדימה.',
        'success',
        now,
      )
    }
  }
  if (actions.scan && state.player.scanCooldown <= 0 && !state.player.diving) {
    const response = handleScan(next, now)
    next = response.state
  }
  if (actions.toggleDive) {
    next = handleDiveToggle(next, now)
  }
  if (actions.sonarPing) {
    next = handlePing(next, now)
  }
  if (actions.interact) {
    next = handleInteract(next, now)
  }
  return next
}

export const advanceFrame = (
  prev: GameState,
  input: InputSnapshot,
  actions: ActionFlags,
  deltaMs: number,
  now: number,
): GameState => {
  const base = { ...prev }
  base.pulses = decayPulses(prev.pulses, deltaMs)

  if (prev.phase !== 'running') {
    return { ...base, lastTimestamp: now }
  }

  const player = advancePlayer(prev.player, input, deltaMs)
  let next: GameState = {
    ...prev,
    player,
    pulses: base.pulses,
    lastTimestamp: now,
    clockMs: Math.max(0, prev.clockMs - deltaMs),
  }

  const elapsedRatio =
    1 - next.clockMs / next.totalDurationMs
  const newDayIndex = clamp(
    Math.floor(elapsedRatio * MAX_DAYS) + 1,
    1,
    MAX_DAYS,
  )
  if (newDayIndex !== next.dayIndex) {
    next.dayIndex = newDayIndex
    next.intel = appendIntel(
      next,
      `יום ${newDayIndex} בחיפוש. המתח עולה.`,
      'intel',
      now,
    )
  }

  if (next.clockMs <= 0) {
    return {
      ...next,
      phase: 'lost',
      reason: 'הזמן הסתיים לפני שמצאת את האייפון.',
    }
  }
  if (next.player.focus <= 0 || next.player.integrity <= 0) {
    return {
      ...next,
      phase: 'lost',
      reason: 'אנשי החליפות שיבשו את המשימה.',
    }
  }

  next = processActions(next, actions, now)
  next = resolveDevicePickup(next, now)

  next = enforceTide(next, now)

  const suits = updateSuits(next.suits, next.player, deltaMs)
  next = { ...next, suits }
  next = applySuitPressure(next, suits, deltaMs)

  const spawnResult = maybeSpawnSuit(next, now)
  next = spawnResult.state

  if (!next.device.located && elapsedRatio >= next.device.revealHint) {
    next.device = { ...next.device, located: true }
    next.intel = appendIntel(
      next,
      'הים חשף מצוף של השליח. זה הזמן לסריקה קפדנית.',
      'intel',
      now,
    )
  }

  if (next.player.diving && next.device.depth === 'reef') {
    const dist = distance(next.player.position, next.device.position)
    if (dist <= DEVICE_CAPTURE_RADIUS + 20) {
      next.device = { ...next.device, located: true }
    }
  }

  if (
    next.device.retrieved &&
    distance(next.player.position, next.policeZone.position) <=
      next.policeZone.radius &&
    next.phase === 'running'
  ) {
    next.intel = appendIntel(
      next,
      'לחץ Enter כדי למסור את האייפון למשטרה.',
      'success',
      now,
    )
  }

  return next
}

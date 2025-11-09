import { MAP_HEIGHT, MAP_WIDTH, WATER_LINE, CLIFF_LINE } from './constants'
import type { Vector2 } from './types'
import { randomRange } from './utils'

export interface WorldSectorDefinition {
  id: string
  label: string
  bounds: { x1: number; y1: number; x2: number; y2: number }
  intelHint: string
  hazard: 'calm' | 'watch' | 'danger'
}

export const WORLD_SECTORS: WorldSectorDefinition[] = [
  {
    id: 'north-dunes',
    label: 'דיונות צפון',
    bounds: { x1: MAP_WIDTH * 0.05, y1: CLIFF_LINE - 40, x2: MAP_WIDTH * 0.55, y2: CLIFF_LINE + 120 },
    intelHint: 'הדיונות מחביאים נתיבים עוקפים, אך אנשי החליפות מזהים עקבות.',
    hazard: 'watch',
  },
  {
    id: 'tidal-belt',
    label: 'רצועת גאות',
    bounds: { x1: MAP_WIDTH * 0.1, y1: WATER_LINE - 80, x2: MAP_WIDTH * 0.9, y2: WATER_LINE + 80 },
    intelHint: 'הגאות חושפת אוצרות ואיומים. דווח אם מצאת משהו נוצץ.',
    hazard: 'danger',
  },
  {
    id: 'reef-shelf',
    label: 'מדף הריף',
    bounds: { x1: MAP_WIDTH * 0.2, y1: WATER_LINE + 40, x2: MAP_WIDTH * 0.95, y2: MAP_HEIGHT - 120 },
    intelHint: 'הצוללנים במים עמוקים מסתירים סימני שיגור. הישמר מצמדי חליפות.',
    hazard: 'calm',
  },
]

export interface WeatherPattern {
  id: string
  label: string
  skyTint: number
  fogTint: number
  waveStrength: number
  ambientGain: number
}

export const WEATHER_PATTERNS: WeatherPattern[] = [
  { id: 'dawn', label: 'שחר זהוב', skyTint: 0xffc387, fogTint: 0x8fa3c6, waveStrength: 0.6, ambientGain: 0.5 },
  { id: 'noon', label: 'צהריים קרירים', skyTint: 0x8fd3ff, fogTint: 0xbfd6ff, waveStrength: 0.8, ambientGain: 0.8 },
  { id: 'storm', label: 'סערת חוף', skyTint: 0x2e3a50, fogTint: 0x1f1f2b, waveStrength: 1.15, ambientGain: 1 },
  { id: 'sunset', label: 'שקיעה בוערת', skyTint: 0xff7a45, fogTint: 0x362c3a, waveStrength: 0.9, ambientGain: 0.7 },
]

export const pickWeatherPattern = (seed: number, dayIndex: number) => {
  const index = (seed + dayIndex * 3) % WEATHER_PATTERNS.length
  return WEATHER_PATTERNS[index]
}

export const pointInSector = (point: Vector2) =>
  WORLD_SECTORS.find((sector) =>
    point.x >= sector.bounds.x1 &&
    point.x <= sector.bounds.x2 &&
    point.y >= sector.bounds.y1 &&
    point.y <= sector.bounds.y2,
  )

export const randomBeacon = () => ({
  x: randomRange(MAP_WIDTH * 0.2, MAP_WIDTH * 0.8),
  y: randomRange(CLIFF_LINE + 20, WATER_LINE + 40),
})

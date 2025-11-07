import type { LeaderboardRecord } from '../game/types'

const API_URL = '/api/leaderboard'
const LOCAL_KEY = 'sea-game-fast-finds'

const parseRecords = (raw: unknown): LeaderboardRecord[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => ({
      id: String(entry.id ?? crypto.randomUUID()),
      username: String(entry.username ?? 'מסתורי'),
      durationMs: Number(entry.durationMs ?? entry.duration_ms ?? 0),
      dayCount: Number(entry.dayCount ?? entry.day_count ?? 0),
      createdAt: String(entry.createdAt ?? entry.created_at ?? new Date().toISOString()),
    }))
    .filter((record) => Number.isFinite(record.durationMs) && record.durationMs > 0)
    .sort((a, b) => a.durationMs - b.durationMs)
    .slice(0, 10)
}

const readLocal = (): LeaderboardRecord[] => {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
    return parseRecords(raw)
  } catch {
    return []
  }
}

const writeLocal = (record: LeaderboardRecord) => {
  if (typeof localStorage === 'undefined') return
  const records = readLocal()
  records.push(record)
  records.sort((a, b) => a.durationMs - b.durationMs)
  localStorage.setItem(LOCAL_KEY, JSON.stringify(records.slice(0, 10)))
}

export const fetchLeaderboard = async (): Promise<LeaderboardRecord[]> => {
  try {
    const response = await fetch(API_URL)
    if (!response.ok) {
      throw new Error('failed to load leaderboard')
    }
    const payload = await response.json()
    return parseRecords(payload.records ?? payload)
  } catch (error) {
    console.warn('[leaderboard] falling back to local cache', error)
    return readLocal()
  }
}

export const submitScore = async (payload: {
  username: string
  durationMs: number
  dayCount: number
}): Promise<LeaderboardRecord | null> => {
  const body = JSON.stringify(payload)
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    if (!response.ok) throw new Error('failed to submit score')
    const data = await response.json()
    return parseRecords([data.record ?? data])[0] ?? null
  } catch (error) {
    console.warn('[leaderboard] storing score locally', error)
    const localRecord: LeaderboardRecord = {
      id: crypto.randomUUID(),
      username: payload.username,
      durationMs: payload.durationMs,
      dayCount: payload.dayCount,
      createdAt: new Date().toISOString(),
    }
    writeLocal(localRecord)
    return localRecord
  }
}

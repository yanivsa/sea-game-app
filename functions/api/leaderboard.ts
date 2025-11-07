interface Env {
  DB: D1Database
}

type ScoreRow = {
  id: number
  username: string
  duration_ms: number
  day_count: number
  created_at: string
}

const mapRecord = (row: ScoreRow) => ({
  id: String(row.id),
  username: row.username,
  durationMs: row.duration_ms,
  dayCount: row.day_count,
  createdAt: row.created_at,
})

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const statement = env.DB.prepare(
    'SELECT id, username, duration_ms, day_count, created_at FROM scores ORDER BY duration_ms ASC LIMIT 10',
  )
  const { results } = await statement.all<ScoreRow>()
  return Response.json({ records: results?.map(mapRecord) ?? [] })
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const payload = await request.json()
  const username = String(payload.username ?? '').trim().slice(0, 32)
  const durationMs = Number(payload.durationMs ?? payload.duration_ms ?? 0)
  const dayCount = Number(payload.dayCount ?? payload.day_count ?? 0)

  if (!username || !Number.isFinite(durationMs) || durationMs <= 0) {
    return new Response('Invalid payload', { status: 400 })
  }

  const statement = env.DB.prepare(
    'INSERT INTO scores (username, duration_ms, day_count) VALUES (?, ?, ?) RETURNING id, username, duration_ms, day_count, created_at',
  ).bind(username, durationMs, dayCount)

  const result = await statement.first<ScoreRow>()

  return new Response(JSON.stringify({ record: result ? mapRecord(result) : null }), {
    headers: { 'Content-Type': 'application/json' },
    status: 201,
  })
}

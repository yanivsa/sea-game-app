import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { World3D } from './components/World3D'
import { GAME_DURATION_MS, MAX_DAYS, DEVICE_UNLOCK_DAY } from './game/constants'
import type { LeaderboardRecord } from './game/types'
import { useGameEngine } from './hooks/useGameEngine'
import { fetchLeaderboard, submitScore } from './services/leaderboard'
import { useGameAudio } from './audio/useGameAudio'
import { MiniMap } from './components/MiniMap'
import { TrackerHUD } from './components/TrackerHUD'
import { clamp, distance } from './game/utils'

const formatClock = (ms: number) => {
  const safeMs = Math.max(0, Math.floor(ms))
  const minutes = Math.floor(safeMs / 60000)
  const seconds = Math.floor((safeMs % 60000) / 1000)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const formatDuration = (ms: number) => {
  const minutes = (ms / 60000).toFixed(2)
  return `${minutes} דק׳`
}

const BUILD_VERSION = 'v0.7.0'

const keyLegend = [
  { hotkey: '⬆⬇⬅➡', label: 'תנועה קדימה ואחורה' },
  { hotkey: 'רווח', label: 'מכת הרתעה' },
  { hotkey: 'F', label: 'סריקה ממוקדת בחול' },
  { hotkey: 'V', label: 'כניסה/יציאה מצלילה' },
  { hotkey: 'G', label: 'פינג כיוון' },
  { hotkey: 'Enter', label: 'מסירה בתחנת המשטרה' },
]

function App() {
  const [handleInput, setHandleInput] = useState('')
  const [launched, setLaunched] = useState(false)
  const [records, setRecords] = useState<LeaderboardRecord[]>([])
  const lastSubmissionRef = useRef<number | null>(null)
  const [submissionState, setSubmissionState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')

  const missionHandle = launched ? handleInput.trim() : null
  const { state, resetGame, refreshLeaderboard } = useGameEngine(missionHandle)

  // Hook up synthesized game audio
  useGameAudio(state, launched)

  useEffect(() => {
    fetchLeaderboard().then((remote) => {
      setRecords(remote)
      refreshLeaderboard(remote)
    })
  }, [refreshLeaderboard])

  useEffect(() => {
    if (state.phase === 'won' && state.scoreMs && missionHandle) {
      if (lastSubmissionRef.current === state.scoreMs) return
      lastSubmissionRef.current = state.scoreMs
      setSubmissionState('saving')
      submitScore({
        username: state.profile.handle,
        durationMs: state.scoreMs,
        dayCount: state.dayIndex,
      })
        .then((newRecord) => {
          setSubmissionState('saved')
          if (newRecord) {
            setRecords((prev) => {
              const next = [...prev, newRecord]
                .sort((a, b) => a.durationMs - b.durationMs)
                .slice(0, 10)
              refreshLeaderboard(next)
              return next
            })
          }
        })
        .catch(() => setSubmissionState('error'))
    } else if (state.phase !== 'won') {
      setSubmissionState('idle')
      lastSubmissionRef.current = null
    }
  }, [state.phase, state.scoreMs, state.profile.handle, missionHandle, state.dayIndex, refreshLeaderboard])

  const bestRecord = records[0]
  const daysWindow = DEVICE_UNLOCK_DAY
  const progressRatio = 1 - state.clockMs / GAME_DURATION_MS
  const dayProgress = (progressRatio * MAX_DAYS).toFixed(1)
  const phoneTelemetry = useMemo(() => {
    const deviceX = state.device.position.x
    const deviceY = state.device.position.y
    const playerX = state.player.position.x
    const playerY = state.player.position.y
    const dx = deviceX - playerX
    const dy = deviceY - playerY
    const dist = distance(state.device.position, state.player.position)
    const worldBearing = (Math.atan2(dy, dx) * 180) / Math.PI
    const playerHeading = (state.player.heading * 180) / Math.PI
    const relativeBearing = ((worldBearing - playerHeading + 540) % 360) - 180
    const signalBase = state.device.located
      ? 1 - clamp(dist / 320, 0, 1)
      : clamp((DEVICE_UNLOCK_DAY - state.dayIndex + 4) / Math.max(dist / 90, 8), 0.05, 0.55)
    return {
      dist,
      bearing: relativeBearing,
      signal: clamp(signalBase, 0, 1),
    }
  }, [
    state.device.position.x,
    state.device.position.y,
    state.player.position.x,
    state.player.position.y,
    state.player.heading,
    state.device.located,
    state.dayIndex,
  ])
  const actionBars = useMemo(
    () => [
      { label: 'סטמינה', value: state.player.stamina, color: '#ffb347' },
      { label: 'פוקוס', value: state.player.focus, color: '#7dd3fc' },
      { label: 'יציבות', value: state.player.integrity, color: '#f472b6' },
      { label: 'איום חליפות', value: state.threatLevel * 100, color: '#f87171' },
      { label: 'גלאי', value: state.player.gadgetCharge, color: '#34d399' },
    ],
    [state.player, state.threatLevel],
  )

  const readyToLaunch = handleInput.trim().length >= 2

  const restartMission = () => {
    lastSubmissionRef.current = null
    resetGame()
  }

  return (
    <div className="app-shell" dir="rtl">
      <div className="build-badge">{BUILD_VERSION}</div>
      <header className="key-row">
        {keyLegend.map((entry) => (
          <span key={entry.hotkey}>
            <strong>{entry.hotkey}</strong> {entry.label}
          </span>
        ))}
      </header>

      <main className="layout">
        <section className="hud-panel">
          <div className="timer-block">
            <h1>חוף הצוק | ציד האייפון 16</h1>
            <div className="timer-meta">
              <span>שעון: {formatClock(state.clockMs)}</span>
              <span>
                יום {state.dayIndex} / {MAX_DAYS}
              </span>
              <span>התקדמות: {Math.round(progressRatio * 100)}%</span>
            </div>
            <div className="window-indicator">
              חלון הזהב: {daysWindow} ימים ראשונים • התקדמות {dayProgress} ימים
            </div>
          </div>

          <div className="metrics">
            {actionBars.map((bar) => (
              <div key={bar.label} className="metric-row">
                <span>{bar.label}</span>
                <div className="bar">
                  <div
                    className="fill"
                    style={{ width: `${Math.min(100, Math.max(0, bar.value))}%`, backgroundColor: bar.color }}
                  />
                </div>
                <span className="value">{Math.round(Math.max(0, bar.value))}%</span>
              </div>
            ))}
          </div>

          <div className="intel-feed">
            <h2>יומן מודיעין</h2>
            <ul>
              {state.intel.map((entry) => (
                <li key={entry.id} className={`tone-${entry.tone}`}>
                  <span>{entry.content}</span>
                  <small>
                    לפני {Math.max(0, Math.round((state.lastTimestamp - entry.createdAt) / 1000))} שניות
                  </small>
                </li>
              ))}
            </ul>
          </div>

          <div className="records-panel">
            <h2>לוח שיאי חילוץ</h2>
            {bestRecord ? (
              <p className="best-line">
                {bestRecord.username} • {formatDuration(bestRecord.durationMs)} • {bestRecord.dayCount} ימים
              </p>
            ) : (
              <p className="best-line">עדיין אין שיאים. היה הראשון!</p>
            )}
            <ol>
              {records.map((record) => (
                <li key={record.id}>
                  <span>{record.username}</span>
                  <span>{formatDuration(record.durationMs)}</span>
                  <span>{record.dayCount} ימים</span>
                </li>
              ))}
            </ol>
          </div>

          <MiniMap state={state} />

          <div className="world-brief">
            <h2>תדריך שטח</h2>
            <dl>
              <div>
                <dt>אנשי חליפות יבשתיים</dt>
                <dd>מסיירים על החול היבש, נצמדים למטרה. פגיעה ברווח עוצרת אותם למספר שניות.</dd>
              </div>
              <div>
                <dt>אנשי חליפות ימיים</dt>
                <dd>מגיחים מתוך הגלים. צלילה קצרה ויציאה מהירה משבשים את נעילתם.</dd>
              </div>
              <div>
                <dt>טלפון iPhone 16</dt>
                <dd>קבור באזור החוף הרטוב או מעל ריף רדוד. האזנה לפינגים תכוון אותך בדיוק.</dd>
              </div>
              <div>
                <dt>תוואי החוף</dt>
                <dd>דיונות, סלעי בזלת, דגלי אזהרה ומצופים. ניתן להשתמש בהם לכיסוי ולסימון כיוון.</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="game-panel">
          <div className="canvas-wrapper">
            <World3D state={state} />
            <TrackerHUD
              distance={phoneTelemetry.dist}
              bearingDeg={phoneTelemetry.bearing}
              located={state.device.located}
              retrieved={state.device.retrieved}
              signal={state.device.retrieved ? 1 : phoneTelemetry.signal}
              threat={state.threatLevel}
              tide={state.tideLevel}
            />
          </div>
        </section>
      </main>

      {!launched && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>משימת חוף הצוק</h2>
            <p>
              מצא את האייפון 16 שאבד בחוף הצוק והעבר אותו לתחנת המשטרה בתוך 15 דקות (15 ימים בעולם המשחק). אנשי חליפות עם משקפי שמש יעשו הכול כדי לעצור אותך ביבשה ובים.
            </p>
            <ul className="mission-points">
              <li>סריקה (F) יעילה יותר על החוף הרטוב, במיוחד בארבעת הימים הראשונים.</li>
              <li>צלילה (V) מגלה מצופים חשודים ומאפשרת להתחמק מהפרעות מתחת למים.</li>
              <li>מכת הרתעה (רווח) פותחת חלון בריחה קצר – אל תיתקע בתוך קבוצה.</li>
              <li>מסירת המכשיר (Enter) אפשרית רק בתוך מעגל תחנת המשטרה בצפון המפה.</li>
            </ul>
            <input
              placeholder="הקלד שם לוחם / שם משתמש"
              value={handleInput}
              onChange={(event) => setHandleInput(event.target.value)}
            />
            <button disabled={!readyToLaunch} onClick={() => readyToLaunch && setLaunched(true)}>
              כניסה למשימה
            </button>
          </div>
        </div>
      )}

      {state.phase !== 'running' && state.phase !== 'intro' && (
        <div className="overlay">
          <div className="overlay-card result">
            <h2>{state.phase === 'won' ? 'הצלחה!' : 'נכשלת במשימה'}</h2>
            <p>{state.reason}</p>
            {state.phase === 'won' && state.scoreMs && (
              <p>
                השלמת ב־{formatDuration(state.scoreMs)} • {state.dayIndex} ימים בתוך החלון
              </p>
            )}
            {submissionState === 'saving' && <p>שומר את השיא בענן…</p>}
            {submissionState === 'error' && (
              <p>לא הצלחנו לשמור את השיא בענן. שמרנו מקומית.</p>
            )}
            <div className="overlay-actions">
              <button onClick={restartMission}>משחק מחדש</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

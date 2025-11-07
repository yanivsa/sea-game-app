import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { GameCanvas } from './components/GameCanvas'
import { GAME_DURATION_MS, MAX_DAYS, DEVICE_UNLOCK_DAY } from './game/constants'
import type { LeaderboardRecord } from './game/types'
import { useGameEngine } from './hooks/useGameEngine'
import { fetchLeaderboard, submitScore } from './services/leaderboard'
import { useGameAudio } from './audio/useGameAudio'

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

const keyLegend = [
  { hotkey: '⬆⬇⬅➡', label: 'תנועה על החוף' },
  { hotkey: 'Space', label: 'מכת נוקאאוט' },
  { hotkey: 'F', label: 'סריקה מתחת לחול' },
  { hotkey: 'V', label: 'מצב צלילה' },
  { hotkey: 'G', label: 'פינג גלאי' },
  { hotkey: 'Enter', label: 'מסירת האייפון למשטרה' },
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
    <div className="app-shell">
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
            <h2>שיאי Fast Finder</h2>
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
        </section>

        <section className="game-panel">
          <GameCanvas state={state} />
        </section>
      </main>

      {!launched && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>משימת חוף הצוק</h2>
            <p>
              מצא את האייפון 16 שאבד בחוף הצוק והעבר אותו לתחנת המשטרה בתוך 15
              דקות (15 ימים בעולם המשחק). אנשי חליפות עם משקפי שמש יעשו הכול כדי
              לעצור אותך ביבשה ובים.
            </p>
            <ul className="mission-points">
              <li>סרוק את החול בעזרת הסורק (F) ברגע שהאיתות חזק.</li>
              <li>צלול (V) כאשר אתה בים כדי לבדוק את המים העמוקים.</li>
              <li>הדף אנשי חליפות עם מקש הרווח והישמר מהסחות.</li>
              <li>חלון מציאה מהיר: 4 ימים ראשונים. פעל מהר!</li>
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

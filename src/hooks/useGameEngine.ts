import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { advanceFrame, createInitialState, snapshotInputs } from '../game/engine'
import type { ActionFlags, GameState, LeaderboardRecord } from '../game/types'

const defaultActions: ActionFlags = {
  strike: false,
  scan: false,
  toggleDive: false,
  sonarPing: false,
  interact: false,
}

const cloneActions = () => ({ ...defaultActions })

const actionFromKey = (key: string): keyof ActionFlags | null => {
  switch (key) {
    case 'space':
      return 'strike'
    case 'f':
      return 'scan'
    case 'v':
      return 'toggleDive'
    case 'g':
      return 'sonarPing'
    case 'enter':
      return 'interact'
    default:
      return null
  }
}

const normalizedKey = (event: KeyboardEvent) => {
  if (event.code === 'Space') return 'space'
  if (event.key === ' ') return 'space'
  return event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase()
}

export const useGameEngine = (handle: string | null) => {
  const stateRef = useRef<GameState>(createInitialState(handle ?? ''))
  const [state, setState] = useState<GameState>(stateRef.current)
  const actionsRef = useRef<ActionFlags>(cloneActions())
  const pressedRef = useRef<Set<string>>(new Set())
  const frameRef = useRef<number | null>(null)
  const lastUiRef = useRef<number>(0)

  const replaceState = useCallback((next: GameState) => {
    stateRef.current = next
    setState(next)
  }, [])

  useEffect(() => {
    const next = createInitialState(handle ?? '')
    next.leaderboard = stateRef.current.leaderboard
    replaceState(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = normalizedKey(event)
      if (
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space'].includes(
          key,
        )
      ) {
        event.preventDefault()
      }
      pressedRef.current.add(key)
      const action = actionFromKey(key)
      if (action) {
        actionsRef.current[action] = true
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      const key = normalizedKey(event)
      pressedRef.current.delete(key)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    const loop = (timestamp: number) => {
      const prev = stateRef.current
      const delta = prev.lastTimestamp ? timestamp - prev.lastTimestamp : 16
      const input = snapshotInputs(pressedRef.current)
      const next = advanceFrame(prev, input, actionsRef.current, delta, timestamp)
      actionsRef.current = cloneActions()
      stateRef.current = next
      if (timestamp - lastUiRef.current > 32) {
        setState(next)
        lastUiRef.current = timestamp
      }
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const refreshLeaderboard = useCallback((records: LeaderboardRecord[]) => {
    const next = { ...stateRef.current, leaderboard: records }
    replaceState(next)
  }, [replaceState])

  const resetGame = useCallback(() => {
    const next = createInitialState(stateRef.current.profile.handle)
    next.leaderboard = stateRef.current.leaderboard
    replaceState(next)
  }, [replaceState])

  const setProfileHandle = useCallback((name: string) => {
    const trimmed = name.trim() || 'שומר-הצוק'
    const next = {
      ...stateRef.current,
      profile: { handle: trimmed },
      player: { ...stateRef.current.player, name: trimmed },
    }
    replaceState(next)
  }, [replaceState])

  return useMemo(
    () => ({
      state,
      resetGame,
      refreshLeaderboard,
      setProfileHandle,
    }),
    [state, resetGame, refreshLeaderboard, setProfileHandle],
  )
}

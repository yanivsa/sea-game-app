import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../game/types'
import { createAudioBus, sfx, startAmbient } from './sfx'
import { applyWeatherToSoundscape, createSoundscape } from './soundscape'

export const useGameAudio = (state: GameState, armed: boolean) => {
  const busRef = useRef<ReturnType<typeof createAudioBus> | null>(null)
  const ambientRef = useRef<{ stop: () => void } | null>(null)
  const soundscapeRef = useRef<ReturnType<typeof createSoundscape> | null>(null)
  const [ready, setReady] = useState(false)
  const prevRef = useRef<{
    pulses: number
    suits: number
    strikeCooldown: number
    diving: boolean
    located: boolean
    retrieved: boolean
    phase: GameState['phase']
    intelCount: number
  }>({
    pulses: 0,
    suits: 0,
    strikeCooldown: 0,
    diving: false,
    located: false,
    retrieved: false,
    phase: 'intro',
    intelCount: 0,
  })

  // Create audio context on demand
  useEffect(() => {
    if (!busRef.current) {
      busRef.current = createAudioBus()
    }
    if (!soundscapeRef.current) {
      soundscapeRef.current = createSoundscape()
    }
    setReady(!!busRef.current)
  }, [])

  // Resume & ambient when armed
  useEffect(() => {
    const bus = busRef.current
    const scape = soundscapeRef.current
    if (!bus) return
    if (armed && bus.ctx.state !== 'running') {
      bus.ctx.resume().catch(() => {})
      scape?.ctx.resume().catch(() => {})
    }
    if (armed && !ambientRef.current) {
      ambientRef.current = startAmbient(bus)
    } else if (!armed && ambientRef.current) {
      ambientRef.current.stop()
      ambientRef.current = null
    }
  }, [armed])

  // React to gameplay deltas
  useEffect(() => {
    const bus = busRef.current
    const scape = soundscapeRef.current
    if (!bus || !ready || bus.ctx.state !== 'running') return
    const prev = prevRef.current
    const next = {
      pulses: state.pulses.length,
      suits: state.suits.length,
      strikeCooldown: state.player.strikeCooldown,
      diving: state.player.diving,
      located: state.device.located,
      retrieved: state.device.retrieved,
      phase: state.phase,
      intelCount: state.intel.length,
    }

    // Pulses: scan/ping
    if (next.pulses > prev.pulses) {
      const last = state.pulses[state.pulses.length - 1]
      if (last) {
        if (last.type === 'scan') sfx.scan(bus)
        else sfx.sonar(bus)
      }
    }

    // Suit spawn
    if (next.suits > prev.suits) sfx.spawn(bus)

    // Strike
    if (prev.strikeCooldown === 0 && next.strikeCooldown > 0) sfx.strike(bus)

    // Dive toggle
    if (prev.diving !== next.diving) {
      next.diving ? sfx.dive(bus) : sfx.surface(bus)
    }

    // Located / Pickup
    if (!prev.located && next.located) sfx.located(bus)
    if (!prev.retrieved && next.retrieved) sfx.pickup(bus)

    // Victory / Fail
    if (prev.phase !== next.phase) {
      if (next.phase === 'won') sfx.victory(bus)
      if (next.phase === 'lost') sfx.fail(bus)
    }

    // Intel success lines indicating hits
    if (next.intelCount > prev.intelCount) {
      const head = state.intel[0]?.content ?? ''
      if (head.includes('הדפת') || head.includes('פגעת')) sfx.hit(bus)
    }

    if (scape) {
      applyWeatherToSoundscape(scape, state.weather)
    }

    prevRef.current = next
  }, [state, ready])
}

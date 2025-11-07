import { useEffect, useRef } from 'react'
import {
  CLIFF_LINE,
  MAP_HEIGHT,
  MAP_WIDTH,
  WATER_LINE,
} from '../game/constants'
import type { GameState } from '../game/types'

const toTimeOfDay = (state: GameState) =>
  ((state.totalDurationMs - state.clockMs) / state.totalDurationMs) * state.dayIndex

export const GameCanvas = ({ state }: { state: GameState }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT)
    const timeOfDay = toTimeOfDay(state)
    const light = Math.max(0.2, Math.sin(timeOfDay * 0.9) * 0.6 + 0.4)

    const skyGradient = ctx.createLinearGradient(0, 0, 0, CLIFF_LINE)
    skyGradient.addColorStop(0, `rgba(${20 * light}, ${40 * light}, ${110 + 60 * light}, 1)`)
    skyGradient.addColorStop(1, `rgba(${60 * light}, ${120 * light}, ${200}, 1)`)
    ctx.fillStyle = skyGradient
    ctx.fillRect(0, 0, MAP_WIDTH, CLIFF_LINE)

    const sandGradient = ctx.createLinearGradient(0, CLIFF_LINE, 0, WATER_LINE)
    sandGradient.addColorStop(0, `rgba(180, 150, 90, ${0.6 + light * 0.3})`)
    sandGradient.addColorStop(1, `rgba(210, 190, 120, ${0.9})`)
    ctx.fillStyle = sandGradient
    ctx.fillRect(0, CLIFF_LINE, MAP_WIDTH, WATER_LINE - CLIFF_LINE)

    const seaGradient = ctx.createLinearGradient(0, WATER_LINE, 0, MAP_HEIGHT)
    seaGradient.addColorStop(0, `rgba(30, 90, 150, ${0.8 + state.tideLevel * 0.2})`)
    seaGradient.addColorStop(1, `rgba(5, 25, 60, 1)`)
    ctx.fillStyle = seaGradient
    ctx.fillRect(0, WATER_LINE, MAP_WIDTH, MAP_HEIGHT - WATER_LINE)

    // Police tent
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 2
    ctx.arc(
      state.policeZone.position.x,
      state.policeZone.position.y,
      state.policeZone.radius,
      0,
      Math.PI * 2,
    )
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fill()
    ctx.fillStyle = '#f0f8ff'
    ctx.font = '12px "Assistant", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('תחנת המשטרה', state.policeZone.position.x, state.policeZone.position.y + 4)

    // Pulses
    state.pulses.forEach((pulse) => {
      ctx.beginPath()
      ctx.strokeStyle =
        pulse.type === 'scan' ? 'rgba(255,255,255,0.35)' : 'rgba(0,255,255,0.45)'
      ctx.lineWidth = pulse.type === 'scan' ? 2 : 1.5
      ctx.arc(pulse.position.x, pulse.position.y, pulse.radius, 0, Math.PI * 2)
      ctx.stroke()
    })

    // Device hint
    if (state.device.located || state.device.retrieved) {
      ctx.beginPath()
      ctx.strokeStyle = state.device.retrieved ? '#1efc1e' : 'rgba(255,255,255,0.6)'
      ctx.setLineDash([4, 4])
      ctx.arc(
        state.device.position.x,
        state.device.position.y,
        18 + (state.device.retrieved ? 6 : 0),
        0,
        Math.PI * 2,
      )
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Suits
    state.suits.forEach((suit) => {
      ctx.save()
      ctx.translate(suit.position.x, suit.position.y)
      ctx.rotate(Math.atan2(suit.velocity.y, suit.velocity.x))
      ctx.fillStyle =
        suit.variant === 'shore'
          ? 'rgba(0,0,0,0.7)'
          : 'rgba(10,30,110,0.9)'
      if (suit.stunnedMs > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
      }
      ctx.fillRect(-8, -12, 16, 24)
      ctx.restore()
      ctx.fillStyle = '#00ffff55'
      ctx.fillRect(suit.position.x - 2, suit.position.y - 12, 4, 8)
    })

    // Player
    ctx.beginPath()
    ctx.fillStyle = state.player.carryingDevice ? '#1efc1e' : '#fffc52'
    ctx.arc(state.player.position.x, state.player.position.y, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.strokeStyle = '#000'
    ctx.moveTo(state.player.position.x, state.player.position.y)
    ctx.lineTo(
      state.player.position.x + state.player.velocity.x * 40,
      state.player.position.y + state.player.velocity.y * 40,
    )
    ctx.stroke()

    // tide overlay
    ctx.fillStyle = `rgba(255,255,255,${0.04 + state.tideLevel * 0.04})`
    ctx.fillRect(0, WATER_LINE - state.tideLevel * 20, MAP_WIDTH, 4)
  }, [state])

  return (
    <canvas
      ref={canvasRef}
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
      className="game-canvas"
    />
  )
}

import { useEffect, useRef } from 'react'
import { MAP_HEIGHT, MAP_WIDTH } from '../game/constants'
import type { GameState, Vector2 } from '../game/types'
import { clamp } from '../game/utils'

const HORIZON = 140

const projectPoint = (state: GameState, target: Vector2) => {
  const dx = target.x - state.player.position.x
  const dy = target.y - state.player.position.y
  const cos = Math.cos(state.player.heading)
  const sin = Math.sin(state.player.heading)
  const forward = dx * cos + dy * sin
  const sideways = dx * -sin + dy * cos
  const depth = forward + 140
  if (depth <= 20) return null
  const depthClamped = clamp(depth, 40, 900)
  const normalized = (depthClamped - 40) / (900 - 40)
  const inverted = 1 - normalized
  const screenY = HORIZON + inverted * (MAP_HEIGHT - HORIZON - 90)
  const screenX = MAP_WIDTH / 2 + sideways * 0.38 * inverted
  if (screenX < -200 || screenX > MAP_WIDTH + 200) return null
  return {
    x: screenX,
    y: screenY,
    scale: 0.45 + inverted * 1.8,
    normalized,
    depth: depthClamped,
  }
}

const drawBackground = (ctx: CanvasRenderingContext2D, state: GameState) => {
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON + 40)
  const dayProgress =
    (state.totalDurationMs - state.clockMs) / state.totalDurationMs
  const skyTint = 0.35 + 0.45 * Math.sin(dayProgress * Math.PI * 2)
  sky.addColorStop(0, `rgba(${20 + skyTint * 60}, ${40 + skyTint * 80}, ${110 + skyTint * 90}, 1)`)
  sky.addColorStop(1, `rgba(10, 26, 53, 1)`)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, MAP_WIDTH, HORIZON + 60)

  const sunX = MAP_WIDTH / 2 + Math.sin(dayProgress * Math.PI * 2) * 220
  const sunY = HORIZON - 60 - Math.cos(dayProgress * Math.PI * 2) * 50
  const sunGradient = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 80)
  sunGradient.addColorStop(0, 'rgba(255, 241, 181, 0.9)')
  sunGradient.addColorStop(1, 'rgba(255, 241, 181, 0)')
  ctx.fillStyle = sunGradient
  ctx.beginPath()
  ctx.arc(sunX, sunY, 80, 0, Math.PI * 2)
  ctx.fill()

  // Dunes
  ctx.fillStyle = '#3a250f'
  ctx.beginPath()
  ctx.moveTo(0, HORIZON + 30)
  ctx.quadraticCurveTo(MAP_WIDTH * 0.25, HORIZON + 10, MAP_WIDTH * 0.55, HORIZON + 40)
  ctx.quadraticCurveTo(MAP_WIDTH * 0.75, HORIZON + 70, MAP_WIDTH, HORIZON + 40)
  ctx.lineTo(MAP_WIDTH, HORIZON + 140)
  ctx.lineTo(0, HORIZON + 140)
  ctx.closePath()
  ctx.fill()

  const sandGradient = ctx.createLinearGradient(0, HORIZON + 40, 0, MAP_HEIGHT)
  sandGradient.addColorStop(0, 'rgba(204, 165, 96, 0.9)')
  sandGradient.addColorStop(1, 'rgba(122, 82, 32, 1)')
  ctx.fillStyle = sandGradient
  ctx.fillRect(0, HORIZON + 40, MAP_WIDTH, MAP_HEIGHT - (HORIZON + 40))

  // Ocean waves
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, HORIZON + 80, MAP_WIDTH, MAP_HEIGHT - (HORIZON + 80))
  ctx.clip()
  for (let i = 0; i < 24; i += 1) {
    const waveY = HORIZON + 90 + i * 12
    const alpha = 0.25 + (i / 24) * 0.4
    ctx.strokeStyle = `rgba(80, 166, 255, ${alpha})`
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = 0; x <= MAP_WIDTH; x += 16) {
      const offset =
        Math.sin((x + state.lastTimestamp / 6 + i * 40) * 0.01) * (6 - i * 0.15)
      ctx.lineTo(x, waveY + offset)
    }
    ctx.stroke()
  }
  ctx.restore()
}

const drawHands = (ctx: CanvasRenderingContext2D, carrying: boolean, sway: number) => {
  ctx.save()
  ctx.fillStyle = carrying ? 'rgba(34, 211, 115, 0.8)' : 'rgba(255, 204, 102, 0.8)'
  ctx.beginPath()
  ctx.moveTo(0, MAP_HEIGHT)
  ctx.lineTo(160 + sway, MAP_HEIGHT - 80)
  ctx.lineTo(260 + sway * 0.6, MAP_HEIGHT - 20)
  ctx.lineTo(140 + sway * 0.3, MAP_HEIGHT)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(MAP_WIDTH, MAP_HEIGHT)
  ctx.lineTo(MAP_WIDTH - 160 + sway * 0.6, MAP_HEIGHT - 90)
  ctx.lineTo(MAP_WIDTH - 260 + sway * 0.3, MAP_HEIGHT - 30)
  ctx.lineTo(MAP_WIDTH - 80 + sway * 0.2, MAP_HEIGHT)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

const drawReticle = (ctx: CanvasRenderingContext2D) => {
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(MAP_WIDTH / 2, HORIZON + 120, 14, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(MAP_WIDTH / 2 - 20, HORIZON + 120)
  ctx.lineTo(MAP_WIDTH / 2 + 20, HORIZON + 120)
  ctx.moveTo(MAP_WIDTH / 2, HORIZON + 120 - 20)
  ctx.lineTo(MAP_WIDTH / 2, HORIZON + 120 + 20)
  ctx.stroke()
  ctx.restore()
}

const drawBeacon = (
  ctx: CanvasRenderingContext2D,
  projected: ReturnType<typeof projectPoint>,
  color: string,
  pulse: number,
) => {
  if (!projected) return
  ctx.save()
  const height = 220 * projected.scale
  const width = 20 * projected.scale
  const gradient = ctx.createLinearGradient(
    projected.x,
    projected.y - height,
    projected.x,
    projected.y,
  )
  gradient.addColorStop(0, `${color}00`)
  gradient.addColorStop(0.3, `${color}30`)
  gradient.addColorStop(0.8, `${color}80`)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.ellipse(projected.x, projected.y - height / 2, width, height, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(projected.x, projected.y, 18 * projected.scale + pulse * 6, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

const drawSuit = (
  ctx: CanvasRenderingContext2D,
  projected: ReturnType<typeof projectPoint>,
  stunned: boolean,
  variant: 'shore' | 'water',
) => {
  if (!projected) return
  const tone = stunned
    ? 'rgba(255,255,255,0.6)'
    : variant === 'shore'
      ? 'rgba(10,10,10,0.85)'
      : 'rgba(4,45,99,0.85)'
  const height = 120 * projected.scale
  const width = 32 * projected.scale
  ctx.save()
  ctx.translate(projected.x, projected.y)
  ctx.fillStyle = tone
  ctx.fillRect(-width / 2, -height, width, height)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(-width / 2, -height, width, height * 0.25)
  ctx.beginPath()
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.arc(0, -height, width * 0.45, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawPoliceMarker = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
) => {
  const projected = projectPoint(state, state.policeZone.position)
  if (!projected) return
  ctx.save()
  ctx.strokeStyle = 'rgba(173, 216, 230, 0.9)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(projected.x, projected.y, 40 * projected.scale, 0, Math.PI * 2)
  ctx.stroke()
  ctx.font = `bold ${12 + projected.scale * 6}px "Assistant", sans-serif`
  ctx.fillStyle = 'rgba(200,230,255,0.95)'
  ctx.textAlign = 'center'
  ctx.fillText('תחנת המשטרה', projected.x, projected.y - 10 * projected.scale)
  ctx.restore()
}

const drawPulseEchoes = (
  ctx: CanvasRenderingContext2D,
  state: GameState,
) => {
  ctx.save()
  ctx.strokeStyle = 'rgba(0,255,255,0.2)'
  state.pulses.forEach((pulse) => {
    const projected = projectPoint(state, pulse.position)
    if (!projected) return
    ctx.lineWidth = pulse.type === 'scan' ? 1.4 : 0.8
    ctx.beginPath()
    ctx.arc(projected.x, projected.y, (pulse.radius / 5) * projected.scale, 0, Math.PI * 2)
    ctx.stroke()
  })
  ctx.restore()
}

const drawStructures = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.structures.forEach((structure) => {
    const projected = projectPoint(state, structure.position)
    if (!projected) return
    ctx.save()
    ctx.translate(projected.x, projected.y)
    const width = structure.size * projected.scale
    const height = structure.height * projected.scale
    switch (structure.kind) {
      case 'rock':
        ctx.fillStyle = 'rgba(70, 65, 60, 0.9)'
        ctx.beginPath()
        ctx.moveTo(-width * 0.6, -height)
        ctx.lineTo(-width * 0.2, -height * 1.2)
        ctx.lineTo(width * 0.4, -height * 0.8)
        ctx.lineTo(width * 0.7, -height * 0.1)
        ctx.closePath()
        ctx.fill()
        break
      case 'lifeguard':
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillRect(-width / 2, -height, width, height * 0.6)
        ctx.fillStyle = '#f87171'
        ctx.fillRect(-width / 2, -height, width, height * 0.1)
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-width / 2, -height * 0.4)
        ctx.lineTo(-width / 2, 0)
        ctx.moveTo(width / 2, -height * 0.4)
        ctx.lineTo(width / 2, 0)
        ctx.stroke()
        break
      case 'flag':
        ctx.strokeStyle = '#facc15'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(0, -height)
        ctx.lineTo(0, 0)
        ctx.stroke()
        ctx.fillStyle = 'rgba(248, 113, 113, 0.9)'
        ctx.beginPath()
        ctx.moveTo(0, -height)
        ctx.lineTo(width, -height + 18 * projected.scale)
        ctx.lineTo(0, -height + 32 * projected.scale)
        ctx.closePath()
        ctx.fill()
        break
      case 'buoy':
        ctx.fillStyle = 'rgba(99, 179, 237, 0.9)'
        ctx.beginPath()
        ctx.arc(0, -height * 0.4, width * 0.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(-width * 0.2, -height, width * 0.4, height * 0.6)
        break
      case 'driftwood':
        ctx.fillStyle = 'rgba(145, 96, 56, 0.85)'
        ctx.rotate(0.2)
        ctx.fillRect(-width / 2, -height * 0.2, width, height * 0.4)
        break
      default:
        break
    }
    ctx.restore()
  })
}

export const GameCanvas = ({ state }: { state: GameState }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

    drawBackground(ctx, state)
    drawPulseEchoes(ctx, state)
    drawPoliceMarker(ctx, state)

    const beaconColor = state.device.retrieved ? 'rgba(50,255,153,0.9)' : 'rgba(255,255,255,0.85)'
    drawBeacon(
      ctx,
      projectPoint(state, state.device.position),
      beaconColor,
      state.device.located ? 1 : 0.3,
    )

    drawStructures(ctx, state)

    state.suits.forEach((suit) => {
      drawSuit(
        ctx,
        projectPoint(state, suit.position),
        suit.stunnedMs > 0,
        suit.variant,
      )
    })

    drawHands(ctx, state.player.carryingDevice, state.player.sway)
    drawReticle(ctx)
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

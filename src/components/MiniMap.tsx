import type { GameState } from '../game/types'
import { MAP_HEIGHT, MAP_WIDTH, WATER_LINE, CLIFF_LINE } from '../game/constants'

const MAP_SIZE = 220
const scaleX = MAP_SIZE / MAP_WIDTH
const scaleY = MAP_SIZE / MAP_HEIGHT

const project = (x: number, y: number) => ({
  x: x * scaleX,
  y: y * scaleY,
})

export const MiniMap = ({ state }: { state: GameState }) => {
  const player = project(state.player.position.x, state.player.position.y)
  const headingDeg = (state.player.heading * 180) / Math.PI

  return (
    <svg className="mini-map" viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`} role="img">
      <title>מבט על החוף</title>
      <defs>
        <linearGradient id="seaGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#003b60" />
          <stop offset="100%" stopColor="#0f6288" />
        </linearGradient>
      </defs>
      <rect width={MAP_SIZE} height={MAP_SIZE} fill="#3b250f" rx="12" />
      <rect
        width={MAP_SIZE}
        height={(WATER_LINE / MAP_HEIGHT) * MAP_SIZE}
        fill="url(#seaGradient)"
      />
      <rect
        y={(CLIFF_LINE / MAP_HEIGHT) * MAP_SIZE}
        width={MAP_SIZE}
        height={12}
        fill="#f9e0a4"
        opacity={0.6}
      />

      {/* Device */}
      <circle
        cx={project(state.device.position.x, state.device.position.y).x}
        cy={project(state.device.position.x, state.device.position.y).y}
        r={state.device.located ? 6 : 4}
        fill={state.device.retrieved ? '#1efc1e' : '#facc15'}
        opacity={state.device.located ? 0.9 : 0.5}
      />

      {/* Police zone */}
      <circle
        cx={project(state.policeZone.position.x, state.policeZone.position.y).x}
        cy={project(state.policeZone.position.x, state.policeZone.position.y).y}
        r={state.policeZone.radius * scaleX}
        fill="none"
        stroke="#c6e9ff"
        strokeDasharray="4 4"
      />

      {/* Suits */}
      {state.suits.map((suit) => {
        const pos = project(suit.position.x, suit.position.y)
        return (
          <circle
            key={suit.id}
            cx={pos.x}
            cy={pos.y}
            r={suit.variant === 'shore' ? 4 : 5}
            fill={suit.stunnedMs > 0 ? '#f8fafc' : '#111'}
            opacity={0.85}
          />
        )
      })}

      {/* Structures */}
      {state.structures.map((structure) => {
        const pos = project(structure.position.x, structure.position.y)
        const colorMap: Record<string, string> = {
          rock: '#6b7280',
          lifeguard: '#f87171',
          flag: '#facc15',
          buoy: '#22d3ee',
          driftwood: '#a16207',
        }
        return (
          <rect
            key={`structure-${structure.id}`}
            x={pos.x - 2}
            y={pos.y - 2}
            width={4}
            height={4}
            fill={colorMap[structure.kind] ?? '#94a3b8'}
          />
        )
      })}

      {/* Player */}
      <g transform={`translate(${player.x}, ${player.y}) rotate(${headingDeg})`}>
        <polygon points="0,-8 6,8 -6,8" fill="#00f9ff" />
      </g>

      <text
        x={MAP_SIZE - 10}
        y={MAP_SIZE - 8}
        textAnchor="end"
        fill="#fff"
        fontSize="10"
      >
        סקירה
      </text>
    </svg>
  )
}

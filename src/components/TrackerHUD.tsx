import { useMemo } from 'react'

interface TrackerProps {
  distance: number
  bearingDeg: number
  located: boolean
  retrieved: boolean
  signal: number
  threat: number
  tide: number
  weatherLabel: string
  sectorLabel?: string
}

const headingLabel = (deg: number) => {
  const normalized = ((deg % 360) + 360) % 360
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(normalized / 45) % labels.length
  return labels[index]
}

export const TrackerHUD = ({
  distance,
  bearingDeg,
  located,
  retrieved,
  signal,
  threat,
  tide,
  weatherLabel,
  sectorLabel,
}: TrackerProps) => {
  const directionName = headingLabel(bearingDeg)
  const status = retrieved
    ? 'ברשותך'
    : located
      ? 'נעול'
      : 'מחפש...'

  const progress = useMemo(() => Math.min(1, Math.max(0, signal)), [signal])
  const threatPerc = Math.min(100, Math.round(threat * 100))

  return (
    <div className="tracker-overlay">
      <div className="compass">
        <div className="compass-ring">
          <div
            className="bearing-arrow"
            style={{ transform: `rotate(${bearingDeg}deg)` }}
          >
            <span />
          </div>
          <div className="bearing-label">
            {directionName} • {Math.abs(Math.round(bearingDeg))}°
          </div>
        </div>
        <div className="tracker-status">
          <span>{status}</span>
          <strong>{(distance / 10).toFixed(1)} מ׳</strong>
          <small>{weatherLabel}{sectorLabel ? ` • ${sectorLabel}` : ''}</small>
        </div>
      </div>

      <div className="tracker-bars">
        <div className="bar meter">
          <label>אות</label>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <div className="bar meter threat">
          <label>איום חליפות</label>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${threatPerc}%` }} />
          </div>
        </div>

        <div className="bar meter tide">
          <label>גל (Tide)</label>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${tide * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

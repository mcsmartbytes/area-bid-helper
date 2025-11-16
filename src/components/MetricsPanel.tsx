"use client"
import { useAppStore } from '@/lib/store'
import { formatArea, formatLength } from '@/lib/format'

export default function MetricsPanel() {
  const { measurements, unitSystem } = useAppStore((s) => ({
    measurements: s.measurements,
    unitSystem: s.unitSystem,
  }))

  const area = measurements.area
  const length = measurements.length

  const tokenMissing = typeof window !== 'undefined' && !localStorage.getItem('MAPBOX_TOKEN') && !process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  return (
    <div className="glass metrics">
      {area != null && (
        <div className="metric-line">
          <span className="metric-label">Area</span>
          <span className="metric-value">{formatArea(area, unitSystem)}</span>
        </div>
      )}
      {length != null && (
        <div className="metric-line">
          <span className="metric-label">Length</span>
          <span className="metric-value">{formatLength(length, unitSystem)}</span>
        </div>
      )}
      {!area && !length && <div className="metric-line"><span className="metric-label">Tip</span><span>Draw an area or line</span></div>}
      {tokenMissing && (
        <div className="token-warning">No Mapbox token detected. Add <code>?token=YOUR_TOKEN</code> to the URL or set <code>localStorage.MAPBOX_TOKEN</code>.</div>
      )}
    </div>
  )
}


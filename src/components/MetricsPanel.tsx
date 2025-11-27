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

  const copySummary = async () => {
    const parts: string[] = []
    if (area != null) parts.push(`Area: ${formatArea(area, unitSystem)}`)
    if (length != null) parts.push(`Length: ${formatLength(length, unitSystem)}`)
    const text = parts.join(' | ') || 'No measurements'
    try { await navigator.clipboard.writeText(text) } catch {}
  }

  return (
    <div className="glass metrics">
      <div className="metrics-head">
        <div className="metrics-title">Measurements</div>
        <button className="btn btn-quiet" onClick={copySummary} title="Copy summary">⧉ Copy</button>
      </div>
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
      {area == null && length == null && (
        <div className="metric-line"><span className="metric-label">Tip</span><span>Draw an area or line</span></div>
      )}
      <div className="metric-foot">Units: {unitSystem === 'metric' ? 'Metric' : 'Imperial'}</div>
      {tokenMissing && (
        <div className="token-warning">No Mapbox token detected. Add <code>?token=YOUR_TOKEN</code> to the URL or set <code>localStorage.MAPBOX_TOKEN</code>.</div>
      )}
    </div>
  )
}

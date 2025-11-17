"use client"
import { useAppStore } from '@/lib/store'

export default function Toolbar() {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  const unitSystem = useAppStore((s) => s.unitSystem)
  const toggleUnits = useAppStore((s) => s.toggleUnits)
  const requestClear = useAppStore((s) => s.requestClear)
  const styleId = useAppStore((s) => s.styleId)
  const setStyleId = useAppStore((s) => s.setStyleId)
  const smoothing = useAppStore((s) => s.smoothing)
  const setSmoothing = useAppStore((s) => s.setSmoothing)

  return (
    <div className="glass toolbar">
      <button className={"btn" + (mode === 'pan' ? ' active' : '')} onClick={() => setMode('pan')} title="Pan/Select (V)">🖱 Pan</button>
      <button className={"btn" + (mode === 'polygon' ? ' active' : '')} onClick={() => setMode('polygon')} title="Draw area (A)">⬠ Area</button>
      <button className={"btn" + (mode === 'line' ? ' active' : '')} onClick={() => setMode('line')} title="Measure length (L)">／ Length</button>
      <button className={"btn" + (mode === 'freehand' ? ' active' : '')} onClick={() => setMode('freehand')} title="Freehand area (Shift while Area)">✎ Freehand</button>
      <button className="btn" onClick={requestClear} title="Clear all">✕ Clear</button>
      <button className="btn" onClick={toggleUnits} title="Toggle units">
        Units: {unitSystem === 'metric' ? 'Metric' : 'Imperial'}
      </button>
      <span className="btn" title="Map style">
        Style:
        <select
          value={styleId}
          onChange={(e) => setStyleId(e.target.value as any)}
          style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none' }}
        >
          <option value="mapbox://styles/mapbox/streets-v12">Streets</option>
          <option value="mapbox://styles/mapbox/outdoors-v12">Outdoors</option>
          <option value="mapbox://styles/mapbox/satellite-streets-v12">Satellite</option>
          <option value="mapbox://styles/mapbox/light-v11">Light</option>
          <option value="mapbox://styles/mapbox/dark-v11">Dark</option>
        </select>
      </span>
      <span className="btn" title="Freehand smoothing">
        Smoothing
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={smoothing}
          onChange={(e) => setSmoothing(Number(e.target.value))}
          style={{ width: 90 }}
        />
      </span>
      <span className="btn" style={{ cursor: 'default' }}>
        <span className="brand">Area Bid Pro</span>
      </span>
    </div>
  )
}

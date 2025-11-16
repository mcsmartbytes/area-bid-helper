"use client"
import { useAppStore } from '@/lib/store'

export default function Toolbar() {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  const unitSystem = useAppStore((s) => s.unitSystem)
  const toggleUnits = useAppStore((s) => s.toggleUnits)
  const requestClear = useAppStore((s) => s.requestClear)

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
      <span className="btn" style={{ cursor: 'default' }}>
        <span className="brand">Area Bid Pro</span>
      </span>
    </div>
  )
}

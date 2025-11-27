"use client"
import { useRef, useState } from 'react'
import { useAppStore } from '@/lib/store'

export default function Toolbar() {
  const [showHelp, setShowHelp] = useState(false)
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  const unitSystem = useAppStore((s) => s.unitSystem)
  const toggleUnits = useAppStore((s) => s.toggleUnits)
  const requestClear = useAppStore((s) => s.requestClear)
  const styleId = useAppStore((s) => s.styleId)
  const setStyleId = useAppStore((s) => s.setStyleId)
  const smoothing = useAppStore((s) => s.smoothing)
  const setSmoothing = useAppStore((s) => s.setSmoothing)
  const requestCommand = useAppStore((s) => s.requestCommand)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="glass toolbar">
      <div className="segmented" role="group" aria-label="Drawing modes">
        <button className={"btn" + (mode === 'freehand' ? ' active' : '')} onClick={() => setMode('freehand')} title="Freehand (F)">✎ Freehand</button>
        <button className={"btn" + (mode === 'polygon' ? ' active' : '')} onClick={() => setMode('polygon')} title="Polygon (A)">⬠ Polygon</button>
        <button className={"btn" + (mode === 'line' ? ' active' : '')} onClick={() => setMode('line')} title="Length (L)">／ Length</button>
        <button className={"btn" + (mode === 'pan' ? ' active' : '')} onClick={() => setMode('pan')} title="Pan/Select (V)">🖱 Pan</button>
      </div>
      <button className="btn" onClick={() => requestCommand('draw:rectangle')} title="Rectangle (R)">▭ Rectangle</button>
      <button className="btn" onClick={() => requestCommand('draw:circle')} title="Circle (O)">◯ Circle</button>
      <button className="btn" onClick={() => requestCommand('view:reset')} title="Reset view">⟲ Reset</button>
      <button className="btn" onClick={requestClear} title="Clear all (C)">✕ Clear</button>
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
          <option value="auto">Auto (System)</option>
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
      <span className="btn" title="Export">
        Export
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            requestCommand(v)
            e.currentTarget.value = ''
          }}
          style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none' }}
        >
          <option value="">Choose…</option>
          <option value="export:png">PNG Snapshot (P)</option>
          <option value="export:json">GeoJSON (J)</option>
          <option value="export:csv">CSV Report (K)</option>
        </select>
      </span>
      <button
        className="btn"
        title="Import GeoJSON"
        onClick={() => fileInputRef.current?.click()}
      >
        ⤒ Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.geojson,application/geo+json,application/json"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.currentTarget.files?.[0]
          if (!f) return
          try {
            const txt = await f.text()
            requestCommand('import:json', txt)
          } catch {}
          e.currentTarget.value = ''
        }}
      />
      <button className="btn" onClick={() => setShowHelp((v: boolean) => !v)} title="Help">❓ Help</button>
      <span className="btn" style={{ cursor: 'default' }}>
        <span className="brand">Area Bid Pro</span>
      </span>
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="glass modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Quick Tips</div>
            <div className="modal-content">
              - Freehand (F): drag to draw; release to finish.<br/>
              - Polygon (A): click vertices; double-click to finish.<br/>
              - Length (L): measure linear distance.<br/>
              - Pan (V): select/move shapes.<br/>
              - Rectangle (R) and Circle (O) tools available.<br/>
              - Clear (C), Toggle Units (U). Export: PNG (P), GeoJSON (J), CSV (K).<br/>
              - Style: use Auto to follow system light/dark.<br/>
              - Reset view to go back to start.
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowHelp(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

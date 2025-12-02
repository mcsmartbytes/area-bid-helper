"use client"
import { useRef, useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { readToken } from '@/lib/token'
import { useMounted } from '@/lib/useMounted'
import { integrationAPI } from '@/lib/integration'

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
  const mounted = useMounted()
  const mapEnabled = useAppStore((s) => s.mapEnabled)
  const setMapEnabled = useAppStore((s) => s.setMapEnabled)
  const notes = useAppStore((s) => s.notes)
  const setNotes = useAppStore((s) => s.setNotes)
  const [showMapSettings, setShowMapSettings] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [isEmbedded, setIsEmbedded] = useState(false)
  const [context, setContext] = useState<{ customerName?: string; jobName?: string }>({})

  useEffect(() => {
    if (integrationAPI) {
      setIsEmbedded(integrationAPI.isEmbedded())
      setContext(integrationAPI.getContext())

      // Listen for context updates from parent
      const unsubscribe = integrationAPI.on('PARENT_SET_CONTEXT', (data) => {
        setContext(data)
      })
      return unsubscribe
    }
  }, [])

  return (
    <div className="glass toolbar">
      <div className="segmented" role="group" aria-label="Drawing modes">
        <button className={"btn" + (mode === 'freehand' ? ' active' : '')} onClick={() => setMode('freehand')} title="Freehand (F)">✎ Freehand</button>
        <button className={"btn" + (mode === 'polygon' ? ' active' : '')} onClick={() => setMode('polygon')} title="Polygon (A)">⬠ Polygon</button>
        <button className={"btn" + (mode === 'line' ? ' active' : '')} onClick={() => setMode('line')} title="Length (L)">／ Length</button>
        <button className={"btn" + (mode === 'text' ? ' active' : '')} onClick={() => setMode('text')} title="Text Label (T)">T Text</button>
        <button className={"btn" + (mode === 'height' ? ' active' : '')} onClick={() => setMode('height')} title="Height (H)">↕ Height</button>
        <button className={"btn" + (mode === 'pan' ? ' active' : '')} onClick={() => setMode('pan')} title="Pan/Select (V)">🖱 Pan</button>
      </div>
      <button className="btn" onClick={() => requestCommand('draw:rectangle')} title="Rectangle (R)">▭ Rectangle</button>
      <button className="btn" onClick={() => requestCommand('draw:circle')} title="Circle (O)">◯ Circle</button>
      <button className="btn" onClick={() => requestCommand('view:reset')} title="Reset view">⟲ Reset</button>
      <button className="btn" onClick={requestClear} title="Clear all (C)">✕ Clear</button>
      <button className="btn" onClick={toggleUnits} title="Toggle units" suppressHydrationWarning>
        Units: {mounted ? (unitSystem === 'metric' ? 'Metric' : 'Imperial') : '…'}
      </button>
      <span className="btn btn-dropdown" title="Map style">
        <label htmlFor="style-select" style={{ cursor: 'pointer' }}>Style:</label>
        {mounted && (
          <select
            id="style-select"
            name="map-style"
            value={styleId}
            onChange={(e) => setStyleId(e.target.value as any)}
            style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', cursor: 'pointer' }}
          >
            <option value="auto">Auto</option>
            <option value="mapbox://styles/mapbox/streets-v12">Streets</option>
            <option value="mapbox://styles/mapbox/outdoors-v12">Outdoors</option>
            <option value="mapbox://styles/mapbox/satellite-streets-v12">Satellite</option>
            <option value="mapbox://styles/mapbox/light-v11">Light</option>
            <option value="mapbox://styles/mapbox/dark-v11">Dark</option>
          </select>
        )}
      </span>
      <span className="btn btn-slider" title="Freehand smoothing">
        <label htmlFor="smoothing-range" style={{ cursor: 'pointer' }}>Smooth:</label>
        {mounted && (
          <input
            id="smoothing-range"
            name="smoothing"
            type="range"
            min={0}
            max={10}
            step={1}
            value={smoothing}
            onChange={(e) => setSmoothing(Number(e.target.value))}
          />
        )}
      </span>
      <span className="btn btn-dropdown" title="Export">
        <label htmlFor="export-select" style={{ cursor: 'pointer' }}>Export</label>
        <select
          id="export-select"
          name="export-format"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            requestCommand(v)
            e.currentTarget.value = ''
          }}
          style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', cursor: 'pointer' }}
        >
          <option value="">Choose…</option>
          {isEmbedded && <option value="export:quote">📤 Send to Quote</option>}
          <option value="export:png">PNG Snapshot (P)</option>
          <option value="export:json">GeoJSON (J)</option>
          <option value="export:csv">CSV Report (K)</option>
          <option value="export:iif">QuickBooks IIF (Q)</option>
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
        id="import-file"
        name="import-file"
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
      <button className="btn" onClick={() => setShowHelp((v: boolean) => !v)} title="Help">❓</button>
      <button className="btn" onClick={() => setShowNotes(true)} title="Site Notes">📝</button>
      <button className="btn" onClick={() => setShowMapSettings(true)} title="Settings">⚙️</button>
      <span className="btn brand-btn" style={{ cursor: 'default' }}>
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
              - Text (T): click to add text labels.<br/>
              - Height (H): click to add height measurements.<br/>
              - Pan (V): select/move shapes.<br/>
              - Rectangle (R) and Circle (O) tools available.<br/>
              - Clear (C), Toggle Units (U).<br/>
              - Export: PNG (P), GeoJSON (J), CSV (K), QuickBooks IIF (Q).<br/>
              - Style: use Auto to follow system light/dark.<br/>
              - Reset view to go back to start.<br/>
              - When embedded: "Send to Quote" sends data to parent website.
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowHelp(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showMapSettings && (
        <div className="modal-overlay" onClick={() => setShowMapSettings(false)}>
          <div className="glass modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Map Settings</div>
            <div className="modal-content" style={{ display: 'grid', gap: 10 }}>
              <div>
                <strong>Status:</strong> {mapEnabled ? 'Enabled' : 'Disabled'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!mapEnabled ? (
                  <button className="btn" onClick={() => setMapEnabled(true)}>Enable Map</button>
                ) : (
                  <button className="btn" onClick={() => setMapEnabled(false)}>Disable Map</button>
                )}
                <button className="btn" onClick={() => requestCommand('view:reset')}>Reset View</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Token source: {readToken().source || 'none'}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label htmlFor="modal-token-input">Token</label>
                <input
                  id="modal-token-input"
                  name="modal-token-input"
                  type="text"
                  placeholder="pk.eyJ..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                />
                <button className="btn" onClick={() => { try { localStorage.setItem('MAPBOX_TOKEN', tokenInput.trim()) } catch {}; setMapEnabled(false); setTimeout(() => setMapEnabled(true), 0) }}>Save</button>
                <button className="btn" onClick={() => { try { localStorage.removeItem('MAPBOX_TOKEN') } catch {}; setMapEnabled(false) }}>Clear</button>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowMapSettings(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showNotes && (
        <div className="modal-overlay" onClick={() => setShowNotes(false)} style={{ alignItems: 'flex-start', paddingTop: 60 }}>
          <div className="glass modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ maxHeight: 'calc(100vh - 120px)', overflow: 'auto' }}>
            <div className="modal-title">Site Notes</div>
            <div className="modal-content">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this site..."
                style={{
                  width: '100%',
                  height: 150,
                  maxHeight: '40vh',
                  padding: '8px',
                  borderRadius: 8,
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(0,0,0,0.2)',
                  color: 'inherit',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  resize: 'vertical'
                }}
              />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowNotes(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

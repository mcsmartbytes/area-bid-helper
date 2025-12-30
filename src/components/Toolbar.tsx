"use client"
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { usePricingStore } from '@/lib/pricing-store'
import { readToken } from '@/lib/token'
import { useMounted } from '@/lib/useMounted'
import { integrationAPI } from '@/lib/integration'
import PhotoMeasureModal from '@/components/PhotoMeasureModal'
import BidBuilder from '@/components/BidBuilder'
import PricingConfigModal from '@/components/PricingConfigModal'

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
  const enable3D = useAppStore((s) => s.enable3D)
  const setEnable3D = useAppStore((s) => s.setEnable3D)
  const [showMapSettings, setShowMapSettings] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [showPhotoMeasure, setShowPhotoMeasure] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [isEmbedded, setIsEmbedded] = useState(false)
  const [context, setContext] = useState<{ customerName?: string; jobName?: string }>({})
  const [showBidBuilder, setShowBidBuilder] = useState(false)
  const [showPricingConfig, setShowPricingConfig] = useState(false)

  // Pricing store
  const createNewBid = usePricingStore((s) => s.createNewBid)
  const currentBid = usePricingStore((s) => s.currentBid)
  const hydratePricing = usePricingStore((s) => s.hydrate)
  const pricingHydrated = usePricingStore((s) => s.hydrated)

  // Hydrate pricing store on mount
  useEffect(() => {
    if (!pricingHydrated) {
      hydratePricing()
    }
  }, [pricingHydrated, hydratePricing])

  useEffect(() => {
    if (integrationAPI) {
      setIsEmbedded(integrationAPI.isEmbedded())
      setContext(integrationAPI.getContext())
      const unsubscribe = integrationAPI.on('PARENT_SET_CONTEXT', (data) => {
        setContext(data)
      })
      return unsubscribe
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 900px)')
    const update = () => setIsCompact(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!isCompact) setMobileMenuOpen(false)
  }, [isCompact])

  const closeMobileMenu = () => setMobileMenuOpen(false)
  const openMapSettingsModal = () => {
    setShowMapSettings(true)
    if (isCompact) closeMobileMenu()
  }
  const openNotesModal = () => {
    setShowNotes(true)
    if (isCompact) closeMobileMenu()
  }
  const openPhotoMeasure = () => {
    setShowPhotoMeasure(true)
    if (isCompact) closeMobileMenu()
  }
  const openHelpModal = () => {
    setShowHelp(true)
    if (isCompact) closeMobileMenu()
  }

  const openBidBuilder = () => {
    const ctx = integrationAPI ? integrationAPI.getContext() : {}

    createNewBid(undefined, {
      customerName: ctx.customerName,
      jobName: ctx.jobName,
      address: ctx.address,
    })

    setShowBidBuilder(true)
    if (isCompact) closeMobileMenu()
  }

  const openPricingConfig = () => {
    setShowPricingConfig(true)
    if (isCompact) closeMobileMenu()
  }

  const toolbarControls = (
    <>
      <div className="segmented" role="group" aria-label="Drawing modes">
        <button className={'btn' + (mode === 'freehand' ? ' active' : '')} onClick={() => setMode('freehand')} title="Freehand (F)">✎ Freehand</button>
        <button className={'btn' + (mode === 'polygon' ? ' active' : '')} onClick={() => setMode('polygon')} title="Polygon (A)">⬠ Polygon</button>
        <button className={'btn' + (mode === 'line' ? ' active' : '')} onClick={() => setMode('line')} title="Length (L)">／ Length</button>
        <button className={'btn' + (mode === 'text' ? ' active' : '')} onClick={() => setMode('text')} title="Text Label (T)">T Text</button>
        <button className={'btn' + (mode === 'height' ? ' active' : '')} onClick={() => setMode('height')} title="Height (H)">↕ Height</button>
        <button className={'btn' + (mode === 'pan' ? ' active' : '')} onClick={() => setMode('pan')} title="Pan/Select (V)">🖱 Pan</button>
      </div>
      <button className="btn" onClick={() => requestCommand('draw:rectangle')} title="Rectangle (R)">▭ Rectangle</button>
      <button className="btn" onClick={() => requestCommand('draw:circle')} title="Circle (O)">◯ Circle</button>
      <button className="btn" onClick={() => requestCommand('view:reset')} title="Reset view">⟲ Reset</button>
      <button className={'btn' + (enable3D ? ' active' : '')} onClick={() => setEnable3D(!enable3D)} title="Toggle 3D buildings">⬒ 3D</button>
      <button className="btn" onClick={() => requestCommand('view:streetview')} title="Street View helper">📷 Street</button>
      <button className="btn" onClick={requestClear} title="Clear all (C)">✕ Clear</button>
      <button className="btn" onClick={openMapSettingsModal} title="Map settings">🗺 Map</button>
      <button className="btn btn-photo-measure" onClick={openPhotoMeasure} title="Photo Measure Pro - measure on photos">📐 Photo Measure</button>
      <button className="btn btn-build-quote" onClick={openBidBuilder} title="Build Quote - production-aware pricing (B)">💰 Build Quote</button>
      <button className="btn" onClick={openPricingConfig} title="Configure pricing rates">⚙ Pricing</button>
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
          const input = e.currentTarget
          const f = input.files?.[0]
          if (!f) return
          try {
            const txt = await f.text()
            requestCommand('import:json', txt)
          } catch {}
          if (input) input.value = ''
        }}
      />
      <button className="btn" onClick={openHelpModal} title="Help">❓ Help</button>
      <button className="btn" onClick={openNotesModal} title="Site Notes">📝 Notes</button>
      <span className="btn" style={{ cursor: 'default' }}>
        <span className="brand">Area Bid Pro</span>
      </span>
    </>
  )

  return (
    <div className="toolbar-wrapper">
      <div className="glass toolbar">
        {!isCompact ? (
          <div className="toolbar-content">{toolbarControls}</div>
        ) : (
          <div className="toolbar-mobile-shell">
            <button className="btn" onClick={() => setMobileMenuOpen(true)} title="Open tools menu (M)">☰ Menu</button>
            <span className="brand">Area Bid Pro</span>
            <button className="btn" onClick={toggleUnits} title="Toggle units" suppressHydrationWarning>
              Units: {mounted ? (unitSystem === 'metric' ? 'Metric' : 'Imperial') : '…'}
            </button>
          </div>
        )}
      </div>
      {isCompact && mobileMenuOpen && (
        <div className="modal-overlay" onClick={closeMobileMenu}>
          <div className="glass modal toolbar-mobile-menu" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="toolbar-content toolbar-stack">
              {toolbarControls}
              {isEmbedded && (
                <div className="btn" style={{ justifyContent: 'center', textAlign: 'center' }}>
                  {context.customerName ? `${context.customerName}${context.jobName ? ` – ${context.jobName}` : ''}` : 'Embedded session'}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={closeMobileMenu}>Close</button>
            </div>
          </div>
        </div>
      )}
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
              - 3D buildings toggle and Street helper live near Reset.<br/>
              - When embedded: &ldquo;Send to Quote&rdquo; sends data to the parent site.
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
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={enable3D}
                  onChange={(e) => setEnable3D(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                Enable 3D buildings and tilt view
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                <span>Street View helper</span>
                <button className="btn" onClick={() => { setShowMapSettings(false); requestCommand('view:streetview') }}>Launch Street View</button>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>After launching, click anywhere on the map to enter Street mode.</span>
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
      {showPhotoMeasure && (
        <PhotoMeasureModal onClose={() => setShowPhotoMeasure(false)} />
      )}
      {showBidBuilder && (
        <BidBuilder onClose={() => setShowBidBuilder(false)} />
      )}
      {showPricingConfig && (
        <PricingConfigModal onClose={() => setShowPricingConfig(false)} />
      )}
    </div>
  )
}

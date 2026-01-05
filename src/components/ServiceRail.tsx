"use client"
import { useState } from 'react'
import { useQuoteStore } from "@/lib/quote/store"
import { useAppStore } from '@/lib/store'

export function ServiceRail() {
  const templates = useQuoteStore(s => s.templates)
  const activeServiceId = useQuoteStore(s => s.activeServiceId)
  const setActiveService = useQuoteStore(s => s.setActiveService)
  const mode = useAppStore(s => s.mode)
  const setMode = useAppStore(s => s.setMode)
  const requestClear = useAppStore(s => s.requestClear)
  const [showHelp, setShowHelp] = useState(false)

  const handleServiceClick = (serviceId: string) => {
    setActiveService(serviceId)
    const template = templates.find(t => t.id === serviceId)
    if (template) {
      // Auto-arm drawing based on measurement type
      if (template.measurementType === "AREA") {
        setMode('polygon')
      } else if (template.measurementType === "LENGTH") {
        setMode('line')
      } else {
        setMode('polygon')
      }
    }
  }

  const areaServices = templates.filter(t => t.measurementType === "AREA")
  const linearServices = templates.filter(t => t.measurementType === "LENGTH")
  const countServices = templates.filter(t => t.measurementType === "COUNT")
  const toolOptions: { id: 'freehand' | 'polygon' | 'line'; label: string; hint: string }[] = [
    { id: 'freehand', label: 'Quick Fill', hint: 'Drag to paint asphalt' },
    { id: 'polygon', label: 'Polygon', hint: 'Click perfect corners' },
    { id: 'line', label: 'Line', hint: 'Measure curbs & crack fill' },
  ]

  return (
    <div className="services-panel">
      <div className="services-panel-header">
        <div className="services-panel-eyebrow">Create Quote</div>
        <h2>Services</h2>
        <p>Pick a service to auto-arm the correct drawing tool. Rates and minimums load instantly.</p>
      </div>

      <div className="tool-selector">
        <div className="tool-selector-header">
          <div>
            <div className="tool-selector-label">Drawing tools</div>
            <div className="tool-selector-hint">Switch anytime if you need more precision.</div>
          </div>
        </div>
        <div className="tool-selector-list">
          {toolOptions.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`tool-selector-button ${mode === tool.id ? 'tool-selector-button-active' : ''}`}
              onClick={() => setMode(tool.id)}
            >
              <span className="tool-selector-name">{tool.label}</span>
              <span className="tool-selector-desc">{tool.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions Row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => {
            if (confirm('Clear all drawings and start over?')) {
              requestClear()
            }
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid rgba(255,100,100,0.3)',
            background: 'rgba(255,100,100,0.1)',
            color: '#ff6b6b',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Clear All
        </button>
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid var(--glass-border)',
            background: 'rgba(255,255,255,0.05)',
            color: 'inherit',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {showHelp ? 'Hide Help' : 'Help & Shortcuts'}
        </button>
      </div>

      {/* Help Dropdown */}
      {showHelp && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 8,
          border: '1px solid var(--glass-border)',
          fontSize: 12,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 10, color: 'var(--accent)' }}>
            Quick Start Guide
          </div>
          <div style={{ marginBottom: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            1. Select a <strong>service</strong> below<br/>
            2. Choose a <strong>drawing tool</strong><br/>
            3. Draw on the map<br/>
            4. Price updates live!
          </div>

          <div style={{ fontWeight: 600, marginBottom: 8 }}>Drawing Tools</div>
          <div style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>Quick Fill</strong> - Paint areas fast</span>
              <span style={{ color: 'var(--muted)' }}>F</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>Polygon</strong> - Click precise corners</span>
              <span style={{ color: 'var(--muted)' }}>A</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>Line</strong> - Measure linear features</span>
              <span style={{ color: 'var(--muted)' }}>L</span>
            </div>
          </div>

          <div style={{ fontWeight: 600, marginBottom: 8 }}>Keyboard Shortcuts</div>
          <div style={{ display: 'grid', gap: 4, fontSize: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Select/Edit mode</span>
              <span style={{ color: 'var(--muted)' }}>V</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Clear all drawings</span>
              <span style={{ color: 'var(--muted)' }}>C</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Toggle units (ft/m)</span>
              <span style={{ color: 'var(--muted)' }}>U</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Draw rectangle</span>
              <span style={{ color: 'var(--muted)' }}>R</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Draw circle</span>
              <span style={{ color: 'var(--muted)' }}>O</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Concrete mode</span>
              <span style={{ color: 'var(--muted)' }}>G</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Stall striping tool</span>
              <span style={{ color: 'var(--muted)' }}>S</span>
            </div>
          </div>

          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--glass-border)' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Imagery Toggle</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              Use the <strong>Standard / High-Res</strong> buttons at the bottom of the map to switch between Mapbox and Google satellite imagery.
            </div>
          </div>
        </div>
      )}

      <div className="services-list">
        {areaServices.length > 0 && (
          <div className="services-group">
            <div className="services-group-label">Area Services ({areaServices.length})</div>
            {areaServices.map(t => (
              <button
                key={t.id}
                className={`service-button ${activeServiceId === t.id ? 'service-button-selected' : ''}`}
                onClick={() => handleServiceClick(t.id)}
              >
                <span className="service-color-dot service-color-area" />
                <div className="service-button-info">
                  <span className="service-button-name">{t.name}</span>
                  <span className="service-button-rate">
                    ${t.defaultRate.toFixed(2)}/{t.unitLabel}
                    {t.minimumCharge ? ` · $${Math.round(t.minimumCharge).toLocaleString()} min` : ''}
                  </span>
                </div>
                {activeServiceId === t.id && <span className="service-check">✓</span>}
              </button>
            ))}
          </div>
        )}

        {linearServices.length > 0 && (
          <div className="services-group">
            <div className="services-group-label">Linear Services ({linearServices.length})</div>
            {linearServices.map(t => (
              <button
                key={t.id}
                className={`service-button ${activeServiceId === t.id ? 'service-button-selected' : ''}`}
                onClick={() => handleServiceClick(t.id)}
              >
                <span className="service-color-dot service-color-linear" />
                <div className="service-button-info">
                  <span className="service-button-name">{t.name}</span>
                  <span className="service-button-rate">
                    ${t.defaultRate.toFixed(2)}/{t.unitLabel}
                    {t.minimumCharge ? ` · $${Math.round(t.minimumCharge).toLocaleString()} min` : ''}
                  </span>
                </div>
                {activeServiceId === t.id && <span className="service-check">✓</span>}
              </button>
            ))}
          </div>
        )}

        {countServices.length > 0 && (
          <div className="services-group">
            <div className="services-group-label">Per-Unit Services ({countServices.length})</div>
            {countServices.map(t => (
              <button
                key={t.id}
                className={`service-button ${activeServiceId === t.id ? 'service-button-selected' : ''}`}
                onClick={() => handleServiceClick(t.id)}
              >
                <span className="service-color-dot service-color-count" />
                <div className="service-button-info">
                  <span className="service-button-name">{t.name}</span>
                  <span className="service-button-rate">
                    ${t.defaultRate.toFixed(2)}/{t.unitLabel}
                    {t.minimumCharge ? ` · $${Math.round(t.minimumCharge).toLocaleString()} min` : ''}
                  </span>
                </div>
                {activeServiceId === t.id && <span className="service-check">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

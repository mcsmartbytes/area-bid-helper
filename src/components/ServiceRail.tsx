"use client"
import { useQuoteStore } from "@/lib/quote/store"
import { useAppStore } from '@/lib/store'

export function ServiceRail() {
  const templates = useQuoteStore(s => s.templates)
  const activeServiceId = useQuoteStore(s => s.activeServiceId)
  const setActiveService = useQuoteStore(s => s.setActiveService)
  const mode = useAppStore(s => s.mode)
  const setMode = useAppStore(s => s.setMode)

  const handleServiceClick = (serviceId: string) => {
    setActiveService(serviceId)
    const template = templates.find(t => t.id === serviceId)
    if (template) {
      // Auto-arm drawing based on measurement type
      if (template.measurementType === "AREA") {
        setMode('freehand')
      } else if (template.measurementType === "LENGTH") {
        setMode('line')
      }
    }
  }

  const areaServices = templates.filter(t => t.measurementType === "AREA")
  const linearServices = templates.filter(t => t.measurementType === "LENGTH")
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

      <div className="services-list">
        {areaServices.length > 0 && (
          <div className="services-group">
            <div className="services-group-label">Area Services</div>
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
            <div className="services-group-label">Linear Services</div>
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
      </div>
    </div>
  )
}

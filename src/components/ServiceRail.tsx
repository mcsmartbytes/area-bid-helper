"use client"
import { useQuoteStore } from "@/lib/quote/store"
import { useAppStore } from '@/lib/store'

export function ServiceRail() {
  const templates = useQuoteStore(s => s.templates)
  const activeServiceId = useQuoteStore(s => s.activeServiceId)
  const setActiveService = useQuoteStore(s => s.setActiveService)
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

  return (
    <div className="services-panel">
      <div className="services-panel-header">
        <span className="services-panel-step">1</span>
        <span className="services-panel-title">Select Service</span>
      </div>
      {templates.length === 0 && (
        <div className="services-panel-hint">
          Select a service, then draw on the map
        </div>
      )}

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

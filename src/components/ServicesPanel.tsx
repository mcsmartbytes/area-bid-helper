"use client"
import { usePricingStore } from '@/lib/pricing-store'
import { useAppStore } from '@/lib/store'
import type { ServiceType, PricingConfig } from '@/lib/pricing-types'

interface ServicesPanelProps {
  onServiceSelect?: (service: ServiceType) => void
}

// Calculate effective rate per unit for a service
function calculateEffectiveRate(service: ServiceType, config: PricingConfig): number {
  const laborCostPerUnit = (service.defaultHourlyRate * service.defaultCrewSize * config.laborBurdenRate) / service.productionRate
  const materialCostPerUnit = (service.materialCostPerUnit || 0) * (service.materialWasteFactor || 1)
  return laborCostPerUnit + materialCostPerUnit
}

export default function ServicesPanel({ onServiceSelect }: ServicesPanelProps) {
  const pricingConfigs = usePricingStore((s) => s.pricingConfigs)
  const activePricingConfigId = usePricingStore((s) => s.activePricingConfigId)
  const hydrated = usePricingStore((s) => s.hydrated)
  const setMode = useAppStore((s) => s.setMode)

  const activeConfig = pricingConfigs.find(c => c.id === activePricingConfigId)
  const services = activeConfig?.serviceTypes || []

  // Group services by pricing model for better organization
  const areaServices = services.filter(s => s.pricingModel === 'area')
  const linearServices = services.filter(s => s.pricingModel === 'linear')
  const otherServices = services.filter(s => !['area', 'linear'].includes(s.pricingModel))

  const handleServiceClick = (service: ServiceType) => {
    // Set appropriate drawing mode based on service type
    if (service.pricingModel === 'area') {
      setMode('freehand')
    } else if (service.pricingModel === 'linear') {
      setMode('line')
    }
    onServiceSelect?.(service)
  }

  if (!hydrated) {
    return (
      <div className="services-panel">
        <div className="services-panel-header">
          <span className="services-panel-title">Services</span>
        </div>
        <div className="services-loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="services-panel">
      <div className="services-panel-header">
        <span className="services-panel-title">Services</span>
      </div>

      <div className="services-list">
        {areaServices.length > 0 && (
          <div className="services-group">
            <div className="services-group-label">Area Services</div>
            {areaServices.map(service => {
              const rate = activeConfig ? calculateEffectiveRate(service, activeConfig) : 0
              return (
                <button
                  key={service.id}
                  className="service-button"
                  onClick={() => handleServiceClick(service)}
                  style={{ '--service-color': '#7aa2ff' } as React.CSSProperties}
                >
                  <span className="service-color-dot" />
                  <div className="service-button-info">
                    <span className="service-button-name">{service.name}</span>
                    <span className="service-button-rate">
                      ${rate.toFixed(2)}/sq ft
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {linearServices.length > 0 && (
          <div className="services-group">
            <div className="services-group-label">Linear Services</div>
            {linearServices.map(service => {
              const rate = activeConfig ? calculateEffectiveRate(service, activeConfig) : 0
              return (
                <button
                  key={service.id}
                  className="service-button"
                  onClick={() => handleServiceClick(service)}
                  style={{ '--service-color': '#94f0ff' } as React.CSSProperties}
                >
                  <span className="service-color-dot" />
                  <div className="service-button-info">
                    <span className="service-button-name">{service.name}</span>
                    <span className="service-button-rate">
                      ${rate.toFixed(2)}/ft
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {otherServices.length > 0 && (
          <div className="services-group">
            <div className="services-group-label">Other Services</div>
            {otherServices.map(service => {
              const rate = activeConfig ? calculateEffectiveRate(service, activeConfig) : 0
              const unitLabel = service.pricingModel === 'hourly' ? '/hr' : '/ea'
              return (
                <button
                  key={service.id}
                  className="service-button"
                  onClick={() => handleServiceClick(service)}
                  style={{ '--service-color': '#ff9f7a' } as React.CSSProperties}
                >
                  <span className="service-color-dot" />
                  <div className="service-button-info">
                    <span className="service-button-name">{service.name}</span>
                    <span className="service-button-rate">
                      ${rate.toFixed(2)}{unitLabel}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {services.length === 0 && (
          <div className="services-empty">
            No services configured. Click the gear icon to add services.
          </div>
        )}
      </div>
    </div>
  )
}

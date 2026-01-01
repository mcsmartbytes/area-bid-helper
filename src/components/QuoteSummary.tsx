"use client"
import { usePricingStore } from '@/lib/pricing-store'
import { useAppStore } from '@/lib/store'
import { formatArea } from '@/lib/format'

interface QuoteSummaryProps {
  onBuildQuote?: () => void
  onSendQuote?: () => void
}

export default function QuoteSummary({ onBuildQuote, onSendQuote }: QuoteSummaryProps) {
  const currentBid = usePricingStore((s) => s.currentBid)
  const previewBid = usePricingStore((s) => s.previewBid)
  const liveMeasurements = usePricingStore((s) => s.liveMeasurements)
  const committedMeasurements = usePricingStore((s) => s.committedMeasurements)
  const hydrated = usePricingStore((s) => s.hydrated)
  const unitSystem = useAppStore((s) => s.unitSystem)

  // Use preview bid if available, otherwise current bid
  const displayBid = previewBid || currentBid
  const measurements = liveMeasurements || committedMeasurements

  // Calculate live estimate from measurements and active config
  const pricingConfigs = usePricingStore((s) => s.pricingConfigs)
  const activePricingConfigId = usePricingStore((s) => s.activePricingConfigId)
  const activeConfig = pricingConfigs.find(c => c.id === activePricingConfigId)

  // Quick estimate based on measurements
  let quickEstimate = 0
  if (measurements && activeConfig) {
    const primaryAreaService = activeConfig.serviceTypes.find(s => s.pricingModel === 'area')
    const primaryLinearService = activeConfig.serviceTypes.find(s => s.pricingModel === 'linear')

    // Calculate effective rate from production rate and labor cost
    if (primaryAreaService && measurements.totalArea > 0) {
      const laborCostPerUnit = (primaryAreaService.defaultHourlyRate * primaryAreaService.defaultCrewSize * activeConfig.laborBurdenRate) / primaryAreaService.productionRate
      const materialCostPerUnit = (primaryAreaService.materialCostPerUnit || 0) * (primaryAreaService.materialWasteFactor || 1)
      const effectiveRate = laborCostPerUnit + materialCostPerUnit
      quickEstimate += measurements.totalArea * effectiveRate
    }
    if (primaryLinearService && measurements.totalPerimeter > 0) {
      const laborCostPerUnit = (primaryLinearService.defaultHourlyRate * primaryLinearService.defaultCrewSize * activeConfig.laborBurdenRate) / primaryLinearService.productionRate
      const materialCostPerUnit = (primaryLinearService.materialCostPerUnit || 0) * (primaryLinearService.materialWasteFactor || 1)
      const effectiveRate = laborCostPerUnit + materialCostPerUnit
      quickEstimate += measurements.totalPerimeter * effectiveRate
    }
  }

  // Format large number with commas
  const formatPrice = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  if (!hydrated) {
    return (
      <div className="quote-summary">
        <div className="quote-summary-header">
          <span className="quote-summary-step">2</span>
          <span className="quote-summary-title">Your Quote</span>
        </div>
        <div className="quote-loading">Loading...</div>
      </div>
    )
  }

  const totalAmount = displayBid ? displayBid.total : quickEstimate
  const hasDrawings = measurements && (measurements.totalArea > 0 || measurements.totalPerimeter > 0)

  return (
    <div className="quote-summary">
      <div className="quote-summary-header">
        <span className="quote-summary-step">2</span>
        <span className="quote-summary-title">Your Quote</span>
      </div>

      {/* BIG ESTIMATED TOTAL - The hero number */}
      <div className="quote-hero">
        <div className="quote-hero-label">ESTIMATED TOTAL</div>
        <div className="quote-hero-amount">
          ${formatPrice(totalAmount)}
        </div>
        {!hasDrawings && (
          <div className="quote-hero-hint">Draw on the map to see pricing</div>
        )}
      </div>

      {/* Line Items - only show if we have a bid with items */}
      {displayBid && displayBid.lineItems.length > 0 && (
        <div className="quote-line-items">
          {displayBid.lineItems.map(item => (
            <div key={item.id} className="quote-line-item">
              <div className="quote-line-item-name">{item.serviceName}</div>
              <div className="quote-line-item-calc">
                {item.quantity.toLocaleString()} {item.unit} × ${(item.subtotal / item.quantity).toFixed(2)}
              </div>
              <div className="quote-line-item-price">${item.subtotal.toFixed(0)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Simple area display - only if drawing exists */}
      {hasDrawings && !displayBid && (
        <div className="quote-measurements-simple">
          {measurements.totalArea > 0 && (
            <div className="quote-measurement-chip">
              {formatArea(measurements.totalArea / 10.764, unitSystem)}
            </div>
          )}
        </div>
      )}

      {/* Risk Warnings - compact */}
      {displayBid?.riskFlags && displayBid.riskFlags.length > 0 && (
        <div className="quote-risks">
          {displayBid.riskFlags.map((risk, i) => (
            <div key={i} className={`quote-risk ${risk.severity}`}>
              <span className="quote-risk-icon">!</span>
              <span>{risk.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Details toggle - for power users */}
      {hasDrawings && (
        <details className="quote-details">
          <summary>View details</summary>
          <div className="quote-details-content">
            <div className="quote-detail-row">
              <span>Area</span>
              <span>{measurements.totalArea.toLocaleString()} sq ft</span>
            </div>
            <div className="quote-detail-row">
              <span>Perimeter</span>
              <span>{measurements.totalPerimeter.toLocaleString()} ft</span>
            </div>
            <div className="quote-detail-row">
              <span>Shapes</span>
              <span>{measurements.shapes?.length || 0}</span>
            </div>
          </div>
        </details>
      )}
    </div>
  )
}

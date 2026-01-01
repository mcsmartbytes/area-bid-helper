"use client"
import { usePricingStore } from '@/lib/pricing-store'
import { useAppStore } from '@/lib/store'
import { formatArea, formatLength } from '@/lib/format'

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

  if (!hydrated) {
    return (
      <div className="quote-summary">
        <div className="quote-summary-header">
          <span className="quote-summary-title">Quote Summary</span>
        </div>
        <div className="quote-loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="quote-summary">
      <div className="quote-summary-header">
        <span className="quote-summary-title">Quote Summary</span>
      </div>

      {/* Measurements Section */}
      <div className="quote-measurements">
        <div className="quote-measurement-row">
          <span className="quote-measurement-label">Total Area</span>
          <span className="quote-measurement-value">
            {measurements?.totalArea
              ? formatArea(measurements.totalArea / 10.764, unitSystem)
              : '0 sq ft'}
          </span>
        </div>
        <div className="quote-measurement-row">
          <span className="quote-measurement-label">Total Perimeter</span>
          <span className="quote-measurement-value">
            {measurements?.totalPerimeter
              ? formatLength(measurements.totalPerimeter / 3.281, unitSystem)
              : '0 ft'}
          </span>
        </div>
        {measurements?.shapes && measurements.shapes.length > 0 && (
          <div className="quote-measurement-row">
            <span className="quote-measurement-label">Shapes</span>
            <span className="quote-measurement-value">{measurements.shapes.length}</span>
          </div>
        )}
      </div>

      {/* Line Items (if bid exists) */}
      {displayBid && displayBid.lineItems.length > 0 && (
        <div className="quote-line-items">
          <div className="quote-section-label">Line Items</div>
          {displayBid.lineItems.map(item => (
            <div key={item.id} className="quote-line-item">
              <div className="quote-line-item-name">{item.serviceName}</div>
              <div className="quote-line-item-detail">
                {item.quantity.toLocaleString()} {item.unit} @ ${(item.subtotal / item.quantity).toFixed(2)}
              </div>
              <div className="quote-line-item-price">${item.subtotal.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div className="quote-totals">
        {displayBid ? (
          <>
            <div className="quote-total-row">
              <span>Subtotal</span>
              <span>${displayBid.subtotal.toFixed(2)}</span>
            </div>
            {displayBid.marginAmount > 0 && (
              <div className="quote-total-row">
                <span>Margin ({(displayBid.margin * 100).toFixed(0)}%)</span>
                <span>${displayBid.marginAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="quote-total-row quote-grand-total">
              <span>Total</span>
              <span>${displayBid.total.toFixed(2)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="quote-total-row quote-estimate">
              <span>Quick Estimate</span>
              <span>${quickEstimate.toFixed(2)}</span>
            </div>
            <div className="quote-estimate-note">
              Based on primary service rates
            </div>
          </>
        )}
      </div>

      {/* Risk Warnings */}
      {displayBid?.riskFlags && displayBid.riskFlags.length > 0 && (
        <div className="quote-risks">
          {displayBid.riskFlags.map((risk, i) => (
            <div key={i} className={`quote-risk ${risk.severity}`}>
              <span className="quote-risk-icon">{risk.severity === 'error' ? '!' : '!'}</span>
              <span>{risk.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="quote-actions">
        <button className="btn btn-primary quote-action-btn" onClick={onBuildQuote}>
          Build Quote
        </button>
        <button className="btn quote-action-btn" onClick={onSendQuote}>
          Send Quote
        </button>
      </div>
    </div>
  )
}

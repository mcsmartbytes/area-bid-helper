"use client"
import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { usePricingStore } from '@/lib/pricing-store'

export default function CursorTooltip() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)
  const lastUpdateRef = useRef(0)

  const mode = useAppStore((s) => s.mode)
  const liveMeasurements = usePricingStore((s) => s.liveMeasurements)
  const pricingConfigs = usePricingStore((s) => s.pricingConfigs)
  const activePricingConfigId = usePricingStore((s) => s.activePricingConfigId)

  const activeConfig = pricingConfigs.find(c => c.id === activePricingConfigId)

  // Calculate price from measurements
  let price = 0
  let area = 0
  if (liveMeasurements && activeConfig) {
    area = liveMeasurements.totalArea || 0
    const primaryService = activeConfig.serviceTypes.find(s => s.pricingModel === 'area')
    if (primaryService && area > 0) {
      const laborCostPerUnit = (primaryService.defaultHourlyRate * primaryService.defaultCrewSize * activeConfig.laborBurdenRate) / primaryService.productionRate
      const materialCostPerUnit = (primaryService.materialCostPerUnit || 0) * (primaryService.materialWasteFactor || 1)
      price = area * (laborCostPerUnit + materialCostPerUnit)
    }
  }

  // Track mouse position with throttling
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now()
      if (now - lastUpdateRef.current < 16) return // ~60fps throttle
      lastUpdateRef.current = now
      setPosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Show tooltip when in drawing mode and we have measurements
  useEffect(() => {
    const isDrawingMode = mode === 'freehand' || mode === 'polygon' || mode === 'line'
    const hasMeasurements = area > 0
    setVisible(isDrawingMode && hasMeasurements)
  }, [mode, area])

  if (!visible || area === 0) return null

  return (
    <div
      className="cursor-tooltip"
      style={{
        left: position.x + 20,
        top: position.y - 10,
      }}
    >
      <div className="cursor-tooltip-area">
        {area.toLocaleString()} sq ft
      </div>
      <div className="cursor-tooltip-price">
        ${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </div>
    </div>
  )
}

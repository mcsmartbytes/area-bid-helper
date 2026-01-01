"use client"
import { useEffect, useState } from 'react'
import MapView from '@/components/MapView'
import QuoteToolbar from '@/components/QuoteToolbar'
import ServicesPanel from '@/components/ServicesPanel'
import QuoteSummary from '@/components/QuoteSummary'
import CursorTooltip from '@/components/CursorTooltip'
import PrefHydrator from '@/components/PrefHydrator'
import { useMounted } from '@/lib/useMounted'
import ErrorBoundary from '@/components/ErrorBoundary'
import BidBuilder from '@/components/BidBuilder'
import PricingConfigModal from '@/components/PricingConfigModal'
import { usePricingStore } from '@/lib/pricing-store'

export default function Page() {
  const mounted = useMounted()
  const [showBidBuilder, setShowBidBuilder] = useState(false)
  const [showPricingConfig, setShowPricingConfig] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [flags, setFlags] = useState<{ legacy?: boolean }>({})

  const createNewBid = usePricingStore((s) => s.createNewBid)
  const hydratePricing = usePricingStore((s) => s.hydrate)
  const pricingHydrated = usePricingStore((s) => s.hydrated)

  // Hydrate pricing store on mount
  useEffect(() => {
    if (!pricingHydrated) {
      hydratePricing()
    }
  }, [pricingHydrated, hydratePricing])

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      setFlags({
        legacy: url.searchParams.get('legacy') != null,
      })
    } catch {}
  }, [])

  const handleBuildQuote = () => {
    createNewBid()
    setShowBidBuilder(true)
  }

  const handleSendQuote = () => {
    // For now, open bid builder - in future this could send directly
    createNewBid()
    setShowBidBuilder(true)
  }

  if (!mounted) {
    return <div className="quote-layout" />
  }

  // Legacy mode for backwards compatibility
  if (flags.legacy) {
    const Toolbar = require('@/components/Toolbar').default
    const MetricsPanel = require('@/components/MetricsPanel').default
    const StatusBar = require('@/components/StatusBar').default

    return (
      <div className="app-root">
        <PrefHydrator />
        <ErrorBoundary label="MapView">
          <MapView />
        </ErrorBoundary>
        <div className="overlay top-left">
          <ErrorBoundary label="Toolbar">
            <Toolbar />
          </ErrorBoundary>
        </div>
        <div className="overlay bottom-right">
          <ErrorBoundary label="MetricsPanel">
            <MetricsPanel />
          </ErrorBoundary>
        </div>
        <div className="overlay bottom-left">
          <ErrorBoundary label="StatusBar">
            <StatusBar />
          </ErrorBoundary>
        </div>
      </div>
    )
  }

  return (
    <div className="quote-layout">
      <PrefHydrator />

      {/* Header with Toolbar */}
      <div className="quote-layout-header">
        <ErrorBoundary label="QuoteToolbar">
          <QuoteToolbar
            onSettings={() => setShowPricingConfig(true)}
            onSendQuote={handleSendQuote}
            onSaveDraft={() => { /* TODO: implement save draft */ }}
          />
        </ErrorBoundary>
      </div>

      {/* Left Panel - Services */}
      <div className="quote-layout-services">
        <ErrorBoundary label="ServicesPanel">
          <ServicesPanel />
        </ErrorBoundary>
      </div>

      {/* Center - Map */}
      <div className="quote-layout-map">
        <ErrorBoundary label="MapView">
          <MapView />
        </ErrorBoundary>
        <CursorTooltip />
      </div>

      {/* Right Panel - Quote Summary */}
      <div className="quote-layout-summary">
        <ErrorBoundary label="QuoteSummary">
          <QuoteSummary
            onBuildQuote={handleBuildQuote}
            onSendQuote={handleSendQuote}
          />
        </ErrorBoundary>
      </div>

      {/* Modals */}
      {showBidBuilder && (
        <BidBuilder onClose={() => setShowBidBuilder(false)} />
      )}
      {showPricingConfig && (
        <PricingConfigModal onClose={() => setShowPricingConfig(false)} />
      )}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="glass modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Instant Quote - Quick Tips</div>
            <div className="modal-content">
              <strong>Drawing Tools:</strong><br/>
              - Draw (F): Freehand draw areas<br/>
              - Polygon (A): Click vertices, double-click to finish<br/>
              - Line (L): Measure linear distances<br/>
              - Select (V): Select and move shapes<br/><br/>
              <strong>Shapes:</strong><br/>
              - Rectangle (R) and Circle (O) tools<br/><br/>
              <strong>Quick Keys:</strong><br/>
              - C: Clear all drawings<br/>
              - U: Toggle units (Imperial/Metric)<br/><br/>
              <strong>Services Panel:</strong><br/>
              - Click a service to start drawing with that rate<br/>
              - Prices update live as you draw<br/><br/>
              <strong>Quote Summary:</strong><br/>
              - See measurements and estimates in real-time<br/>
              - Click &quot;Build Quote&quot; to finalize
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

"use client"
import { useAppStore } from '@/lib/store'
import { usePricingStore } from '@/lib/pricing-store'
import { ModeToggle } from './ModeToggle'

interface QuoteToolbarProps {
  onSettings?: () => void
  onSendQuote?: () => void
  onSaveDraft?: () => void
}

export default function QuoteToolbar({ onSettings, onSendQuote, onSaveDraft }: QuoteToolbarProps) {
  const liveMeasurements = usePricingStore((s) => s.liveMeasurements)
  const hasDrawings = liveMeasurements && (liveMeasurements.totalArea > 0 || liveMeasurements.totalPerimeter > 0)
  const requestClear = useAppStore((s) => s.requestClear)
  const requestCommand = useAppStore((s) => s.requestCommand)

  return (
    <div className="quote-toolbar">
      {/* Quote Mode Badge */}
      <div className="quote-mode-badge">
        <span className="quote-mode-dot" />
        QUOTE MODE
      </div>

      {/* Mode Toggle - Map vs Photo */}
      <ModeToggle />

      {/* Edit Actions - minimal */}
      <div className="quote-toolbar-group">
        <button
          className="btn btn-tool"
          onClick={() => requestCommand('undo')}
          title="Undo (Ctrl+Z)"
        >
          <span className="tool-icon">↩</span>
        </button>
        <button
          className="btn btn-tool"
          onClick={() => requestCommand('redo')}
          title="Redo (Ctrl+Y)"
        >
          <span className="tool-icon">↪</span>
        </button>
        <button
          className="btn btn-tool"
          onClick={requestClear}
          title="Clear All"
        >
          <span className="tool-icon">✕</span>
        </button>
      </div>

      {/* Spacer */}
      <div className="quote-toolbar-spacer" />

      {/* Settings (gear) */}
      <button
        className="btn btn-tool"
        onClick={onSettings}
        title="Settings"
      >
        <span className="tool-icon">⚙</span>
      </button>

      {/* Primary Actions */}
      <div className="quote-toolbar-actions">
        <button
          className="btn btn-secondary"
          onClick={onSaveDraft}
        >
          Save Draft
        </button>
        <button
          className="btn btn-primary btn-send-quote"
          onClick={onSendQuote}
          disabled={!hasDrawings}
          title={hasDrawings ? 'Send quote to customer' : 'Draw on the map first'}
        >
          Send Quote
        </button>
      </div>
    </div>
  )
}

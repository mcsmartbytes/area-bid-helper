"use client"
import { useAppStore } from '@/lib/store'

interface QuoteToolbarProps {
  onSettings?: () => void
  onSendQuote?: () => void
  onSaveDraft?: () => void
}

export default function QuoteToolbar({ onSettings, onSendQuote, onSaveDraft }: QuoteToolbarProps) {
  const requestClear = useAppStore((s) => s.requestClear)
  const requestCommand = useAppStore((s) => s.requestCommand)

  return (
    <div className="quote-toolbar">
      {/* Quote Mode Badge */}
      <div className="quote-mode-badge">
        <span className="quote-mode-dot" />
        QUOTE MODE
      </div>

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
        >
          Send Quote
        </button>
      </div>
    </div>
  )
}

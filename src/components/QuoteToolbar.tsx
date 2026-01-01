"use client"
import { useAppStore } from '@/lib/store'
import { usePricingStore } from '@/lib/pricing-store'

interface QuoteToolbarProps {
  onSettings?: () => void
  onHelp?: () => void
}

export default function QuoteToolbar({ onSettings, onHelp }: QuoteToolbarProps) {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  const requestClear = useAppStore((s) => s.requestClear)
  const requestCommand = useAppStore((s) => s.requestCommand)

  return (
    <div className="quote-toolbar">
      {/* Drawing Tools - Simplified */}
      <div className="quote-toolbar-group">
        <div className="segmented" role="group" aria-label="Drawing modes">
          <button
            className={'btn btn-tool' + (mode === 'freehand' ? ' active' : '')}
            onClick={() => setMode('freehand')}
            title="Freehand Draw (F)"
          >
            <span className="tool-icon">✎</span>
            <span className="tool-label">Draw</span>
          </button>
          <button
            className={'btn btn-tool' + (mode === 'polygon' ? ' active' : '')}
            onClick={() => setMode('polygon')}
            title="Polygon (A)"
          >
            <span className="tool-icon">⬠</span>
            <span className="tool-label">Polygon</span>
          </button>
          <button
            className={'btn btn-tool' + (mode === 'line' ? ' active' : '')}
            onClick={() => setMode('line')}
            title="Line (L)"
          >
            <span className="tool-icon">／</span>
            <span className="tool-label">Line</span>
          </button>
          <button
            className={'btn btn-tool' + (mode === 'pan' ? ' active' : '')}
            onClick={() => setMode('pan')}
            title="Select/Pan (V)"
          >
            <span className="tool-icon">👆</span>
            <span className="tool-label">Select</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quote-toolbar-group">
        <button
          className="btn btn-tool"
          onClick={() => requestCommand('draw:rectangle')}
          title="Rectangle (R)"
        >
          <span className="tool-icon">▭</span>
        </button>
        <button
          className="btn btn-tool"
          onClick={() => requestCommand('draw:circle')}
          title="Circle (O)"
        >
          <span className="tool-icon">◯</span>
        </button>
      </div>

      {/* Edit Actions */}
      <div className="quote-toolbar-group">
        <button
          className="btn btn-tool btn-danger-subtle"
          onClick={requestClear}
          title="Clear All (C)"
        >
          <span className="tool-icon">✕</span>
          <span className="tool-label">Clear</span>
        </button>
      </div>

      {/* Right side - Settings */}
      <div className="quote-toolbar-spacer" />

      <div className="quote-toolbar-group">
        <button
          className="btn btn-tool"
          onClick={onSettings}
          title="Settings"
        >
          <span className="tool-icon">⚙</span>
        </button>
        <button
          className="btn btn-tool"
          onClick={onHelp}
          title="Help"
        >
          <span className="tool-icon">?</span>
        </button>
      </div>

      {/* Brand */}
      <div className="quote-toolbar-brand">
        <span className="brand">Instant Quote</span>
      </div>
    </div>
  )
}

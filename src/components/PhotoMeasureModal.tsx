"use client"
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react'

type Point = { x: number; y: number }
type Measurement = { id: string; name: string; start: Point; end: Point }
type Photo = {
  id: string
  name: string
  url: string
  measurements: Measurement[]
  scale?: { unitsPerRelative: number; unitLabel: string; referenceActual: number }
}

type ActiveTool = { photoId: string; type: 'scale' | 'measure'; start?: Point; current?: Point }

const STORAGE_KEY = 'PHOTO_MEASURE_STORE_V1'

function distanceBetween(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function formatMeasurement(photo: Photo, measurement: Measurement) {
  const dist = distanceBetween(measurement.start, measurement.end)
  if (photo.scale && Number.isFinite(photo.scale.unitsPerRelative) && photo.scale.unitsPerRelative > 0) {
    const value = dist * photo.scale.unitsPerRelative
    return `${value.toFixed(2)} ${photo.scale.unitLabel}`
  }
  return `${(dist * 100).toFixed(1)}% of frame`
}

export default function PhotoMeasureModal({ onClose }: { onClose: () => void }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [activeTool, setActiveTool] = useState<ActiveTool | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setPhotos(
            parsed.map((item: Photo) => {
              if (item?.scale) {
                return {
                  ...item,
                  scale: {
                    ...item.scale,
                    referenceActual: typeof item.scale.referenceActual === 'number' ? item.scale.referenceActual : 1,
                  },
                }
              }
              return item
            })
          )
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(photos))
    } catch {}
  }, [photos])

  useEffect(() => {
    if (!activeTool) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveTool(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTool])

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const url = reader.result
        if (typeof url !== 'string') return
        setPhotos((prev) => [
          ...prev,
          {
            id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: file.name || 'Photo',
            url,
            measurements: [],
          },
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  const completeLine = (photoId: string, tool: ActiveTool, endPoint: Point) => {
    if (!tool.start) return
    const dist = distanceBetween(tool.start, endPoint)
    if (dist < 0.002) {
      setActiveTool(null)
      return
    }
    if (tool.type === 'scale') {
      const valueStr = window.prompt('Enter the real-world length for this reference (numbers only):', '10')
      if (!valueStr) {
        setActiveTool(null)
        return
      }
      const value = Number(valueStr)
      if (!Number.isFinite(value) || value <= 0) {
        setActiveTool(null)
        return
      }
      const unit = window.prompt('Enter the unit label (ft, m, in, etc.):', 'ft')?.trim() || 'ft'
      const unitsPerRelative = value / dist
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId
            ? { ...photo, scale: { unitsPerRelative, unitLabel: unit, referenceActual: value } }
            : photo
        )
      )
    } else {
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId
            ? {
                ...photo,
                measurements: [
                  ...photo.measurements,
                  {
                    id: `measure_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    name: `Measurement ${photo.measurements.length + 1}`,
                    start: tool.start!,
                    end: endPoint,
                  },
                ],
              }
            : photo
        )
      )
    }
    setActiveTool(null)
  }

  const handleStagePointer = (photoId: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeTool || activeTool.photoId !== photoId) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const clamp = (val: number) => Math.max(0, Math.min(1, val))
    const point = {
      x: clamp((e.clientX - rect.left) / rect.width),
      y: clamp((e.clientY - rect.top) / rect.height),
    }
    e.preventDefault()
    e.stopPropagation()
    if (!activeTool.start) {
      setActiveTool((prev) => (prev && prev.photoId === photoId ? { ...prev, start: point, current: point } : prev))
    } else if (e.type === 'pointerdown') {
      completeLine(photoId, activeTool, point)
    } else if (activeTool.start) {
      setActiveTool((prev) => (prev && prev.photoId === photoId ? { ...prev, current: point } : prev))
    }
  }

  const activeMessage = useMemo(() => {
    if (!activeTool) return ''
    if (!activeTool.start) {
      return activeTool.type === 'scale'
        ? 'Scale mode: click two points on the photo that match a known real-world distance.'
        : 'Measure mode: click two points on the photo to measure between them.'
    }
    return 'Click a second point to finish.'
  }, [activeTool])

  const resetScale = (photoId: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, scale: undefined } : p)))
  }

  const deletePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    if (activeTool?.photoId === photoId) setActiveTool(null)
  }

  const deleteMeasurement = (photoId: string, measurementId: string) => {
    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === photoId
          ? { ...photo, measurements: photo.measurements.filter((m) => m.id !== measurementId) }
          : photo
      )
    )
  }

  const renameMeasurement = (photoId: string, measurementId: string, name: string) => {
    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === photoId
          ? {
              ...photo,
              measurements: photo.measurements.map((m) => (m.id === measurementId ? { ...m, name } : m)),
            }
          : photo
      )
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div className="glass modal photo-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Photo Measurements</div>
        <div className="modal-content" style={{ color: 'var(--fg)' }}>
          <div style={{ marginBottom: 12 }}>
            Upload site photos (front/back elevations, etc.) to sketch quick measurements with a reference scale.
            Set a scale line once per photo, then add as many measurements as you need.
          </div>
          <label className="photo-uploader">
            <input type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} />
            <span>Add photos…</span>
          </label>
          {activeTool && (
            <div className="photo-active-tool">
              {activeMessage}
              <button className="btn btn-quiet" onClick={() => setActiveTool(null)}>Cancel</button>
            </div>
          )}
          {photos.length === 0 && (
            <div className="photo-empty">
              No photos yet. Upload a front or back elevation to get started.
            </div>
          )}
          <div className="photo-grid">
            {photos.map((photo) => {
              const previewLine = activeTool && activeTool.photoId === photo.id && activeTool.start && activeTool.current
                ? { start: activeTool.start, end: activeTool.current }
                : null
              return (
                <div key={photo.id} className="photo-card">
                  <div className="photo-card-head">
                    <div>
                      <div className="photo-name">{photo.name}</div>
                      <div className="photo-scale">
                        Scale: {photo.scale ? `${photo.scale.referenceActual} ${photo.scale.unitLabel} reference set` : 'Not set'}
                      </div>
                    </div>
                    <button className="btn btn-quiet" onClick={() => deletePhoto(photo.id)}>Remove</button>
                  </div>
                  <div
                    className="photo-stage"
                    onPointerDown={(e) => handleStagePointer(photo.id, e)}
                    onPointerMove={(e) => {
                      if (activeTool?.photoId === photo.id && activeTool.start) handleStagePointer(photo.id, e)
                    }}
                    style={{ cursor: activeTool?.photoId === photo.id ? 'crosshair' : 'default' }}
                  >
                    <img src={photo.url} alt={photo.name} />
                    <svg className="photo-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                      {photo.measurements.map((m) => (
                        <line
                          key={m.id}
                          x1={m.start.x * 1000}
                          y1={m.start.y * 1000}
                          x2={m.end.x * 1000}
                          y2={m.end.y * 1000}
                          stroke="var(--accent)"
                          strokeWidth={4}
                          strokeLinecap="round"
                        />
                      ))}
                      {previewLine && (
                        <line
                          x1={previewLine.start.x * 1000}
                          y1={previewLine.start.y * 1000}
                          x2={previewLine.end.x * 1000}
                          y2={previewLine.end.y * 1000}
                          stroke="var(--accent-2)"
                          strokeDasharray="8 8"
                          strokeWidth={4}
                          strokeLinecap="round"
                        />
                      )}
                    </svg>
                    {photo.measurements.map((m) => {
                      const midX = ((m.start.x + m.end.x) / 2) * 100
                      const midY = ((m.start.y + m.end.y) / 2) * 100
                      return (
                        <div
                          key={`${m.id}-label`}
                          className="photo-measure-label"
                          style={{ left: `${midX}%`, top: `${midY}%` }}
                        >
                          {formatMeasurement(photo, m)}
                        </div>
                      )
                    })}
                  </div>
                  <div className="photo-actions">
                    <button className="btn" onClick={() => setActiveTool({ photoId: photo.id, type: 'scale' })}>Set scale</button>
                    <button
                      className="btn"
                      onClick={() => setActiveTool({ photoId: photo.id, type: 'measure' })}
                      disabled={!photo.scale}
                      title={photo.scale ? 'Click two points to measure' : 'Set a scale first to convert to real units'}
                    >
                      Measure
                    </button>
                    <button className="btn btn-quiet" onClick={() => resetScale(photo.id)} disabled={!photo.scale}>Reset scale</button>
                  </div>
                  <div className="photo-measurements">
                    {photo.measurements.length === 0 ? (
                      <div className="photo-empty">No measurements yet.</div>
                    ) : (
                      photo.measurements.map((m) => (
                        <div key={m.id} className="photo-measure-row">
                          <input
                            type="text"
                            value={m.name}
                            onChange={(e) => renameMeasurement(photo.id, m.id, e.target.value)}
                          />
                          <div className="photo-measure-value">
                            {formatMeasurement(photo, m)}
                            {!photo.scale && <span className="photo-hint">Set scale for real units</span>}
                          </div>
                          <button className="btn btn-quiet" onClick={() => deleteMeasurement(photo.id, m.id)}>✕</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={() => { setActiveTool(null); onClose() }}>Close</button>
        </div>
      </div>
    </div>
  )
}

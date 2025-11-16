"use client"
import { useEffect, useRef } from 'react'
import mapboxgl, { MapMouseEvent } from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
// Turf utils
import * as turf from '@turf/turf'
import { useAppStore } from '@/lib/store'

function getToken(): string | undefined {
  // 1) Env at build time
  const envToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (envToken) return envToken
  // 2) URL ?token=
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href)
    const t = url.searchParams.get('token')
    if (t) {
      try { localStorage.setItem('MAPBOX_TOKEN', t) } catch {}
      return t
    }
    const ls = localStorage.getItem('MAPBOX_TOKEN')
    if (ls) return ls
  }
  return undefined
}

export default function MapView() {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const mode = useAppStore((s) => s.mode)
  const setMeasurements = useAppStore((s) => s.setMeasurements)
  const clearTick = useAppStore((s) => s.clearTick)

  useEffect(() => {
    const token = getToken()
    if (token) {
      ;(mapboxgl as any).accessToken = token
    }

    const map = new mapboxgl.Map({
      container: containerRef.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-97.75, 30.27],
      zoom: 11,
      attributionControl: true,
    })
    mapRef.current = map

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true, line_string: true },
      defaultMode: 'simple_select',
    })
    drawRef.current = draw
    map.addControl(draw, 'top-right')
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')

    const compute = () => {
      const all = draw.getAll()
      let area = 0
      let length = 0
      for (const f of all.features as turf.AllGeoJSON[]) {
        const g = f as any
        if (g.geometry?.type === 'Polygon' || g.geometry?.type === 'MultiPolygon') {
          try { area += turf.area(g as any) } catch {}
        }
        if (g.geometry?.type === 'LineString' || g.geometry?.type === 'MultiLineString') {
          try { length += turf.length(g as any, { units: 'meters' as any }) as unknown as number } catch {}
        }
      }
      setMeasurements({ area: area || undefined, length: length || undefined })
    }
    const computeRef: { current: () => void } = { current: compute }

    const onCreate = () => compute()
    const onUpdate = () => compute()
    const onDelete = () => compute()

    map.on('draw.create', onCreate)
    map.on('draw.update', onUpdate)
    map.on('draw.delete', onDelete)

    map.on('load', () => {
      // slightly nicer atmosphere
      try { map.setFog({ 'horizon-blend': 0.1, color: '#d2e9ff', 'high-color': '#aad4ff' } as any) } catch {}
    })

    // Freehand drawing support (mode 'freehand' or Shift while in 'polygon')
    let drawing = false
    let points: number[][] = []
    let lastScreen: { x: number; y: number } | null = null
    const pxThreshold = 3

    function startFreehand(e: MapMouseEvent) {
      drawing = true
      points = [[e.lngLat.lng, e.lngLat.lat]]
      lastScreen = map.project(e.lngLat)
      try { map.dragPan.disable() } catch {}
    }
    function moveFreehand(e: MapMouseEvent) {
      if (!drawing) return
      const p = map.project(e.lngLat)
      if (!lastScreen || Math.hypot(p.x - lastScreen.x, p.y - lastScreen.y) >= pxThreshold) {
        points.push([e.lngLat.lng, e.lngLat.lat])
        lastScreen = p
      }
    }
    function endFreehand() {
      if (!drawing) return
      drawing = false
      try { map.dragPan.enable() } catch {}
      if (points.length > 3) {
        const ls = turf.lineString(points)
        const simplified = turf.simplify(ls, { tolerance: 0.0001, highQuality: false }) as turf.Feature<turf.LineString>
        const coords = simplified.geometry.coordinates.slice()
        if (coords.length > 3) {
          coords.push(coords[0])
          const poly = {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [coords] },
          } as any
          try { draw.add(poly) } catch {}
          computeRef.current()
        }
      }
      points = []
      lastScreen = null
    }

    const onMouseDown = (e: MapMouseEvent) => {
      const shiftHeld = e.originalEvent.shiftKey
      const shouldFreehand = useAppStore.getState().mode === 'freehand' || (useAppStore.getState().mode === 'polygon' && shiftHeld)
      if (shouldFreehand) startFreehand(e)
    }
    const onMouseMove = (e: MapMouseEvent) => moveFreehand(e)
    const onMouseUp = () => endFreehand()

    map.on('mousedown', onMouseDown)
    map.on('mousemove', onMouseMove)
    map.on('mouseup', onMouseUp)
    map.on('mouseout', onMouseUp)

    return () => {
      map.off('draw.create', onCreate)
      map.off('draw.update', onUpdate)
      map.off('draw.delete', onDelete)
      map.off('mousedown', onMouseDown)
      map.off('mousemove', onMouseMove)
      map.off('mouseup', onMouseUp)
      map.off('mouseout', onMouseUp)
      map.remove()
      mapRef.current = null
      drawRef.current = null
    }
  }, [setMeasurements])

  // respond to mode changes
  useEffect(() => {
    const draw = drawRef.current
    if (!draw) return
    if (mode === 'polygon') draw.changeMode('draw_polygon')
    else if (mode === 'line') draw.changeMode('draw_line_string')
    else draw.changeMode('simple_select')
  }, [mode])

  // respond to clear requests
  useEffect(() => {
    const draw = drawRef.current
    if (!draw) return
    draw.deleteAll()
  }, [clearTick])

  return <div ref={containerRef} className="map-container" />
}

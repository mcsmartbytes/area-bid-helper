"use client"
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
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

    return () => {
      map.off('draw.create', onCreate)
      map.off('draw.update', onUpdate)
      map.off('draw.delete', onDelete)
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


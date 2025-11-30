"use client"
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import mapboxgl, { type MapMouseEvent } from 'mapbox-gl'
import { useAppStore } from '@/lib/store'
import { readToken } from '@/lib/token'

export default function MapView() {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hasToken, setHasToken] = useState<boolean>(false)
  const [tokenSource, setTokenSource] = useState<string | undefined>(undefined)
  const [skipInit, setSkipInit] = useState(false)
  const enabled = useAppStore((s) => s.mapEnabled)
  const setEnabled = useAppStore((s) => s.setMapEnabled)
  const [initTick, setInitTick] = useState(0)
  const [initError, setInitError] = useState<string | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [forceManual, setForceManual] = useState(false)
  const [mapLoading, setMapLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [textAnnotations, setTextAnnotations] = useState<Array<{id: string; lng: number; lat: number; text: string}>>([])
  const textMarkersRef = useRef<Array<mapboxgl.Marker>>([])
  const [heightMeasurements, setHeightMeasurements] = useState<Array<{id: string; lng: number; lat: number; value: number; label: string}>>([])
  const heightMarkersRef = useRef<Array<mapboxgl.Marker>>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  const mode = useAppStore((s) => s.mode)
  const setMeasurements = useAppStore((s) => s.setMeasurements)
  const clearTick = useAppStore((s) => s.clearTick)
  const command = useAppStore((s) => s.command)
  const unitSystem = useAppStore((s) => s.unitSystem)
  const toggleUnits = useAppStore((s) => s.toggleUnits)

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.has('skipinit')) setSkipInit(true)
      if (url.searchParams.has('autoinit')) setEnabled(true)
      if (url.searchParams.has('disablemap')) { setEnabled(false); setForceManual(true) }
    } catch {}
  }, [])

  // Auto-enable when a token is available
  useEffect(() => {
    if (skipInit || enabled || forceManual) return
    try {
      const { token } = readToken()
      if (token) setEnabled(true)
    } catch {}
  }, [skipInit, enabled, forceManual])

  useEffect(() => {
    if (skipInit || !enabled) return
    let cancelled = false
    const { token, source } = readToken()
    setHasToken(!!token)
    setTokenSource(source)
    if (!token) return

    ;(async () => {
      try {
        const [
          { default: mapboxgl, NavigationControl },
          { default: MapboxDraw },
          turf,
        ] = await Promise.all([
          import('mapbox-gl') as any,
          import('@mapbox/mapbox-gl-draw') as any,
          import('@turf/turf') as any,
        ])
        if (cancelled) return
        ;(mapboxgl as any).accessToken = token
        // Compute style, supporting 'auto' (system theme)
        const mql = window.matchMedia('(prefers-color-scheme: dark)')
        const computeStyle = (styleId: string) => {
          if (styleId === 'auto') {
            return mql.matches ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11'
          }
          return styleId
        }

        setMapLoading(true)
        const map = new mapboxgl.Map({
          container: containerRef.current!,
          style: computeStyle(useAppStore.getState().styleId),
          center: [-97.75, 30.27],
          zoom: 11,
          attributionControl: true,
          preserveDrawingBuffer: true,
        })
        mapRef.current = map

        const onMapLoad = async () => {
          if (cancelled) return
          try { map.setFog({ 'horizon-blend': 0.1, color: '#d2e9ff', 'high-color': '#aad4ff' } as any) } catch {}

          // Enable 3D buildings layer
          const add3DBuildings = () => {
            try {
              if (!useAppStore.getState().enable3D) return

              // Check if the map style has a 'composite' source (Mapbox vector tiles)
              const style = map.getStyle()
              if (!style?.sources?.composite) {
                console.log('3D buildings require a Mapbox vector style (streets, outdoors, satellite-streets)')
                return
              }

              // Remove existing layer if it exists
              if (map.getLayer('3d-buildings')) {
                map.removeLayer('3d-buildings')
              }

              // Find the first symbol layer to insert buildings below labels
              const layers = style.layers || []
              const labelLayerId = layers.find(layer => layer.type === 'symbol' && (layer as any).layout?.['text-field'])?.id

              // Add 3D building layer
              map.addLayer({
                id: '3d-buildings',
                source: 'composite',
                'source-layer': 'building',
                filter: ['==', 'extrude', 'true'],
                type: 'fill-extrusion',
                minzoom: 15,
                paint: {
                  'fill-extrusion-color': '#aaa',
                  'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    15.05,
                    ['get', 'height']
                  ],
                  'fill-extrusion-base': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    15.05,
                    ['get', 'min_height']
                  ],
                  'fill-extrusion-opacity': 0.6
                }
              } as any, labelLayerId)

              console.log('3D buildings layer added successfully')
            } catch (err) {
              console.warn('Failed to add 3D buildings:', err)
            }
          }

          // Add 3D buildings when style loads
          map.once('idle', add3DBuildings)

          // Controls after load
          const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: { polygon: true, trash: true, line_string: true },
            defaultMode: 'simple_select',
          })
          drawRef.current = draw
          try { map.addControl(draw, 'top-right') } catch {}
          try { map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right') } catch {}

          // Address search (Mapbox Geocoder)
          try {
            const geocoderMod: any = await import('@mapbox/mapbox-gl-geocoder')
            const Geocoder: any = geocoderMod?.default || geocoderMod
            const geocoder = new Geocoder({
              accessToken: (mapboxgl as any).accessToken,
              mapboxgl,
              marker: false,
              collapsed: true,
              placeholder: 'Search address…',
            })
            map.addControl(geocoder as any, 'top-right')
          } catch {}

          // Measurement compute
          const compute = () => {
            if (!drawRef.current) return
            const all = (drawRef.current as any).getAll()
            let area = 0
            let length = 0
            for (const f of all.features as any[]) {
              const g = f as any
              if (g.geometry?.type === 'Polygon' || g.geometry?.type === 'MultiPolygon') {
                try { area += (turf as any).area(g as any) } catch {}
              }
              if (g.geometry?.type === 'LineString' || g.geometry?.type === 'MultiLineString') {
                try { length += (turf as any).length(g as any, { units: 'kilometers' }) * 1000 } catch {}
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

          // Respond to style toggle
          const onMql = () => {
            if (useAppStore.getState().styleId === 'auto') {
              try {
                map.setStyle(computeStyle('auto'))
                map.once('style.load', add3DBuildings)
              } catch {}
            }
          }
          mql.addEventListener?.('change', onMql)
          const unsubStyle = useAppStore.subscribe((state, prev) => {
            if (state.styleId !== prev.styleId) {
              try {
                map.setStyle(computeStyle(state.styleId))
                map.once('style.load', add3DBuildings)
              } catch {}
            }
          })

          // Freehand drawing support
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
              const ls = (turf as any).lineString(points)
              const smoothing = useAppStore.getState().smoothing
              const tol = Math.max(0, Math.min(10, smoothing)) * 0.00005
              const simplified = tol > 0 ? (turf as any).simplify(ls as any, { tolerance: tol, highQuality: false }) as any : ls
              const coords = simplified.geometry.coordinates.slice()
              if (coords.length > 3) {
                coords.push(coords[0])
                const poly = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } } as any
                try { (drawRef.current as any)?.add(poly) } catch {}
                computeRef.current()
              }
            }
            points = []
            lastScreen = null
          }
          const onMouseDown = (e: MapMouseEvent) => {
            const shiftHeld = (e.originalEvent as any).shiftKey
            const shouldFreehand = useAppStore.getState().mode === 'freehand' || (useAppStore.getState().mode === 'polygon' && shiftHeld)
            if (shouldFreehand) startFreehand(e)
          }
          const onMouseMove = (e: MapMouseEvent) => moveFreehand(e)
          const onMouseUp = () => endFreehand()

          // Touch event handlers for mobile/tablet
          const onTouchStart = (e: MapMouseEvent) => {
            const shouldFreehand = useAppStore.getState().mode === 'freehand'
            if (shouldFreehand) {
              e.preventDefault()
              startFreehand(e)
            }
          }
          const onTouchMove = (e: MapMouseEvent) => {
            if (useAppStore.getState().mode === 'freehand') {
              e.preventDefault()
              moveFreehand(e)
            }
          }
          const onTouchEnd = () => endFreehand()

          map.on('mousedown', onMouseDown)
          map.on('mousemove', onMouseMove)
          map.on('mouseup', onMouseUp)
          map.on('mouseout', onMouseUp)
          map.on('touchstart', onTouchStart)
          map.on('touchmove', onTouchMove)
          map.on('touchend', onTouchEnd)
          map.on('touchcancel', onTouchEnd)

          // Text annotation click handler
          const onMapClick = (e: MapMouseEvent) => {
            const currentMode = useAppStore.getState().mode

            if (currentMode === 'text') {
              const text = prompt('Enter text label:')
              if (!text) return
              const id = 'text_' + Date.now()
              const annotation = { id, lng: e.lngLat.lng, lat: e.lngLat.lat, text }
              setTextAnnotations(prev => [...prev, annotation])
            } else if (currentMode === 'height') {
              const isImp = useAppStore.getState().unitSystem === 'imperial'
              const input = prompt(`Enter height (${isImp ? 'feet' : 'meters'}):`, isImp ? '10' : '3')
              if (!input) return
              const value = Number(input)
              if (Number.isNaN(value) || value <= 0) return

              // Convert to meters for storage
              const valueInMeters = isImp ? value * 0.3048 : value
              const label = isImp ? `${value} ft` : `${value} m`

              const id = 'height_' + Date.now()
              const measurement = { id, lng: e.lngLat.lng, lat: e.lngLat.lat, value: valueInMeters, label }
              setHeightMeasurements(prev => {
                const updated = [...prev, measurement]
                // Update store measurements
                const current = useAppStore.getState().measurements
                useAppStore.getState().setMeasurements({
                  ...current,
                  heights: updated
                })
                return updated
              })
            }
          }
          map.on('click', onMapClick)

          // Cleanup on unload
          const cleanup = () => {
            try { unsubStyle() } catch {}
            try { mql.removeEventListener?.('change', onMql) } catch {}
            try { map.off('draw.create', onCreate) } catch {}
            try { map.off('draw.update', onUpdate) } catch {}
            try { map.off('draw.delete', onDelete) } catch {}
            try { map.off('mousedown', onMouseDown) } catch {}
            try { map.off('mousemove', onMouseMove) } catch {}
            try { map.off('mouseup', onMouseUp) } catch {}
            try { map.off('mouseout', onMouseUp) } catch {}
            try { map.off('touchstart', onTouchStart) } catch {}
            try { map.off('touchmove', onTouchMove) } catch {}
            try { map.off('touchend', onTouchEnd) } catch {}
            try { map.off('touchcancel', onTouchEnd) } catch {}
            try { map.off('click', onMapClick) } catch {}
            textMarkersRef.current.forEach(m => m.remove())
            textMarkersRef.current = []
            heightMarkersRef.current.forEach(m => m.remove())
            heightMarkersRef.current = []
          }
          // Store cleanup on ref for outer dispose
          ;(map as any).__abp_cleanup = cleanup
          setMapLoading(false)
        }

        map.once('load', onMapLoad)

        return () => {
          try { (mapRef.current as any)?.__abp_cleanup?.() } catch {}
          try { mapRef.current?.off('load', onMapLoad) } catch {}
          try { mapRef.current?.remove() } catch {}
          mapRef.current = null
          drawRef.current = null
        }
      } catch (err) {
        console.warn('Map failed to initialize:', err)
        if (!cancelled) {
          setHasToken(false)
          setInitError(err instanceof Error ? err.message : String(err))
        }
      }
    })()

    return () => { cancelled = true }
  }, [setMeasurements, skipInit, enabled, initTick])

  // Capture unhandled rejections while initializing
  useEffect(() => {
    if (!enabled) return
    const onRej = (e: PromiseRejectionEvent) => {
      try {
        const msg = e?.reason?.message || String(e?.reason || 'unknown')
        setInitError((prev) => prev || msg)
      } catch {}
    }
    const onErr = (e: ErrorEvent) => {
      try { setInitError((prev) => prev || (e?.error?.message || e.message || 'error')) } catch {}
    }
    window.addEventListener('unhandledrejection', onRej)
    window.addEventListener('error', onErr)
    return () => {
      window.removeEventListener('unhandledrejection', onRej)
      window.removeEventListener('error', onErr)
    }
  }, [enabled])

  // respond to mode changes
  useEffect(() => {
    const draw = drawRef.current
    if (!draw) return
    if (mode === 'polygon') draw.changeMode('draw_polygon')
    else if (mode === 'line') draw.changeMode('draw_line_string')
    else draw.changeMode('simple_select')
  }, [mode])

  // Render text annotations as markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove existing markers
    textMarkersRef.current.forEach(m => m.remove())
    textMarkersRef.current = []

    // Create new markers for each annotation
    textAnnotations.forEach(ann => {
      const el = document.createElement('div')
      el.className = 'text-marker'
      el.textContent = ann.text
      el.style.cssText = 'background: rgba(255,255,255,0.9); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #000; border: 1px solid #333; cursor: pointer; white-space: nowrap;'

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([ann.lng, ann.lat])
        .addTo(map)

      textMarkersRef.current.push(marker)
    })
  }, [textAnnotations])

  // Render height measurements as markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove existing markers
    heightMarkersRef.current.forEach(m => m.remove())
    heightMarkersRef.current = []

    // Create new markers for each height measurement
    heightMeasurements.forEach(h => {
      const el = document.createElement('div')
      el.className = 'height-marker'
      el.textContent = `↕ ${h.label}`
      el.style.cssText = 'background: rgba(122,162,255,0.9); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #fff; border: 1px solid #4a7acc; cursor: pointer; white-space: nowrap;'

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([h.lng, h.lat])
        .addTo(map)

      heightMarkersRef.current.push(marker)
    })
  }, [heightMeasurements])

  // respond to clear requests
  useEffect(() => {
    const draw = drawRef.current
    if (!draw) return
    draw.deleteAll()
    setTextAnnotations([])
    setHeightMeasurements([])
  }, [clearTick])

  // Handle commands (export/rectangle/circle)
  useEffect(() => {
    if (!command) return
    const map = mapRef.current
    const draw = drawRef.current as any
    if (!map || !draw) return

    const currentId = command.id

    function download(name: string, type: string, data: BlobPart) {
      const blob = new Blob([data], { type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }

    const run = async () => {
      if (command.id !== currentId) return
      const all = draw.getAll()
      switch (command.type) {
        case 'export:json': {
          // Add text annotations as Point features
          const textFeatures = textAnnotations.map(ann => ({
            type: 'Feature',
            properties: { text: ann.text, type: 'text-annotation' },
            geometry: { type: 'Point', coordinates: [ann.lng, ann.lat] }
          }))
          // Add height measurements as Point features
          const heightFeatures = heightMeasurements.map(h => ({
            type: 'Feature',
            properties: { height: h.value, label: h.label, type: 'height-measurement' },
            geometry: { type: 'Point', coordinates: [h.lng, h.lat] }
          }))
          const combined = {
            type: 'FeatureCollection',
            features: [...all.features, ...textFeatures, ...heightFeatures]
          }
          download('areas.geojson', 'application/geo+json', JSON.stringify(combined))
          break
        }
        case 'export:png': {
          try {
            map.getCanvas().toBlob((blob) => {
              if (!blob) return
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = 'map-snapshot.png'
              document.body.appendChild(a)
              a.click()
              a.remove()
            })
          } catch {}
          break
        }
        case 'export:csv': {
          try {
            const turf = await import('@turf/turf') as any
            let areaSqM = 0
            let perimeterKm = 0
            const rows: string[] = []
            let idx = 0
            for (const f of all.features as any[]) {
              if (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon') {
                try {
                  const a = turf.area(f)
                  const lines = turf.polygonToLine(f)
                  const p = turf.length(lines, { units: 'kilometers' })
                  areaSqM += a
                  perimeterKm += p
                  const areaSqFt = a * 10.76391041671
                  const perimM = p * 1000
                  const perimFt = p * 3280.8398950131
                  rows.push([String(++idx), areaSqFt.toFixed(2), a.toFixed(2), perimFt.toFixed(2), perimM.toFixed(2)].join(','))
                } catch {}
              }
            }
            const areaSqFt = areaSqM * 10.76391041671
            const perimM = perimeterKm * 1000
            const perimFt = perimeterKm * 3280.8398950131
            let csv = 'Area Measurement Report\n'
            csv += `Units:,${unitSystem === 'imperial' ? 'Imperial (ft/sq ft)' : 'Metric (m/sq m)'}\n\n`
            csv += 'SUMMARY\n'
            csv += `Total Area (sq ft):,${areaSqFt.toFixed(2)}\n`
            csv += `Total Area (sq m):,${areaSqM.toFixed(2)}\n`
            csv += `Total Perimeter (ft):,${perimFt.toFixed(2)}\n`
            csv += `Total Perimeter (m):,${perimM.toFixed(2)}\n`
            csv += `Number of Shapes:,${rows.length}\n`
            csv += `Number of Height Measurements:,${heightMeasurements.length}\n\n`
            csv += 'INDIVIDUAL SHAPES\n'
            csv += 'Shape #,Area (sq ft),Area (sq m),Perimeter (ft),Perimeter (m)\n'
            csv += rows.join('\n') + (rows.length ? '\n' : '')
            if (heightMeasurements.length > 0) {
              csv += '\nHEIGHT MEASUREMENTS\n'
              csv += 'Measurement #,Height (ft),Height (m)\n'
              heightMeasurements.forEach((h, i) => {
                const heightFt = h.value * 3.28084
                const heightM = h.value
                csv += `${i + 1},${heightFt.toFixed(2)},${heightM.toFixed(2)}\n`
              })
            }
            download('areas.csv', 'text/csv', csv)
          } catch {}
          break
        }
        case 'draw:rectangle': {
          let first: [number, number] | null = null
          const onClick = (e: MapMouseEvent) => {
            if (!first) {
              first = [e.lngLat.lng, e.lngLat.lat]
            } else {
              const second: [number, number] = [e.lngLat.lng, e.lngLat.lat]
              const minX = Math.min(first[0], second[0])
              const maxX = Math.max(first[0], second[0])
              const minY = Math.min(first[1], second[1])
              const maxY = Math.max(first[1], second[1])
              const rect = {
                type: 'Feature',
                properties: {},
                geometry: { type: 'Polygon', coordinates: [[[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]]] },
              }
              try { draw.add(rect) } catch {}
              map.off('click', onClick)
              first = null
            }
          }
          map.off('click', onClick)
          map.on('click', onClick)
          break
        }
        case 'draw:circle': {
          const once = (e: MapMouseEvent) => {
            const center: [number, number] = [e.lngLat.lng, e.lngLat.lat]
            const isImp = unitSystem === 'imperial'
            const input = window.prompt(`Enter radius (${isImp ? 'feet' : 'meters'}):`, isImp ? '50' : '15')
            if (!input) { map.off('click', once); return }
            const radius = Number(input)
            if (Number.isNaN(radius) || radius <= 0) { map.off('click', once); return }
            const miles = isImp ? radius / 5280 : (radius / 1000) * 0.621371
            import('@turf/turf').then((t: any) => {
              try {
                const circle = t.circle(center, miles, { steps: 128, units: 'miles' })
                draw.add(circle)
              } catch {}
            }).finally(() => map.off('click', once))
          }
          map.off('click', once)
          map.on('click', once)
          break
        }
        case 'view:reset': {
          try {
            map.flyTo({ center: [-97.75, 30.27], zoom: 11 })
          } catch {}
          break
        }
        case 'import:json': {
          try {
            const payload = (command as any).payload as string | undefined
            if (!payload) break
            let parsed: any
            try { parsed = JSON.parse(payload) } catch { break }
            const addFeature = (f: any) => {
              try { draw.add(f) } catch {}
            }
            if (parsed?.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
              for (const f of parsed.features) addFeature(f)
            } else if (parsed?.type === 'Feature') {
              addFeature(parsed)
            } else {
              // try treating as geometry
              if (parsed?.type && parsed?.coordinates) addFeature({ type: 'Feature', properties: {}, geometry: parsed })
            }
          } catch {}
          break
        }
      }
    }

    run()
  }, [command, unitSystem, textAnnotations, heightMeasurements])

  // Keyboard shortcuts
  useEffect(() => {
    const map = mapRef.current
    const draw = drawRef.current
    if (!map || !draw) return
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/selects
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      const key = e.key.toLowerCase()
      if (key === 'v') useAppStore.getState().setMode('pan')
      else if (key === 'a') useAppStore.getState().setMode('polygon')
      else if (key === 'l') useAppStore.getState().setMode('line')
      else if (key === 'f') useAppStore.getState().setMode('freehand')
      else if (key === 't') useAppStore.getState().setMode('text')
      else if (key === 'h') useAppStore.getState().setMode('height')
      else if (key === 'c') useAppStore.getState().requestClear()
      else if (key === 'u') toggleUnits()
      else if (key === 'j') useAppStore.getState().requestCommand('export:json')
      else if (key === 'p') useAppStore.getState().requestCommand('export:png')
      else if (key === 'k') useAppStore.getState().requestCommand('export:csv')
      else if (key === 'r') useAppStore.getState().requestCommand('draw:rectangle')
      else if (key === 'o') useAppStore.getState().requestCommand('draw:circle')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleUnits])

  const modals = (
    <>
      {!enabled && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg)', background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.25))', zIndex: 1000
        }}>
          <div className="glass" style={{ padding: 16, borderRadius: 12, maxWidth: 560 }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>Map disabled</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 10 }}>
              Click Enable to initialize Mapbox. You can also add <code>?autoinit=1</code> to auto-run.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => { setInitError(null); setEnabled(true) }}>Enable Map</button>
              <button className="btn" onClick={() => setEnabled(false)}>Keep Disabled</button>
            </div>
          </div>
        </div>
      )}
      {enabled && !hasToken && !skipInit && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg)', background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.25))', zIndex: 1000
        }}>
          <div className="glass" style={{ padding: 16, borderRadius: 12, maxWidth: 560 }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>Mapbox token required</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 10 }}>
              Paste your public token below (saved to this browser), or set env <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label htmlFor="token-input" style={{ fontSize: 13 }}>Token</label>
              <input
                id="token-input"
                name="mapbox-token"
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="pk.eyJ..."
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
              />
              <button
                className="btn"
                onClick={() => {
                  if (!tokenInput.trim()) return
                  try { localStorage.setItem('MAPBOX_TOKEN', tokenInput.trim()) } catch {}
                  setInitError(null)
                  setHasToken(true)
                  setTokenSource('localStorage')
                  setInitTick((n) => n + 1)
                }}
              >Save</button>
            </div>
          </div>
        </div>
      )}
      {skipInit && (
        <div style={{ position: 'fixed', top: 8, left: 8, fontSize: 12, color: 'var(--muted)', zIndex: 1000 }}>
          Map init skipped via ?skipinit
        </div>
      )}
      {enabled && initError && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 1000 }}>
          <div className="glass" style={{ padding: 14, borderRadius: 12, maxWidth: 560, pointerEvents: 'auto' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Map initialization error</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{initError}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => { setInitError(null); setInitTick((n) => n + 1) }}>Retry</button>
              <button className="btn" onClick={() => setEnabled(false)}>Disable</button>
            </div>
          </div>
        </div>
      )}
      {hasToken && tokenSource && (
        <div style={{ position: 'fixed', right: 8, top: 8, fontSize: 11, color: 'var(--muted)', zIndex: 1000 }}>
          token: {tokenSource}
        </div>
      )}
      {mapLoading && enabled && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 500 }}>
          <div className="glass" style={{ padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 14, color: 'var(--fg)' }}>Loading map...</div>
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
      <div className="map-container">
        <div ref={containerRef} className="map-canvas" />
      </div>
      {mounted && createPortal(modals, document.body)}
    </>
  )
}

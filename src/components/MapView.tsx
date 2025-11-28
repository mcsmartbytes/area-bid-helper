"use client"
import { useEffect, useRef, useState } from 'react'
import type { MapMouseEvent } from 'mapbox-gl'
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

        const map = new mapboxgl.Map({
          container: containerRef.current!,
          style: computeStyle(useAppStore.getState().styleId),
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
        map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right')

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

        const compute = () => {
          const all = draw.getAll()
          let area = 0
          let length = 0
          for (const f of all.features as any[]) {
            const g = f as any
            if (g.geometry?.type === 'Polygon' || g.geometry?.type === 'MultiPolygon') {
              try { area += turf.area(g as any) } catch {}
            }
            if (g.geometry?.type === 'LineString' || g.geometry?.type === 'MultiLineString') {
              try { length += turf.length(g as any, { units: 'kilometers' }) * 1000 } catch {}
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
          try { map.setFog({ 'horizon-blend': 0.1, color: '#d2e9ff', 'high-color': '#aad4ff' } as any) } catch {}
        })

        // Respond to style toggle
        const onMql = () => {
          if (useAppStore.getState().styleId === 'auto') {
            try { map.setStyle(computeStyle('auto')) } catch {}
          }
        }
        mql.addEventListener?.('change', onMql)
        const unsubStyle = useAppStore.subscribe((state, prev) => {
          if (state.styleId !== prev.styleId) {
            try { map.setStyle(computeStyle(state.styleId)) } catch {}
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
            const ls = turf.lineString(points)
            const smoothing = useAppStore.getState().smoothing
            const tol = Math.max(0, Math.min(10, smoothing)) * 0.00005 // 0..0.0005 degrees
            const simplified = tol > 0 ? turf.simplify(ls as any, { tolerance: tol, highQuality: false }) as any : ls
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
          try { unsubStyle() } catch {}
          try { mql.removeEventListener?.('change', onMql) } catch {}
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

  // respond to clear requests
  useEffect(() => {
    const draw = drawRef.current
    if (!draw) return
    draw.deleteAll()
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
          download('areas.geojson', 'application/geo+json', JSON.stringify(all))
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
            csv += `Number of Shapes:,${rows.length}\n\n`
            csv += 'INDIVIDUAL SHAPES\n'
            csv += 'Shape #,Area (sq ft),Area (sq m),Perimeter (ft),Perimeter (m)\n'
            csv += rows.join('\n') + (rows.length ? '\n' : '')
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
  }, [command, unitSystem])

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

  return (
    <div className="map-container">
      <div ref={containerRef} className="map-canvas" />
      {!enabled && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg)', background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.25))'
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
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg)', background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.25))'
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
        <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 12, color: 'var(--muted)' }}>
          Map init skipped via ?skipinit
        </div>
      )}
      {enabled && initError && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
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
        <div style={{ position: 'absolute', right: 8, top: 8, fontSize: 11, color: 'var(--muted)' }}>
          token: {tokenSource}
        </div>
      )}
    </div>
  )
}

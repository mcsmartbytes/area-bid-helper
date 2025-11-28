# Start Tomorrow

Focus: ship stable map init + polish UI

## High‑priority

- Map init hardening
  - [ ] Pin compatible Mapbox packages (known good combo)
        - mapbox-gl: ^3.10.0 (current)
        - @mapbox/mapbox-gl-draw: ^1.4.3 (current) — verify works with GL v3
        - @mapbox/mapbox-gl-geocoder: ^5.0.1 (current)
  - [ ] Initialize Draw/Geocoder only after `map.on('load')`
  - [ ] Guard event handlers and unmount cleanup
  - [ ] Move any remaining overlays to a separate layer/portal (container must be empty)
  - [ ] Add more descriptive error messages in the Map initialization panel

- Token UX
  - [ ] Verify Map Settings modal (🗺 Map) enables/disables map reliably
  - [ ] Save token to localStorage and auto‑enable on reload
  - [ ] Detect `NEXT_PUBLIC_MAPBOX_TOKEN` on prod and auto‑enable
  - [ ] Optional: expose “Token” entry in status bar for quick access

## Verification checklist

- Routes
  - [ ] `/` loads without React errors
  - [ ] `/health` shows OK page
  - [ ] `/api/health` returns JSON
  - [ ] `/diag` shows mounted=true and store snapshot

- Map testing
  - [ ] `/?disablemap=1` shows Enable Map prompt
  - [ ] Enable Map → paste token → Save → map renders
  - [ ] With env token set, map auto‑enables on load
  - [ ] `/?skipinit=1` shows “Map init skipped” note (for debugging)

- Lighthouse
  - [ ] Tap targets (target-size) pass on touch
  - [ ] Source maps valid (valid-source-maps)
  - [ ] Note: “unused/legacy JS” comes from vendor/framework — safe to ignore unless we optimize bundles

## Known flags (diagnostics)

- `?disablemap=1` — force manual enable prompt
- `?autoinit=1` — force auto‑init (even if prompt would show)
- `?skipinit=1` — skip map initialization (no Mapbox)
- Component toggles (for isolation):
  - `?nomap=1`, `?notoolbar=1`, `?nometrics=1`, `?nostatus=1`

## Small polish

- [ ] Status bar: add quick token status + link to Map Settings
- [ ] Move prompts to React portal to further decouple from map container
- [ ] Improve icons/text spacing for mobile
- [ ] A11y: add landmarks, aria labels for geocoder container, keyboard nav pass

## Stretch

- [ ] Shapes panel (list, rename, delete, zoom‑to)
- [ ] Draggable/dockable overlays (persist positions)
- [ ] Snapping + vertex helpers for precision
- [ ] Undo/redo stack for drawing
- [ ] Theming presets (accents), accessibility contrast pass

## Deployment notes

- Vercel
  - Production Branch: `main`
  - Env: set `NEXT_PUBLIC_MAPBOX_TOKEN` for Production
  - Domain mapping: ensure project domain points to Production deployment

- Local
  - `npm install`
  - `npm run build`
  - `npm run dev`


# Start Tomorrow (Area Bid Helper)

## Status
- Web Component `<area-bid-helper>` implemented with:
  - Address input + Mapbox Geocoder
  - Freehand (button) and Shift-to-freehand anywhere
  - Units toggle, Clear, Snapshot, JSON export
  - Token sources: attribute > ?token > localStorage > `window.MAPBOX_TOKEN`
- `index.html` sets `window.MAPBOX_TOKEN` for Vercel.
- Repo pushed to main: https://github.com/mcsmartbytes/area-bid-helper

## Test locally
```
python3 -m http.server 8000
# then open http://localhost:8000/index.html
# or use: http://localhost:8000/index.html?token=pk...
```

## Next tasks
- [ ] Minor UI polish (labels/instructions).
- [ ] Optional: expose circle radius units selector.
- [ ] Optional: add import/export of GeoJSON files.
- [ ] Optional: package as npm (web component) for distribution.

## Notes
- Ensure your Mapbox token allows localhost and your deployed domains.

Prepared for tomorrow. 👍


# Area Bid Pro

A professional area measurement and bidding tool for contractors. Measure properties on satellite maps or photos, then build production-aware quotes with profit intelligence.

## Features

### Map-Based Measurement
- **Satellite imagery** via Mapbox
- **Drawing tools**: Freehand, Polygon, Line, Rectangle, Circle
- **Auto-calculate**: Area (sq ft), Perimeter (ft), Heights
- **3D buildings** toggle for context
- **Street View** integration
- **Text annotations** for labeling

### Photo Measure Pro
- Upload or capture photos of properties
- Set scale using known references (doors, windows, etc.)
- Draw measurement lines directly on photos
- Export measurement summaries

### Spatial Quote Engine
- **Live pricing preview** - measurements stream to quote builder in real-time as you draw
- **Production-aware pricing** - not just area × rate
- Calculate labor hours based on production rates
- Factor in crew size, hourly rates, and labor burden
- Material costs with waste factors
- Equipment costs (fixed + hourly)
- **Profit preview** with adjustable margin slider
- **Risk indicators**: Low margin, labor heavy, material sensitive
- **Recalculate button** - lock in latest measurements anytime
- Export to CSV and QuickBooks IIF

### Export Options
- PNG snapshot
- GeoJSON (for GIS tools)
- CSV report
- QuickBooks IIF estimate
- Iframe integration for websites

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000)

### Mapbox Token

You'll need a [Mapbox access token](https://account.mapbox.com/access-tokens/). Enter it via:
- The Map Settings modal (click "Map" button)
- Or set `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`

---

## User Guide

### Measuring on the Map

1. **Search** for an address using the search bar (top-right)
2. **Select a drawing tool**:
   - `Freehand (F)` - Draw by dragging
   - `Polygon (A)` - Click vertices, double-click to finish
   - `Length (L)` - Measure linear distance
   - `Rectangle (R)` - Click and drag
   - `Circle (O)` - Click center, drag radius
3. **View measurements** in the bottom-right panel
4. **Toggle units** between Imperial and Metric

### Measuring on Photos

1. Click **"Photo Measure"** in the toolbar
2. **Upload** a photo or **take one** with your camera
3. **Set scale**: Click "Set Scale", draw a line on a known object (like a door), select its real size
4. **Measure**: Click "Measure", draw lines on anything you want to measure
5. **Export** the summary when done

### Building a Quote

1. **Draw shapes** on the map to measure the work area
2. Click **"Build Quote"** in the toolbar
3. **Add job info**: Customer name, job name, address
4. **Add services**: Click "Add Service", select a service type
   - The quantity auto-fills from your measurements
   - Costs are calculated based on production rates
5. **Live updates**: Keep drawing while the quote is open
   - Measurements update in real-time (preview mode)
   - Click **"Recalculate"** to lock in the latest measurements
6. **Adjust margin**: Use the slider (0-50%)
7. **Review risk flags**: Warnings appear for low margin or cost-heavy jobs
8. **Export**: CSV or QuickBooks IIF

### Configuring Pricing

1. Click **"Pricing"** in the toolbar
2. **Global settings**:
   - Default margin (applied to new quotes)
   - Labor burden rate (taxes, insurance, benefits)
3. **Service types**: Edit or add services with:
   - Production rate (sq ft/hr or linear ft/hr)
   - Crew size
   - Hourly labor rate
   - Material cost per unit
   - Waste factor
   - Equipment cost
   - Minimum job charge

---

## Default Service Types

| Service | Type | Production Rate | Notes |
|---------|------|-----------------|-------|
| Interior Painting | Area | 200 sq ft/hr | Walls, ceilings |
| Exterior Painting | Area | 150 sq ft/hr | Includes prep time |
| Sealcoating | Area | 2,000 sq ft/hr | Spray application |
| Pressure Washing | Area | 500 sq ft/hr | Driveways, decks |
| Line Striping | Linear | 500 ft/hr | Parking lots |
| Fencing | Linear | 20 ft/hr | Installation |
| Crack Filling | Linear | 200 ft/hr | Asphalt repair |
| Mulching | Area | 100 sq ft/hr | Landscaping |

Add custom services for your specific trade in Pricing Settings.

---

## Pricing Calculations

### Labor Cost
```
Labor Hours = Quantity / Production Rate
Labor Cost = Labor Hours × Crew Size × Hourly Rate × Burden Rate
```

### Material Cost
```
Material Cost = Quantity × Cost Per Unit × Waste Factor
```

### Equipment Cost
```
Equipment Cost = Fixed Cost + (Hourly Cost × Labor Hours)
```

### Total Quote
```
Subtotal = Labor + Material + Equipment
Margin Amount = Subtotal × Margin %
Total = Subtotal + Margin Amount
```

---

## Risk Indicators

The quote builder automatically flags potential issues:

| Flag | Trigger | Severity |
|------|---------|----------|
| Low Margin | Margin < 15% | Warning (< 10% = Error) |
| Labor Heavy | Labor > 70% of costs | Warning |
| Material Sensitive | Material > 40% of costs | Warning |
| Below Minimum | Line item < service minimum | Error |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| F | Freehand draw mode |
| A | Polygon mode |
| L | Length/line mode |
| T | Text annotation |
| H | Height measurement |
| V | Pan/select mode |
| R | Rectangle tool |
| O | Circle tool |
| C | Clear all |
| U | Toggle units |
| P | Export PNG |
| J | Export GeoJSON |
| K | Export CSV |
| Q | Export QuickBooks IIF |
| B | Build Quote |
| Esc | Cancel current action |

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Maps**: Mapbox GL JS + Mapbox Draw
- **Calculations**: Turf.js
- **State**: Zustand
- **Styling**: CSS (glass morphism design)
- **Validation**: Zod

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main app page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # All styles
├── components/
│   ├── MapView.tsx       # Mapbox map + drawing
│   ├── Toolbar.tsx       # Main toolbar
│   ├── MetricsPanel.tsx  # Measurement display
│   ├── PhotoMeasureModal.tsx  # Photo measurement
│   ├── BidBuilder.tsx    # Quote builder
│   └── PricingConfigModal.tsx # Pricing settings
└── lib/
    ├── store.ts          # App state (Zustand)
    ├── pricing-store.ts  # Pricing state
    ├── pricing-engine.ts # Calculation logic
    ├── pricing-types.ts  # TypeScript types
    ├── integration.ts    # Iframe API
    └── format.ts         # Display formatting
```

---

## Embedding in Websites

Area Bid Pro can be embedded via iframe:

```html
<iframe
  src="https://your-domain.com?customerId=123&customerName=Acme&jobName=Parking%20Lot"
  width="100%"
  height="600"
></iframe>

<script>
window.addEventListener('message', (e) => {
  if (e.data.source === 'area-bid-pro') {
    if (e.data.type === 'AREA_BID_PRO_EXPORT_QUOTE') {
      // Handle quote data: e.data.payload
      console.log('Quote received:', e.data.payload);
    }
  }
});
</script>
```

### URL Parameters
- `customerId` - Customer ID for tracking
- `customerName` - Pre-fill customer name
- `jobId` - Job ID for tracking
- `jobName` - Pre-fill job name
- `address` - Pre-fill address

---

## License

Proprietary - All rights reserved.

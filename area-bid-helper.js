(() => {
  const CDN = {
    mapboxCss: 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css',
    mapboxJs: 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js',
    drawCss: 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.5.0/mapbox-gl-draw.css',
    drawJs: 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.5.0/mapbox-gl-draw.js',
    geocoderCss: 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.7.2/mapbox-gl-geocoder.css',
    geocoderJs: 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.7.2/mapbox-gl-geocoder.min.js',
    turfJs: 'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js',
    supabaseJs: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
  };

  function ensureCss(href, root) {
    // If a shadow root is provided, inject the stylesheet inside it for proper scoping.
    if (root && typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot) {
      const existing = Array.from(root.querySelectorAll('link[rel="stylesheet"]')).find(l => l.href === href);
      if (existing) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = reject;
        root.appendChild(link);
      });
    }
    // Otherwise, ensure it exists on the main document head.
    const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(l => l.href === href);
    if (existing) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  function ensureScript(src, globalKey) {
    if (globalKey && getPath(window, globalKey)) return Promise.resolve(getPath(window, globalKey));
    const existing = Array.from(document.querySelectorAll('script')).find(s => s.src === src);
    if (existing && globalKey && getPath(window, globalKey)) return Promise.resolve(getPath(window, globalKey));
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve(globalKey ? getPath(window, globalKey) : undefined);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
  }

  async function ensureDeps(shadowRoot) {
    // Inject CSS into the component's shadow root for encapsulated styling
    await ensureCss(CDN.mapboxCss, shadowRoot);
    await ensureCss(CDN.drawCss, shadowRoot);
    await ensureCss(CDN.geocoderCss, shadowRoot);
    await ensureScript(CDN.mapboxJs, 'mapboxgl');
    await ensureScript(CDN.drawJs, 'MapboxDraw');
    await ensureScript(CDN.geocoderJs, 'MapboxGeocoder');
    await ensureScript(CDN.turfJs, 'turf');
  }

  class AreaBidHelper extends HTMLElement {
    constructor() {
      super();
      this._units = 'imperial'; // 'imperial' or 'metric'
      this._mode = 'polygon'; // 'polygon' | 'freehand'
      this._postMessage = false;
      this._targetOrigin = '*';
      this._supabase = null;
      this._table = null;
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <style>
          *, *::before, *::after { box-sizing: border-box; }
          :host { display:block; position:relative; min-height:400px; }
          #map { position:absolute; inset:0; }
          .panel { position:absolute; top:10px; left:10px; z-index:10; background:#fff; padding:10px 12px; border-radius:8px; box-shadow: 0 2px 8px rgba(0,0,0,.18); min-width:240px; }
          .panel .row{ margin-top:6px; }
          .panel button{ margin-top:6px; width:100%; padding:8px 10px; border-radius:8px; border:1px solid #ddd; background:#f8f8f8; cursor:pointer; }
          .panel button:hover{ background:#f0f0f0; }
          .token-warning{ position:absolute; bottom:10px; left:10px; z-index:10; background:#fff3cd; color:#5c3c00; padding:8px 10px; border-radius:8px; border:1px solid #ffe69c; display:none; }
        </style>
        <div id="map"></div>
        <div class="panel">
          <div id="output"><strong>Draw shapes</strong> then see total area & perimeter.</div>
          <div class="row"><button id="btn-poly">✏️ Polygon Mode</button></div>
          <div class="row"><button id="btn-rect">▭ Draw Rectangle</button></div>
          <div class="row"><button id="btn-freehand">~ Freehand Polygon</button></div>
          <div class="row"><button id="btn-circle">◯ Draw Circle</button></div>
          <div class="row"><button id="btn-clear">🗑️ Clear Shapes</button></div>
          <div class="row"><button id="btn-units">Units: ft / sq ft</button></div>
          <div class="row"><button id="btn-image">Download Snapshot</button></div>
          <div class="row"><button id="btn-data">Download Data (JSON)</button></div>
          <div class="row"><button id="btn-token">Set Mapbox Token…</button></div>
          <div class="row" id="save-row" style="display:none;"><button id="btn-save">Save to Supabase</button></div>
        </div>
        <div class="token-warning" id="tokenWarn">⚠️ Map token missing/blocked. Set a valid Mapbox token.</div>
      `;
    }

    static get observedAttributes() {
      return ['token', 'units', 'center', 'zoom', 'style', 'post-message', 'target-origin', 'supabase-url', 'supabase-key', 'supabase-table'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (name === 'units' && (newVal === 'imperial' || newVal === 'metric')) {
        this._units = newVal;
        this._updateUnitsButton();
        this._updateMeasurements();
      }
      if (name === 'post-message') {
        this._postMessage = newVal !== null;
      }
      if (name === 'target-origin') {
        this._targetOrigin = newVal || '*';
      }
      if (name === 'supabase-url' || name === 'supabase-key' || name === 'supabase-table') {
        this._setupSupabase();
      }
    }

    connectedCallback() {
      this._init();
    }

    async _init() {
      await ensureDeps(this.shadowRoot);

      // Token: attribute > URL ?token > localStorage > none
      const urlToken = new URLSearchParams(location.search).get('token');
      const saved = localStorage.getItem('mapbox_token');
      const globalToken = (window && (window.MAPBOX_TOKEN || window.__MAPBOX_TOKEN)) || '';
      const token = this.getAttribute('token') || urlToken || saved || globalToken || '';
      if (urlToken) localStorage.setItem('mapbox_token', urlToken);
      mapboxgl.accessToken = token;

      if (!mapboxgl.accessToken) {
        this.shadowRoot.getElementById('tokenWarn').style.display = 'block';
      }

      const center = this._parseCenter(this.getAttribute('center')) || [-98.5795, 39.8283];
      const zoom = parseFloat(this.getAttribute('zoom') || '4');
      const style = this.getAttribute('style') || 'mapbox://styles/mapbox/satellite-streets-v12';

      this._map = new mapboxgl.Map({
        container: this.shadowRoot.getElementById('map'),
        style,
        center,
        zoom,
        preserveDrawingBuffer: true
      });

      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: false,
        placeholder: 'Search address or place'
      });
      this._map.addControl(geocoder, 'top-left');

      this._draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: { polygon: true, trash: true },
        defaultMode: 'draw_polygon'
      });
      this._map.addControl(this._draw, 'top-left');

      this._wireUi();

      this._map.on('draw.create', () => this._updateMeasurements());
      this._map.on('draw.update', () => this._updateMeasurements());
      this._map.on('draw.delete', () => {
        this.shadowRoot.getElementById('output').innerHTML = '<strong>Draw shapes</strong> then see total area & perimeter.';
        this._updateMeasurements();
      });

      this._setupSupabase();
    }

    _wireUi() {
      const out = this.shadowRoot.getElementById('output');
      const btnPoly = this.shadowRoot.getElementById('btn-poly');
      const btnRect = this.shadowRoot.getElementById('btn-rect');
      const btnFree = this.shadowRoot.getElementById('btn-freehand');
      const btnCircle = this.shadowRoot.getElementById('btn-circle');
      const btnClear = this.shadowRoot.getElementById('btn-clear');
      const btnUnits = this.shadowRoot.getElementById('btn-units');
      const btnImage = this.shadowRoot.getElementById('btn-image');
      const btnData = this.shadowRoot.getElementById('btn-data');
      const btnToken = this.shadowRoot.getElementById('btn-token');
      const btnSave = this.shadowRoot.getElementById('btn-save');

      btnPoly.addEventListener('click', () => {
        this._draw.changeMode('draw_polygon');
        this._mode = 'polygon';
        out.innerHTML = 'Polygon mode: click to add vertices, double-click to finish.';
      });

      btnRect.addEventListener('click', () => {
        out.innerHTML = 'Rectangle: click first corner, then second corner.';
        let first = null;
        const onClick = (e) => {
          if (!first) {
            first = [e.lngLat.lng, e.lngLat.lat];
          } else {
            const second = [e.lngLat.lng, e.lngLat.lat];
            const minX = Math.min(first[0], second[0]);
            const maxX = Math.max(first[0], second[0]);
            const minY = Math.min(first[1], second[1]);
            const maxY = Math.max(first[1], second[1]);
            const rect = { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[ [minX,minY],[maxX,minY],[maxX,maxY],[minX,maxY],[minX,minY] ]] } };
            this._draw.add(rect);
            this._map.off('click', onClick);
            first = null;
            this._updateMeasurements();
          }
        };
        this._map.off('click', onClick);
        this._map.on('click', onClick);
      });

      this._freehand = { active:false, points:[] };
      const finishFreehand = () => {
        if (!this._freehand.active || this._freehand.points.length < 3) return;
        const coords = this._freehand.points.slice();
        coords.push(coords[0]);
        const poly = { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[coords] } };
        this._draw.add(poly);
        this._freehand.active = false; this._freehand.points = [];
        this._map.getCanvas().style.cursor = '';
        this._map.dragPan.enable();
        this._updateMeasurements();
      };

      btnFree.addEventListener('click', () => {
        out.innerHTML = 'Freehand: hold mouse button and move to draw; release to finish.';
        this._map.getCanvas().style.cursor = 'crosshair';
        this._mode = 'freehand';
        this._freehand.active = false; this._freehand.points = [];
      });

      this._map.on('mousedown', (e) => {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        if (this._mode === 'freehand') {
          this._freehand.active = true;
          this._freehand.points = [[e.lngLat.lng, e.lngLat.lat]];
          this._map.dragPan.disable();
        }
      });
      this._map.on('mousemove', (e) => {
        if (!this._freehand.active) return;
        const last = this._freehand.points[this._freehand.points.length - 1];
        const curr = [e.lngLat.lng, e.lngLat.lat];
        const dx = curr[0] - last[0];
        const dy = curr[1] - last[1];
        if (Math.abs(dx) > 0.00002 || Math.abs(dy) > 0.00002) {
          this._freehand.points.push(curr);
        }
      });
      this._map.on('mouseup', () => finishFreehand());

      btnCircle.addEventListener('click', () => {
        out.innerHTML = 'Click map for circle center…';
        this._map.getCanvas().style.cursor = 'crosshair';
        this._map.once('click', (e) => {
          this._map.getCanvas().style.cursor = '';
          const center = [e.lngLat.lng, e.lngLat.lat];
          const input = prompt(`Enter radius (${this._units==='imperial'?'feet':'meters'}):`, this._units==='imperial'?'50':'15');
          if (!input) { this._updateMeasurements(); return; }
          const radius = Number(input);
          if (Number.isNaN(radius) || radius <= 0) { alert('Please enter a positive number.'); return; }
          let radiusMi = radius / 5280;
          if (this._units === 'metric') {
            radiusMi = (radius / 1000) * 0.621371; // meters -> km -> miles
          }
          const circle = turf.circle(center, radiusMi, { steps: 128, units: 'miles' });
          this._draw.add(circle);
          this._updateMeasurements();
        });
      });

      btnClear.addEventListener('click', () => {
        this._draw.deleteAll();
        this._updateMeasurements();
      });

      btnUnits.addEventListener('click', () => {
        this._units = this._units === 'imperial' ? 'metric' : 'imperial';
        this._updateUnitsButton();
        this._updateMeasurements();
        this.dispatchEvent(new CustomEvent('abh:units', { detail: { units: this._units } }));
      });

      btnImage.addEventListener('click', () => {
        this._map.getCanvas().toBlob(blob => {
          if (!blob) return alert('Snapshot failed. Try again after map fully loads.');
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'area-snapshot.png';
          link.click();
        });
      });

      btnData.addEventListener('click', () => {
        const data = this.getData();
        if (!data.features.length) return alert('Draw an area first.');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'measurement-data.json';
        link.click();
      });

      btnToken.addEventListener('click', () => {
        const existing = localStorage.getItem('mapbox_token') || '';
        const token = prompt('pk.eyJ1Ijoic2VhbG5zdHJpcGVuc3BlY2lhbGlzdCIsImEiOiJjbWZtaXE4aW4wMmE5MmpvaWEzMms2MXg3In0.2Py8b4hLtIqzLHVGAo9sYg:', existing);
        if (token != null) {
          localStorage.setItem('mapbox_token', token.trim());
          alert('Token saved. Reload to apply.');
        }
      });

      btnSave.addEventListener('click', () => this._saveToSupabase());

      this._updateUnitsButton();
    }

    _updateUnitsButton() {
      const btnUnits = this.shadowRoot.getElementById('btn-units');
      if (!btnUnits) return;
      btnUnits.textContent = this._units === 'imperial' ? 'Units: ft / sq ft' : 'Units: m / sq m';
    }

    _parseCenter(attr) {
      if (!attr) return null;
      const parts = attr.split(',').map(Number);
      if (parts.length === 2 && parts.every(n => !Number.isNaN(n))) return parts;
      return null;
    }

    _sumMeasurements() {
      const data = this._draw.getAll();
      let areaSqMeters = 0;
      let perimeterKm = 0;
      for (const feat of data.features) {
        try {
          areaSqMeters += turf.area(feat);
          const lines = turf.polygonToLine(feat);
          perimeterKm += turf.length(lines, { units: 'kilometers' });
        } catch (_) { /* ignore non-polygons */ }
      }
      const areaSqFt = areaSqMeters * 10.76391041671;
      const perimeterMeters = perimeterKm * 1000;
      const perimeterFeet = perimeterKm * 3280.8398950131;

      return {
        features: data.features,
        area: this._units === 'imperial' ? areaSqFt : areaSqMeters,
        perimeter: this._units === 'imperial' ? perimeterFeet : perimeterMeters,
        area_sq_m: areaSqMeters,
        area_sq_ft: areaSqFt,
        perimeter_m: perimeterMeters,
        perimeter_ft: perimeterFeet,
        units: this._units
      };
    }

    _updateMeasurements() {
      const out = this.shadowRoot.getElementById('output');
      const data = this._sumMeasurements();
      if (!data.features.length) return;
      const areaLabel = this._units === 'imperial' ? 'sq ft' : 'sq m';
      const perimLabel = this._units === 'imperial' ? 'ft' : 'm';
      out.innerHTML = `
        <div><strong>Total Area:</strong> ${data.area.toFixed(2)} ${areaLabel}</div>
        <div><strong>Total Perimeter:</strong> ${data.perimeter.toFixed(2)} ${perimLabel}</div>
        <div>${data.features.length} shape(s)</div>
      `;

      const detail = {
        area: data.area,
        perimeter: data.perimeter,
        units: this._units,
        geojson: { type: 'FeatureCollection', features: data.features },
        area_sq_m: data.area_sq_m,
        area_sq_ft: data.area_sq_ft,
        perimeter_m: data.perimeter_m,
        perimeter_ft: data.perimeter_ft
      };
      this.dispatchEvent(new CustomEvent('abh:change', { detail }));
      if (this._postMessage && window.parent && window.parent !== window) {
        try { window.parent.postMessage({ type: 'abh:change', payload: detail }, this._targetOrigin); } catch (_) {}
      }
    }

    getData() {
      const sums = this._sumMeasurements();
      return {
        units: this._units,
        area: Number(sums.area.toFixed(2)),
        perimeter: Number(sums.perimeter.toFixed(2)),
        area_sq_m: Number(sums.area_sq_m.toFixed(2)),
        area_sq_ft: Number(sums.area_sq_ft.toFixed(2)),
        perimeter_m: Number(sums.perimeter_m.toFixed(2)),
        perimeter_ft: Number(sums.perimeter_ft.toFixed(2)),
        features: sums.features
      };
    }

    clear() {
      this._draw.deleteAll();
      this._updateMeasurements();
    }

    setToken(token) {
      localStorage.setItem('mapbox_token', token);
      alert('Token saved. Reload to apply.');
    }

    setUnits(units) {
      if (units === 'imperial' || units === 'metric') {
        this._units = units;
        this._updateUnitsButton();
        this._updateMeasurements();
      }
    }

    async _setupSupabase() {
      const url = this.getAttribute('supabase-url');
      const key = this.getAttribute('supabase-key');
      const table = this.getAttribute('supabase-table') || 'measurements';
      const saveRow = this.shadowRoot.getElementById('save-row');
      if (url && key) {
        saveRow.style.display = '';
        if (!this._supabase) {
          await ensureScript(CDN.supabaseJs, 'supabase');
          // globalThis.supabase.createClient in v2 is at window.supabase.createClient
          this._supabase = window.supabase.createClient(url, key);
        }
        this._table = table;
      } else {
        saveRow.style.display = 'none';
        this._supabase = null;
      }
    }

    async _saveToSupabase() {
      if (!this._supabase) return alert('Supabase is not configured on this component.');
      const data = this.getData();
      if (!data.features.length) return alert('Draw an area first.');
      try {
        const row = {
          created_at: new Date().toISOString(),
          units: data.units,
          area_sq_m: data.area_sq_m,
          area_sq_ft: data.area_sq_ft,
          perimeter_m: data.perimeter_m,
          perimeter_ft: data.perimeter_ft,
          geojson: { type: 'FeatureCollection', features: data.features }
        };
        const { error } = await this._supabase.from(this._table).insert(row);
        if (error) throw error;
        alert('Saved to Supabase.');
        this.dispatchEvent(new CustomEvent('abh:saved', { detail: row }));
      } catch (e) {
        console.error(e);
        alert('Save failed: ' + (e.message || 'Unknown error'));
      }
    }
  }

  customElements.define('area-bid-helper', AreaBidHelper);
})();

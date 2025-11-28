import { create } from 'zustand'

export type UnitSystem = 'metric' | 'imperial'
export type Mode = 'pan' | 'polygon' | 'line' | 'freehand'

export type MapStyleId =
  | 'auto'
  | 'mapbox://styles/mapbox/streets-v12'
  | 'mapbox://styles/mapbox/outdoors-v12'
  | 'mapbox://styles/mapbox/satellite-streets-v12'
  | 'mapbox://styles/mapbox/light-v11'
  | 'mapbox://styles/mapbox/dark-v11'

type Measurements = {
  area?: number // square meters
  length?: number // meters
}

type Store = {
  unitSystem: UnitSystem
  mode: Mode
  measurements: Measurements
  clearTick: number
  styleId: MapStyleId
  smoothing: number // 0..10 (affects simplify tolerance)
  command?: { type: string; id: number; payload?: unknown }
  setUnitSystem: (u: UnitSystem) => void
  toggleUnits: () => void
  setMode: (m: Mode) => void
  setMeasurements: (m: Measurements) => void
  requestClear: () => void
  setStyleId: (s: MapStyleId) => void
  setSmoothing: (n: number) => void
  requestCommand: (type: string, payload?: unknown) => void
}

export const useAppStore = create<Store>((set, get) => ({
  // Deterministic defaults for SSR/CSR to avoid hydration mismatches
  unitSystem: 'metric',
  mode: 'freehand',
  measurements: {},
  clearTick: 0,
  styleId: 'auto',
  smoothing: 2,
  command: undefined,
  setUnitSystem: (u) => {
    try { localStorage.setItem('UNIT_SYSTEM', u) } catch {}
    set({ unitSystem: u })
  },
  toggleUnits: () => {
    const next = get().unitSystem === 'metric' ? 'imperial' : 'metric'
    try { localStorage.setItem('UNIT_SYSTEM', next) } catch {}
    set({ unitSystem: next })
  },
  setMode: (m) => set({ mode: m }),
  setMeasurements: (m) => set({ measurements: m }),
  requestClear: () => set((s) => ({ clearTick: s.clearTick + 1, measurements: {} })),
  setStyleId: (s) => { try { localStorage.setItem('MAP_STYLE', s) } catch {}; set({ styleId: s }) },
  setSmoothing: (n) => { try { localStorage.setItem('SMOOTHING', String(n)) } catch {}; set({ smoothing: n }) },
  requestCommand: (type, payload) => set(() => ({ command: { type, id: Date.now(), payload } })),
}))

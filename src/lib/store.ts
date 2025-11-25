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
  command?: { type: string; id: number }
  setUnitSystem: (u: UnitSystem) => void
  toggleUnits: () => void
  setMode: (m: Mode) => void
  setMeasurements: (m: Measurements) => void
  requestClear: () => void
  setStyleId: (s: MapStyleId) => void
  setSmoothing: (n: number) => void
  requestCommand: (type: string) => void
}

export const useAppStore = create<Store>((set, get) => ({
  unitSystem: (typeof window !== 'undefined' && (localStorage.getItem('UNIT_SYSTEM') as UnitSystem)) || 'metric',
  mode: 'freehand',
  measurements: {},
  clearTick: 0,
  styleId: (typeof window !== 'undefined' && (localStorage.getItem('MAP_STYLE') as MapStyleId)) || 'auto',
  smoothing: (typeof window !== 'undefined' && Number(localStorage.getItem('SMOOTHING') || '2')) || 2,
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
  requestCommand: (type) => set(() => ({ command: { type, id: Date.now() } })),
}))

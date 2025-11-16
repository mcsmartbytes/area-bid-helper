import { create } from 'zustand'

export type UnitSystem = 'metric' | 'imperial'
export type Mode = 'pan' | 'polygon' | 'line'

type Measurements = {
  area?: number // square meters
  length?: number // meters
}

type Store = {
  unitSystem: UnitSystem
  mode: Mode
  measurements: Measurements
  clearTick: number
  setUnitSystem: (u: UnitSystem) => void
  toggleUnits: () => void
  setMode: (m: Mode) => void
  setMeasurements: (m: Measurements) => void
  requestClear: () => void
}

export const useAppStore = create<Store>((set, get) => ({
  unitSystem: (typeof window !== 'undefined' && (localStorage.getItem('UNIT_SYSTEM') as UnitSystem)) || 'metric',
  mode: 'pan',
  measurements: {},
  clearTick: 0,
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
}))


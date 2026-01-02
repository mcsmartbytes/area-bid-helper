import { create } from "zustand";
import { computeQuoteLines } from "./engine";
import { Geometry, MeasurementDoc, Mode, QuoteLine, ServiceTemplate } from "./types";

function now() { return new Date().toISOString(); }
function uid() { return crypto.randomUUID(); }

type QuoteState = {
  jobId?: string;
  mode: Mode;
  activeServiceId?: string;

  templates: ServiceTemplate[];
  geometries: Geometry[];

  rateOverrides: Record<string, number>;
  minimumOverrides: Record<string, number>;

  lines: QuoteLine[];
  total: number;

  // "Resume measurement"
  measurementDocId?: string;

  setMode: (mode: Mode) => void;
  setJob: (jobId: string) => void;
  setTemplates: (t: ServiceTemplate[]) => void;
  setActiveService: (serviceId: string) => void;

  upsertGeometry: (g: Omit<Geometry, "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string }) => void;
  removeGeometry: (id: string) => void;
  clearAll: () => void;

  // persistence hooks (wire to Supabase/DB)
  loadMeasurementDoc: (doc: MeasurementDoc) => void;
  toMeasurementDoc: (name: string, photoMeta?: MeasurementDoc["photoMeta"]) => MeasurementDoc;
};

export const useQuoteStore = create<QuoteState>((set, get) => ({
  mode: "MAP",
  templates: [],
  geometries: [],
  rateOverrides: {},
  minimumOverrides: {},
  lines: [],
  total: 0,

  setMode: (mode) => set({ mode }),
  setJob: (jobId) => set({ jobId }),
  setTemplates: (templates) => {
    set({ templates });
    const { geometries, rateOverrides, minimumOverrides } = get();
    const { lines, total } = computeQuoteLines({ templates, geometries, rateOverrides, minimumOverrides });
    set({ lines, total });
  },
  setActiveService: (activeServiceId) => set({ activeServiceId }),

  upsertGeometry: (g) => {
    const state = get();
    const idx = state.geometries.findIndex(x => x.id === g.id);
    const updated: Geometry = {
      ...g,
      createdAt: g.createdAt ?? (idx >= 0 ? state.geometries[idx].createdAt : now()),
      updatedAt: now(),
    } as Geometry;

    const geometries = idx >= 0
      ? state.geometries.map(x => (x.id === updated.id ? updated : x))
      : [...state.geometries, updated];

    const { lines, total } = computeQuoteLines({
      templates: state.templates,
      geometries,
      rateOverrides: state.rateOverrides,
      minimumOverrides: state.minimumOverrides,
    });

    set({ geometries, lines, total });
  },

  removeGeometry: (id) => {
    const state = get();
    const geometries = state.geometries.filter(g => g.id !== id);
    const { lines, total } = computeQuoteLines({
      templates: state.templates,
      geometries,
      rateOverrides: state.rateOverrides,
      minimumOverrides: state.minimumOverrides,
    });
    set({ geometries, lines, total });
  },

  clearAll: () => {
    const state = get();
    const geometries: Geometry[] = [];
    const { lines, total } = computeQuoteLines({
      templates: state.templates,
      geometries,
      rateOverrides: state.rateOverrides,
      minimumOverrides: state.minimumOverrides,
    });
    set({ geometries, lines, total });
  },

  loadMeasurementDoc: (doc) => {
    set({
      measurementDocId: doc.id,
      jobId: doc.jobId,
      mode: doc.mode,
      geometries: doc.geometries,
    });
    const state = get();
    const { lines, total } = computeQuoteLines({
      templates: state.templates,
      geometries: doc.geometries,
      rateOverrides: state.rateOverrides,
      minimumOverrides: state.minimumOverrides,
    });
    set({ lines, total });
  },

  toMeasurementDoc: (name, photoMeta) => {
    const state = get();
    return {
      id: state.measurementDocId ?? uid(),
      jobId: state.jobId ?? "unassigned",
      name,
      mode: state.mode,
      photoMeta,
      geometries: state.geometries,
      createdAt: now(),
      updatedAt: now(),
    };
  },
}));

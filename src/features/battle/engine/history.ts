import type {
  LayerStates,
  MapArea,
  MapPoi,
  MapZone,
  MapCell,
  MapHazard,
  MapObject,
  MapSettings,
  MapTrap,
  TacticalMap,
} from "@/types/battlemap";

/* ============================================================
 * Storico delle modifiche — MODULO PURO.
 *
 * Annullare NON significa ricordare l'intera mappa a ogni click: con
 * mappe da migliaia di celle sarebbe insostenibile. Ogni operazione
 * produce una PATCH (solo ciò che cambia) e la sua inversa, calcolata
 * dallo stato in quel momento. Annullare significa applicare l'inversa.
 * ============================================================ */

/** Valore `null` = elemento da rimuovere. */
export interface MapPatch {
  cells?: Record<string, MapCell | null>;
  objects?: Record<string, MapObject | null>;
  traps?: Record<string, MapTrap | null>;
  hazards?: Record<string, MapHazard | null>;
  areas?: Record<string, MapArea | null>;
  zones?: Record<string, MapZone | null>;
  poi?: Record<string, MapPoi | null>;
  settings?: Partial<MapSettings>;
  layers?: Partial<LayerStates>;
}

export interface HistoryEntry {
  label: string;
  patch: MapPatch;
  inverse: MapPatch;
}

export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

export const EMPTY_HISTORY: HistoryState = { past: [], future: [] };

/** Profondità dello storico: oltre, si perde memoria del più vecchio. */
export const HISTORY_LIMIT = 120;

type Identified = { id: string };

function listToPatchTarget<T extends Identified>(
  list: T[],
  patch: Record<string, T | null> | undefined
): T[] {
  if (!patch) return list;
  const next = list.filter((element) => patch[element.id] !== null);
  const seen = new Set(next.map((element) => element.id));
  const merged = next.map((element) => patch[element.id] ?? element);
  for (const [id, value] of Object.entries(patch)) {
    if (value && !seen.has(id)) merged.push(value);
  }
  return merged;
}

/** Applica una patch e restituisce una mappa nuova (mai mutata). */
export function applyPatch(map: TacticalMap, patch: MapPatch): TacticalMap {
  const cells = patch.cells ? { ...map.cells } : map.cells;
  if (patch.cells) {
    for (const [key, value] of Object.entries(patch.cells)) {
      if (value === null) delete cells[key];
      else cells[key] = value;
    }
  }

  return {
    ...map,
    cells,
    objects: listToPatchTarget(map.objects, patch.objects),
    traps: listToPatchTarget(map.traps, patch.traps),
    hazards: listToPatchTarget(map.hazards, patch.hazards),
    areas: listToPatchTarget(map.areas, patch.areas),
    zones: listToPatchTarget(map.zones, patch.zones),
    poi: listToPatchTarget(map.poi, patch.poi),
    settings: patch.settings
      ? { ...map.settings, ...patch.settings }
      : map.settings,
    layers: patch.layers ? { ...map.layers, ...patch.layers } : map.layers,
  };
}

function inverseFor<T extends Identified>(
  list: T[],
  patch: Record<string, T | null> | undefined
): Record<string, T | null> | undefined {
  if (!patch) return undefined;
  const byId = new Map(list.map((element) => [element.id, element]));
  const inverse: Record<string, T | null> = {};
  for (const id of Object.keys(patch)) {
    inverse[id] = byId.get(id) ?? null;
  }
  return inverse;
}

/**
 * L'inversa di una patch, calcolata sullo stato PRIMA di applicarla:
 * per ogni chiave toccata si memorizza il valore che aveva.
 */
export function invertPatch(map: TacticalMap, patch: MapPatch): MapPatch {
  const inverse: MapPatch = {};

  if (patch.cells) {
    inverse.cells = {};
    for (const key of Object.keys(patch.cells)) {
      inverse.cells[key] = map.cells[key] ?? null;
    }
  }
  inverse.objects = inverseFor(map.objects, patch.objects);
  inverse.traps = inverseFor(map.traps, patch.traps);
  inverse.hazards = inverseFor(map.hazards, patch.hazards);
  inverse.areas = inverseFor(map.areas, patch.areas);
  inverse.zones = inverseFor(map.zones, patch.zones);
  inverse.poi = inverseFor(map.poi, patch.poi);

  if (patch.settings) {
    const settings: Partial<MapSettings> = {};
    for (const key of Object.keys(patch.settings) as (keyof MapSettings)[]) {
      // Ogni chiave torna al valore che aveva: nessuna copia dell'intero
      // blocco impostazioni.
      Object.assign(settings, { [key]: map.settings[key] });
    }
    inverse.settings = settings;
  }
  if (patch.layers) {
    const layers: Partial<LayerStates> = {};
    for (const key of Object.keys(patch.layers) as (keyof LayerStates)[]) {
      Object.assign(layers, { [key]: map.layers[key] });
    }
    inverse.layers = layers;
  }

  return inverse;
}

/** True se la patch non cambia nulla: non merita una voce di storico. */
export function isEmptyPatch(patch: MapPatch): boolean {
  return (
    Object.keys(patch.cells ?? {}).length === 0 &&
    Object.keys(patch.objects ?? {}).length === 0 &&
    Object.keys(patch.traps ?? {}).length === 0 &&
    Object.keys(patch.hazards ?? {}).length === 0 &&
    Object.keys(patch.areas ?? {}).length === 0 &&
    Object.keys(patch.zones ?? {}).length === 0 &&
    Object.keys(patch.poi ?? {}).length === 0 &&
    Object.keys(patch.settings ?? {}).length === 0 &&
    Object.keys(patch.layers ?? {}).length === 0
  );
}

export interface CommitResult {
  map: TacticalMap;
  history: HistoryState;
  /** False quando la patch era vuota e non è successo nulla. */
  changed: boolean;
}

/**
 * Esegue un'operazione e la registra. Una nuova azione cancella il
 * "futuro": è il comportamento che ogni editor ha, e che ogni utente
 * si aspetta.
 */
export function commit(
  map: TacticalMap,
  history: HistoryState,
  label: string,
  patch: MapPatch
): CommitResult {
  if (isEmptyPatch(patch)) return { map, history, changed: false };

  const entry: HistoryEntry = {
    label,
    patch,
    inverse: invertPatch(map, patch),
  };
  const past = [...history.past, entry].slice(-HISTORY_LIMIT);

  return {
    map: applyPatch(map, patch),
    history: { past, future: [] },
    changed: true,
  };
}

export function canUndo(history: HistoryState): boolean {
  return history.past.length > 0;
}

export function canRedo(history: HistoryState): boolean {
  return history.future.length > 0;
}

export function undo(
  map: TacticalMap,
  history: HistoryState
): CommitResult {
  const entry = history.past[history.past.length - 1];
  if (!entry) return { map, history, changed: false };
  return {
    map: applyPatch(map, entry.inverse),
    history: {
      past: history.past.slice(0, -1),
      future: [entry, ...history.future].slice(0, HISTORY_LIMIT),
    },
    changed: true,
  };
}

export function redo(
  map: TacticalMap,
  history: HistoryState
): CommitResult {
  const [entry, ...rest] = history.future;
  if (!entry) return { map, history, changed: false };
  return {
    map: applyPatch(map, entry.patch),
    history: { past: [...history.past, entry].slice(-HISTORY_LIMIT), future: rest },
    changed: true,
  };
}

/** Etichetta dell'ultima operazione: la si mostra sul pulsante Annulla. */
export function lastLabel(history: HistoryState): string | null {
  return history.past[history.past.length - 1]?.label ?? null;
}

export function nextLabel(history: HistoryState): string | null {
  return history.future[0]?.label ?? null;
}

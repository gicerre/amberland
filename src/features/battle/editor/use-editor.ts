"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { CanvasApi } from "@/features/battle/components/battle-canvas";
import { useSaveBattleMap, useUpdateBattle } from "@/features/battle/data";
import {
  canRedo,
  canUndo,
  commit as commitHistory,
  EMPTY_HISTORY,
  lastLabel,
  nextLabel,
  redo as redoHistory,
  undo as undoHistory,
  type CommitResult,
  type HistoryState,
  type MapPatch,
} from "@/features/battle/engine/history";
import {
  applyCellPatch,
  buildObstacleIndex,
  copySelection,
  normalizeTacticalMap,
  pasteClipboard,
  type MapClipboard,
} from "@/features/battle/engine/tactical";
import {
  buildToolPatch,
  bulkCellPatch,
  DEFAULT_TOOL_SETTINGS,
  type ToolSettings,
} from "@/features/battle/editor/operations";
import type {
  BackgroundImage,
  Battle,
  GridConfig,
  Position,
} from "@/types/battle";
import {
  type BrushShape,
  type EditorMode,
  type EditorTool,
  MAP_LIMITS,
  type MapCell,
  type MapLayer,
  type TacticalMap,
} from "@/types/battlemap";

/* ============================================================
 * Stato del Battlemap Editor.
 *
 * La mappa vive in memoria mentre si lavora: ogni gesto è una patch
 * registrata nello storico, il salvataggio è un atto esplicito. È il
 * modello di qualunque editor serio — e l'unico che rende annulla e
 * ripristina davvero istantanei.
 * ============================================================ */

export type SelectionMode = "REPLACE" | "ADD" | "TOGGLE";

/** Stato del salvataggio, mostrato senza ambiguità nella testata. */
export type SaveState = "SAVED" | "DIRTY" | "SAVING" | "ERROR";

/** Dati di battaglia modificabili dall'editor. */
export interface BattleDraft {
  name: string;
  description: string;
  grid: GridConfig;
  background: BackgroundImage | null;
}

/** Quiete prima dell'autosalvataggio. */
const AUTOSAVE_DELAY_MS = 4000;

export type ElementKind = "object" | "trap" | "hazard" | "area";

export interface EditorSelection {
  cells: string[];
  kind: ElementKind | null;
  elementId: string | null;
}

const EMPTY_SELECTION: EditorSelection = {
  cells: [],
  kind: null,
  elementId: null,
};

let idCounter = 0;
const newId = () =>
  `el-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

export function useMapEditorState(battle: Battle) {
  const save = useSaveBattleMap(battle.id);
  const updateBattle = useUpdateBattle(battle.id);

  const [map, setMap] = useState<TacticalMap>(() =>
    normalizeTacticalMap(battle.tactical)
  );
  const [history, setHistory] = useState<HistoryState>(EMPTY_HISTORY);
  const [tools, setTools] = useState<ToolSettings>(DEFAULT_TOOL_SETTINGS);
  const [brushShape, setBrushShape] = useState<BrushShape>("PENCIL");
  const [brushSize, setBrushSize] = useState(1);
  const [selection, setSelection] = useState<EditorSelection>(EMPTY_SELECTION);
  const [mode, setMode] = useState<EditorMode>("EDIT");
  const [clipboard, setClipboard] = useState<MapClipboard | null>(null);
  const [dirty, setDirty] = useState(false);
  const [battleDirty, setBattleDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const viewport = useRef<CanvasApi | null>(null);

  /**
   * Bozza dei dati di battaglia: nome, descrizione, griglia e immagine.
   * Vivono qui perché l'editor è l'unico posto in cui si configura una
   * battlemap — non esiste più una schermata di preparazione a parte.
   */
  const [draft, setDraft] = useState<BattleDraft>(() => ({
    name: battle.name,
    description: battle.description,
    grid: battle.grid,
    background: battle.background,
  }));
  const grid = draft.grid;

  /** Indice degli ingombri: ricalcolato solo quando cambiano gli oggetti. */
  const obstacles = useMemo(() => buildObstacleIndex(map), [map]);

  /* ----------------------------- Storico ---------------------------- */

  /**
   * Mappa e storico si muovono insieme, con due `setState` affiancati:
   * aggiornare lo storico DENTRO l'updater della mappa sarebbe un effetto
   * collaterale in fase di render, e in StrictMode verrebbe eseguito due
   * volte.
   */
  const applyResult = useCallback((result: CommitResult) => {
    if (!result.changed) return;
    setMap(result.map);
    setHistory(result.history);
    setDirty(true);
  }, []);

  const commit = useCallback(
    (label: string, patch: MapPatch) => {
      applyResult(commitHistory(map, history, label, patch));
    },
    [map, history, applyResult]
  );

  const undo = useCallback(() => {
    applyResult(undoHistory(map, history));
  }, [map, history, applyResult]);

  const redo = useCallback(() => {
    applyResult(redoHistory(map, history));
  }, [map, history, applyResult]);

  /* --------------------------- Strumenti ---------------------------- */

  /**
   * Applica uno strumento a un insieme di celle. `override` serve alle
   * azioni rapide: "crea elemento" deve funzionare senza costringere il
   * Master a cambiare strumento prima.
   */
  const applyTool = useCallback(
    (keys: string[], override?: EditorTool) => {
      const settings = override ? { ...tools, tool: override } : tools;
      const layer = layerForTool(settings.tool);
      if (layer && map.layers[layer]?.locked) return;

      const result = buildToolPatch(map, settings, keys, newId);
      if (result) commit(result.label, result.patch);
    },
    [map, tools, commit]
  );

  /** Alza o abbassa di N livelli tutte le caselle selezionate. */
  const raiseSelection = useCallback(
    (delta: number) => {
      if (selection.cells.length === 0) return;
      const { after } = applyCellPatch(
        map.cells,
        selection.cells,
        (cell) => ({
          elevation: Math.max(
            MAP_LIMITS.minElevation,
            Math.min(MAP_LIMITS.maxElevation, cell.elevation + delta)
          ),
        }),
        map.settings.defaultTerrain
      );
      commit(delta > 0 ? "Rialza" : "Abbassa", { cells: after });
    },
    [map, selection.cells, commit]
  );

  /** Seleziona tutte le caselle configurate: base delle modifiche massive. */
  const selectAllConfigured = useCallback(() => {
    const keys = new Set(Object.keys(map.cells));
    for (const element of [
      ...map.objects,
      ...map.traps,
      ...map.hazards,
      ...map.areas,
    ]) {
      element.cells.forEach((key) => keys.add(key));
    }
    setSelection({ cells: [...keys], kind: null, elementId: null });
  }, [map]);

  /** Modifica in blocco le celle selezionate dal pannello proprietà. */
  const patchSelectedCells = useCallback(
    (change: Partial<MapCell>, label: string) => {
      if (selection.cells.length === 0) return;
      const result = bulkCellPatch(map, selection.cells, change, label);
      commit(result.label, result.patch);
    },
    [map, selection.cells, commit]
  );

  /* --------------------------- Selezione ---------------------------- */

  const selectCells = useCallback(
    (keys: string[], selectionMode: SelectionMode = "REPLACE") => {
      setSelection((current) => {
        if (selectionMode === "REPLACE") {
          return { cells: keys, kind: null, elementId: null };
        }
        const set = new Set(current.cells);
        for (const key of keys) {
          if (selectionMode === "TOGGLE" && set.has(key)) set.delete(key);
          else set.add(key);
        }
        return { ...current, cells: [...set] };
      });
    },
    []
  );

  const selectElement = useCallback(
    (kind: ElementKind, id: string, cells: string[]) => {
      setSelection({ cells, kind, elementId: id });
    },
    []
  );

  const clearSelection = useCallback(() => setSelection(EMPTY_SELECTION), []);

  /* ---------------------------- Elementi ---------------------------- */

  const updateElement = useCallback(
    (
      kind: ElementKind,
      id: string,
      /** Solo i campi da cambiare: il tipo esatto lo conosce il pannello. */
      change: Record<string, unknown>,
      label: string
    ) => {
      const list =
        kind === "object"
          ? map.objects
          : kind === "trap"
            ? map.traps
            : kind === "hazard"
              ? map.hazards
              : map.areas;
      const element = (list as { id: string }[]).find(
        (entry) => entry.id === id
      );
      if (!element) return;

      const updated = { ...(element as Record<string, unknown>), ...change };
      commit(label, { [pluralOf(kind)]: { [id]: updated } } as MapPatch);
    },
    [map, commit]
  );

  const deleteElement = useCallback(
    (kind: ElementKind, id: string) => {
      commit("Elimina elemento", {
        [pluralOf(kind)]: { [id]: null },
      } as MapPatch);
      clearSelection();
    },
    [commit, clearSelection]
  );

  /* -------------------------- Copia/incolla -------------------------- */

  const copy = useCallback(() => {
    const content = copySelection(map, selection.cells);
    if (content) setClipboard(content);
    return content;
  }, [map, selection.cells]);

  const paste = useCallback(
    (anchor: Position) => {
      if (!clipboard) return;
      const pasted = pasteClipboard(
        clipboard,
        anchor,
        { ...battle.grid, ...grid },
        newId
      );
      const patch: MapPatch = { cells: {} };
      for (const [key, cell] of Object.entries(pasted.cells)) {
        patch.cells![key] = cell;
      }
      if (pasted.objects.length > 0) {
        patch.objects = Object.fromEntries(
          pasted.objects.map((object) => [object.id, object])
        );
      }
      if (pasted.traps.length > 0) {
        patch.traps = Object.fromEntries(
          pasted.traps.map((trap) => [trap.id, trap])
        );
      }
      if (pasted.hazards.length > 0) {
        patch.hazards = Object.fromEntries(
          pasted.hazards.map((hazard) => [hazard.id, hazard])
        );
      }
      commit("Incolla", patch);
    },
    [clipboard, battle.grid, grid, commit]
  );

  /* ------------------------------ Layer ------------------------------ */

  const toggleLayer = useCallback(
    (layer: MapLayer, field: "visible" | "locked") => {
      const current = map.layers[layer];
      commit(`Layer ${layer}`, {
        layers: { [layer]: { ...current, [field]: !current[field] } },
      });
    },
    [map.layers, commit]
  );

  /* --------------------------- Impostazioni -------------------------- */

  const patchSettings = useCallback(
    (change: Partial<TacticalMap["settings"]>, label = "Impostazioni") => {
      commit(label, { settings: change });
    },
    [commit]
  );

  /**
   * Sostituisce l'intera mappa (rigenerazione da preset). Lo storico
   * riparte: tenere l'inversa di una mappa intera vanificherebbe il
   * motivo per cui lo storico è fatto di patch.
   */
  const replaceMap = useCallback((next: TacticalMap) => {
    setMap(next);
    setHistory(EMPTY_HISTORY);
    setSelection(EMPTY_SELECTION);
    setDirty(true);
  }, []);

  /** Modifica un dato della battaglia (nome, griglia, immagine…). */
  const patchBattle = useCallback((change: Partial<BattleDraft>) => {
    setDraft((current) => ({ ...current, ...change }));
    setBattleDirty(true);
  }, []);

  const patchGrid = useCallback(
    (change: Partial<GridConfig>) => {
      setDraft((current) => ({
        ...current,
        grid: { ...current.grid, ...change },
      }));
      setBattleDirty(true);
    },
    []
  );

  const resizeGrid = useCallback(
    (cols: number, rows: number) => patchGrid({ cols, rows }),
    [patchGrid]
  );

  /* --------------------------- Salvataggio --------------------------- */

  /**
   * Salvataggio unico: la mappa tattica e i dati di battaglia partono
   * insieme, così "salvato" significa davvero salvato tutto.
   */
  const saveMap = useCallback(() => {
    setSaveError(null);
    const tasks: Promise<unknown>[] = [];

    if (battleDirty) {
      // Griglia e immagine si toccano solo prima dello schieramento: a
      // scontro aperto l'API le rifiuterebbe, e con esse l'intero
      // salvataggio. Nome e descrizione restano modificabili sempre.
      const layoutEditable =
        battle.status === "DRAFT" || battle.status === "READY";
      tasks.push(
        updateBattle.mutateAsync({
          name: draft.name,
          description: draft.description,
          ...(layoutEditable
            ? { grid: draft.grid, background: draft.background }
            : {}),
        })
      );
    }
    if (dirty || battleDirty) {
      tasks.push(
        save.mutateAsync({
          map,
          grid: { cols: draft.grid.cols, rows: draft.grid.rows },
        })
      );
    }
    if (tasks.length === 0) return;

    void Promise.all(tasks)
      .then(() => {
        setDirty(false);
        setBattleDirty(false);
      })
      .catch((error: Error) => setSaveError(error.message));
  }, [save, updateBattle, map, draft, dirty, battleDirty, battle.status]);

  // L'autosalvataggio deve chiamare l'ULTIMA versione di `saveMap`, non
  // quella catturata al primo render.
  const saveRef = useRef(saveMap);
  saveRef.current = saveMap;

  /**
   * Autosalvataggio: qualche secondo di quiete e le modifiche partono da
   * sole. Il Master non deve ricordarsi di premere niente per non
   * perdere mezz'ora di configurazione.
   */
  useEffect(() => {
    if (!dirty && !battleDirty) return;
    const timer = setTimeout(() => saveRef.current(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dirty, battleDirty, map, draft]);

  const saving = save.isPending || updateBattle.isPending;
  const saveState: SaveState = saveError
    ? "ERROR"
    : saving
      ? "SAVING"
      : dirty || battleDirty
        ? "DIRTY"
        : "SAVED";

  return {
    battle,
    draft,
    patchBattle,
    patchGrid,
    map,
    grid,
    obstacles,
    tools,
    setTools,
    brushShape,
    setBrushShape,
    brushSize,
    setBrushSize,
    selection,
    selectCells,
    selectElement,
    clearSelection,
    mode,
    setMode,
    clipboard,
    dirty: dirty || battleDirty,
    saving,
    saveState,
    saveError,
    viewport,
    history: {
      canUndo: canUndo(history),
      canRedo: canRedo(history),
      undoLabel: lastLabel(history),
      redoLabel: nextLabel(history),
      depth: history.past.length,
    },
    applyTool,
    raiseSelection,
    selectAllConfigured,
    patchSelectedCells,
    updateElement,
    deleteElement,
    copy,
    paste,
    toggleLayer,
    patchSettings,
    replaceMap,
    resizeGrid,
    saveMap,
    undo,
    redo,
    commit,
  };
}

export type MapEditorApi = ReturnType<typeof useMapEditorState>;

const EditorContext = createContext<MapEditorApi | null>(null);

export const EditorProvider = EditorContext.Provider;

export function useEditor(): MapEditorApi {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor va usato dentro il Battlemap Editor");
  }
  return context;
}

/* ------------------------------ Utilità ----------------------------- */

function pluralOf(kind: ElementKind): "objects" | "traps" | "hazards" | "areas" {
  return kind === "object"
    ? "objects"
    : kind === "trap"
      ? "traps"
      : kind === "hazard"
        ? "hazards"
        : "areas";
}

/** Layer su cui agisce uno strumento: se è bloccato, lo strumento tace. */
export function layerForTool(tool: EditorTool): MapLayer | null {
  switch (tool) {
    case "TERRAIN":
      return "terrain";
    case "ELEVATION":
      return "elevation";
    case "BLOCK":
      return "walls";
    case "ELEMENT":
      return "objects";
    case "TRAP":
      return "traps";
    case "HAZARD":
      return "hazards";
    case "AREA":
      return "areas";
    case "COVER":
      return "cover";
    default:
      return null;
  }
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { useSaveBattleMap } from "@/features/battle/data";
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
import type { Battle, Position } from "@/types/battle";
import {
  type BrushShape,
  type EditorMode,
  type EditorTool,
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
  const [grid, setGrid] = useState({
    cols: battle.grid.cols,
    rows: battle.grid.rows,
  });

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

  /** Applica lo strumento attivo a un insieme di celle. */
  const applyTool = useCallback(
    (keys: string[]) => {
      const layer = layerForTool(tools.tool);
      if (layer && map.layers[layer]?.locked) return;

      const result = buildToolPatch(map, tools, keys, newId);
      if (result) commit(result.label, result.patch);
    },
    [map, tools, commit]
  );

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

  const resizeGrid = useCallback((cols: number, rows: number) => {
    setGrid({ cols, rows });
    setDirty(true);
  }, []);

  /* --------------------------- Salvataggio --------------------------- */

  const saveMap = useCallback(() => {
    save.mutate(
      { map, grid },
      { onSuccess: () => setDirty(false) }
    );
  }, [save, map, grid]);

  return {
    battle,
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
    dirty,
    saving: save.isPending,
    history: {
      canUndo: canUndo(history),
      canRedo: canRedo(history),
      undoLabel: lastLabel(history),
      redoLabel: nextLabel(history),
      depth: history.past.length,
    },
    applyTool,
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
    case "WATER":
      return "water";
    case "WALL":
      return "walls";
    case "OBSTACLE":
    case "OBJECT":
      return "objects";
    case "DOOR":
      return "interactions";
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

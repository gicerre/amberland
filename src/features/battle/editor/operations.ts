import type { MapPatch } from "@/features/battle/engine/history";
import { applyCellPatch, cellAt } from "@/features/battle/engine/tactical";
import {
  AREA_PRESETS,
  hazardFromTemplate,
  HAZARD_LIBRARY,
  objectFromTemplate,
  OBJECT_LIBRARY,
  trapFromTemplate,
  TRAP_LIBRARY,
} from "@/features/battle/library";
import { terrainById } from "@/features/battle/terrain";
import {
  MAP_LIMITS,
  type CoverLevel,
  type EditorTool,
  type HazardKind,
  type MapArea,
  type MapCell,
  type TacticalMap,
  type TerrainId,
} from "@/types/battlemap";

/* ============================================================
 * Operazioni degli strumenti — MODULO PURO.
 *
 * Ogni gesto dell'editor si traduce in UNA patch e una etichetta. Non
 * esistono scorciatoie che scrivono direttamente nello stato: passando
 * tutti di qui, annulla/ripristina funziona per costruzione e nessuno
 * strumento può dimenticarsi di registrarsi nello storico.
 * ============================================================ */

export interface ToolSettings {
  tool: EditorTool;
  terrainId: TerrainId;
  waterTerrain: TerrainId;
  /** Elevazione: variazione relativa, o valore assoluto se `set`. */
  elevationDelta: number;
  elevationMode: "RAISE" | "LOWER" | "SET" | "LEVEL";
  elevationValue: number;
  coverLevel: CoverLevel;
  objectTemplateId: string;
  trapTemplateId: string;
  hazardKind: HazardKind;
  areaPreset: number;
  /** Marca il terreno come difficile senza cambiarne il tipo. */
  makeDifficult: boolean;
}

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  tool: "SELECT",
  terrainId: "GRASS",
  waterTerrain: "SHALLOW_WATER",
  elevationDelta: 1,
  elevationMode: "RAISE",
  elevationValue: 1,
  coverLevel: "HALF",
  objectTemplateId: "tree",
  trapTemplateId: "spiked-pit",
  hazardKind: "FIRE",
  areaPreset: 0,
  makeDifficult: false,
};

const clampElevation = (value: number) =>
  Math.max(MAP_LIMITS.minElevation, Math.min(MAP_LIMITS.maxElevation, value));

/** Patch di celle a partire da una modifica uniforme. */
function cellsPatch(
  map: TacticalMap,
  keys: string[],
  change: Partial<MapCell> | ((cell: MapCell) => Partial<MapCell>)
): MapPatch {
  const { before, after } = applyCellPatch(
    map.cells,
    keys,
    change,
    map.settings.defaultTerrain
  );
  void before;
  return { cells: after };
}

/** Rimuove dalle liste gli elementi che restano senza celle. */
function eraseElements(map: TacticalMap, keys: string[]): MapPatch {
  const erased = new Set(keys);
  const patch: MapPatch = {};

  const prune = <T extends { id: string; cells: string[] }>(
    list: T[]
  ): Record<string, T | null> | undefined => {
    const changes: Record<string, T | null> = {};
    for (const element of list) {
      if (!element.cells.some((key) => erased.has(key))) continue;
      const remaining = element.cells.filter((key) => !erased.has(key));
      changes[element.id] =
        remaining.length > 0 ? { ...element, cells: remaining } : null;
    }
    return Object.keys(changes).length > 0 ? changes : undefined;
  };

  patch.objects = prune(map.objects);
  patch.traps = prune(map.traps);
  patch.hazards = prune(map.hazards);
  patch.areas = prune(map.areas);
  return patch;
}

export interface ToolResult {
  label: string;
  patch: MapPatch;
}

/**
 * Traduce un gesto (strumento + celle toccate) nella patch corrispondente.
 * `null` quando lo strumento non modifica nulla (selezione, pan).
 */
export function buildToolPatch(
  map: TacticalMap,
  settings: ToolSettings,
  keys: string[],
  newId: () => string
): ToolResult | null {
  if (keys.length === 0) return null;

  switch (settings.tool) {
    case "TERRAIN": {
      const definition = terrainById(
        settings.terrainId,
        map.settings.customTerrains
      );
      return {
        label: `Terreno: ${definition.label}`,
        patch: cellsPatch(map, keys, () => ({
          terrain: settings.terrainId,
          // Dipingere un terreno azzera gli override precedenti: quello
          // che si vede è quello che vale.
          movementCost: settings.makeDifficult ? 2 : undefined,
          blocked: definition.movementCost === null ? true : undefined,
        })),
      };
    }

    case "WATER": {
      const definition = terrainById(settings.waterTerrain);
      return {
        label: `Acqua: ${definition.label}`,
        patch: cellsPatch(map, keys, (cell) => ({
          terrain: settings.waterTerrain,
          // L'acqua sta più in basso del terreno che la circonda.
          elevation: Math.min(cell.elevation, settings.waterTerrain === "DEEP_WATER" ? -1 : 0),
        })),
      };
    }

    case "WALL":
      return {
        label: "Muro",
        patch: cellsPatch(map, keys, {
          terrain: "WALL",
          blocked: true,
          cover: "TOTAL",
        }),
      };

    case "ELEVATION": {
      const mode = settings.elevationMode;
      const label =
        mode === "RAISE"
          ? "Rialza"
          : mode === "LOWER"
            ? "Abbassa"
            : mode === "SET"
              ? `Quota ${settings.elevationValue}`
              : "Livella";

      if (mode === "LEVEL") {
        // Livellamento: tutte le celle prendono la quota della prima.
        const reference = cellAt(map, keys[0]!).elevation;
        return {
          label,
          patch: cellsPatch(map, keys, { elevation: reference }),
        };
      }
      return {
        label,
        patch: cellsPatch(map, keys, (cell) => ({
          elevation:
            mode === "SET"
              ? clampElevation(settings.elevationValue)
              : clampElevation(
                  cell.elevation +
                    (mode === "RAISE" ? 1 : -1) * Math.abs(settings.elevationDelta)
                ),
        })),
      };
    }

    case "COVER":
      return {
        label: `Copertura: ${settings.coverLevel}`,
        patch: cellsPatch(map, keys, {
          cover: settings.coverLevel === "NONE" ? undefined : settings.coverLevel,
        }),
      };

    case "OBSTACLE":
    case "DOOR":
    case "OBJECT": {
      const template =
        OBJECT_LIBRARY.find((entry) => entry.id === settings.objectTemplateId) ??
        OBJECT_LIBRARY[0]!;
      const object = objectFromTemplate(template, newId(), keys);
      return {
        label: `Oggetto: ${template.label}`,
        patch: { objects: { [object.id]: object } },
      };
    }

    case "TRAP": {
      const template =
        TRAP_LIBRARY.find((entry) => entry.id === settings.trapTemplateId) ??
        TRAP_LIBRARY[0]!;
      const trap = trapFromTemplate(template, newId(), keys);
      return {
        label: `Trappola: ${template.label}`,
        patch: { traps: { [trap.id]: trap } },
      };
    }

    case "HAZARD": {
      const template =
        HAZARD_LIBRARY.find((entry) => entry.kind === settings.hazardKind) ??
        HAZARD_LIBRARY[0]!;
      const hazard = hazardFromTemplate(template, newId(), keys);
      return {
        label: `Pericolo: ${template.label}`,
        patch: { hazards: { [hazard.id]: hazard } },
      };
    }

    case "AREA": {
      const preset = AREA_PRESETS[settings.areaPreset] ?? AREA_PRESETS[0]!;
      const area: MapArea = {
        id: newId(),
        name: preset.name,
        shape: "FREE",
        cells: keys,
        origin: null,
        radius: 0,
        direction: 0,
        effect: preset.effect,
        duration: preset.duration,
        color: preset.color,
        opacity: 0.35,
        visibleToPlayers: true,
        trigger: "",
        note: "",
      };
      return { label: `Area: ${preset.name}`, patch: { areas: { [area.id]: area } } };
    }

    case "ERASER": {
      const cells = cellsPatch(map, keys, () => ({
        terrain: map.settings.defaultTerrain,
        elevation: 0,
        movementCost: undefined,
        blocked: undefined,
        cover: undefined,
        coverEdges: undefined,
        check: undefined,
        note: undefined,
      }));
      return {
        label: "Cancella",
        patch: { ...cells, ...eraseElements(map, keys) },
      };
    }

    case "SELECT":
    case "PAN":
    default:
      return null;
  }
}

/** Modifica in blocco delle celle selezionate (pannello proprietà). */
export function bulkCellPatch(
  map: TacticalMap,
  keys: string[],
  change: Partial<MapCell>,
  label: string
): ToolResult {
  return { label, patch: cellsPatch(map, keys, change) };
}

/** True se lo strumento dipinge celle (e quindi vuole un pennello). */
export function isPaintingTool(tool: EditorTool): boolean {
  return (
    tool === "TERRAIN" ||
    tool === "WATER" ||
    tool === "WALL" ||
    tool === "ELEVATION" ||
    tool === "COVER" ||
    tool === "ERASER"
  );
}

/** True se lo strumento posa un elemento (oggetto, trappola, area…). */
export function isStampTool(tool: EditorTool): boolean {
  return (
    tool === "OBSTACLE" ||
    tool === "DOOR" ||
    tool === "OBJECT" ||
    tool === "TRAP" ||
    tool === "HAZARD" ||
    tool === "AREA"
  );
}

import {
  bresenhamLine,
  cellKey,
  isInsideGrid,
  parseCellKey,
} from "@/features/battle/engine/geometry";
import { terrainById } from "@/features/battle/terrain";
import type { GridConfig, Position } from "@/types/battle";
import {
  DEFAULT_MAP_SETTINGS,
  EMPTY_TACTICAL_MAP,
  MAP_LIMITS,
  type BrushShape,
  type CoverLevel,
  type Direction,
  type MapArea,
  type MapCell,
  type MapCells,
  type MapHazard,
  type MapObject,
  type MapTrap,
  type TacticalCheck,
  type TacticalMap,
  type TerrainDefinition,
} from "@/types/battlemap";

/* ============================================================
 * Interrogazione della mappa tattica — MODULO PURO.
 *
 * Nessun import da Firebase, React o DOM. Le stesse funzioni servono
 * all'editor (per disegnare e per il pannello proprietà), al motore di
 * movimento (per i costi) e alle API (per validare). Un'unica risposta
 * possibile alla domanda "cosa c'è in questa cella".
 * ============================================================ */

export const DEFAULT_CELL: MapCell = { terrain: "NORMAL", elevation: 0 };

/** La cella scritta, oppure quella di default della mappa. */
export function cellAt(map: TacticalMap, key: string): MapCell {
  return (
    map.cells[key] ?? {
      terrain: map.settings.defaultTerrain,
      elevation: 0,
    }
  );
}

export function cellAtPosition(map: TacticalMap, position: Position): MapCell {
  return cellAt(map, cellKey(position));
}

/** Definizione del terreno di una cella (personalizzati compresi). */
export function terrainOf(map: TacticalMap, key: string): TerrainDefinition {
  return terrainById(cellAt(map, key).terrain, map.settings.customTerrains);
}

/* ------------------------------------------------------------------ */
/* Indice degli ingombri                                              */
/* ------------------------------------------------------------------ */

export interface ObstacleInfo {
  objectId: string;
  blocksMovement: boolean;
  blocksSight: boolean;
  cover: CoverLevel;
}

const COVER_RANK: Record<CoverLevel, number> = {
  NONE: 0,
  HALF: 1,
  THREE_QUARTERS: 2,
  TOTAL: 3,
};

/** La copertura più forte fra due. */
export function strongerCover(a: CoverLevel, b: CoverLevel): CoverLevel {
  return COVER_RANK[a] >= COVER_RANK[b] ? a : b;
}

/**
 * Celle occupate dagli oggetti. Le porte aperte e gli oggetti distrutti
 * non ostacolano più nessuno: lo stato conta quanto la posizione.
 */
export function buildObstacleIndex(
  map: TacticalMap
): Map<string, ObstacleInfo> {
  const index = new Map<string, ObstacleInfo>();
  for (const object of map.objects) {
    const inert = object.state === "OPEN" || object.state === "BROKEN";
    const info: ObstacleInfo = {
      objectId: object.id,
      blocksMovement: object.blocksMovement && !inert,
      blocksSight: object.blocksSight && !inert,
      cover: inert ? "NONE" : object.cover,
    };
    for (const key of object.cells) {
      const existing = index.get(key);
      index.set(
        key,
        existing
          ? {
              objectId: existing.objectId,
              blocksMovement: existing.blocksMovement || info.blocksMovement,
              blocksSight: existing.blocksSight || info.blocksSight,
              cover: strongerCover(existing.cover, info.cover),
            }
          : info
      );
    }
  }
  return index;
}

/* ------------------------------------------------------------------ */
/* Proprietà tattiche                                                 */
/* ------------------------------------------------------------------ */

/**
 * Moltiplicatore del costo di movimento di una cella.
 * `null` = invalicabile. L'ordine è: blocco esplicito → oggetto che
 * sbarra → override del Master → terreno.
 */
export function movementCostAt(
  map: TacticalMap,
  key: string,
  obstacles?: Map<string, ObstacleInfo>
): number | null {
  const cell = cellAt(map, key);
  if (cell.blocked) return null;
  if (obstacles?.get(key)?.blocksMovement) return null;
  if (cell.movementCost !== undefined) return cell.movementCost;
  return terrainOf(map, key).movementCost;
}

export function isBlockedAt(
  map: TacticalMap,
  key: string,
  obstacles?: Map<string, ObstacleInfo>
): boolean {
  return movementCostAt(map, key, obstacles) === null;
}

export function elevationAt(map: TacticalMap, key: string): number {
  return cellAt(map, key).elevation;
}

/** Copertura complessiva di una cella: la più forte fra cella e oggetti. */
export function coverAt(
  map: TacticalMap,
  key: string,
  obstacles?: Map<string, ObstacleInfo>
): CoverLevel {
  const own = cellAt(map, key).cover ?? "NONE";
  const fromObject = obstacles?.get(key)?.cover ?? "NONE";
  return strongerCover(own, fromObject);
}

/** Copertura da una direzione specifica (muretti, parapetti). */
export function coverFrom(
  map: TacticalMap,
  key: string,
  direction: Direction
): CoverLevel {
  return cellAt(map, key).coverEdges?.[direction] ?? "NONE";
}

/** Prova richiesta dalla cella: quella specifica batte quella del terreno. */
export function checkAt(map: TacticalMap, key: string): TacticalCheck | null {
  const cell = cellAt(map, key);
  if (cell.check !== undefined) return cell.check;
  return terrainOf(map, key).check;
}

export function blocksSightAt(
  map: TacticalMap,
  key: string,
  obstacles?: Map<string, ObstacleInfo>
): boolean {
  return (
    terrainOf(map, key).blocksSight ||
    Boolean(obstacles?.get(key)?.blocksSight)
  );
}

export const trapsAt = (map: TacticalMap, key: string): MapTrap[] =>
  map.traps.filter((trap) => trap.cells.includes(key));

export const hazardsAt = (map: TacticalMap, key: string): MapHazard[] =>
  map.hazards.filter((hazard) => hazard.cells.includes(key));

export const areasAt = (map: TacticalMap, key: string): MapArea[] =>
  map.areas.filter((area) => area.cells.includes(key));

export const objectsAt = (map: TacticalMap, key: string): MapObject[] =>
  map.objects.filter((object) => object.cells.includes(key));

/* ------------------------------------------------------------------ */
/* Rapporto tattico                                                   */
/* ------------------------------------------------------------------ */

export interface CellReport {
  key: string;
  position: Position;
  cell: MapCell;
  terrain: TerrainDefinition;
  /** Costo in unità di mappa (metri), non in moltiplicatori. */
  cost: number | null;
  elevation: number;
  cover: CoverLevel;
  check: TacticalCheck | null;
  traps: MapTrap[];
  hazards: MapHazard[];
  areas: MapArea[];
  objects: MapObject[];
  blocksSight: boolean;
}

/**
 * Tutto ciò che il Master deve sapere di una cella, in una sola
 * chiamata: alimenta il pannello proprietà, la modalità tattica e il
 * Test Battle senza che nessuno dei tre reimplementi le regole.
 */
export function describeCell(
  map: TacticalMap,
  grid: GridConfig,
  key: string,
  obstacles = buildObstacleIndex(map)
): CellReport {
  const multiplier = movementCostAt(map, key, obstacles);
  return {
    key,
    position: parseCellKey(key) ?? { x: 0, y: 0 },
    cell: cellAt(map, key),
    terrain: terrainOf(map, key),
    cost: multiplier === null ? null : multiplier * grid.cellSize,
    elevation: elevationAt(map, key),
    cover: coverAt(map, key, obstacles),
    check: checkAt(map, key),
    traps: trapsAt(map, key),
    hazards: hazardsAt(map, key),
    areas: areasAt(map, key),
    objects: objectsAt(map, key),
    blocksSight: blocksSightAt(map, key, obstacles),
  };
}

/* ------------------------------------------------------------------ */
/* Forme di selezione e pennelli                                      */
/* ------------------------------------------------------------------ */

/** Celle di un rettangolo definito da due angoli qualsiasi. */
export function rectCells(a: Position, b: Position): string[] {
  const cells: string[] = [];
  for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) {
    for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) {
      cells.push(`${x},${y}`);
    }
  }
  return cells;
}

/** Celle di un cerchio (raggio in celle), pieno. */
export function circleCells(center: Position, radius: number): string[] {
  const cells: string[] = [];
  const span = Math.ceil(radius);
  for (let y = center.y - span; y <= center.y + span; y++) {
    for (let x = center.x - span; x <= center.x + span; x++) {
      const dx = x - center.x;
      const dy = y - center.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius + 0.35) cells.push(`${x},${y}`);
    }
  }
  return cells;
}

/** Celle di una linea fra due punti (Bresenham condiviso con la geometria). */
export function lineCells(a: Position, b: Position): string[] {
  return bresenhamLine(a, b).map(cellKey);
}

/**
 * Impronta del pennello: quadrata per `BRUSH`, singola per `PENCIL`.
 * `size` è il lato in celle (1, 2, 3…).
 */
export function brushCells(center: Position, size: number): string[] {
  if (size <= 1) return [cellKey(center)];
  const half = Math.floor(size / 2);
  const cells: string[] = [];
  for (let y = center.y - half; y <= center.y - half + size - 1; y++) {
    for (let x = center.x - half; x <= center.x - half + size - 1; x++) {
      cells.push(`${x},${y}`);
    }
  }
  return cells;
}

/**
 * Riempimento contiguo: parte da una cella e si espande finché il
 * terreno resta lo stesso. È il secchiello di qualunque editor.
 */
export function floodFillCells(
  map: TacticalMap,
  grid: GridConfig,
  start: Position
): string[] {
  const target = cellAt(map, cellKey(start)).terrain;
  const seen = new Set<string>();
  const queue: Position[] = [start];
  const filled: string[] = [];

  while (queue.length > 0 && filled.length < MAP_LIMITS.maxCells) {
    const current = queue.shift()!;
    const key = cellKey(current);
    if (seen.has(key) || !isInsideGrid(current, grid)) continue;
    seen.add(key);
    if (cellAt(map, key).terrain !== target) continue;

    filled.push(key);
    queue.push(
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 }
    );
  }
  return filled;
}

/** Scarta le celle fuori dai confini della griglia. */
export function insideGrid(keys: string[], grid: GridConfig): string[] {
  return keys.filter((key) => {
    const position = parseCellKey(key);
    return position ? isInsideGrid(position, grid) : false;
  });
}

/** Celle toccate da uno strumento, secondo la forma scelta. */
export function toolCells(
  shape: BrushShape,
  from: Position,
  to: Position,
  size: number,
  map: TacticalMap,
  grid: GridConfig
): string[] {
  switch (shape) {
    case "PENCIL":
      return insideGrid([cellKey(to)], grid);
    case "BRUSH":
      return insideGrid(brushCells(to, size), grid);
    case "RECTANGLE":
      return insideGrid(rectCells(from, to), grid);
    case "CIRCLE": {
      const radius = Math.max(
        Math.abs(to.x - from.x),
        Math.abs(to.y - from.y)
      );
      return insideGrid(circleCells(from, radius), grid);
    }
    case "LINE":
      return insideGrid(lineCells(from, to), grid);
    case "FILL":
      return floodFillCells(map, grid, to);
  }
}

/* ------------------------------------------------------------------ */
/* Modifiche                                                          */
/* ------------------------------------------------------------------ */

/** Una cella è "vuota" quando coincide con il default: non va scritta. */
export function isDefaultCell(cell: MapCell, defaultTerrain: string): boolean {
  return (
    cell.terrain === defaultTerrain &&
    cell.elevation === 0 &&
    cell.movementCost === undefined &&
    !cell.blocked &&
    (cell.cover ?? "NONE") === "NONE" &&
    !cell.coverEdges &&
    (cell.check ?? null) === null &&
    !cell.note
  );
}

/**
 * Applica una modifica a un insieme di celle e restituisce le celle
 * nuove insieme al DIFF (prima/dopo) da consegnare allo storico. Le
 * celle tornate al default vengono cancellate: la mappa resta sparsa.
 */
export function applyCellPatch(
  cells: MapCells,
  keys: string[],
  patch: Partial<MapCell> | ((cell: MapCell) => Partial<MapCell>),
  defaultTerrain = DEFAULT_MAP_SETTINGS.defaultTerrain
): { cells: MapCells; before: Record<string, MapCell | null>; after: Record<string, MapCell | null> } {
  const next: MapCells = { ...cells };
  const before: Record<string, MapCell | null> = {};
  const after: Record<string, MapCell | null> = {};

  for (const key of keys) {
    const current = cells[key] ?? { terrain: defaultTerrain, elevation: 0 };
    const delta = typeof patch === "function" ? patch(current) : patch;
    const updated: MapCell = { ...current, ...delta };

    const previous = cells[key] ?? null;
    if (isDefaultCell(updated, defaultTerrain)) {
      if (previous === null) continue;
      delete next[key];
      before[key] = previous;
      after[key] = null;
      continue;
    }
    if (previous && shallowEqualCell(previous, updated)) continue;

    next[key] = updated;
    before[key] = previous;
    after[key] = updated;
  }

  return { cells: next, before, after };
}

function shallowEqualCell(a: MapCell, b: MapCell): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Applica un diff di celle (usato da annulla/ripristina). */
export function applyCellDiff(
  cells: MapCells,
  diff: Record<string, MapCell | null>
): MapCells {
  const next: MapCells = { ...cells };
  for (const [key, value] of Object.entries(diff)) {
    if (value === null) delete next[key];
    else next[key] = value;
  }
  return next;
}

/* ------------------------------------------------------------------ */
/* Copia e incolla                                                    */
/* ------------------------------------------------------------------ */

export interface MapClipboard {
  /** Dimensioni del blocco copiato, in celle. */
  width: number;
  height: number;
  /** Celle relative all'angolo in alto a sinistra. */
  cells: Record<string, MapCell>;
  objects: MapObject[];
  traps: MapTrap[];
  hazards: MapHazard[];
}

/** Copia una selezione: celle e tutto ciò che vi si trova sopra. */
export function copySelection(
  map: TacticalMap,
  keys: string[]
): MapClipboard | null {
  const positions = keys
    .map(parseCellKey)
    .filter((position): position is Position => position !== null);
  if (positions.length === 0) return null;

  const minX = Math.min(...positions.map((position) => position.x));
  const minY = Math.min(...positions.map((position) => position.y));
  const maxX = Math.max(...positions.map((position) => position.x));
  const maxY = Math.max(...positions.map((position) => position.y));
  const selected = new Set(keys);

  const cells: Record<string, MapCell> = {};
  for (const position of positions) {
    const key = cellKey(position);
    const cell = map.cells[key];
    if (cell) cells[`${position.x - minX},${position.y - minY}`] = cell;
  }

  const shift = <T extends { cells: string[] }>(element: T): T => ({
    ...element,
    cells: element.cells
      .map(parseCellKey)
      .filter((position): position is Position => position !== null)
      .map((position) => `${position.x - minX},${position.y - minY}`),
  });

  const inside = (element: { cells: string[] }) =>
    element.cells.some((key) => selected.has(key));

  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    cells,
    objects: map.objects.filter(inside).map(shift),
    traps: map.traps.filter(inside).map(shift),
    hazards: map.hazards.filter(inside).map(shift),
  };
}

/** Traduce il contenuto degli appunti nell'ancora scelta. */
export function pasteClipboard(
  clipboard: MapClipboard,
  anchor: Position,
  grid: GridConfig,
  newId: () => string
): {
  cells: Record<string, MapCell>;
  objects: MapObject[];
  traps: MapTrap[];
  hazards: MapHazard[];
} {
  const translateKey = (key: string): string | null => {
    const position = parseCellKey(key);
    if (!position) return null;
    const moved = { x: position.x + anchor.x, y: position.y + anchor.y };
    return isInsideGrid(moved, grid) ? cellKey(moved) : null;
  };

  const cells: Record<string, MapCell> = {};
  for (const [key, cell] of Object.entries(clipboard.cells)) {
    const target = translateKey(key);
    if (target) cells[target] = cell;
  }

  const move = <T extends { id: string; cells: string[] }>(element: T): T => ({
    ...element,
    id: newId(),
    cells: element.cells
      .map(translateKey)
      .filter((key): key is string => key !== null),
  });

  return {
    cells,
    objects: clipboard.objects.map(move).filter((o) => o.cells.length > 0),
    traps: clipboard.traps.map(move).filter((t) => t.cells.length > 0),
    hazards: clipboard.hazards.map(move).filter((h) => h.cells.length > 0),
  };
}

/* ------------------------------------------------------------------ */
/* Normalizzazione                                                    */
/* ------------------------------------------------------------------ */

/**
 * Mappa sempre completa e coerente, anche se il documento è vecchio o
 * parziale: la UI non deve mai difendersi da campi mancanti.
 */
export function normalizeTacticalMap(
  raw: Partial<TacticalMap> | null | undefined
): TacticalMap {
  return {
    version: raw?.version ?? EMPTY_TACTICAL_MAP.version,
    cells: raw?.cells ?? {},
    objects: raw?.objects ?? [],
    traps: raw?.traps ?? [],
    hazards: raw?.hazards ?? [],
    areas: raw?.areas ?? [],
    layers: { ...EMPTY_TACTICAL_MAP.layers, ...(raw?.layers ?? {}) },
    settings: { ...DEFAULT_MAP_SETTINGS, ...(raw?.settings ?? {}) },
  };
}

/** Numero di celle scritte: serve all'avviso sui limiti del documento. */
export function mapWeight(map: TacticalMap): {
  cells: number;
  elements: number;
} {
  return {
    cells: Object.keys(map.cells).length,
    elements:
      map.objects.length +
      map.traps.length +
      map.hazards.length +
      map.areas.length,
  };
}

import {
  type CellRect,
  type DistanceMetric,
  type DistanceUnit,
  type GridConfig,
  type Position,
  type TerrainKind,
} from "@/types/battle";

import { DISTANCE_UNIT_SHORT } from "../constants";

/* ============================================================
 * Geometria del Campo di Battaglia — MODULO PURO.
 *
 * Nessun import da Firebase, da React o dal DOM: questi stessi
 * file girano nel browser (anteprima immediata del movimento) e
 * dentro le API Route (validazione autorevole). Un'unica logica,
 * nessuna divergenza possibile fra client e server.
 *
 * CONVENZIONI
 *  - Una posizione è la cella in alto a sinistra dell'ingombro.
 *    Una creatura di taglia 2 in (3,4) occupa (3,4)(4,4)(3,5)(4,5).
 *  - L'asse y cresce verso il BASSO (come nello spazio schermo).
 *  - Le distanze "in celle" sono numeri di passi; quelle "nel mondo"
 *    sono nell'unità della mappa (metri o piedi).
 * ============================================================ */

/* ------------------------------------------------------------------ */
/* Celle: chiavi, confini, ingombro                                   */
/* ------------------------------------------------------------------ */

/** Chiave stabile di una cella, usata come indice nelle mappe sparse. */
export function cellKey(position: Position): string {
  return `${position.x},${position.y}`;
}

/** Inverso di `cellKey`. Ritorna null se la chiave non è valida. */
export function parseCellKey(key: string): Position | null {
  const [rawX, rawY] = key.split(",");
  const x = Number(rawX);
  const y = Number(rawY);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  return { x, y };
}

export function samePosition(a: Position | null, b: Position | null): boolean {
  if (!a || !b) return a === b;
  return a.x === b.x && a.y === b.y;
}

/** True se la cella cade dentro i confini logici della mappa. */
export function isInsideGrid(position: Position, grid: GridConfig): boolean {
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < grid.cols &&
    position.y < grid.rows
  );
}

/** Riporta una posizione dentro i confini (utile dopo un drag). */
export function clampToGrid(position: Position, grid: GridConfig): Position {
  return {
    x: Math.min(Math.max(position.x, 0), Math.max(grid.cols - 1, 0)),
    y: Math.min(Math.max(position.y, 0), Math.max(grid.rows - 1, 0)),
  };
}

/**
 * Celle occupate da una creatura di taglia `size` posizionata in `position`.
 * Taglia 1 → una cella; taglia 2 → un quadrato 2×2; e così via.
 */
export function footprint(position: Position, size: number): Position[] {
  const span = Math.max(1, Math.floor(size));
  const cells: Position[] = [];
  for (let dy = 0; dy < span; dy++) {
    for (let dx = 0; dx < span; dx++) {
      cells.push({ x: position.x + dx, y: position.y + dy });
    }
  }
  return cells;
}

/** True se l'intero ingombro sta dentro la mappa. */
export function footprintFits(
  position: Position,
  size: number,
  grid: GridConfig
): boolean {
  return footprint(position, size).every((cell) => isInsideGrid(cell, grid));
}

/** Centro geometrico di una cella, in coordinate continue. */
export function cellCenter(position: Position): { x: number; y: number } {
  return { x: position.x + 0.5, y: position.y + 0.5 };
}

/** Tutte le celle di un rettangolo (zone di schieramento, aree quadrate). */
export function cellsInRect(rect: CellRect): Position[] {
  const cells: Position[] = [];
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      cells.push({ x, y });
    }
  }
  return cells;
}

export function isInsideRect(position: Position, rect: CellRect): boolean {
  return (
    position.x >= rect.x &&
    position.x < rect.x + rect.w &&
    position.y >= rect.y &&
    position.y < rect.y + rect.h
  );
}

/** True se la cella cade in almeno una delle zone indicate. */
export function isInsideAnyRect(
  position: Position,
  rects: CellRect[]
): boolean {
  return rects.some((rect) => isInsideRect(position, rect));
}

/* ------------------------------------------------------------------ */
/* Distanze                                                           */
/* ------------------------------------------------------------------ */

/**
 * Distanza fra due celle, espressa in NUMERO DI CELLE.
 *
 *  - CHEBYSHEV:   max(dx, dy) — la diagonale vale un passo (5e base)
 *  - ALTERNATING: variante DMG, una diagonale su due costa doppio
 *  - MANHATTAN:   dx + dy — nessuna diagonale
 *  - EUCLIDEAN:   distanza reale (non intera)
 */
export function cellDistance(
  a: Position,
  b: Position,
  metric: DistanceMetric
): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);

  switch (metric) {
    case "CHEBYSHEV":
      return Math.max(dx, dy);
    case "MANHATTAN":
      return dx + dy;
    case "EUCLIDEAN":
      return Math.sqrt(dx * dx + dy * dy);
    case "ALTERNATING": {
      const diagonal = Math.min(dx, dy);
      const straight = Math.max(dx, dy) - diagonal;
      // Ogni seconda diagonale costa un passo in più.
      return straight + diagonal + Math.floor(diagonal / 2);
    }
  }
}

/** Distanza fra due celle nell'unità della mappa (es. 12 metri). */
export function worldDistance(
  a: Position,
  b: Position,
  grid: GridConfig,
  metric: DistanceMetric = grid.metric
): number {
  return cellDistance(a, b, metric) * grid.cellSize;
}

/**
 * Distanza fra due creature tenendo conto dell'ingombro: è la distanza
 * minima fra le rispettive celle. Per due creature Medie coincide con
 * `worldDistance`; per un drago diventa la misura corretta per il range.
 */
export function entityDistance(
  a: { position: Position; size: number },
  b: { position: Position; size: number },
  grid: GridConfig,
  metric: DistanceMetric = grid.metric
): number {
  const cellsA = footprint(a.position, a.size);
  const cellsB = footprint(b.position, b.size);
  let best = Infinity;
  for (const cellA of cellsA) {
    for (const cellB of cellsB) {
      const distance = cellDistance(cellA, cellB, metric);
      if (distance < best) best = distance;
    }
  }
  return (best === Infinity ? 0 : best) * grid.cellSize;
}

/** True se due creature sono adiacenti (mischia). */
export function isAdjacent(
  a: { position: Position; size: number },
  b: { position: Position; size: number },
  grid: GridConfig
): boolean {
  return entityDistance(a, b, grid, "CHEBYSHEV") <= grid.cellSize;
}

/**
 * Formatta una distanza per la UI, con la virgola decimale italiana:
 * `formatDistance(1.5, "m")` → "1,5 m".
 */
export function formatDistance(value: number, unit: DistanceUnit): string {
  const rounded = Math.round(value * 100) / 100;
  const text = rounded.toLocaleString("it-IT", { maximumFractionDigits: 2 });
  return `${text} ${DISTANCE_UNIT_SHORT[unit]}`;
}

/** Frase pronta per il pannello: "Il Goblin si trova a 12 m". */
export function describeDistance(
  a: Position,
  b: Position,
  grid: GridConfig
): string {
  return formatDistance(worldDistance(a, b, grid), grid.unit);
}

/* ------------------------------------------------------------------ */
/* Vicinato                                                           */
/* ------------------------------------------------------------------ */

const ORTHOGONAL_STEPS: Position[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const DIAGONAL_STEPS: Position[] = [
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

/** True se la metrica ammette passi diagonali. */
export function allowsDiagonal(metric: DistanceMetric): boolean {
  return metric !== "MANHATTAN";
}

/** Celle adiacenti dentro la mappa, secondo la metrica configurata. */
export function neighbors(position: Position, grid: GridConfig): Position[] {
  const steps = allowsDiagonal(grid.metric)
    ? [...ORTHOGONAL_STEPS, ...DIAGONAL_STEPS]
    : ORTHOGONAL_STEPS;
  return steps
    .map((step) => ({ x: position.x + step.x, y: position.y + step.y }))
    .filter((cell) => isInsideGrid(cell, grid));
}

/** True se il passo fra due celle adiacenti è diagonale. */
export function isDiagonalStep(from: Position, to: Position): boolean {
  return from.x !== to.x && from.y !== to.y;
}

/* ------------------------------------------------------------------ */
/* Aree di effetto                                                    */
/* ------------------------------------------------------------------ */

/**
 * Celle entro un raggio espresso nell'unità della mappa.
 * Il default è la metrica della mappa (coerente con movimento e range);
 * per un template circolare da manuale si passa "EUCLIDEAN".
 */
export function cellsInRadius(
  center: Position,
  radius: number,
  grid: GridConfig,
  metric: DistanceMetric = grid.metric
): Position[] {
  const radiusInCells = radius / grid.cellSize;
  const span = Math.ceil(radiusInCells);
  const cells: Position[] = [];
  for (let y = center.y - span; y <= center.y + span; y++) {
    for (let x = center.x - span; x <= center.x + span; x++) {
      const cell = { x, y };
      if (!isInsideGrid(cell, grid)) continue;
      if (cellDistance(center, cell, metric) <= radiusInCells + 1e-9) {
        cells.push(cell);
      }
    }
  }
  return cells;
}

/**
 * Cono con origine su una cella. `direction` è in gradi (0 = destra,
 * crescente in senso orario perché y punta in basso); `length` e
 * l'apertura seguono il template 5e (~53°). L'origine non è inclusa.
 */
export function cellsInCone(
  origin: Position,
  direction: number,
  length: number,
  grid: GridConfig,
  apertureDegrees = 53
): Position[] {
  const lengthInCells = length / grid.cellSize;
  const span = Math.ceil(lengthInCells);
  const originCenter = cellCenter(origin);
  const directionRad = (direction * Math.PI) / 180;
  const halfAperture = (apertureDegrees * Math.PI) / 360;
  const cells: Position[] = [];

  for (let y = origin.y - span; y <= origin.y + span; y++) {
    for (let x = origin.x - span; x <= origin.x + span; x++) {
      const cell = { x, y };
      if (!isInsideGrid(cell, grid)) continue;
      if (samePosition(cell, origin)) continue;

      const center = cellCenter(cell);
      const vectorX = center.x - originCenter.x;
      const vectorY = center.y - originCenter.y;
      const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
      if (distance > lengthInCells + 1e-9) continue;

      const angle = Math.atan2(vectorY, vectorX);
      if (Math.abs(normalizeAngle(angle - directionRad)) <= halfAperture) {
        cells.push(cell);
      }
    }
  }
  return cells;
}

/** Riporta un angolo nell'intervallo (−π, π]. */
function normalizeAngle(angle: number): number {
  let value = angle;
  while (value > Math.PI) value -= 2 * Math.PI;
  while (value <= -Math.PI) value += 2 * Math.PI;
  return value;
}

/**
 * Linea di larghezza `width` (unità della mappa) fra due celle:
 * il template dei fulmini e delle scie.
 */
export function cellsInLine(
  from: Position,
  to: Position,
  width: number,
  grid: GridConfig
): Position[] {
  const halfWidthInCells = width / grid.cellSize / 2;
  const start = cellCenter(from);
  const end = cellCenter(to);
  const cells: Position[] = [];

  const minX = Math.floor(Math.min(from.x, to.x) - halfWidthInCells - 1);
  const maxX = Math.ceil(Math.max(from.x, to.x) + halfWidthInCells + 1);
  const minY = Math.floor(Math.min(from.y, to.y) - halfWidthInCells - 1);
  const maxY = Math.ceil(Math.max(from.y, to.y) + halfWidthInCells + 1);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const cell = { x, y };
      if (!isInsideGrid(cell, grid)) continue;
      if (distanceToSegment(cellCenter(cell), start, end) <= halfWidthInCells + 0.5) {
        cells.push(cell);
      }
    }
  }
  return cells;
}

/** Distanza di un punto dal segmento AB (coordinate continue). */
function distanceToSegment(
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const segmentX = b.x - a.x;
  const segmentY = b.y - a.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }
  const raw = ((point.x - a.x) * segmentX + (point.y - a.y) * segmentY) / lengthSquared;
  const t = Math.min(1, Math.max(0, raw));
  return Math.hypot(point.x - (a.x + t * segmentX), point.y - (a.y + t * segmentY));
}

/* ------------------------------------------------------------------ */
/* Linea di vista                                                     */
/* ------------------------------------------------------------------ */

/**
 * Celle attraversate dal segmento fra due celle (Bresenham).
 * Include gli estremi.
 */
export function bresenhamLine(from: Position, to: Position): Position[] {
  const cells: Position[] = [];
  let x = from.x;
  let y = from.y;
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const stepX = from.x < to.x ? 1 : -1;
  const stepY = from.y < to.y ? 1 : -1;
  let error = dx - dy;

  for (;;) {
    cells.push({ x, y });
    if (x === to.x && y === to.y) break;
    const doubleError = 2 * error;
    if (doubleError > -dy) {
      error -= dy;
      x += stepX;
    }
    if (doubleError < dx) {
      error += dx;
      y += stepY;
    }
  }
  return cells;
}

/** Terreni che interrompono la vista. */
const SIGHT_BLOCKING: TerrainKind[] = ["WALL"];

/**
 * True se esiste linea di vista fra due celle: nessun terreno opaco
 * lungo il tragitto. Gli estremi non bloccano mai (si vede sempre la
 * propria cella e quella del bersaglio).
 */
export function lineOfSight(
  from: Position,
  to: Position,
  terrain: Record<string, TerrainKind>
): boolean {
  const path = bresenhamLine(from, to);
  for (let index = 1; index < path.length - 1; index++) {
    const kind = terrain[cellKey(path[index]!)];
    if (kind && SIGHT_BLOCKING.includes(kind)) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Rendering: dal mondo logico ai pixel                               */
/* ------------------------------------------------------------------ */

/**
 * Lato in pixel di una cella perché la mappa entri nel viewport.
 * Zoom e pan NON passano di qui: sono trasformazioni CSS applicate
 * sopra, così le dimensioni logiche non cambiano mai.
 */
export function fitCellSize(
  viewport: { width: number; height: number },
  grid: GridConfig
): number {
  if (grid.cols <= 0 || grid.rows <= 0) return 0;
  return Math.min(viewport.width / grid.cols, viewport.height / grid.rows);
}

/** Angolo in alto a sinistra di una cella, in pixel. */
export function cellToPixel(
  position: Position,
  cellSizePx: number
): { left: number; top: number } {
  return { left: position.x * cellSizePx, top: position.y * cellSizePx };
}

/** Cella corrispondente a un punto in pixel (click e drag). */
export function pixelToCell(
  point: { x: number; y: number },
  cellSizePx: number
): Position {
  return {
    x: Math.floor(point.x / cellSizePx),
    y: Math.floor(point.y / cellSizePx),
  };
}

/**
 * Griglia suggerita a partire dalle proporzioni di un'immagine: dà al
 * Master un punto di partenza sensato, che resta libero di correggere.
 * Il lato lungo viene fissato a `longSideCells` celle.
 */
export function suggestGrid(
  naturalWidth: number,
  naturalHeight: number,
  longSideCells = 20
): { cols: number; rows: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { cols: longSideCells, rows: longSideCells };
  }
  const ratio = naturalWidth / naturalHeight;
  if (ratio >= 1) {
    return {
      cols: longSideCells,
      rows: Math.max(1, Math.round(longSideCells / ratio)),
    };
  }
  return {
    cols: Math.max(1, Math.round(longSideCells * ratio)),
    rows: longSideCells,
  };
}

/**
 * Confronto fra le proporzioni dell'immagine e quelle della griglia:
 * serve ad avvisare il Master prima che la mappa risulti deformata.
 * `delta` è lo scarto relativo (0 = combaciano).
 */
export function aspectMismatch(
  background: { naturalWidth: number; naturalHeight: number },
  grid: GridConfig
): { imageRatio: number; gridRatio: number; delta: number } {
  const imageRatio =
    background.naturalHeight > 0
      ? background.naturalWidth / background.naturalHeight
      : 0;
  const gridRatio = grid.rows > 0 ? grid.cols / grid.rows : 0;
  const delta =
    gridRatio > 0 ? Math.abs(imageRatio - gridRatio) / gridRatio : 0;
  return { imageRatio, gridRatio, delta };
}

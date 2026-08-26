import { TERRAIN_COST_MULTIPLIER } from "@/features/battle/constants";
import {
  cellKey,
  footprint,
  isInsideGrid,
  isDiagonalStep,
} from "@/features/battle/engine/geometry";
import {
  elevationAt,
  movementCostAt,
  type ObstacleInfo,
} from "@/features/battle/engine/tactical";
import type {
  Battle,
  Combatant,
  CombatantSide,
  GridConfig,
  Position,
  TerrainKind,
} from "@/types/battle";
import type { TacticalMap } from "@/types/battlemap";

/* ============================================================
 * Movimento — MODULO PURO.
 *
 * "Quali celle raggiungo con 9 metri, aggirando gli ostacoli?" è un
 * Dijkstra su griglia: il terreno difficile pesa il doppio, muri e
 * voragini sono invalicabili. Su 30 × 21 celle costa microsecondi, così
 * si può ricalcolare a ogni passaggio del puntatore senza cache.
 *
 * Lo stesso modulo gira nel browser (anteprima del percorso) e nella
 * transazione del server (verità): è ciò che impedisce a client e server
 * di dissentire su quanto lontano possa arrivare una pedina.
 * ============================================================ */

export interface OccupantInfo {
  combatantId: string;
  side: CombatantSide;
}

/**
 * Strato tattico: quando c'è, comanda lui. Costi, blocchi e dislivelli
 * arrivano dalla mappa dell'editor invece che dal vecchio `terrain` a
 * sei tipi, che resta valido per le battaglie create prima dell'editor.
 */
export interface TacticalContext {
  map: TacticalMap;
  obstacles: Map<string, ObstacleInfo>;
}

export interface MovementContext {
  grid: GridConfig;
  terrain: Record<string, TerrainKind>;
  tactical?: TacticalContext;
  /** Chiave di cella → chi la occupa (compreso l'ingombro delle taglie). */
  occupied: Map<string, OccupantInfo>;
  mover: {
    id: string;
    position: Position;
    size: number;
    side: CombatantSide;
  };
  /** Budget residuo nell'unità della mappa (es. 9 metri). */
  budget: number;
  rules: Pick<Battle["rules"], "blockOccupied" | "enforceMovement">;
}

/** Nodo della coda: la parità delle diagonali serve alla metrica 5-10-5. */
interface Node {
  position: Position;
  cost: number;
  /** Diagonali già percorse, modulo 2 (solo metrica ALTERNATING). */
  parity: number;
}

const nodeKey = (position: Position, parity: number) =>
  `${position.x},${position.y},${parity}`;

/**
 * Mappa di occupazione a partire dalle pedine sul campo: ogni creatura
 * occupa TUTTE le celle del proprio ingombro, non solo l'angolo.
 */
export function buildOccupancy(
  combatants: Pick<
    Combatant,
    "id" | "position" | "size" | "side" | "turnState" | "isDead"
  >[]
): Map<string, OccupantInfo> {
  const map = new Map<string, OccupantInfo>();
  for (const combatant of combatants) {
    // I caduti e i rimossi non ingombrano più il campo.
    if (!combatant.position || combatant.isDead) continue;
    if (combatant.turnState === "REMOVED") continue;
    for (const cell of footprint(combatant.position, combatant.size)) {
      map.set(cellKey(cell), {
        combatantId: combatant.id,
        side: combatant.side,
      });
    }
  }
  return map;
}

/** Fazioni ostili fra loro: si attraversano gli amici, non i nemici. */
function isHostile(a: CombatantSide, b: CombatantSide): boolean {
  const friendly = (side: CombatantSide) => side === "PC" || side === "ALLY";
  if (friendly(a)) return b === "ENEMY";
  if (a === "ENEMY") return friendly(b);
  return false; // I neutrali non ostacolano nessuno.
}

/** Movimento residuo di una pedina, nell'unità della mappa. */
export function remainingBudget(
  combatant: Pick<Combatant, "speed" | "movementUsed">
): number {
  return Math.max(0, combatant.speed - combatant.movementUsed);
}

/**
 * Una cella si può ATTRAVERSARE? Il terreno invalicabile no; i nemici
 * nemmeno (se la regola è attiva); gli alleati sì — regola 5e: si passa
 * attraverso un compagno, non ci si ferma sopra.
 */
function canEnterCell(
  context: MovementContext,
  cell: Position,
  { asDestination }: { asDestination: boolean }
): boolean {
  if (!isInsideGrid(cell, context.grid)) return false;

  const key = cellKey(cell);
  if (context.tactical) {
    const cost = movementCostAt(
      context.tactical.map,
      key,
      context.tactical.obstacles
    );
    if (cost === null) return false;
  } else {
    const kind = context.terrain[key];
    if (kind && TERRAIN_COST_MULTIPLIER[kind] === null) return false;
  }

  const occupant = context.occupied.get(key);
  if (!occupant || occupant.combatantId === context.mover.id) return true;

  // La destinazione non si condivide mai con nessuno.
  if (asDestination) return false;
  return !(context.rules.blockOccupied && isHostile(context.mover.side, occupant.side));
}

/** Tutte le celle dell'ingombro devono essere agibili, non solo l'angolo. */
function footprintUsable(
  context: MovementContext,
  origin: Position,
  options: { asDestination: boolean }
): boolean {
  return footprint(origin, context.mover.size).every((cell) =>
    canEnterCell(context, cell, options)
  );
}

/**
 * Sovrapprezzo del dislivello: salire costa, scendere no (semplificazione
 * a griglia della regola sull'arrampicata). Oltre `maxClimbableStep` il
 * passo è impossibile e il costo diventa infinito.
 */
function elevationPenalty(
  context: MovementContext,
  from: Position,
  to: Position
): number {
  const tactical = context.tactical;
  if (!tactical) return 0;

  const rise =
    elevationAt(tactical.map, cellKey(to)) -
    elevationAt(tactical.map, cellKey(from));
  if (rise <= 0) return 0;

  const { elevationStepCost, maxClimbableStep } = tactical.map.settings;
  if (rise > maxClimbableStep) return Infinity;
  return rise * elevationStepCost * context.grid.cellSize;
}

/**
 * Costo di un passo verso `to`, nell'unità della mappa.
 * `parity` è il numero di diagonali già percorse: con la metrica
 * ALTERNATING una diagonale su due costa doppio (variante DMG 5-10-5).
 */
export function stepCost(
  context: MovementContext,
  from: Position,
  to: Position,
  diagonal: boolean,
  parity: number
): number {
  const { grid } = context;
  let cells = 1;
  if (diagonal) {
    if (grid.metric === "MANHATTAN") return Infinity; // niente diagonali
    if (grid.metric === "ALTERNATING" && parity === 1) cells = 2;
  }

  // Il terreno difficile pesa sull'INTERO ingombro che vi entra: basta
  // che una cella lo sia perché il passo raddoppi.
  const occupiedCells = footprint(to, context.mover.size);
  const multiplier = occupiedCells.reduce((worst, cell) => {
    const key = cellKey(cell);
    if (context.tactical) {
      const cost = movementCostAt(
        context.tactical.map,
        key,
        context.tactical.obstacles
      );
      return cost === null ? Infinity : Math.max(worst, cost);
    }
    const kind = context.terrain[key];
    const cost = kind ? TERRAIN_COST_MULTIPLIER[kind] : 1;
    return Math.max(worst, cost ?? 1);
  }, 1);
  if (!Number.isFinite(multiplier)) return Infinity;

  return cells * multiplier * grid.cellSize + elevationPenalty(context, from, to);
}

/** Gli 8 (o 4) vicini di una cella, secondo la metrica della mappa. */
function neighborsOf(context: MovementContext, position: Position): Position[] {
  const cells: Position[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (context.grid.metric === "MANHATTAN" && dx !== 0 && dy !== 0) continue;
      cells.push({ x: position.x + dx, y: position.y + dy });
    }
  }
  return cells;
}

interface SearchResult {
  /** Chiave di cella → costo minimo per arrivarci. */
  costs: Map<string, number>;
  /** Chiave di cella → cella precedente nel percorso ottimo. */
  from: Map<string, Position>;
}

/**
 * Dijkstra vero e proprio. Coda a scansione lineare: su qualche centinaio
 * di celle è più veloce di un heap, e non introduce una struttura dati da
 * mantenere.
 */
function search(context: MovementContext): SearchResult {
  const limit = context.rules.enforceMovement ? context.budget : Infinity;
  const costs = new Map<string, number>();
  const from = new Map<string, Position>();
  const best = new Map<string, number>();

  const start: Node = { position: context.mover.position, cost: 0, parity: 0 };
  const queue: Node[] = [start];
  best.set(nodeKey(start.position, 0), 0);
  costs.set(cellKey(start.position), 0);

  while (queue.length > 0) {
    let index = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i]!.cost < queue[index]!.cost) index = i;
    }
    const current = queue.splice(index, 1)[0]!;
    if (current.cost > (best.get(nodeKey(current.position, current.parity)) ?? Infinity)) {
      continue;
    }

    for (const neighbor of neighborsOf(context, current.position)) {
      const diagonal = isDiagonalStep(current.position, neighbor);
      if (!footprintUsable(context, neighbor, { asDestination: false })) continue;

      const cost =
        current.cost +
        stepCost(context, current.position, neighbor, diagonal, current.parity);
      if (!Number.isFinite(cost) || cost > limit + 1e-9) continue;

      const parity =
        context.grid.metric === "ALTERNATING" && diagonal
          ? (current.parity + 1) % 2
          : current.parity;
      const key = nodeKey(neighbor, parity);
      if (cost >= (best.get(key) ?? Infinity) - 1e-9) continue;

      best.set(key, cost);
      const plainKey = cellKey(neighbor);
      if (cost < (costs.get(plainKey) ?? Infinity)) {
        costs.set(plainKey, cost);
        from.set(plainKey, current.position);
      }
      queue.push({ position: neighbor, cost, parity });
    }
  }

  return { costs, from };
}

/**
 * Celle su cui la pedina può FERMARSI, con il costo per arrivarci.
 * Le celle di sola transito (occupate da un alleato) restano fuori.
 */
export function reachableCells(context: MovementContext): Map<string, number> {
  const { costs } = search(context);
  const reachable = new Map<string, number>();
  for (const [key, cost] of costs) {
    const [x, y] = key.split(",").map(Number);
    const position = { x: x as number, y: y as number };
    if (!footprintUsable(context, position, { asDestination: true })) continue;
    reachable.set(key, cost);
  }
  return reachable;
}

/**
 * Percorso ottimo fino a `target`, dalla cella di partenza a quella di
 * arrivo comprese. `null` se la meta è irraggiungibile con il budget.
 */
export function pathTo(
  context: MovementContext,
  target: Position
): Position[] | null {
  if (!footprintUsable(context, target, { asDestination: true })) return null;

  const { costs, from } = search(context);
  const targetKey = cellKey(target);
  if (!costs.has(targetKey)) return null;

  const path: Position[] = [target];
  let cursor = from.get(targetKey);
  const startKey = cellKey(context.mover.position);
  while (cursor && cellKey(cursor) !== startKey) {
    path.unshift(cursor);
    cursor = from.get(cellKey(cursor));
  }
  path.unshift(context.mover.position);
  return path;
}

/**
 * Costo di un percorso PROPOSTO dal client. Il server non si fida mai
 * del percorso ricevuto: lo ripercorre passo per passo e, se una sola
 * tappa non è contigua o è impraticabile, lo rifiuta.
 */
export function pathCost(
  context: MovementContext,
  path: Position[]
): number | null {
  if (path.length === 0) return null;
  if (cellKey(path[0]!) !== cellKey(context.mover.position)) return null;

  let total = 0;
  let parity = 0;
  for (let index = 1; index < path.length; index++) {
    const previous = path[index - 1]!;
    const cell = path[index]!;
    const dx = Math.abs(cell.x - previous.x);
    const dy = Math.abs(cell.y - previous.y);
    if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) return null;

    const last = index === path.length - 1;
    if (!footprintUsable(context, cell, { asDestination: last })) return null;

    const diagonal = isDiagonalStep(previous, cell);
    const cost = stepCost(context, previous, cell, diagonal, parity);
    if (!Number.isFinite(cost)) return null;
    total += cost;
    if (context.grid.metric === "ALTERNATING" && diagonal) {
      parity = (parity + 1) % 2;
    }
  }
  return total;
}

/** Esito di una richiesta di movimento, pronto per API e UI. */
export interface MovementCheck {
  ok: boolean;
  path: Position[] | null;
  cost: number;
  /** Il costo supera il budget (rilevante solo se `enforceMovement`). */
  overBudget: boolean;
  reason: string | null;
}

/**
 * Verifica completa di uno spostamento: la stessa chiamata che fa
 * l'anteprima nel browser e la transazione sul server.
 */
export function checkMove(
  context: MovementContext,
  target: Position,
  proposedPath?: Position[]
): MovementCheck {
  const path = proposedPath?.length ? proposedPath : pathTo(context, target);
  if (!path) {
    return {
      ok: false,
      path: null,
      cost: 0,
      overBudget: false,
      reason: "Nessun percorso praticabile fino a quella cella",
    };
  }
  if (cellKey(path[path.length - 1]!) !== cellKey(target)) {
    return {
      ok: false,
      path: null,
      cost: 0,
      overBudget: false,
      reason: "Il percorso non termina sulla cella richiesta",
    };
  }

  const cost = pathCost(context, path);
  if (cost === null) {
    return {
      ok: false,
      path: null,
      cost: 0,
      overBudget: false,
      reason: "Percorso non valido",
    };
  }

  const overBudget = cost > context.budget + 1e-9;
  if (overBudget && context.rules.enforceMovement) {
    return {
      ok: false,
      path,
      cost,
      overBudget,
      reason: "Movimento insufficiente per arrivare fin lì",
    };
  }
  return { ok: true, path, cost, overBudget, reason: null };
}

/**
 * Celle libere attorno a un punto, in spirale quadrata: serve a posare
 * in blocco gli 8 Goblin senza che il Master li piazzi a uno a uno.
 * Restituisce meno posizioni di quelle chieste se il campo non basta.
 */
export function autoPlace(
  origin: Position,
  count: number,
  field: {
    grid: GridConfig;
    terrain: Record<string, TerrainKind>;
    occupied: Map<string, OccupantInfo>;
    size: number;
  }
): Position[] {
  const context: MovementContext = {
    grid: field.grid,
    terrain: field.terrain,
    occupied: new Map(field.occupied),
    mover: { id: "__placing__", position: origin, size: field.size, side: "NEUTRAL" },
    budget: 0,
    rules: { blockOccupied: true, enforceMovement: false },
  };

  const placed: Position[] = [];
  const maxRadius = Math.max(field.grid.cols, field.grid.rows);

  for (let radius = 0; radius <= maxRadius && placed.length < count; radius++) {
    for (let dy = -radius; dy <= radius && placed.length < count; dy++) {
      for (let dx = -radius; dx <= radius && placed.length < count; dx++) {
        // Solo il bordo dell'anello: l'interno è già stato visitato.
        if (radius > 0 && Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
          continue;
        }
        const cell = { x: origin.x + dx, y: origin.y + dy };
        if (!footprintUsable(context, cell, { asDestination: true })) continue;

        placed.push(cell);
        // La cella appena assegnata è occupata per chi viene dopo.
        for (const taken of footprint(cell, field.size)) {
          context.occupied.set(cellKey(taken), {
            combatantId: "__placing__",
            side: "NEUTRAL",
          });
        }
      }
    }
  }

  return placed;
}

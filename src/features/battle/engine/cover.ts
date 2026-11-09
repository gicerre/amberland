import { bresenhamLine, cellKey } from "@/features/battle/engine/geometry";
import {
  blocksSightAt,
  cellAt,
  coverAt,
  elevationAt,
  objectsAt,
  strongerCover,
  type ObstacleInfo,
} from "@/features/battle/engine/tactical";
import type { Position } from "@/types/battle";
import type {
  CoverLevel,
  Direction,
  TacticalMap,
} from "@/types/battlemap";

/* ============================================================
 * Copertura — MODULO PURO.
 *
 * La copertura non è una proprietà della casella in cui ci si trova: è
 * la relazione ATTACCANTE → ELEMENTO → BERSAGLIO. Un masso protegge solo
 * chi ci sta dietro rispetto a chi tira, e non protegge affatto da chi
 * lo aggira. Qui si percorre la retta fra i due e si guarda che cosa c'è
 * in mezzo, secondo ciò che il Master ha configurato sull'immagine.
 * ============================================================ */

const RANK: Record<CoverLevel, number> = {
  NONE: 0,
  HALF: 1,
  THREE_QUARTERS: 2,
  TOTAL: 3,
};

const BY_RANK: CoverLevel[] = ["NONE", "HALF", "THREE_QUARTERS", "TOTAL"];

/** Abbassa la copertura di un grado (tiro dall'alto). */
function weaken(level: CoverLevel): CoverLevel {
  return BY_RANK[Math.max(0, RANK[level] - 1)]!;
}

/** Dislivello oltre il quale chi tira scavalca con lo sguardo un riparo. */
const HIGH_GROUND_ADVANTAGE = 2;

export interface CoverSource {
  key: string;
  /** Nome dell'elemento ambientale, quando la copertura viene da lì. */
  label: string;
  level: CoverLevel;
}

export interface CoverResult {
  level: CoverLevel;
  /** Nessuna linea di vista: il bersaglio non è nemmeno inquadrabile. */
  blocked: boolean;
  sources: CoverSource[];
  /** Vantaggio di quota di chi attacca, in livelli. */
  highGround: number;
}

/** Direzione cardinale prevalente da `from` verso `to`. */
function directionFrom(from: Position, to: Position): Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "W" : "E";
  return dy >= 0 ? "N" : "S";
}

/**
 * Copertura di cui gode `target` rispetto a `attacker`.
 *
 * Concorrono, nell'ordine in cui il tavolo se le aspetta:
 *  - gli elementi ambientali attraversati dalla retta di tiro;
 *  - la copertura configurata sulla casella del bersaglio (un muretto
 *    dietro cui si acquatta);
 *  - i bordi direzionali della casella del bersaglio (parapetti,
 *    feritoie), ma solo dal lato da cui arriva il colpo.
 *
 * Chi tira da almeno due livelli più in alto vede oltre i ripari bassi:
 * la copertura scende di un grado.
 */
export function coverBetween(
  map: TacticalMap,
  obstacles: Map<string, ObstacleInfo>,
  attacker: Position,
  target: Position
): CoverResult {
  const path = bresenhamLine(attacker, target);
  const between = path.slice(1, -1);

  const attackerHeight = elevationAt(map, cellKey(attacker));
  const targetHeight = elevationAt(map, cellKey(target));
  const highGround = attackerHeight - targetHeight;

  const sources: CoverSource[] = [];
  let level: CoverLevel = "NONE";
  let blocked = false;

  for (const cell of between) {
    const key = cellKey(cell);

    if (blocksSightAt(map, key, obstacles)) {
      blocked = true;
      sources.push({
        key,
        label: objectsAt(map, key)[0]?.name ?? "Ostacolo",
        level: "TOTAL",
      });
      level = "TOTAL";
      continue;
    }

    const fromCell = coverAt(map, key, obstacles);
    if (fromCell === "NONE") continue;

    // Un riparo più basso di chi tira e di chi è bersaglio non copre
    // nulla: la quota conta quanto la posizione.
    const obstacleHeight = elevationAt(map, key);
    const effective =
      attackerHeight - obstacleHeight >= HIGH_GROUND_ADVANTAGE
        ? weaken(fromCell)
        : fromCell;
    if (effective === "NONE") continue;

    sources.push({
      key,
      label: objectsAt(map, key)[0]?.name ?? "Riparo",
      level: effective,
    });
    level = strongerCover(level, effective);
  }

  // Copertura propria della casella del bersaglio e dei suoi bordi.
  const ownCover = cellAt(map, cellKey(target)).cover ?? "NONE";
  if (ownCover !== "NONE") {
    sources.push({ key: cellKey(target), label: "Riparo sul posto", level: ownCover });
    level = strongerCover(level, ownCover);
  }

  const edge =
    cellAt(map, cellKey(target)).coverEdges?.[directionFrom(attacker, target)] ??
    "NONE";
  if (edge !== "NONE") {
    sources.push({ key: cellKey(target), label: "Parapetto", level: edge });
    level = strongerCover(level, edge);
  }

  return { level, blocked, sources, highGround };
}

/** True se fra le due caselle esiste linea di vista. */
export function hasLineOfSight(
  map: TacticalMap,
  obstacles: Map<string, ObstacleInfo>,
  from: Position,
  to: Position
): boolean {
  return !bresenhamLine(from, to)
    .slice(1, -1)
    .some((cell) => blocksSightAt(map, cellKey(cell), obstacles));
}

/** Bonus a CA e tiri salvezza per grado di copertura (regole 5e). */
export const COVER_AC_BONUS: Record<CoverLevel, number> = {
  NONE: 0,
  HALF: 2,
  THREE_QUARTERS: 5,
  TOTAL: 0,
};

/** Frase pronta per il tavolo: "Tre quarti di copertura dietro il Masso". */
export function describeCover(result: CoverResult): string {
  if (result.blocked) return "Nessuna linea di vista";
  switch (result.level) {
    case "NONE":
      return "Bersaglio allo scoperto";
    case "HALF":
      return `Mezza copertura${sourceSuffix(result)} (+2 CA)`;
    case "THREE_QUARTERS":
      return `Tre quarti di copertura${sourceSuffix(result)} (+5 CA)`;
    case "TOTAL":
      return "Copertura totale: non può essere bersagliato";
  }
}

function sourceSuffix(result: CoverResult): string {
  const label = result.sources[result.sources.length - 1]?.label;
  return label ? ` dietro ${label}` : "";
}

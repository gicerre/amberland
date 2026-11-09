import { cellKey, isInsideGrid, parseCellKey } from "@/features/battle/engine/geometry";
import {
  buildObstacleIndex,
  cellAt,
  coverAt,
  elevationAt,
  movementCostAt,
  type ObstacleInfo,
} from "@/features/battle/engine/tactical";
import type { GridConfig, Position } from "@/types/battle";
import type { MapPoi, TacticalMap } from "@/types/battlemap";

/* ============================================================
 * Analisi della battlemap — MODULO PURO.
 *
 * Non giudica se una mappa è bella: verifica se STA IN PIEDI. Le
 * domande sono quelle che al tavolo ci si accorge di aver sbagliato solo
 * a scontro iniziato — una zona murata dentro, due schieramenti a tre
 * passi, un campo senza un riparo, un ponte che è l'unico passaggio.
 *
 * Ogni problema porta con sé le caselle a cui si riferisce, così
 * l'editor può mostrarle invece di descriverle.
 * ============================================================ */

export const ISSUE_SEVERITIES = ["ERROR", "WARNING", "INFO"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export interface MapIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  /** Caselle da evidenziare sulla mappa. */
  cells: string[];
}

export interface ScoreBreakdown {
  label: string;
  /** 0–100. */
  value: number;
  hint: string;
}

export interface MapAnalysis {
  score: number;
  breakdown: ScoreBreakdown[];
  issues: MapIssue[];
  stats: {
    total: number;
    open: number;
    blocked: number;
    difficult: number;
    withCover: number;
    elevated: number;
    regions: number;
    chokepoints: number;
  };
}

/* ------------------------------------------------------------------ */
/* Attraversamento                                                    */
/* ------------------------------------------------------------------ */

const NEIGHBOURS: Position[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

function isOpen(
  map: TacticalMap,
  key: string,
  obstacles: Map<string, ObstacleInfo>
): boolean {
  return movementCostAt(map, key, obstacles) !== null;
}

/**
 * Si può passare da una casella alla vicina? Conta anche il dislivello:
 * un salto di quota oltre il limite è un muro, anche se il terreno è
 * libero.
 */
function canStep(
  map: TacticalMap,
  from: string,
  to: string,
  obstacles: Map<string, ObstacleInfo>
): boolean {
  if (!isOpen(map, to, obstacles)) return false;
  const rise = elevationAt(map, to) - elevationAt(map, from);
  return rise <= map.settings.maxClimbableStep;
}

/** Regioni connesse di caselle percorribili, dalla più grande. */
export function connectedRegions(
  map: TacticalMap,
  grid: GridConfig,
  obstacles = buildObstacleIndex(map)
): string[][] {
  const seen = new Set<string>();
  const regions: string[][] = [];

  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      const start = cellKey({ x, y });
      if (seen.has(start) || !isOpen(map, start, obstacles)) continue;

      const region: string[] = [];
      const queue: string[] = [start];
      seen.add(start);

      while (queue.length > 0) {
        const current = queue.pop()!;
        region.push(current);
        const position = parseCellKey(current);
        if (!position) continue;

        for (const step of NEIGHBOURS) {
          const next = { x: position.x + step.x, y: position.y + step.y };
          if (!isInsideGrid(next, grid)) continue;
          const nextKey = cellKey(next);
          if (seen.has(nextKey)) continue;
          if (!canStep(map, current, nextKey, obstacles)) continue;
          seen.add(nextKey);
          queue.push(nextKey);
        }
      }
      regions.push(region);
    }
  }

  return regions.sort((a, b) => b.length - a.length);
}

/** Distanza in passi fra due caselle, ignorando i costi. `null` se separate. */
export function stepDistance(
  map: TacticalMap,
  grid: GridConfig,
  from: string,
  to: string,
  obstacles = buildObstacleIndex(map)
): number | null {
  if (!isOpen(map, from, obstacles) || !isOpen(map, to, obstacles)) return null;

  const distances = new Map<string, number>([[from, 0]]);
  const queue: string[] = [from];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === to) return distances.get(current)!;
    const position = parseCellKey(current);
    if (!position) continue;

    for (const step of NEIGHBOURS) {
      const next = { x: position.x + step.x, y: position.y + step.y };
      if (!isInsideGrid(next, grid)) continue;
      const nextKey = cellKey(next);
      if (distances.has(nextKey)) continue;
      if (!canStep(map, current, nextKey, obstacles)) continue;
      distances.set(nextKey, distances.get(current)! + 1);
      queue.push(nextKey);
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Analisi                                                            */
/* ------------------------------------------------------------------ */

/** Soglie oltre le quali una mappa smette di funzionare al tavolo. */
const THRESHOLDS = {
  minCoverRatio: 0.08,
  maxCoverRatio: 0.6,
  maxDifficultRatio: 0.6,
  maxBlockedRatio: 0.55,
  minSpawnDistance: 6,
  maxSpawnDistance: 40,
  strandedRatio: 0.05,
};

export function analyzeMap(
  map: TacticalMap,
  grid: GridConfig,
  encounter: { partySize: number; enemyCount: number } = {
    partySize: 4,
    enemyCount: 4,
  }
): MapAnalysis {
  const obstacles = buildObstacleIndex(map);
  const issues: MapIssue[] = [];

  const total = grid.cols * grid.rows;
  let open = 0;
  let difficult = 0;
  let withCover = 0;
  let elevated = 0;

  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      const key = cellKey({ x, y });
      const cost = movementCostAt(map, key, obstacles);
      if (cost === null) continue;
      open++;
      if (cost > 1) difficult++;
      // Al riparo ci si sta DIETRO: conta la copertura della casella o
      // di una adiacente, che è ciò che accade davvero al tavolo.
      const covered =
        coverAt(map, key, obstacles) !== "NONE" ||
        NEIGHBOURS.some((step) => {
          const next = { x: x + step.x, y: y + step.y };
          return (
            isInsideGrid(next, grid) &&
            coverAt(map, cellKey(next), obstacles) !== "NONE"
          );
        });
      if (covered) withCover++;
      if (cellAt(map, key).elevation !== 0) elevated++;
    }
  }
  const blocked = total - open;

  const regions = connectedRegions(map, grid, obstacles);
  const main = regions[0] ?? [];
  const stranded = regions.slice(1).flat();

  /* -------------------------- Accessibilità ------------------------ */

  if (regions.length > 1 && stranded.length > 0) {
    issues.push({
      id: "regions",
      severity:
        stranded.length / Math.max(1, open) > THRESHOLDS.strandedRatio
          ? "ERROR"
          : "WARNING",
      title: `${regions.length - 1} zone isolate`,
      detail: `${stranded.length} caselle percorribili non sono collegate al resto della mappa: chi ci finisce non ne esce, e chi è fuori non ci arriva.`,
      cells: stranded,
    });
  }

  if (open === 0) {
    issues.push({
      id: "no-open",
      severity: "ERROR",
      title: "Nessuna casella percorribile",
      detail: "L'intera mappa è invalicabile: non ci si può muovere.",
      cells: [],
    });
  } else if (blocked / total > THRESHOLDS.maxBlockedRatio) {
    issues.push({
      id: "too-blocked",
      severity: "WARNING",
      title: "Mappa troppo chiusa",
      detail: `${Math.round((blocked / total) * 100)}% delle caselle è invalicabile: resta poco spazio per manovrare.`,
      cells: [],
    });
  }

  /* ---------------------------- Spazio ----------------------------- */

  const needed = (encounter.partySize + encounter.enemyCount) * 9;
  if (open < needed) {
    issues.push({
      id: "space",
      severity: "WARNING",
      title: "Spazio insufficiente per lo scontro",
      detail: `${open} caselle libere per ${encounter.partySize} personaggi contro ${encounter.enemyCount} nemici: ne servirebbero almeno ${needed}.`,
      cells: [],
    });
  }

  /* --------------------------- Copertura --------------------------- */

  const coverRatio = open > 0 ? withCover / open : 0;
  if (coverRatio < THRESHOLDS.minCoverRatio) {
    issues.push({
      id: "no-cover",
      severity: "WARNING",
      title: "Copertura quasi assente",
      detail: `Solo il ${Math.round(coverRatio * 100)}% delle caselle offre riparo: chi tira da lontano domina lo scontro.`,
      cells: [],
    });
  } else if (coverRatio > THRESHOLDS.maxCoverRatio) {
    issues.push({
      id: "too-much-cover",
      severity: "INFO",
      title: "Ripari ovunque",
      detail: `Il ${Math.round(coverRatio * 100)}% delle caselle offre riparo: i tiri a distanza diventano quasi inutili.`,
      cells: [],
    });
  }

  const difficultRatio = open > 0 ? difficult / open : 0;
  if (difficultRatio > THRESHOLDS.maxDifficultRatio) {
    issues.push({
      id: "too-difficult",
      severity: "WARNING",
      title: "Troppo terreno difficile",
      detail: `Il ${Math.round(difficultRatio * 100)}% del campo costa doppio: lo scontro rischia di impantanarsi.`,
      cells: [],
    });
  }

  /* --------------------------- Strettoie --------------------------- */

  const chokepoints: string[] = [];
  for (const key of main) {
    const position = parseCellKey(key);
    if (!position) continue;
    let exits = 0;
    for (const step of NEIGHBOURS) {
      const next = { x: position.x + step.x, y: position.y + step.y };
      if (!isInsideGrid(next, grid)) continue;
      if (canStep(map, key, cellKey(next), obstacles)) exits++;
    }
    if (exits <= 2) chokepoints.push(key);
  }
  if (chokepoints.length > 0) {
    issues.push({
      id: "chokepoints",
      severity: "INFO",
      title: `${chokepoints.length} strettoie`,
      detail:
        "Caselle con due sole vie d'uscita: ottime per una difesa, pessime se sono l'unico passaggio.",
      cells: chokepoints,
    });
  }

  /* ------------------------- Schieramenti -------------------------- */

  const spawns = map.poi.filter((entry) => entry.kind === "SPAWN");
  const partySpawn = spawns.find((entry) => entry.side === "PC");
  const enemySpawn = spawns.find((entry) => entry.side === "ENEMY");

  if (spawns.length === 0) {
    issues.push({
      id: "no-spawn",
      severity: "INFO",
      title: "Nessuno schieramento definito",
      detail: "Senza punti di partenza il Master piazzerà le pedine a mano.",
      cells: [],
    });
  }

  if (partySpawn && enemySpawn) {
    const distance = stepDistance(
      map,
      grid,
      partySpawn.cell,
      enemySpawn.cell,
      obstacles
    );
    if (distance === null) {
      issues.push({
        id: "spawn-unreachable",
        severity: "ERROR",
        title: "Schieramenti scollegati",
        detail:
          "Dal punto di partenza del party non si raggiunge quello nemico: lo scontro non può cominciare.",
        cells: [partySpawn.cell, enemySpawn.cell],
      });
    } else if (distance < THRESHOLDS.minSpawnDistance) {
      issues.push({
        id: "spawn-close",
        severity: "WARNING",
        title: "Schieramenti troppo vicini",
        detail: `${distance} caselle fra i due gruppi: il primo turno è già mischia, e chi tira da lontano non serve a nulla.`,
        cells: [partySpawn.cell, enemySpawn.cell],
      });
    } else if (distance > THRESHOLDS.maxSpawnDistance) {
      issues.push({
        id: "spawn-far",
        severity: "INFO",
        title: "Schieramenti lontanissimi",
        detail: `${distance} caselle di avvicinamento: i primi turni saranno solo movimento.`,
        cells: [partySpawn.cell, enemySpawn.cell],
      });
    }
  }

  /* -------------------- Punti di interesse ------------------------- */

  const mainSet = new Set(main);
  const unreachable: MapPoi[] = map.poi.filter(
    (entry) => entry.cell && !mainSet.has(entry.cell)
  );
  if (unreachable.length > 0) {
    issues.push({
      id: "poi-unreachable",
      severity: "ERROR",
      title: `${unreachable.length} punti di interesse irraggiungibili`,
      detail: unreachable
        .map((entry) => entry.name)
        .join(", "),
      cells: unreachable.map((entry) => entry.cell),
    });
  }

  /* ---------------------------- Punteggio -------------------------- */

  const accessibility = open === 0 ? 0 : Math.round(100 * (main.length / open));
  const coverScore = Math.round(
    100 * (1 - Math.min(1, Math.abs(coverRatio - 0.25) / 0.35))
  );
  const varietyScore = Math.round(
    100 *
      Math.min(
        1,
        (difficultRatio > 0 ? 0.35 : 0) +
          (elevated > 0 ? 0.35 : 0) +
          (map.objects.length > 0 ? 0.3 : 0)
      )
  );
  const verticality = Math.round(
    100 * Math.min(1, elevated / Math.max(1, open) / 0.25)
  );
  const routes = Math.round(
    100 * Math.min(1, 1 - chokepoints.length / Math.max(1, main.length) / 0.25)
  );
  const spawnBalance = (() => {
    if (!partySpawn || !enemySpawn) return 60;
    const distance = stepDistance(map, grid, partySpawn.cell, enemySpawn.cell, obstacles);
    if (distance === null) return 0;
    if (distance < THRESHOLDS.minSpawnDistance) return 40;
    if (distance > THRESHOLDS.maxSpawnDistance) return 70;
    return 100;
  })();
  const density = Math.round(
    100 * (1 - Math.min(1, Math.abs(blocked / total - 0.2) / 0.35))
  );

  const breakdown: ScoreBreakdown[] = [
    { label: "Accessibilità", value: accessibility, hint: "Quanta mappa è davvero collegata." },
    { label: "Copertura", value: coverScore, hint: "Ripari né assenti né ovunque." },
    { label: "Varietà", value: varietyScore, hint: "Terreni, quote ed elementi diversi." },
    { label: "Verticalità", value: verticality, hint: "Dislivelli sfruttabili." },
    { label: "Percorsi", value: routes, hint: "Vie alternative, non un imbuto." },
    { label: "Schieramenti", value: spawnBalance, hint: "Distanza sensata fra i gruppi." },
    { label: "Densità", value: density, hint: "Ostacoli sufficienti, non soffocanti." },
  ];

  const score = Math.round(
    breakdown.reduce((sum, entry) => sum + entry.value, 0) / breakdown.length
  );

  return {
    score,
    breakdown,
    issues: issues.sort(
      (a, b) =>
        ISSUE_SEVERITIES.indexOf(a.severity) - ISSUE_SEVERITIES.indexOf(b.severity)
    ),
    stats: {
      total,
      open,
      blocked,
      difficult,
      withCover,
      elevated,
      regions: regions.length,
      chokepoints: chokepoints.length,
    },
  };
}

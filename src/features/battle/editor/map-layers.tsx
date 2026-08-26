"use client";

import { TriangleAlert } from "lucide-react";
import { useMemo } from "react";

import { parseCellKey } from "@/features/battle/engine/geometry";
import {
  cellAt,
  movementCostAt,
  type ObstacleInfo,
} from "@/features/battle/engine/tactical";
import { terrainById } from "@/features/battle/terrain";
import type { GridConfig, Position } from "@/types/battle";
import type {
  CoverLevel,
  EditorMode,
  TacticalMap,
} from "@/types/battlemap";

import { objectIcon } from "./object-icons";

/* ============================================================
 * Disegno della mappa tattica.
 *
 * Un solo `<svg>` per i fondi, con i tratti orizzontali FUSI: una
 * distesa d'erba larga trenta celle diventa un rettangolo, non trenta.
 * È ciò che tiene fluida una mappa 100×100 restando in SVG, con la
 * nitidezza a ogni zoom che il canvas non darebbe.
 * ============================================================ */

interface Run {
  x: number;
  y: number;
  width: number;
  fill: string;
}

/** Fonde in rettangoli i tratti orizzontali dello stesso colore. */
function buildRuns(
  grid: GridConfig,
  colorAt: (x: number, y: number) => string | null
): Run[] {
  const runs: Run[] = [];
  for (let y = 0; y < grid.rows; y++) {
    let start = 0;
    let current: string | null = null;
    for (let x = 0; x <= grid.cols; x++) {
      const fill = x < grid.cols ? colorAt(x, y) : null;
      if (fill !== current) {
        if (current) runs.push({ x: start, y, width: x - start, fill: current });
        current = fill;
        start = x;
      }
    }
  }
  return runs;
}

const COVER_MARK: Record<CoverLevel, string | null> = {
  NONE: null,
  HALF: "rgba(214, 178, 94, 0.55)",
  THREE_QUARTERS: "rgba(214, 140, 60, 0.65)",
  TOTAL: "rgba(200, 70, 60, 0.7)",
};

export function MapLayers({
  map,
  grid,
  cellPx,
  obstacles,
  mode,
  showCoordinates,
}: {
  map: TacticalMap;
  grid: GridConfig;
  cellPx: number;
  obstacles: Map<string, ObstacleInfo>;
  mode: EditorMode;
  showCoordinates: boolean;
}) {
  const layers = map.layers;
  const width = grid.cols * cellPx;
  const height = grid.rows * cellPx;
  const tactical = mode === "TACTICAL";

  /* --------------------------- Terreno ---------------------------- */
  const terrainRuns = useMemo(() => {
    if (!layers.terrain.visible) return [];
    return buildRuns(grid, (x, y) => {
      const definition = terrainById(
        cellAt(map, `${x},${y}`).terrain,
        map.settings.customTerrains
      );
      return definition.color === "transparent" ? null : definition.color;
    });
  }, [map, grid, layers.terrain.visible]);

  /* -------------------------- Elevazione --------------------------- */
  const elevationRuns = useMemo(() => {
    if (!layers.elevation.visible) return [];
    return buildRuns(grid, (x, y) => {
      const level = cellAt(map, `${x},${y}`).elevation;
      if (level === 0) return null;
      // Il rilievo si legge come luce: in alto più chiaro, in basso più cupo.
      const strength = Math.min(0.42, Math.abs(level) * 0.09);
      return level > 0
        ? `rgba(255, 255, 255, ${strength})`
        : `rgba(0, 0, 0, ${strength + 0.08})`;
    });
  }, [map, grid, layers.elevation.visible]);

  /** Bordi fra quote diverse: sono le curve di livello del campo. */
  const contours = useMemo(() => {
    if (!layers.elevation.visible) return [];
    const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const here = cellAt(map, `${x},${y}`).elevation;
        if (x + 1 < grid.cols && cellAt(map, `${x + 1},${y}`).elevation !== here) {
          segments.push({
            x1: (x + 1) * cellPx,
            y1: y * cellPx,
            x2: (x + 1) * cellPx,
            y2: (y + 1) * cellPx,
          });
        }
        if (y + 1 < grid.rows && cellAt(map, `${x},${y + 1}`).elevation !== here) {
          segments.push({
            x1: x * cellPx,
            y1: (y + 1) * cellPx,
            x2: (x + 1) * cellPx,
            y2: (y + 1) * cellPx,
          });
        }
      }
    }
    return segments;
  }, [map, grid, cellPx, layers.elevation.visible]);

  /* --------------------- Evidenziazioni tattiche -------------------- */
  const tacticalRuns = useMemo(() => {
    if (!tactical) return [];
    return buildRuns(grid, (x, y) => {
      const key = `${x},${y}`;
      const cost = movementCostAt(map, key, obstacles);
      if (cost === null) return "rgba(200, 70, 60, 0.35)";
      if (cost > 1) return "rgba(214, 178, 94, 0.28)";
      return null;
    });
  }, [tactical, map, grid, obstacles]);

  const labelSize = Math.min(cellPx * 0.3, 14);
  const showLabels = cellPx > 26;

  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0"
        width={width}
        height={height}
        aria-hidden
      >
        {terrainRuns.map((run, index) => (
          <rect
            key={`t${index}`}
            x={run.x * cellPx}
            y={run.y * cellPx}
            width={run.width * cellPx}
            height={cellPx}
            fill={run.fill}
          />
        ))}

        {elevationRuns.map((run, index) => (
          <rect
            key={`e${index}`}
            x={run.x * cellPx}
            y={run.y * cellPx}
            width={run.width * cellPx}
            height={cellPx}
            fill={run.fill}
          />
        ))}

        {contours.map((segment, index) => (
          <line
            key={`c${index}`}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            stroke="rgba(255,255,255,0.28)"
            strokeWidth={1.5}
          />
        ))}

        {tacticalRuns.map((run, index) => (
          <rect
            key={`x${index}`}
            x={run.x * cellPx}
            y={run.y * cellPx}
            width={run.width * cellPx}
            height={cellPx}
            fill={run.fill}
          />
        ))}

        {/* Aree: indipendenti dalle celle, disegnate sopra il terreno. */}
        {layers.areas.visible &&
          map.areas.map((area) =>
            area.cells.map((key) => {
              const position = parseCellKey(key);
              if (!position) return null;
              return (
                <rect
                  key={`${area.id}-${key}`}
                  x={position.x * cellPx}
                  y={position.y * cellPx}
                  width={cellPx}
                  height={cellPx}
                  fill={area.color}
                  opacity={area.opacity}
                />
              );
            })
          )}

        {/* Pericoli: tinta piena e bordo tratteggiato. */}
        {layers.hazards.visible &&
          map.hazards.map((hazard) =>
            hazard.cells.map((key) => {
              const position = parseCellKey(key);
              if (!position) return null;
              return (
                <rect
                  key={`${hazard.id}-${key}`}
                  x={position.x * cellPx + 1}
                  y={position.y * cellPx + 1}
                  width={cellPx - 2}
                  height={cellPx - 2}
                  fill={hazard.color}
                  opacity={0.32}
                  stroke={hazard.color}
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                />
              );
            })
          )}

        {/* Copertura: spessore sul bordo della cella. */}
        {layers.cover.visible &&
          Object.entries(map.cells).map(([key, cell]) => {
            const mark = COVER_MARK[cell.cover ?? "NONE"];
            const position = parseCellKey(key);
            if (!mark || !position) return null;
            return (
              <rect
                key={`cov-${key}`}
                x={position.x * cellPx + 2}
                y={position.y * cellPx + 2}
                width={cellPx - 4}
                height={cellPx - 4}
                fill="none"
                stroke={mark}
                strokeWidth={2}
                rx={3}
              />
            );
          })}

        {/* Quote e coordinate: solo quando c'è spazio per leggerle. */}
        {showLabels &&
          layers.elevation.visible &&
          Object.entries(map.cells).map(([key, cell]) => {
            if (cell.elevation === 0) return null;
            const position = parseCellKey(key);
            if (!position) return null;
            return (
              <text
                key={`h-${key}`}
                x={position.x * cellPx + cellPx - 3}
                y={position.y * cellPx + labelSize + 1}
                textAnchor="end"
                fontSize={labelSize}
                fill="rgba(255,255,255,0.75)"
                className="font-mono"
              >
                {cell.elevation > 0 ? `+${cell.elevation}` : cell.elevation}
              </text>
            );
          })}

        {showCoordinates &&
          showLabels &&
          Array.from({ length: grid.rows }, (_row, y) =>
            Array.from({ length: grid.cols }, (_col, x) => (
              <text
                key={`k-${x}-${y}`}
                x={x * cellPx + 3}
                y={y * cellPx + cellPx - 3}
                fontSize={Math.min(cellPx * 0.22, 10)}
                fill="rgba(255,255,255,0.35)"
                className="font-mono"
              >
                {x},{y}
              </text>
            ))
          )}
      </svg>

      {/* Oggetti e trappole: DOM, così restano cliccabili e accessibili. */}
      {layers.objects.visible &&
        map.objects.map((object) => (
          <ObjectMark
            key={object.id}
            cells={object.cells}
            cellPx={cellPx}
            color={object.color}
            icon={object.icon}
            title={object.name}
            faded={object.state === "OPEN" || object.state === "BROKEN"}
          />
        ))}

      {layers.traps.visible &&
        map.traps.map((trap) => (
          <TrapMark key={trap.id} cells={trap.cells} cellPx={cellPx} name={trap.name} />
        ))}
    </>
  );
}

function ObjectMark({
  cells,
  cellPx,
  color,
  icon,
  title,
  faded,
}: {
  cells: string[];
  cellPx: number;
  color: string;
  icon: string;
  title: string;
  faded?: boolean;
}) {
  const Icon = objectIcon(icon);
  return (
    <>
      {cells.map((key) => {
        const position = parseCellKey(key);
        if (!position) return null;
        return (
          <div
            key={key}
            className="pointer-events-none absolute flex items-center justify-center"
            style={{
              left: position.x * cellPx,
              top: position.y * cellPx,
              width: cellPx,
              height: cellPx,
              opacity: faded ? 0.4 : 1,
            }}
            title={title}
          >
            <span
              className="flex items-center justify-center rounded-md"
              style={{
                width: cellPx * 0.82,
                height: cellPx * 0.82,
                backgroundColor: `${color}33`,
                boxShadow: `inset 0 0 0 1.5px ${color}`,
              }}
            >
              <Icon
                style={{ width: cellPx * 0.5, height: cellPx * 0.5, color }}
              />
            </span>
          </div>
        );
      })}
    </>
  );
}

function TrapMark({
  cells,
  cellPx,
  name,
}: {
  cells: string[];
  cellPx: number;
  name: string;
}) {
  return (
    <>
      {cells.map((key) => {
        const position = parseCellKey(key);
        if (!position) return null;
        return (
          <div
            key={key}
            className="pointer-events-none absolute flex items-center justify-center"
            style={{
              left: position.x * cellPx,
              top: position.y * cellPx,
              width: cellPx,
              height: cellPx,
            }}
            title={name}
          >
            <TriangleAlert
              style={{
                width: cellPx * 0.46,
                height: cellPx * 0.46,
                color: "#e0a33c",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))",
              }}
            />
          </div>
        );
      })}
    </>
  );
}

/** Contorno delle celle selezionate o in anteprima. */
export function CellOutline({
  cells,
  cellPx,
  color = "var(--gold)",
  fill = "rgba(214, 178, 94, 0.18)",
}: {
  cells: string[] | Set<string>;
  cellPx: number;
  color?: string;
  fill?: string;
}) {
  const list = Array.isArray(cells) ? cells : [...cells];
  if (list.length === 0) return null;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {list.map((key) => {
        const position = parseCellKey(key);
        if (!position) return null;
        return (
          <rect
            key={key}
            x={position.x * cellPx + 0.5}
            y={position.y * cellPx + 0.5}
            width={cellPx - 1}
            height={cellPx - 1}
            fill={fill}
            stroke={color}
            strokeWidth={1.5}
          />
        );
      })}
    </svg>
  );
}

/** Rettangolo di selezione trascinato dal puntatore. */
export function MarqueeRect({
  from,
  to,
  cellPx,
}: {
  from: Position;
  to: Position;
  cellPx: number;
}) {
  const x = Math.min(from.x, to.x) * cellPx;
  const y = Math.min(from.y, to.y) * cellPx;
  const width = (Math.abs(to.x - from.x) + 1) * cellPx;
  const height = (Math.abs(to.y - from.y) + 1) * cellPx;

  return (
    <div
      className="pointer-events-none absolute rounded-sm border border-gold/70 bg-gold/10"
      style={{ left: x, top: y, width, height }}
    />
  );
}

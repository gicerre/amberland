"use client";

import { useId } from "react";

import { TERRAIN_FILL } from "@/features/battle/constants";
import { parseCellKey } from "@/features/battle/engine/geometry";
import type { GridConfig, TerrainKind } from "@/types/battle";

/**
 * Griglia e terreno come UN SOLO `<svg>`.
 *
 * Le linee sono un `<pattern>`: un nodo DOM per l'intera griglia, nitido
 * a qualunque zoom (nessun ricampionamento, a differenza di un canvas) e
 * del colore `--hairline` come ogni altro bordo dell'interfaccia.
 *
 * Il componente non sa nulla di zoom e pan: riceve il lato della cella
 * in pixel e disegna. Le trasformazioni vivono nel viewport.
 */
export function BattleGrid({
  grid,
  cellPx,
  terrain,
  className,
}: {
  grid: GridConfig;
  cellPx: number;
  terrain?: Record<string, TerrainKind>;
  className?: string;
}) {
  // L'id del pattern deve essere unico: due mappe nella stessa pagina
  // (anteprima + elenco) userebbero altrimenti lo stesso riferimento.
  const patternId = useId().replace(/:/g, "");
  const width = grid.cols * cellPx;
  const height = grid.rows * cellPx;

  // Calibrazione: sposta le linee per farle coincidere con la griglia
  // già dipinta su una mappa scaricata (offset in frazioni di cella).
  const shiftX = grid.offsetX * cellPx;
  const shiftY = grid.offsetY * cellPx;

  const cells = Object.entries(terrain ?? {}).flatMap(([key, kind]) => {
    const position = parseCellKey(key);
    if (!position || kind === "NORMAL") return [];
    return [{ key, position, kind }];
  });

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      // La griglia non intercetta il puntatore: click e drag appartengono
      // al viewport e alle pedine.
      style={{ pointerEvents: "none" }}
    >
      <defs>
        <pattern
          id={patternId}
          width={cellPx}
          height={cellPx}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${shiftX} ${shiftY})`}
        >
          <path
            d={`M ${cellPx} 0 L 0 0 0 ${cellPx}`}
            fill="none"
            stroke="var(--hairline)"
            strokeWidth={1}
          />
        </pattern>
      </defs>

      {cells.map(({ key, position, kind }) => (
        <rect
          key={key}
          x={position.x * cellPx}
          y={position.y * cellPx}
          width={cellPx}
          height={cellPx}
          fill={TERRAIN_FILL[kind]}
        />
      ))}

      {grid.visible && (
        <rect width={width} height={height} fill={`url(#${patternId})`} />
      )}

      {/* Perimetro: dice dove finisce il campo anche senza linee interne. */}
      <rect
        width={width}
        height={height}
        fill="none"
        stroke="var(--hairline-strong)"
        strokeWidth={1}
      />
    </svg>
  );
}

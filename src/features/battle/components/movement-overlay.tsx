"use client";

import { parseCellKey } from "@/features/battle/engine/geometry";
import type { Position } from "@/types/battle";

/**
 * Celle raggiungibili e percorso proposto.
 *
 * Vive nello stesso spazio-mappa delle pedine e non intercetta il
 * puntatore: il click resta del campo. I colori sono segnale, non
 * decorazione — oro solo sul percorso scelto.
 */
export function MovementOverlay({
  cellPx,
  reachable,
  path,
  overBudget,
}: {
  cellPx: number;
  /** Chiave di cella → costo per arrivarci. */
  reachable: Map<string, number>;
  path?: Position[] | null;
  /** Il percorso supera il movimento residuo: si avvisa in rosso. */
  overBudget?: boolean;
}) {
  const cells = [...reachable.keys()].flatMap((key) => {
    const position = parseCellKey(key);
    return position ? [{ key, position }] : [];
  });

  const stroke = overBudget ? "#c0453c" : "var(--gold)";
  const points = (path ?? [])
    .map(
      (cell) =>
        `${cell.x * cellPx + cellPx / 2},${cell.y * cellPx + cellPx / 2}`
    )
    .join(" ");

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      {cells.map(({ key, position }) => (
        <rect
          key={key}
          x={position.x * cellPx + 1}
          y={position.y * cellPx + 1}
          width={cellPx - 2}
          height={cellPx - 2}
          rx={Math.min(6, cellPx * 0.12)}
          fill="rgba(255,255,255,0.07)"
          stroke="var(--hairline-strong)"
          strokeWidth={1}
        />
      ))}

      {path && path.length > 1 && (
        <>
          <polyline
            points={points}
            fill="none"
            stroke={stroke}
            strokeWidth={Math.max(2, cellPx * 0.08)}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
          <circle
            cx={path[path.length - 1]!.x * cellPx + cellPx / 2}
            cy={path[path.length - 1]!.y * cellPx + cellPx / 2}
            r={Math.max(3, cellPx * 0.12)}
            fill={stroke}
          />
        </>
      )}
    </svg>
  );
}

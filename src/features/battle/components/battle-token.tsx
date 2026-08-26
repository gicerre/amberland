"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { HEALTH_BAND_LABELS } from "@/features/battle/constants";
import { optimizeCloudinary } from "@/lib/upload/image-service";
import { cn } from "@/lib/utils";
import type { CombatantView, Position } from "@/types/battle";

/* ============================================================
 * Pedina sul campo.
 *
 * DOM, non canvas (§8.3): con qualche decina di pedine si resta a 60fps
 * animando solo `transform`, e in cambio si ottengono gratis avatar,
 * focus da tastiera e hit-testing.
 *
 * Quando manca l'immagine il segnaposto è GENERATO: iniziale del nome su
 * disco del colore della categoria. Zero asset da produrre, nessuna
 * texture — in linea con la Constitution v2.
 * ============================================================ */

export function BattleToken({
  view,
  cellPx,
  zoom,
  active,
  selected,
  canDrag,
  onSelect,
  onDrop,
}: {
  view: CombatantView;
  cellPx: number;
  /** Scala del viewport: serve a convertire i pixel del drag in celle. */
  zoom: number;
  /** Pedina di turno: l'unico punto d'oro sul campo. */
  active?: boolean;
  selected?: boolean;
  canDrag?: boolean;
  onSelect?: (id: string) => void;
  onDrop?: (position: Position) => void;
}) {
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  if (!view.position) return null;
  const size = Math.max(1, view.size);
  const sizePx = size * cellPx;
  const left = view.position.x * cellPx + (drag?.dx ?? 0);
  const top = view.position.y * cellPx + (drag?.dy ?? 0);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    onSelect?.(view.id);
    if (!canDrag) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    origin.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!origin.current) return;
    setDrag({
      dx: (event.clientX - origin.current.x) / zoom,
      dy: (event.clientY - origin.current.y) / zoom,
    });
  };

  const handlePointerUp = () => {
    if (!origin.current || !view.position) return;
    const offset = drag;
    origin.current = null;
    setDrag(null);
    if (!offset || cellPx <= 0) return;

    const target = {
      x: view.position.x + Math.round(offset.dx / cellPx),
      y: view.position.y + Math.round(offset.dy / cellPx),
    };
    if (target.x === view.position.x && target.y === view.position.y) return;
    onDrop?.(target);
  };

  const initial = view.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <motion.div
      data-battle-token={view.id}
      role="button"
      tabIndex={0}
      aria-label={`${view.name}${view.healthBand ? ` — ${HEALTH_BAND_LABELS[view.healthBand]}` : ""}`}
      className={cn(
        "absolute top-0 left-0 touch-none select-none",
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      )}
      style={{ width: sizePx, height: sizePx }}
      animate={{ x: left, y: top }}
      transition={
        drag
          ? { duration: 0 }
          : { type: "tween", ease: "easeOut", duration: 0.18 }
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect?.(view.id);
      }}
    >
      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center overflow-hidden rounded-full",
          view.isDead && "opacity-45 grayscale"
        )}
        style={{
          // L'anello è l'identità della pedina: categoria per i nemici,
          // fazione per tutti gli altri.
          boxShadow: `0 0 0 ${Math.max(2, cellPx * 0.06)}px ${view.accent}, 0 6px 16px -6px rgba(0,0,0,0.8)`,
          backgroundColor: `${view.accent}33`,
        }}
      >
        {view.tokenUrl ? (
          <Image
            src={optimizeCloudinary(view.tokenUrl, 240)}
            alt=""
            fill
            draggable={false}
            className="pointer-events-none object-cover"
          />
        ) : (
          <span
            className="pointer-events-none font-heading leading-none font-bold text-white/90"
            style={{ fontSize: sizePx * 0.42 }}
          >
            {initial}
          </span>
        )}

        {/* Turno in corso: l'oro è raro, qui è al suo posto. */}
        {active && (
          <span
            className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-gold motion-safe:animate-pulse"
            aria-hidden
          />
        )}
        {selected && !active && (
          <span
            className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/60"
            aria-hidden
          />
        )}
      </div>

      {/* Barra di salute: solo se chi guarda ha diritto di vederla. */}
      {view.hpRatio !== null && !view.isDead && (
        <div
          className="pointer-events-none absolute -bottom-1 left-1/2 h-1 -translate-x-1/2 overflow-hidden rounded-full bg-black/60"
          style={{ width: sizePx * 0.8 }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(2, view.hpRatio * 100)}%`,
              backgroundColor:
                view.hpRatio > 0.5
                  ? "#5fa06a"
                  : view.hpRatio > 0.25
                    ? "#d6b25e"
                    : "#c0453c",
            }}
          />
        </div>
      )}
    </motion.div>
  );
}

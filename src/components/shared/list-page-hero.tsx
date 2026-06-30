"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ImmersiveHero } from "./immersive-hero";

/**
 * Testata immersiva per le pagine di lista/panoramica: lo stesso hero a piena
 * larghezza (immagine 45rem + onda/stemma) usato per le entità singole, con
 * occhiello, titolo, sottotitolo e azioni centrati e sovrapposti.
 *
 * `src` è opzionale: senza immagine mostra il fondo "pietra" come segnaposto
 * (pronto a ricevere lo sfondo WebP definitivo).
 */
export function ListPageHero({
  src,
  alt,
  accent = "#c8a75d",
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  src?: string | null;
  alt?: string;
  accent?: string;
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative left-1/2 -mt-4 mb-8 w-screen -translate-x-1/2 sm:-mt-6 lg:-mt-10 lg:w-[calc(100vw-18rem)]",
        className
      )}
    >
      <ImmersiveHero
        src={src ?? undefined}
        alt={alt ?? title}
        accent={accent}
        priority
        className="rounded-none border-0"
      >
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="font-heading text-[11px] font-semibold tracking-[0.45em] text-arcane-bright/90 uppercase sm:text-xs">
              {eyebrow}
            </p>
          )}
          <h1 className="text-gold-gradient mt-3 font-heading text-4xl font-black tracking-wider drop-shadow-[0_2px_20px_rgba(0,0,0,0.85)] sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-parchment-dark/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {actions}
          </div>
        )}
      </ImmersiveHero>
    </div>
  );
}

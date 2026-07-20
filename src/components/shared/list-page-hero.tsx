"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ImmersiveHero } from "./immersive-hero";

/**
 * Testata immersiva per le pagine di lista/panoramica, in formato ridotto
 * (h-56 → h-96: il monumento a 45rem è riservato al dettaglio entità,
 * UX_AUDIT_REDESIGN 0.5) con occhiello, titolo, sottotitolo e azioni.
 *
 * Al primo scroll l'hero collassa in una **Targa sticky** di 64px con
 * titolo e azioni, così ricerca e comandi restano sempre raggiungibili.
 *
 * `src` è opzionale: senza immagine mostra il fondo "pietra" come
 * segnaposto (pronto a ricevere lo sfondo WebP definitivo).
 */
export function ListPageHero({
  src,
  alt,
  accent = "var(--gold)",
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
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      // La Targa appare appena la coda dell'hero supera la topbar mobile.
      { rootMargin: "-56px 0px 0px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
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
          size="list"
          priority
          className="rounded-none border-0"
        >
          <div className="max-w-3xl">
            {eyebrow && (
              <p className="font-heading text-[11px] font-semibold tracking-[0.45em] text-arcane-bright/90 uppercase sm:text-xs">
                {eyebrow}
              </p>
            )}
            <h1 className="text-gold-gradient mt-2 font-heading text-3xl font-black tracking-wider drop-shadow-[0_2px_20px_rgba(0,0,0,0.85)] sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mx-auto mt-3 hidden max-w-2xl text-sm leading-relaxed text-parchment-dark/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:block sm:text-base">
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
        {/* Sentinella del collasso: quando esce dalla vista, appare la Targa */}
        <div ref={sentinelRef} aria-hidden className="absolute bottom-0 h-px w-px" />
      </div>

      {/* Barra sticky (64px) su vetro: titolo + azioni sempre a portata */}
      <div
        aria-hidden={!collapsed}
        className={cn(
          "glass fixed inset-x-0 top-12 z-30 border-x-0 border-t-0 border-b border-hairline sm:top-13 lg:top-0 lg:left-72",
          "transition-[transform,opacity] duration-200 ease-[var(--ease-out)]",
          collapsed
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-3 sm:px-5 lg:px-10">
          <span className="truncate font-heading text-base font-bold tracking-wide text-parchment sm:text-lg">
            {title}
          </span>
          {actions && (
            <span className="flex shrink-0 items-center gap-2">{actions}</span>
          )}
        </div>
      </div>
    </>
  );
}

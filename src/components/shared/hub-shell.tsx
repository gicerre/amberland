"use client";

import { useCallback, useRef } from "react";

import { CornerOrnaments } from "@/components/shared/fantasy-card";
import { WindowPanel } from "@/design-system";
import { cn } from "@/lib/utils";

/* ============================================================
 * HubShell — impianto condiviso da Area Personale e Area Party:
 * banner del titolo + pannello header (PC o Party) in alto a destra,
 * navigazione sezioni, contenuto della sezione attiva.
 *
 * Mobile: pill-tab compatto (3 col) + swipe left/right + dot indicator.
 * Desktop: grandi card di navigazione (invariate).
 * ============================================================ */

/** Icona di sezione: componente lucide o wrapper immagine (PNG). */
export type HubIcon = React.ComponentType<{ className?: string }>;

export interface HubSection {
  value: string;
  label: string;
  description: string;
  icon: HubIcon;
}

const SWIPE_THRESHOLD = 55;

export function HubShell({
  title,
  subtitle,
  icon: Icon,
  headerPanel,
  sections,
  active,
  onSelect,
  children,
  bareIcons = false,
  bannerImage,
  cardImage,
}: {
  title: string;
  subtitle: string;
  icon: HubIcon;
  headerPanel?: React.ReactNode;
  sections: HubSection[];
  active: string;
  onSelect: (value: string) => void;
  children: React.ReactNode;
  /** Icone illustrate (PNG): niente riquadro, più grandi. */
  bareIcons?: boolean;
  /** Immagine di sfondo (scurita) del banner del titolo. */
  bannerImage?: string;
  /** Texture di sfondo delle card di navigazione (si scurisce verso il basso). */
  cardImage?: string;
}) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      touchStartX.current = null;
      touchStartY.current = null;
      // Ignora se il gesto è prevalentemente verticale (scroll)
      if (Math.abs(dy) > Math.abs(dx)) return;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      const idx = sections.findIndex((s) => s.value === active);
      if (dx < 0 && idx < sections.length - 1) {
        onSelect(sections[idx + 1].value);
      } else if (dx > 0 && idx > 0) {
        onSelect(sections[idx - 1].value);
      }
    },
    [sections, active, onSelect]
  );

  return (
    <div className="space-y-5">
      {/* Banner + pannello header */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1fr_minmax(0,20rem)] lg:items-stretch">
        <WindowPanel
          variant="06"
          className="min-w-0 bg-gradient-to-br from-gold/12 via-card to-night/60"
          contentClassName="flex flex-col justify-center p-6 sm:p-8"
        >
          {bannerImage && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(6,7,10,0.92), rgba(6,7,10,0.62) 55%, rgba(6,7,10,0.42)), url(${bannerImage})`,
              }}
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.14),transparent_60%)]" />
          <div className="relative flex items-center gap-4">
            {bareIcons ? (
              <Icon className="size-24 shrink-0 drop-shadow-[0_3px_14px_rgba(0,0,0,0.6)] sm:size-32" />
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/15 text-gold shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                <Icon className="size-7" />
              </span>
            )}
            <div>
              <h1 className="text-gold-gradient font-heading text-2xl font-bold tracking-wider sm:text-4xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                {subtitle}
              </p>
            </div>
          </div>
        </WindowPanel>

        {headerPanel}
      </div>

      {/* Nav mobile: pill-tab orizzontale compatto */}
      <div className="sm:hidden">
        <div className="grid grid-cols-3 gap-0.5 rounded-xl border border-gold/20 bg-card/50 p-0.5 backdrop-blur-sm sm:gap-1 sm:p-1">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            const isActive = section.value === active;
            return (
              <button
                key={section.value}
                type="button"
                onClick={() => onSelect(section.value)}
                aria-label={section.label}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-lg px-2 transition-all duration-200",
                  bareIcons ? "py-3" : "py-2.5",
                  isActive
                    ? "bg-gold/18 text-gold-bright shadow-[0_0_12px_rgba(212,175,55,0.12)]"
                    : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute inset-x-3 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
                )}
                <SectionIcon
                  className={cn(
                    "transition-colors",
                    bareIcons ? "size-11" : "size-5",
                    isActive ? "text-gold" : "text-muted-foreground/70"
                  )}
                />
                {/* In modalità icone illustrate: solo icona, niente etichetta. */}
                {!bareIcons && (
                  <span
                    className={cn(
                      "font-heading text-[10px] font-bold tracking-wide leading-none",
                      isActive ? "text-gold-bright" : "text-muted-foreground"
                    )}
                  >
                    {section.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Nav desktop: grandi card */}
      <div className="hidden grid-cols-1 gap-4 sm:grid sm:grid-cols-3">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          const isActive = section.value === active;
          return (
            <button
              key={section.value}
              type="button"
              onClick={() => onSelect(section.value)}
              style={
                cardImage
                  ? {
                      backgroundImage: `linear-gradient(to bottom, rgba(11,13,18,0.28) 0%, rgba(8,9,13,0.72) 55%, rgba(6,7,10,0.95) 100%), url(${cardImage})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
              className={cn(
                "group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border p-6 text-center transition-all",
                isActive
                  ? "border-gold/60 shadow-[0_0_28px_rgba(212,175,55,0.18)]"
                  : "border-gold/20 hover:-translate-y-0.5 hover:border-gold/45 hover:shadow-[0_0_24px_rgba(212,175,55,0.12)]",
                !cardImage &&
                  (isActive
                    ? "bg-gradient-to-b from-gold/15 to-transparent"
                    : "bg-card/60 hover:bg-gold/5")
              )}
            >
              {isActive && <CornerOrnaments className="size-4 border-gold/50" />}
              {bareIcons ? (
                <SectionIcon
                  className={cn(
                    "size-20 drop-shadow-[0_3px_12px_rgba(0,0,0,0.55)] transition-transform duration-200 group-hover:scale-105",
                    isActive ? "text-gold" : "text-muted-foreground group-hover:text-gold"
                  )}
                />
              ) : (
                <span
                  className={cn(
                    "flex size-16 items-center justify-center rounded-2xl border transition-colors",
                    isActive
                      ? "border-gold/50 bg-gold/15 text-gold"
                      : "border-gold/25 bg-night/40 text-muted-foreground group-hover:text-gold"
                  )}
                >
                  <SectionIcon className="size-8" />
                </span>
              )}
              <span>
                <span
                  className={cn(
                    "block font-heading text-lg font-bold tracking-wide",
                    isActive ? "text-gold-bright" : "text-foreground"
                  )}
                >
                  {section.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {section.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Sezione attiva — swipe gesture su mobile */}
      <div
        className="touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {children}

        {/* Dot indicator (mobile) */}
        {sections.length > 1 && (
          <div className="mt-6 flex justify-center gap-2 sm:hidden">
            {sections.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-label={s.label}
                onClick={() => onSelect(s.value)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  s.value === active ? "w-6 bg-gold" : "w-1.5 bg-gold/30"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

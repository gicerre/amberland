"use client";

import type { LucideIcon } from "lucide-react";

import { CornerOrnaments } from "@/components/shared/fantasy-card";
import { cn } from "@/lib/utils";

/* ============================================================
 * HubShell — impianto condiviso da Area Personale e Area Party:
 * banner del titolo + pannello header (PC o Party) in alto a destra,
 * tre grandi card di navigazione, contenuto della sezione attiva.
 * Garantisce lo stesso linguaggio visivo tra le due macro-aree.
 * ============================================================ */

export interface HubSection {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export function HubShell({
  title,
  subtitle,
  icon: Icon,
  headerPanel,
  sections,
  active,
  onSelect,
  children,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  headerPanel?: React.ReactNode;
  sections: HubSection[];
  active: string;
  onSelect: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {/* Banner + pannello header */}
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-stretch">
        <div className="relative flex flex-col justify-center overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/12 via-card to-night/60 p-6 sm:p-8">
          <CornerOrnaments className="size-5 border-gold/50" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.14),transparent_60%)]" />
          <div className="relative flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/15 text-gold shadow-[0_0_30px_rgba(212,175,55,0.2)]">
              <Icon className="size-7" />
            </span>
            <div>
              <h1 className="text-gold-gradient font-heading text-3xl font-bold tracking-wider sm:text-4xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {headerPanel}
      </div>

      {/* Navigazione: tre grandi card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          const isActive = section.value === active;
          return (
            <button
              key={section.value}
              type="button"
              onClick={() => onSelect(section.value)}
              className={cn(
                "group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border p-6 text-center transition-all",
                isActive
                  ? "border-gold/60 bg-gradient-to-b from-gold/15 to-transparent shadow-[0_0_28px_rgba(212,175,55,0.18)]"
                  : "border-gold/20 bg-card/60 hover:-translate-y-0.5 hover:border-gold/45 hover:bg-gold/5 hover:shadow-[0_0_24px_rgba(212,175,55,0.12)]"
              )}
            >
              {isActive && <CornerOrnaments className="size-4 border-gold/50" />}
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

      {/* Sezione attiva */}
      <div>{children}</div>
    </div>
  );
}

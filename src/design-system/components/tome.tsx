"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/* ============================================================
 * IL LINGUAGGIO DEL TOMO
 *
 * Set canonico di "box da manuale fantasy": pannelli, stat block,
 * intestazioni e divulgazione progressiva. È il riferimento visivo
 * dell'intera app — schede, card, dettagli e codex derivano da qui.
 *
 * Gerarchia delle informazioni (4 livelli):
 *   1. CRITICO        → <StatGrid> / <StatBlock>   (a colpo d'occhio)
 *   2. UTILE          → <TomePanel>                (sezioni tematiche)
 *   3. APPROFONDIMENTO→ <TomeDisclosure>           (collassabile)
 *   4. DETTAGLIO      → <KeyValueGrid>             (coppie etichetta/valore)
 * ============================================================ */

export type TomeAccent = "gold" | "crimson" | "arcane" | "emerald" | "amber";

const ACCENT: Record<
  TomeAccent,
  { border: string; title: string; icon: string; value: string }
> = {
  gold: {
    border: "border-gold/15",
    title: "text-gold-gradient",
    icon: "text-gold",
    value: "text-gold-bright",
  },
  crimson: {
    border: "border-crimson/25",
    title: "text-red-200",
    icon: "text-crimson-bright",
    value: "text-red-300",
  },
  arcane: {
    border: "border-arcane-bright/30",
    title: "text-violet-200",
    icon: "text-arcane-bright",
    value: "text-arcane-bright",
  },
  emerald: {
    border: "border-emerald/30",
    title: "text-emerald-bright",
    icon: "text-emerald-bright",
    value: "text-emerald-bright",
  },
  amber: {
    border: "border-amber/30",
    title: "text-amber-bright",
    icon: "text-amber-bright",
    value: "text-amber-bright",
  },
};

/* ──────────────────────────────────────────────────────────
 * TomeHeading — intestazione di sezione (Targa incisa).
 * Per sezioni NON racchiuse in un pannello.
 * ────────────────────────────────────────────────────────── */

export function TomeHeading({
  icon: Icon,
  title,
  meta,
  accent = "gold",
  className,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  meta?: React.ReactNode;
  accent?: TomeAccent;
  className?: string;
}) {
  const a = ACCENT[accent];
  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className={cn("size-5 shrink-0", a.icon)} />}
        <h2
          className={cn(
            "font-heading text-lg font-bold tracking-wide",
            a.title
          )}
        >
          {title}
        </h2>
        {meta && (
          <span className="ml-auto text-sm text-muted-foreground">{meta}</span>
        )}
      </div>
      <div className="rule-gold mt-2.5 w-full" />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * TomePanel — il box base del Tomo (pagina di manuale).
 * Materiale "stone" (default, scuro) o "parchment" (pergamena chiara).
 * ────────────────────────────────────────────────────────── */

export interface TomePanelProps
  extends Omit<React.ComponentProps<"section">, "title"> {
  title?: React.ReactNode;
  icon?: LucideIcon;
  /** Sopra-titolo piccolo in maiuscoletto. */
  eyebrow?: React.ReactNode;
  /** Slot a destra dell'intestazione (conteggi, badge, azioni). */
  meta?: React.ReactNode;
  footer?: React.ReactNode;
  accent?: TomeAccent;
  material?: "stone" | "parchment";
  contentClassName?: string;
}

export function TomePanel({
  title,
  icon: Icon,
  eyebrow,
  meta,
  footer,
  accent = "gold",
  material = "stone",
  className,
  contentClassName,
  children,
  ...props
}: TomePanelProps) {
  const a = ACCENT[accent];
  const isParchment = material === "parchment";

  return (
    <section
      className={cn(
        "fantasy-stripe-top relative overflow-hidden rounded-2xl border shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)]",
        a.border,
        isParchment
          ? "parchment"
          : "bg-gradient-to-b from-stone-surface to-stone-mid/80",
        className
      )}
      {...props}
    >
      {!isParchment && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(200,167,93,0.05),transparent_55%)]"
        />
      )}
      <div className="relative p-4 sm:p-5">
        {(title || eyebrow || meta) && (
          <header className="mb-3 flex items-start gap-2.5">
            {Icon && (
              <span
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-gold/25 bg-night/40",
                  a.icon
                )}
              >
                <Icon className="size-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <p
                  className={cn(
                    "font-heading text-[10px] font-bold tracking-[0.18em] uppercase",
                    isParchment ? "text-[#7a5c1e]" : "text-gold/60"
                  )}
                >
                  {eyebrow}
                </p>
              )}
              {title && (
                <h3
                  className={cn(
                    "font-heading text-lg leading-tight font-bold tracking-wide",
                    isParchment ? "text-[#3b2808]" : a.title
                  )}
                >
                  {title}
                </h3>
              )}
            </div>
            {meta && <div className="shrink-0">{meta}</div>}
          </header>
        )}
        <div className={contentClassName}>{children}</div>
        {footer && (
          <footer className="mt-4 border-t border-gold/12 pt-3">{footer}</footer>
        )}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────
 * StatTile / StatGrid — info critiche a colpo d'occhio.
 * ────────────────────────────────────────────────────────── */

export interface StatItem {
  icon?: LucideIcon;
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: TomeAccent;
}

export function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent = "gold",
  className,
}: StatItem & { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl border border-gold/15 bg-gradient-to-b from-stone-surface to-stone-mid/80 px-2 py-3 text-center shadow-[0_4px_16px_-8px_rgba(0,0,0,0.6)]",
        className
      )}
    >
      {Icon && <Icon className="size-4 text-gold/70" />}
      <span
        className={cn(
          "font-heading text-xl leading-none font-bold",
          ACCENT[accent].value
        )}
      >
        {value}
      </span>
      <span className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </span>
      {sub && <span className="text-[10px] text-muted-foreground/80">{sub}</span>}
    </div>
  );
}

export function StatGrid({
  items,
  className,
}: {
  items: StatItem[];
  /** Override delle colonne (default 3 → 4 da sm). */
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-2.5 sm:grid-cols-4", className)}>
      {items.map((item, index) => (
        <StatTile key={index} {...item} />
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * StatBlock — blocco statistiche da manuale (Creatura/Oggetto/NPC).
 * ────────────────────────────────────────────────────────── */

export function StatBlock({
  name,
  typeLine,
  icon: Icon,
  badge,
  stats,
  accent = "gold",
  className,
  children,
}: {
  name: React.ReactNode;
  /** Riga "tipo": es. "Mostruosità Grande · Caotico Malvagio". */
  typeLine?: React.ReactNode;
  icon?: LucideIcon;
  /** Badge in alto a destra (es. Grado Sfida). */
  badge?: React.ReactNode;
  stats: StatItem[];
  accent?: TomeAccent;
  className?: string;
  children?: React.ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <TomePanel accent={accent} className={className}>
      <header className="mb-3 flex items-start gap-3 border-b border-gold/15 pb-3">
        {Icon && (
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg border border-gold/25 bg-night/40",
              a.icon
            )}
          >
            <Icon className="size-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className={cn("font-heading text-xl font-bold tracking-wide", a.title)}>
            {name}
          </h3>
          {typeLine && (
            <p className="text-sm text-muted-foreground italic">{typeLine}</p>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </header>

      {stats.length > 0 && (
        <StatGrid
          items={stats}
          className={cn(
            stats.length <= 3
              ? "grid-cols-3 sm:grid-cols-3"
              : "grid-cols-2 sm:grid-cols-4"
          )}
        />
      )}

      {children && <div className="mt-4 space-y-4">{children}</div>}
    </TomePanel>
  );
}

/* ──────────────────────────────────────────────────────────
 * TomeDisclosure — sezione collassabile (approfondimenti).
 * ────────────────────────────────────────────────────────── */

export function TomeDisclosure({
  title,
  icon: Icon,
  count,
  defaultOpen = false,
  accent = "gold",
  children,
  className,
}: {
  title: React.ReactNode;
  icon?: LucideIcon;
  count?: number;
  defaultOpen?: boolean;
  accent?: TomeAccent;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const a = ACCENT[accent];
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-night/30",
        a.border,
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-gold/5"
      >
        {Icon && <Icon className={cn("size-4 shrink-0", a.icon)} />}
        <span className="font-heading text-sm font-bold tracking-wide text-foreground">
          {title}
        </span>
        {typeof count === "number" && (
          <span className="text-xs text-muted-foreground">({count})</span>
        )}
        <ChevronDown
          className={cn(
            "ml-auto size-4 shrink-0 text-gold/60 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="border-t border-gold/12 p-4">{children}</div>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * KeyValue / KeyValueGrid — dettagli (coppie etichetta/valore).
 * ────────────────────────────────────────────────────────── */

export interface KeyValueItem {
  label: React.ReactNode;
  value: React.ReactNode;
}

export function KeyValueGrid({
  items,
  className,
}: {
  items: KeyValueItem[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4",
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-lg border border-gold/12 bg-night/30 px-3 py-2"
        >
          <dt className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
            {item.label}
          </dt>
          <dd className="text-sm text-foreground/90">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

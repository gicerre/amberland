"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Minus, Plus, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ============================================================
 * Mattoni grafici della Modalità Combattimento.
 *
 * Linguaggio: lame e braci. Cremisi/brace come segnale di
 * pericolo, bordi netti, angoli squadrati, ingressi rapidi
 * (nessun rimbalzo). Ogni movimento è lieve e si spegne con
 * `prefers-reduced-motion`.
 * ============================================================ */

/** Ingresso rapido a cascata per i blocchi di una scheda. */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        delay: reduce ? 0 : Math.min(index, 8) * 0.04,
        ease: [0.2, 0.7, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/** Parentesi d'angolo cremisi: dà alla carta un taglio "tattico". */
export function Corners({ tone = "crimson" }: { tone?: "crimson" | "arcane" | "gold" }) {
  const color =
    tone === "arcane"
      ? "border-arcane-bright/70"
      : tone === "gold"
        ? "border-gold/70"
        : "border-crimson-bright/70";
  const base = cn("pointer-events-none absolute size-3.5", color);
  return (
    <>
      <span aria-hidden className={cn(base, "top-0 left-0 border-t-2 border-l-2")} />
      <span aria-hidden className={cn(base, "top-0 right-0 border-t-2 border-r-2")} />
      <span aria-hidden className={cn(base, "bottom-0 left-0 border-b-2 border-l-2")} />
      <span aria-hidden className={cn(base, "right-0 bottom-0 border-r-2 border-b-2")} />
    </>
  );
}

/** Sezione con titolo a lama (barra cremisi inclinata). */
export function Panel({
  title,
  icon: Icon,
  aside,
  tone = "crimson",
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  aside?: ReactNode;
  tone?: "crimson" | "arcane" | "gold";
  children: ReactNode;
  className?: string;
}) {
  const accent =
    tone === "arcane"
      ? "from-arcane-bright/70"
      : tone === "gold"
        ? "from-gold/70"
        : "from-crimson-bright/80";
  return (
    <section
      className={cn(
        "relative rounded-xl border border-hairline-strong bg-surface-1/85 p-4 sm:p-5",
        className
      )}
    >
      <Corners tone={tone} />
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 font-heading text-xs font-bold tracking-[0.2em] text-foreground/90 uppercase">
          <span
            aria-hidden
            className={cn("h-4 w-1.5 -skew-x-[18deg] rounded-[1px] bg-gradient-to-b to-transparent", accent)}
          />
          <Icon aria-hidden className="size-4 text-foreground/70" />
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Tessera numerica compatta. */
export function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "crimson" | "arcane" | "gold";
}) {
  const valueColor =
    tone === "arcane"
      ? "text-arcane-bright"
      : tone === "gold"
        ? "text-gold-bright"
        : tone === "crimson"
          ? "text-crimson-light"
          : "text-parchment";
  return (
    <div className="relative flex min-h-[5.25rem] flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-hairline bg-gradient-to-b from-surface-2/80 to-surface-1/90 px-2 py-3">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      <span
        className={cn(
          "font-heading text-2xl leading-none font-bold tabular-nums",
          valueColor
        )}
      >
        {value}
      </span>
      <span className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {Icon && <Icon aria-hidden className="size-3" />}
        {label}
      </span>
      {sub && (
        <span className="text-[10px] text-muted-foreground/80">{sub}</span>
      )}
    </div>
  );
}

/** Contatore − / valore / + con bersagli da 44px. */
export function Counter({
  value,
  onChange,
  min = 0,
  max,
  label,
  tone,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label: string;
  tone?: "arcane";
}) {
  const clamp = (n: number) =>
    Math.max(min, max !== undefined && max > 0 ? Math.min(max, n) : n);
  const btn =
    "grid size-11 place-items-center rounded-lg border border-hairline-strong bg-surface-2/60 text-foreground/90 transition-colors hover:border-crimson/50 hover:bg-crimson/10 active:bg-crimson/20 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={btn}
        aria-label={`Diminuisci: ${label}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <span
        aria-live="polite"
        className={cn(
          "min-w-10 text-center font-heading text-xl font-bold tabular-nums",
          tone === "arcane" ? "text-arcane-bright" : "text-parchment"
        )}
      >
        {value}
        {max !== undefined && max > 0 && (
          <span className="text-sm text-muted-foreground">/{max}</span>
        )}
      </span>
      <button
        type="button"
        className={btn}
        aria-label={`Aumenta: ${label}`}
        disabled={max !== undefined && max > 0 && value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  );
}

/**
 * Testo descrittivo comprimibile: 2 righe, "Leggi tutto" al tocco.
 * Le descrizioni degli oggetti possono essere molto lunghe.
 */
export function Describe({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const long = text.length > 110;
  if (!text.trim()) return null;
  return (
    <div className={className}>
      <p
        className={cn(
          "text-[13px] leading-relaxed whitespace-pre-line text-muted-foreground",
          !open && long && "line-clamp-2"
        )}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="mt-1 min-h-8 text-xs font-semibold tracking-wide text-crimson-light hover:underline focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
        >
          {open ? "Mostra meno" : "Leggi tutto"}
        </button>
      )}
    </div>
  );
}

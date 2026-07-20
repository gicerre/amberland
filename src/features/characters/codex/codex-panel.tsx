"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/* ============================================================
 * CodexPanel — il modulo base della scheda.
 *
 * Ogni blocco (Caratteristiche, Inventario, Magie…) è un
 * pannello indipendente: intestazione con icona e conteggio,
 * corpo collassabile con stato persistito per personaggio.
 * Superficie E1 pulita, hairline, niente texture (Obsidian).
 * ============================================================ */

/** Stato aperto/chiuso persistito in localStorage. */
function usePersistedOpen(storageKey: string, defaultOpen: boolean) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored !== null) setOpen(stored === "1");
    } catch {
      /* storage non disponibile: si resta sul default */
    }
  }, [storageKey]);

  const toggle = useCallback(() => {
    setOpen((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* ignora */
      }
      return next;
    });
  }, [storageKey]);

  return [open, toggle] as const;
}

export function CodexPanel({
  id,
  icon: Icon,
  title,
  meta,
  actions,
  storageScope,
  defaultOpen = true,
  accent = "gold",
  children,
  className,
  contentClassName,
}: {
  /** Ancora della sezione (per nav e scroll-spy). */
  id: string;
  icon: LucideIcon;
  title: ReactNode;
  /** Conteggi o riepilogo a destra del titolo. */
  meta?: ReactNode;
  /** Azioni (es. + Aggiungi) — restano cliccabili senza collassare. */
  actions?: ReactNode;
  /** Prefisso di persistenza (id del personaggio). */
  storageScope: string;
  defaultOpen?: boolean;
  accent?: "gold" | "arcane" | "crimson";
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const [open, toggle] = usePersistedOpen(
    `codex:${storageScope}:${id}`,
    defaultOpen
  );

  const accentIcon =
    accent === "arcane"
      ? "text-arcane-bright"
      : accent === "crimson"
        ? "text-crimson-bright"
        : "text-gold";

  return (
    <section
      id={`codex-${id}`}
      data-codex-section={id}
      className={cn(
        "elev-1 scroll-mt-28 overflow-hidden rounded-2xl border border-hairline bg-surface-1",
        className
      )}
    >
      <header className="flex items-center gap-2 py-1.5 pr-2 pl-4">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={`codex-${id}-body`}
          className="group flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <Icon className={cn("size-4.5 shrink-0", accentIcon)} />
          <h2 className="min-w-0 truncate font-heading text-base font-bold tracking-wide text-parchment">
            {title}
          </h2>
          {meta && (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {meta}
            </span>
          )}
          <ChevronDown
            aria-hidden
            className={cn(
              "ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-foreground",
              open && "rotate-180"
            )}
          />
        </button>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </header>

      {open && (
        <div
          id={`codex-${id}-body`}
          className={cn(
            "animate-[fade-up_240ms_var(--ease-out)_both] border-t border-hairline p-4 sm:p-5",
            contentClassName
          )}
        >
          {children}
        </div>
      )}
    </section>
  );
}

/** Occhiello di sotto-sezione dentro un pannello. */
export function PanelEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-2 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase",
        className
      )}
    >
      {children}
    </p>
  );
}

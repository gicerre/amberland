"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { imageIcon } from "@/components/shared/image-icon";
import { WindowPanel } from "@/design-system";
import { useEntitiesByType } from "@/features/entities/data";
import { QUEST_EVENT_STYLE } from "@/features/entities/registry";
import { QuestStatusIcon } from "@/features/entities/components/quest-status-icon";
import { cn } from "@/lib/utils";

// Ordine di rilevanza nelle tessere del resoconto.
const TILE_ORDER = ["ACTIVE", "NEXT", "AVAILABLE", "COMPLETED", "FAILED"] as const;

// Icona illustrata del box (arte in /public/icons).
const ChronicleIcon = imageIcon("/icons/pergamena.png");

/**
 * Box epico riassuntivo dell'andamento delle missioni della compagnia:
 * conteggi per stato e barra di completamento. Rispetta la visibilità
 * (i giocatori vedono solo le quest party/pubbliche).
 */
export function QuestOverviewBox() {
  const { data: quests } = useEntitiesByType("quest");
  // Mobile: parte chiuso (solo intestazione + barra). Desktop: sempre aperto.
  const [open, setOpen] = useState(false);

  const { counts, total, completed, pct } = useMemo(() => {
    const c: Record<string, number> = {
      AVAILABLE: 0,
      NEXT: 0,
      ACTIVE: 0,
      COMPLETED: 0,
      FAILED: 0,
    };
    for (const quest of quests ?? []) {
      const status = String(quest.fields.status ?? "AVAILABLE");
      if (status in c) c[status] += 1;
      else c.AVAILABLE += 1;
    }
    const tot = TILE_ORDER.reduce((sum, key) => sum + c[key], 0);
    const done = c.COMPLETED;
    return {
      counts: c,
      total: tot,
      completed: done,
      pct: tot > 0 ? Math.round((done / tot) * 100) : 0,
    };
  }, [quests]);

  if (total === 0) return null;

  return (
    <WindowPanel
      variant="06"
      className="bg-gradient-to-br from-gold/15 via-card to-night/70"
      contentClassName="p-5 sm:p-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.16),transparent_60%)]" />

      <div className="relative">
        {/* Intestazione */}
        <div className="flex items-center gap-3">
          <ChronicleIcon className="size-16 shrink-0 drop-shadow-[0_3px_12px_rgba(0,0,0,0.55)] sm:size-20" />
          <div className="min-w-0 flex-1">
            <h2 className="text-gold-gradient font-heading text-2xl font-bold tracking-wider">
              Cronaca delle Imprese
            </h2>
            <p className="text-sm text-muted-foreground">
              L&rsquo;andamento delle missioni della compagnia.
            </p>
          </div>
          {/* Toggle collapse — solo mobile */}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Comprimi" : "Espandi il dettaglio"}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gold/25 bg-night/40 text-gold transition-colors hover:border-gold/50 sm:hidden"
          >
            <ChevronDown
              className={cn("size-5 transition-transform", open && "rotate-180")}
            />
          </button>
        </div>

        {/* Barra di completamento */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-heading tracking-wide text-foreground">
              Completamento
            </span>
            <span className="text-muted-foreground">
              <strong className="text-emerald-300">{completed}</strong> /{" "}
              {total} ·{" "}
              <strong className="text-gold-bright">{pct}%</strong>
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border border-gold/25 bg-night/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-400 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Tessere per stato — mobile: collassabili, solo icona + numero. */}
        <div
          className={cn(
            "mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5",
            !open && "hidden sm:grid"
          )}
        >
          {TILE_ORDER.map((status) => {
            const style = QUEST_EVENT_STYLE[status];
            return (
              <div
                key={status}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-gold/15 bg-night/40 p-3 text-center"
              >
                <QuestStatusIcon status={status} className="size-10" />
                <span className="font-heading text-2xl font-bold text-foreground">
                  {counts[status]}
                </span>
                {/* Etichetta nascosta su mobile (solo icona + numero). */}
                <span className="hidden text-[11px] tracking-wide text-muted-foreground sm:block">
                  {style.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </WindowPanel>
  );
}

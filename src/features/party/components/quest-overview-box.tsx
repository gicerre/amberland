"use client";

import { ScrollText } from "lucide-react";
import { useMemo } from "react";

import { WindowPanel } from "@/design-system";
import { useEntitiesByType } from "@/features/entities/data";
import { QUEST_EVENT_STYLE } from "@/features/entities/registry";
import { cn } from "@/lib/utils";

// Ordine di rilevanza nelle tessere del resoconto.
const TILE_ORDER = ["ACTIVE", "NEXT", "AVAILABLE", "COMPLETED", "FAILED"] as const;

/**
 * Box epico riassuntivo dell'andamento delle missioni della compagnia:
 * conteggi per stato e barra di completamento. Rispetta la visibilità
 * (i giocatori vedono solo le quest party/pubbliche).
 */
export function QuestOverviewBox() {
  const { data: quests } = useEntitiesByType("quest");

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
      variant="03"
      className="bg-gradient-to-br from-gold/15 via-card to-night/70"
      contentClassName="p-5 sm:p-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.16),transparent_60%)]" />

      <div className="relative">
        {/* Intestazione */}
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/15 text-gold shadow-[0_0_26px_rgba(212,175,55,0.25)]">
            <ScrollText className="size-6" />
          </span>
          <div>
            <h2 className="text-gold-gradient font-heading text-2xl font-bold tracking-wider">
              Cronaca delle Imprese
            </h2>
            <p className="text-sm text-muted-foreground">
              L&rsquo;andamento delle missioni della compagnia.
            </p>
          </div>
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

        {/* Tessere per stato */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {TILE_ORDER.map((status) => {
            const style = QUEST_EVENT_STYLE[status];
            const Icon = style.icon;
            return (
              <div
                key={status}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-gold/15 bg-night/40 p-3 text-center"
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg",
                    style.iconWrap
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="font-heading text-2xl font-bold text-foreground">
                  {counts[status]}
                </span>
                <span className="text-[11px] tracking-wide text-muted-foreground">
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

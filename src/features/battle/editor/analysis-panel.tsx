"use client";

import { AlertCircle, CircleAlert, Info, Stethoscope } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { analyzeMap, type IssueSeverity } from "@/features/battle/engine/analysis";
import { cn } from "@/lib/utils";

import { useEditor } from "./use-editor";

/* ============================================================
 * Analisi della battlemap.
 *
 * Il controllo tecnico che al tavolo si fa troppo tardi: zone murate
 * dentro, schieramenti a tre passi, campi senza un riparo. Ogni problema
 * porta le proprie caselle, e un clic le seleziona sulla mappa — così si
 * corregge dove serve invece di cercare.
 * ============================================================ */

const SEVERITY: Record<
  IssueSeverity,
  { label: string; className: string; icon: typeof Info }
> = {
  ERROR: {
    label: "Da correggere",
    className: "border-crimson/50 bg-crimson/10 text-crimson-light",
    icon: AlertCircle,
  },
  WARNING: {
    label: "Da valutare",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    icon: CircleAlert,
  },
  INFO: {
    label: "Nota",
    className: "border-hairline bg-surface-2 text-muted-foreground",
    icon: Info,
  },
};

export function AnalysisPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editor = useEditor();
  const [partySize, setPartySize] = useState(4);
  const [enemyCount, setEnemyCount] = useState(5);

  const analysis = useMemo(
    () =>
      open
        ? analyzeMap(editor.map, editor.grid, { partySize, enemyCount })
        : null,
    [open, editor.map, editor.grid, partySize, enemyCount]
  );

  if (!analysis) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const scoreTone =
    analysis.score >= 80
      ? "text-emerald-300"
      : analysis.score >= 55
        ? "text-amber-300"
        : "text-crimson-light";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Analisi della battlemap</DialogTitle>
          <DialogDescription>
            Un controllo tecnico, non un giudizio di gusto: cosa impedirebbe
            allo scontro di funzionare.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className={cn("font-heading text-4xl tabular-nums", scoreTone)}>
              {analysis.score}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <label className="text-xs text-muted-foreground">
            Personaggi
            <Input
              type="number"
              min={1}
              max={12}
              value={partySize}
              onChange={(event) => setPartySize(Number(event.target.value) || 1)}
              className="mt-1 h-8 w-20 tabular-nums"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Nemici
            <Input
              type="number"
              min={1}
              max={40}
              value={enemyCount}
              onChange={(event) => setEnemyCount(Number(event.target.value) || 1)}
              className="mt-1 h-8 w-20 tabular-nums"
            />
          </label>
        </div>

        <section className="grid gap-1.5 sm:grid-cols-2">
          {analysis.breakdown.map((entry) => (
            <div key={entry.label} title={entry.hint}>
              <div className="mb-0.5 flex items-baseline justify-between text-[11px]">
                <span>{entry.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {entry.value}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn(
                    "h-full rounded-full",
                    entry.value >= 80
                      ? "bg-emerald-400/70"
                      : entry.value >= 55
                        ? "bg-amber-400/70"
                        : "bg-crimson/70"
                  )}
                  style={{ width: `${Math.max(2, entry.value)}%` }}
                />
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-1.5">
          {analysis.issues.length === 0 ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-200/90">
              Nessun problema rilevato: la mappa è collegata, gli schieramenti
              hanno senso e c&apos;è spazio per combattere.
            </p>
          ) : (
            analysis.issues.map((issue) => {
              const config = SEVERITY[issue.severity];
              const Icon = config.icon;
              return (
                <div
                  key={issue.id}
                  className={cn("rounded-lg border p-2.5 text-xs", config.className)}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 size-3.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-[0.72rem] tracking-wide">
                        {issue.title}
                      </p>
                      <p className="mt-0.5 leading-relaxed opacity-90">
                        {issue.detail}
                      </p>
                    </div>
                    {issue.cells.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 text-[11px]"
                        onClick={() => {
                          editor.selectCells(issue.cells);
                          onOpenChange(false);
                        }}
                      >
                        Mostra
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 border-t border-hairline pt-3 text-[11px] text-muted-foreground sm:grid-cols-4">
          <Stat label="Caselle" value={analysis.stats.total} />
          <Stat label="Percorribili" value={analysis.stats.open} />
          <Stat label="Invalicabili" value={analysis.stats.blocked} />
          <Stat label="Difficili" value={analysis.stats.difficult} />
          <Stat label="Con riparo" value={analysis.stats.withCover} />
          <Stat label="In quota" value={analysis.stats.elevated} />
          <Stat label="Regioni" value={analysis.stats.regions} />
          <Stat label="Strettoie" value={analysis.stats.chokepoints} />
        </dl>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="truncate">{label}</dt>
      <dd className="tabular-nums text-foreground/80">{value}</dd>
    </div>
  );
}

export { Stethoscope as AnalysisIcon };

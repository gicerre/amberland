"use client";

import { Flag, MapPin, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { describeCover, type CoverResult } from "@/features/battle/engine/cover";
import { COVER_LABELS } from "@/features/battle/library";
import { formatDistance } from "@/features/battle/engine/geometry";
import type { CellReport } from "@/features/battle/engine/tactical";
import { DIFFICULTY_LABELS } from "@/features/battle/terrain";
import type { GridConfig } from "@/types/battle";

/* ============================================================
 * Prova sul campo.
 *
 * Serve a rispondere all'unica domanda che conta prima di aprire lo
 * scontro: "questa mappa funziona?". Si posa una pedina finta, si sceglie
 * una destinazione e si legge tutto ciò che il regolamento chiederebbe.
 * Niente di questo tocca il documento: è una simulazione.
 * ============================================================ */

export interface TestReport {
  distance: number;
  cost: number | null;
  reachable: boolean;
  reason: string | null;
  target: CellReport;
  /** Copertura di cui godrebbe chi si trova sulla casella scelta. */
  cover: CoverResult;
  elevationDelta: number;
}

export function TestBattlePanel({
  report,
  grid,
  hasToken,
  onReset,
  onClose,
}: {
  report: TestReport | null;
  grid: GridConfig;
  hasToken: boolean;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="glass absolute top-3 right-3 w-64 rounded-xl border border-hairline p-3 text-xs">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-heading text-[0.7rem] tracking-[0.14em] text-gold uppercase">
          Prova sul campo
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={onClose}
          aria-label="Chiudi la prova"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {!hasToken ? (
        <p className="text-muted-foreground">
          <MapPin className="mr-1 inline size-3.5" />
          Fai clic su una cella per posare la pedina di prova.
        </p>
      ) : !report ? (
        <p className="text-muted-foreground">
          <Flag className="mr-1 inline size-3.5" />
          Ora scegli la destinazione: leggerai distanza, costo e prove
          richieste.
        </p>
      ) : (
        <dl className="space-y-1.5">
          <Row label="Distanza" value={formatDistance(report.distance, grid.unit)} />
          <Row
            label="Costo del movimento"
            value={
              report.cost === null
                ? "Irraggiungibile"
                : formatDistance(report.cost, grid.unit)
            }
            tone={report.reachable ? undefined : "danger"}
          />
          <Row label="Terreno" value={report.target.terrain.label} />
          {report.target.terrain.difficult && (
            <Row label="Tipo" value="Terreno difficile" tone="warn" />
          )}
          <Row
            label="Quota"
            value={
              report.elevationDelta === 0
                ? `${report.target.elevation}`
                : `${report.target.elevation} (${
                    report.elevationDelta > 0 ? "+" : ""
                  }${report.elevationDelta})`
            }
          />
          <Row label="Copertura sul posto" value={COVER_LABELS[report.target.cover]} />
          <Row
            label="Linea di tiro"
            value={describeCover(report.cover)}
            tone={report.cover.blocked ? "danger" : undefined}
          />
          {report.target.check && (
            <Row
              label="Prova richiesta"
              value={`${report.target.check.skill} CD ${report.target.check.dc} (${
                DIFFICULTY_LABELS[report.target.check.difficulty]
              })`}
              tone="warn"
            />
          )}
          {report.target.hazards.length > 0 && (
            <Row
              label="Pericoli"
              value={report.target.hazards.map((h) => h.name).join(", ")}
              tone="danger"
            />
          )}
          {report.target.traps.length > 0 && (
            <Row
              label="Trappole"
              value={report.target.traps.map((t) => t.name).join(", ")}
              tone="danger"
            />
          )}
          {report.target.areas.length > 0 && (
            <Row
              label="Aree"
              value={report.target.areas.map((a) => a.name).join(", ")}
            />
          )}
          {report.reason && (
            <p className="pt-1 text-crimson-light">{report.reason}</p>
          )}
        </dl>
      )}

      {hasToken && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={onReset}
        >
          Sposta la pedina di prova
        </Button>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn" | "danger";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd
        className={
          tone === "danger"
            ? "text-right text-crimson-light"
            : tone === "warn"
              ? "text-right text-amber-300"
              : "text-right"
        }
      >
        {value}
      </dd>
    </div>
  );
}

"use client";

import { ArrowRight, Plus, Swords } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TomePanel } from "@/design-system";
import {
  BATTLE_STATUS_BADGES,
  BATTLE_STATUS_LABELS,
} from "@/features/battle/constants";
import { useBattles } from "@/features/battle/data";
import { cn } from "@/lib/utils";

import { BattleCreateDialog } from "./battle-create-dialog";

/** Quante battaglie mostrare nella Sala del Master prima del "vedi tutte". */
const PREVIEW_COUNT = 4;

/**
 * Tavolo di Guerra: la scorciatoia del Master ai campi di battaglia.
 * Vive nella Sala del Master e mostra le mappe toccate di recente.
 */
export function WarTablePanel() {
  const { data: battles } = useBattles();
  const [createOpen, setCreateOpen] = useState(false);

  const recent = (battles ?? []).slice(0, PREVIEW_COUNT);

  return (
    <TomePanel
      icon={Swords}
      eyebrow="Campi di battaglia"
      title="Tavolo di Guerra"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/battaglie">
              Tutti i campi
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            Nuovo campo
          </Button>
        </div>
      }
    >
      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun campo tracciato: la prima mappa si disegna in pochi minuti,
          griglia e sfondo si regolano con l&apos;anteprima dal vivo.
        </p>
      ) : (
        <ul className="space-y-2">
          {recent.map((battle) => (
            <li key={battle.id}>
              <Link
                href={`/battaglie/${battle.id}/preparazione`}
                className="flex items-center gap-3 rounded-lg border border-hairline bg-surface-2/60 px-3 py-2 transition-colors hover:border-gold/40"
              >
                <Swords className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{battle.name}</span>
                <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:inline">
                  {battle.grid.cols} × {battle.grid.rows}
                </span>
                <Badge
                  className={cn(
                    "shrink-0",
                    BATTLE_STATUS_BADGES[battle.status]
                  )}
                >
                  {BATTLE_STATUS_LABELS[battle.status]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <BattleCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </TomePanel>
  );
}

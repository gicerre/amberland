"use client";

import { Grid3x3, Ruler, Swords } from "lucide-react";
import Link from "next/link";

import { FantasyImage } from "@/components/shared/fantasy-image";
import { Badge } from "@/components/ui/badge";
import {
  BATTLE_STATUS_BADGES,
  BATTLE_STATUS_FLAVOR,
  BATTLE_STATUS_LABELS,
} from "@/features/battle/constants";
import { formatDistance } from "@/features/battle/engine/geometry";
import { cn, formatDate, timestampToDate } from "@/lib/utils";
import type { Battle } from "@/types/battle";

/**
 * Voce dell'elenco dei campi di battaglia. Il Master entra in
 * preparazione; per i giocatori la card resta una scheda di lettura
 * finché lo scontro non viene aperto (fase 3).
 */
export function BattleCard({
  battle,
  href,
}: {
  battle: Battle;
  href?: string;
}) {
  const { grid } = battle;
  const updated = formatDate(timestampToDate(battle.updatedAt));

  const body = (
    <article
      className={cn(
        "elev-1 group flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-surface-1 transition-colors",
        href && "hover:border-gold/40"
      )}
    >
      <div className="relative h-32 shrink-0 overflow-hidden">
        <FantasyImage
          src={battle.background?.url}
          alt=""
          fallbackIcon={Swords}
          className="h-full w-full"
          position="center"
          maxWidth={720}
        />
        <Badge
          className={cn(
            "absolute top-2.5 right-2.5",
            BATTLE_STATUS_BADGES[battle.status]
          )}
        >
          {BATTLE_STATUS_LABELS[battle.status]}
        </Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-base leading-tight tracking-wide">
          {battle.name}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {battle.description || BATTLE_STATUS_FLAVOR[battle.status]}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Grid3x3 className="size-3.5" />
            {grid.cols} × {grid.rows}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="size-3.5" />
            {formatDistance(grid.cellSize, grid.unit)} per cella
          </span>
          <span className="ml-auto tabular-nums">{updated}</span>
        </div>
      </div>
    </article>
  );

  return href ? (
    <Link
      href={href}
      className="block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

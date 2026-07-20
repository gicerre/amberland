"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

import { chronicleDateLabel } from "../calendar";
import {
  CANON_BADGES,
  CHRONICLE_CATEGORY_META,
  DRAFT_BADGE,
} from "../constants";

/**
 * Voce dell'indice del Libro: puntina di categoria (unico segnale
 * colore), titolo in Cinzel, data e sottotitolo. Tutta la riga è un
 * link al capitolo.
 */
export function ChronicleCard({
  entity,
  isNew = false,
}: {
  entity: Entity;
  isNew?: boolean;
}) {
  const data = entity.chronicle;
  const category = data ? CHRONICLE_CATEGORY_META[data.category] : null;
  const Icon = category?.icon;
  const dateLabel = chronicleDateLabel(entity);

  return (
    <Link
      href={`/entita/${entity.id}`}
      className="group flex items-start gap-3.5 rounded-xl border border-hairline bg-card/60 p-4 transition-colors hover:border-gold/45 hover:bg-gold/[0.05]"
    >
      {Icon && (
        <span
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-2"
          style={{ color: category?.accent }}
          title={category?.label}
        >
          <Icon className="size-4.5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-heading text-base font-semibold tracking-wide text-foreground group-hover:text-gold-bright">
            {entity.name}
          </span>
          {dateLabel && (
            <span className="font-heading text-xs text-gold/75">
              {dateLabel}
            </span>
          )}
          {isNew && (
            <Badge
              variant="outline"
              className="border-gold/50 bg-gold/15 text-[10px] text-gold-bright"
            >
              Nuovo
            </Badge>
          )}
          {data?.draft ? (
            <Badge variant="outline" className={cn("text-[10px]", DRAFT_BADGE.className)}>
              {DRAFT_BADGE.label}
            </Badge>
          ) : data?.canonStatus === "PROPOSED" ? (
            <Badge
              variant="outline"
              className={cn("text-[10px]", CANON_BADGES.PROPOSED.className)}
            >
              {CANON_BADGES.PROPOSED.label}
            </Badge>
          ) : null}
        </span>
        {(data?.subtitle || data?.contentText) && (
          <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
            {data.subtitle || data.contentText}
          </span>
        )}
      </span>
    </Link>
  );
}

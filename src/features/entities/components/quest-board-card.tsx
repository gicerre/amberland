"use client";

import { ArrowRight, EyeOff, Lock, ScrollText, Target, Trophy } from "lucide-react";
import Link from "next/link";

import { CornerOrnaments } from "@/components/shared/fantasy-card";
import { FantasyImage } from "@/components/shared/fantasy-image";
import {
  richTextToPlainText,
  type RichTextValue,
} from "@/components/shared/rich-text-utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

import {
  QUEST_STATUS_OPTIONS,
  isHiddenFromPlayers,
  isLockedEntity,
} from "../registry";
import { QuestStatusIcon } from "./quest-status-icon";

/** Esadecimale → rgba() con alpha. */
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Colore-tema per stato della quest: guida bordo, glow e badge. */
const QUEST_STATUS_ACCENT: Record<string, string> = {
  ACTIVE: "#d4af37", // oro — in corso
  NEXT: "#ff7a18", // fuoco — prossima
  AVAILABLE: "#9a907c", // muto — disponibile
  COMPLETED: "#34d399", // luce — completata
  FAILED: "#dc2626", // sangue — fallita
  SECRET: "#7c5cff", // arcano — segreta
};

/**
 * Card "bacheca delle imprese": copertina cinematografica, stato a colpo
 * d'occhio (colore/icona), gerarchia chiara nome → obiettivi → ricompensa →
 * tag. Tematizzata per stato. Pensata per la pagina /quest.
 */
export function QuestBoardCard({ entity }: { entity: Entity }) {
  const { isMaster } = useAuth();
  const status = String(entity.fields.status ?? "AVAILABLE");
  const statusLabel =
    QUEST_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  const accent = QUEST_STATUS_ACCENT[status] ?? QUEST_STATUS_ACCENT.AVAILABLE;
  const isPast = status === "COMPLETED" || status === "FAILED";

  const objectives = richTextToPlainText(
    entity.fields.objectives as RichTextValue
  ).slice(0, 150);
  const rewards = richTextToPlainText(
    entity.fields.rewards as RichTextValue
  ).slice(0, 70);

  return (
    <Link
      href={`/entita/${entity.id}`}
      className={cn(
        "group relative isolate flex min-h-[15rem] flex-col justify-end overflow-hidden rounded-2xl border",
        "shadow-[0_16px_44px_-18px_rgba(0,0,0,0.9)]",
        "transition-all duration-300 hover:-translate-y-1.5"
      )}
      style={{ borderColor: withAlpha(accent, 0.3) }}
    >
      {/* Copertina */}
      <FantasyImage
        src={entity.imageUrl}
        alt={entity.name}
        fallbackIcon={ScrollText}
        position="center"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
        className={cn(
          "absolute inset-0 size-full transition-transform duration-[1.2s] ease-out group-hover:scale-[1.06]",
          isPast && "grayscale-[0.45]"
        )}
      />

      {/* Foschia + vignetta per leggibilità */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-deep via-stone-deep/72 to-stone-deep/15" />
      {/* Alone dello stato dall'alto */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${withAlpha(accent, 0.22)}, transparent 60%)`,
        }}
      />
      {/* Glow di stato che si accende al passaggio del mouse */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 60px ${withAlpha(accent, 0.3)}` }}
      />

      {/* Filo superiore nel colore dello stato + angoli incisi */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5"
        style={{
          background: `linear-gradient(to right, transparent, ${withAlpha(accent, 0.85)}, transparent)`,
        }}
      />
      <CornerOrnaments size="sm" className="z-20 border-gold/35" />

      {/* Sigillo dello stato — grande filigrana di sfondo */}
      <QuestStatusIcon
        status={status}
        className="pointer-events-none absolute -top-3 -right-3 z-0 size-28 opacity-[0.12]"
      />

      {/* Indicatore nascosta/bloccata (solo Master) */}
      {isMaster && isHiddenFromPlayers(entity) && (
        <span className="absolute top-3 right-3 z-20 flex size-6 items-center justify-center rounded-full border border-amber-500/40 bg-background/80 backdrop-blur-sm">
          {isLockedEntity(entity) ? (
            <Lock className="size-3 text-amber-400" />
          ) : (
            <EyeOff className="size-3 text-amber-400" />
          )}
        </span>
      )}

      {/* Contenuto */}
      <div className="relative z-20 p-5">
        {/* Stato — a colpo d'occhio */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-heading text-[10px] font-bold tracking-[0.18em] uppercase backdrop-blur-sm"
          style={{
            color: accent,
            borderColor: withAlpha(accent, 0.5),
            background: withAlpha(accent, 0.12),
          }}
        >
          <QuestStatusIcon status={status} className="size-3.5" />
          {statusLabel}
        </span>

        {/* Nome */}
        <h3 className="text-gold-gradient mt-2.5 font-heading text-xl font-bold tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-2xl">
          {entity.name}
        </h3>

        {/* Obiettivi */}
        {objectives && (
          <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-relaxed text-parchment-dark/80">
            <Target className="mt-0.5 size-3.5 shrink-0 text-gold/55" />
            <span className="line-clamp-2 italic">{objectives}</span>
          </p>
        )}

        {/* Ricompensa */}
        {rewards && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-amber-bright/90">
            <Trophy className="size-3.5 shrink-0" />
            <span className="line-clamp-1">{rewards}</span>
          </p>
        )}

        {/* Tag + invito */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {entity.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="border-gold/20 bg-night/40 text-[9px] text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
          <ArrowRight className="size-4 shrink-0 text-gold/50 transition-all group-hover:translate-x-1 group-hover:text-gold-bright" />
        </div>
      </div>
    </Link>
  );
}

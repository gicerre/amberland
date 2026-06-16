"use client";

/**
 * Layout dei contenuti del dettaglio entità, specifico per tipo.
 * Sostituisce il blocco generico shortFields + descrizione + longFields
 * in entity-view.tsx con layout pensati per ogni tipo di entità.
 *
 * Esporta EntityDetailBody — dispatcher automatico.
 */

import {
  MapPin,
  Pencil,
  ScrollText,
  Skull,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import {
  CornerOrnaments,
  SectionDivider,
} from "@/components/shared/fantasy-card";
import { RichTextRenderer } from "@/components/shared/rich-text-lazy";
import {
  isEmptyRichText,
  type RichTextValue,
} from "@/components/shared/rich-text-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Entity, RichText } from "@/types/entities";

import type { EntityTypeConfig, FieldDef } from "../registry";
import {
  CREATURE_STATUS_BADGES,
  CREATURE_STATUS_OPTIONS,
  QUEST_STATUS_BADGES,
  QUEST_STATUS_OPTIONS,
} from "../registry";

/* ────────────────────────────────────────────────────────────
 * Tipi condivisi (mirror di entity-view.tsx)
 * ─────────────────────────────────────────────────────────── */

export interface ShortField { def: FieldDef; display: string }
export interface LongField  { def: FieldDef; rich: RichText  }

interface BodyProps {
  entity: Entity;
  shortFields: ShortField[];
  longFields: LongField[];
  config: EntityTypeConfig;
  isMaster: boolean;
  onEdit: () => void;
}

/* ────────────────────────────────────────────────────────────
 * EntityDetailBody — dispatcher
 * ─────────────────────────────────────────────────────────── */

export function EntityDetailBody(props: BodyProps) {
  switch (props.entity.type) {
    case "quest":    return <QuestBody    {...props} />;
    case "creature": return <CreatureBody {...props} />;
    default:         return <DefaultBody  {...props} />;
  }
}

/* ────────────────────────────────────────────────────────────
 * QuestBody — Pergamena dell'Archivista
 * Layout: 2 colonne lg — sinistra narrativa, destra meta
 * ─────────────────────────────────────────────────────────── */

function QuestBody({ entity, longFields, isMaster, onEdit }: BodyProps) {
  const status   = String(entity.fields.status ?? "AVAILABLE");
  const statusLabel = QUEST_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  const statusBadge = QUEST_STATUS_BADGES[status] ?? "";

  const objectives = longFields.find((f) => f.def.key === "objectives")?.rich;
  const rewards    = longFields.find((f) => f.def.key === "rewards")?.rich;

  const hasDescription = !isEmptyRichText(entity.description as RichTextValue);
  const hasObjectives  = objectives && !isEmptyRichText(objectives as RichTextValue);
  const hasRewards     = rewards    && !isEmptyRichText(rewards    as RichTextValue);

  /* Colore ribbon in base allo stato */
  const RIBBON: Record<string, string> = {
    ACTIVE:    "bg-gold",
    NEXT:      "bg-amber",
    COMPLETED: "bg-emerald",
    FAILED:    "bg-crimson-bright",
    SECRET:    "bg-arcane-bright",
    AVAILABLE: "bg-iron-mid",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">

      {/* ── Colonna sinistra: narrativa ── */}
      <div className="space-y-5 lg:col-span-2">

        {/* Descrizione: sfondo pergamena */}
        {hasDescription ? (
          <div className="relative overflow-hidden rounded-xl border border-gold/20 bg-gradient-to-b from-[#1a150c] to-[#140f09]">
            {/* Ribbon status */}
            <span className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", RIBBON[status])} />
            <div className="p-6 pl-8 sm:p-8 sm:pl-10">
              <p className="mb-3 font-heading text-[9px] font-bold tracking-[0.3em] text-gold/50 uppercase">
                ◆ Cronache dell&rsquo;incarico
              </p>
              <RichTextRenderer
                content={entity.description as RichTextValue}
                className="parchment-text text-base leading-relaxed text-[#d4c5a0] sm:text-lg"
              />
            </div>
          </div>
        ) : (
          isMaster && (
            <div className="rounded-xl border border-dashed border-gold/20 p-6 text-center">
              <ScrollText className="mx-auto mb-2 size-8 text-gold/25" />
              <p className="text-sm text-muted-foreground italic">
                Le cronache tacciono sull&rsquo;incarico.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={onEdit}>
                <Pencil className="size-3.5" />
                Scrivi le cronache
              </Button>
            </div>
          )
        )}

        {/* Obiettivi */}
        {hasObjectives && (
          <div className="relative overflow-hidden rounded-xl border border-gold/18 bg-gradient-to-b from-stone-surface to-stone-mid/80 p-5">
            <CornerOrnaments size="xs" className="border-gold/20" />
            <div className="mb-3 flex items-center gap-2">
              <Target className="size-4 text-gold" />
              <h3 className="font-heading text-sm font-bold tracking-[0.2em] text-gold uppercase">
                Obiettivi
              </h3>
              <span className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
            </div>
            <RichTextRenderer
              content={objectives as RichTextValue}
              className="text-[15px] leading-relaxed text-foreground/90"
            />
          </div>
        )}
      </div>

      {/* ── Colonna destra: meta + ricompense ── */}
      <div className="space-y-4">

        {/* Status sigillo */}
        <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-gold/15 bg-gradient-to-b from-stone-surface to-stone-mid/80 p-6">
          <CornerOrnaments size="xs" className="border-gold/20" />
          <p className="font-heading text-[9px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
            Stato dell&rsquo;incarico
          </p>
          <Badge variant="outline" className={cn("px-5 py-2 font-heading text-sm font-bold uppercase tracking-wider", statusBadge)}>
            {statusLabel}
          </Badge>
          {entity.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap justify-center gap-1.5">
              {entity.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="border-gold/20 text-[10px] text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Ricompense */}
        {hasRewards && (
          <div className="relative overflow-hidden rounded-xl border border-gold/18 bg-gradient-to-b from-stone-surface to-stone-mid/80 p-5">
            <CornerOrnaments size="xs" className="border-gold/20" />
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="size-4 text-gold" />
              <h3 className="font-heading text-sm font-bold tracking-[0.2em] text-gold uppercase">
                Ricompense
              </h3>
              <span className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
            </div>
            <RichTextRenderer
              content={rewards as RichTextValue}
              className="text-[15px] leading-relaxed text-foreground/90"
            />
          </div>
        )}

        {/* Empty rewards (master only) */}
        {!hasRewards && isMaster && (
          <div className="rounded-xl border border-dashed border-gold/15 p-4 text-center">
            <Trophy className="mx-auto mb-1.5 size-5 text-gold/25" />
            <p className="text-xs text-muted-foreground italic">Nessuna ricompensa definita.</p>
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={onEdit}>
              Aggiungi ricompense
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * CreatureBody — Pagina del Bestiario
 * Layout: sidebar destra (stat block) + contenuto principale
 * ─────────────────────────────────────────────────────────── */

function CreatureBody({ entity, longFields, isMaster, onEdit }: BodyProps) {
  const status       = String(entity.fields.status ?? "UNKNOWN");
  const statusLabel  = CREATURE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  const statusBadge  = CREATURE_STATUS_BADGES[status] ?? "";
  const cr           = entity.fields.cr ? String(entity.fields.cr) : null;
  const creatureType = entity.fields.creatureType ? String(entity.fields.creatureType) : null;
  const habitat      = entity.fields.habitat ? String(entity.fields.habitat) : null;

  const loot = longFields.find((f) => f.def.key === "loot")?.rich;

  const hasDescription = !isEmptyRichText(entity.description as RichTextValue);
  const hasLoot        = loot && !isEmptyRichText(loot as RichTextValue);

  /* CR → colore display */
  const crNum = cr ? parseFloat(cr) : 0;
  const crColor = crNum >= 10 ? "text-red-300" : crNum >= 5 ? "text-amber-bright" : "text-muted-foreground";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">

      {/* ── Main: descrizione + loot ── */}
      <div className="min-w-0 flex-1 space-y-5">

        {hasDescription ? (
          <div className="relative overflow-hidden rounded-xl border border-gold/18 bg-gradient-to-b from-stone-surface to-stone-mid/80 p-6 sm:p-8">
            {/* Striscia crimson in alto */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-crimson/80" />
            <p className="mb-3 font-heading text-[9px] font-bold tracking-[0.3em] text-crimson-bright/60 uppercase">
              ◆ Dal Bestiario
            </p>
            <RichTextRenderer
              content={entity.description as RichTextValue}
              className="text-base leading-relaxed text-foreground/90 sm:text-lg"
            />
          </div>
        ) : (
          isMaster && (
            <div className="rounded-xl border border-dashed border-crimson/30 p-6 text-center">
              <Skull className="mx-auto mb-2 size-8 text-crimson/30" />
              <p className="text-sm text-muted-foreground italic">
                Il bestiario non ha ancora voci su questa creatura.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={onEdit}>
                <Pencil className="size-3.5" />
                Scrivi la scheda
              </Button>
            </div>
          )
        )}

        {hasLoot && (
          <div className="relative overflow-hidden rounded-xl border border-gold/18 bg-gradient-to-b from-stone-surface to-stone-mid/80 p-5">
            <CornerOrnaments size="xs" className="border-gold/20" />
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-4 text-gold" />
              <h3 className="font-heading text-sm font-bold tracking-[0.2em] text-gold uppercase">
                Bottino
              </h3>
              <span className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
            </div>
            <RichTextRenderer
              content={loot as RichTextValue}
              className="text-[15px] leading-relaxed text-foreground/90"
            />
          </div>
        )}
      </div>

      {/* ── Sidebar: Stat block ── */}
      <aside className="shrink-0 space-y-3 lg:w-64 xl:w-72">
        <div className="relative overflow-hidden rounded-xl border border-crimson/40 bg-gradient-to-b from-[#180a0a] to-stone-mid/80 p-5">
          {/* Striscia crimson */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-crimson-bright" />
          <span className="pointer-events-none absolute inset-x-0 top-0.5 h-px bg-gradient-to-r from-transparent via-crimson-bright/30 to-transparent" />
          <CornerOrnaments size="xs" className="border-crimson/30" />

          <p className="mb-4 font-heading text-[9px] font-bold tracking-[0.3em] text-crimson-bright/60 uppercase">
            Scheda Creatura
          </p>

          <div className="space-y-3">
            {/* CR */}
            {cr && (
              <StatRow
                label="Grado Sfida"
                value={<span className={cn("font-heading text-lg font-bold", crColor)}>{cr}</span>}
              />
            )}

            {/* Tipo */}
            {creatureType && (
              <StatRow
                label="Tipo"
                value={<span className="text-foreground/90">{creatureType}</span>}
              />
            )}

            {/* Habitat */}
            {habitat && (
              <StatRow
                label="Habitat"
                icon={<MapPin className="size-3 text-gold/50" />}
                value={<span className="text-foreground/90">{habitat}</span>}
              />
            )}

            {/* Stato */}
            <StatRow
              label="Stato"
              value={
                <Badge variant="outline" className={cn("text-[10px]", statusBadge)}>
                  {statusLabel}
                </Badge>
              }
            />
          </div>
        </div>

        {/* Tags */}
        {entity.tags.length > 0 && (
          <div className="rounded-xl border border-gold/12 bg-card/40 p-3">
            <p className="mb-2 font-heading text-[9px] font-bold tracking-[0.25em] text-muted-foreground uppercase">
              Tag
            </p>
            <div className="flex flex-wrap gap-1.5">
              {entity.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="border-gold/20 text-[10px] text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

/** Riga di statistiche nel bestiary stat block. */
function StatRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-crimson/10 pb-2.5 last:border-0 last:pb-0">
      <dt className="flex shrink-0 items-center gap-1 text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
        {icon}
        {label}
      </dt>
      <dd className="text-right text-[13px]">{value}</dd>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * DefaultBody — Layout generico per tutti gli altri tipi
 * Estratto da entity-view.tsx
 * ─────────────────────────────────────────────────────────── */

function DefaultBody({ entity, config, shortFields, longFields, isMaster, onEdit }: BodyProps) {
  return (
    <>
      {/* Dettagli sintetici */}
      {shortFields.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shortFields.map(({ def, display }) => (
            <div
              key={def.key}
              className="rounded-lg border border-gold/15 bg-card/60 px-4 py-3"
            >
              <dt className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                {def.label}
              </dt>
              <dd className="mt-1 font-heading font-semibold text-gold-bright">
                {display}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Descrizione */}
      {!isEmptyRichText(entity.description as RichTextValue) ? (
        <div className="parchment rounded-xl p-6 sm:p-8">
          <RichTextRenderer
            content={entity.description as RichTextValue}
            className="text-base leading-relaxed sm:text-lg"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gold/20 p-6 text-center">
          <ScrollText className="mx-auto mb-2 size-8 text-gold/25" />
          <p className="text-sm text-muted-foreground italic">{config.flavor}</p>
          {isMaster && (
            <Button variant="outline" size="sm" className="mt-3" onClick={onEdit}>
              <Pencil className="size-3.5" />
              Scrivi le cronache
            </Button>
          )}
        </div>
      )}

      {/* Campi narrativi lunghi */}
      {longFields.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {longFields.map(({ def, rich }) => (
            <section
              key={def.key}
              className="rounded-xl border border-gold/15 bg-card/60 p-5"
            >
              <h3 className="font-heading mb-2 text-sm font-bold tracking-[0.2em] text-gold uppercase">
                {def.label}
              </h3>
              <SectionDivider variant="line" className="mb-3" />
              <RichTextRenderer
                content={rich as RichTextValue}
                className="text-[15px] leading-relaxed text-foreground/90"
              />
            </section>
          ))}
        </div>
      )}
    </>
  );
}

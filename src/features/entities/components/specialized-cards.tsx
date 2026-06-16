"use client";

/**
 * Card specializzate per tipo di entità.
 * Ogni card sostituisce la EntityCard generica con un layout pensato
 * per comunicare visivamente le informazioni chiave di quel tipo.
 *
 * Esporta anche SpecializedEntityCard — selettore automatico.
 */

import {
  CheckCircle2,
  EyeOff,
  Flag,
  Gem,
  Heart,
  Lock,
  MapPin,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Swords,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { CornerOrnaments } from "@/components/shared/fantasy-card";
import { FantasyImage } from "@/components/shared/fantasy-image";
import { richTextToPlainText } from "@/components/shared/rich-text-utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import type {
  CharacterKind,
  CharacterStatus,
  Entity,
} from "@/types/entities";

import {
  CHARACTER_KIND_BADGES,
  CHARACTER_KIND_SHORT,
  CHARACTER_STATUS_BADGES,
  CHARACTER_STATUS_LABELS,
} from "@/features/characters/constants";
import { EntityCard } from "./entity-card";
import {
  CREATURE_STATUS_BADGES,
  CREATURE_STATUS_OPTIONS,
  ITEM_CATEGORY_BADGES,
  ITEM_CATEGORY_OPTIONS,
  QUEST_STATUS_BADGES,
  QUEST_STATUS_OPTIONS,
  isHiddenFromPlayers,
  isLockedEntity,
} from "../registry";

/* ────────────────────────────────────────────────────────────
 * Configurazioni per status
 * ─────────────────────────────────────────────────────────── */

const QUEST_STATUS_RIBBON: Record<string, string> = {
  ACTIVE:    "bg-gold",
  NEXT:      "bg-amber",
  COMPLETED: "bg-emerald",
  FAILED:    "bg-crimson-bright",
  AVAILABLE: "bg-iron-mid",
  SECRET:    "bg-arcane-bright",
};

const QUEST_STATUS_LABEL_COLOR: Record<string, string> = {
  ACTIVE:    "text-gold-bright",
  NEXT:      "text-amber-bright",
  COMPLETED: "text-emerald-bright",
  FAILED:    "text-red-400",
  AVAILABLE: "text-muted-foreground",
  SECRET:    "text-arcane-bright",
};

const ITEM_RARITY_CONFIG: Record<string, {
  border: string;
  glow: string;
  label: string;
  labelColor: string;
}> = {
  COMMON:    { border: "border-iron-mid/70",          glow: "",                                   label: "Comune",            labelColor: "text-muted-foreground" },
  RARE:      { border: "border-arcane-bright/60",     glow: "shadow-[0_0_14px_rgba(77,114,201,0.35)]",   label: "Raro",              labelColor: "text-arcane-bright" },
  MAGIC:     { border: "border-purple-500/70",        glow: "shadow-[0_0_14px_rgba(155,89,182,0.4)]",    label: "Magico",            labelColor: "text-purple-300" },
  LEGENDARY: { border: "border-gold/70",              glow: "animate-glow-pulse",                         label: "Leggendario",       labelColor: "text-gold-bright" },
  ARTIFACT:  { border: "border-crimson-bright/70",   glow: "shadow-[0_0_16px_rgba(196,49,70,0.5)]",     label: "Artefatto",         labelColor: "text-crimson-bright" },
  STORY:     { border: "border-parchment/50",         glow: "",                                   label: "Oggetto di trama",  labelColor: "text-parchment" },
};

/* ────────────────────────────────────────────────────────────
 * QuestCard — Pergamena con Sigillo
 * ─────────────────────────────────────────────────────────── */

export function QuestCard({ entity }: { entity: Entity }) {
  const { isMaster } = useAuth();
  const status = String(entity.fields.status ?? "AVAILABLE");
  const statusLabel = QUEST_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  const ribbonColor = QUEST_STATUS_RIBBON[status] ?? "bg-iron-mid";
  const labelColor = QUEST_STATUS_LABEL_COLOR[status] ?? "text-muted-foreground";

  const objectivesText = richTextToPlainText(
    entity.fields.objectives as Parameters<typeof richTextToPlainText>[0]
  );
  const preview = objectivesText ? objectivesText.slice(0, 90) + (objectivesText.length > 90 ? "…" : "") : null;

  const badgeClass = QUEST_STATUS_BADGES[status] ?? "";

  return (
    <Link
      href={`/entita/${entity.id}`}
      className={cn(
        "group relative flex overflow-hidden rounded-xl border border-gold/15 bg-gradient-to-b from-stone-surface to-stone-mid/80",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.7)]",
        "transition-all duration-200 hover:-translate-y-1.5 hover:border-gold/40 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8),0_0_24px_rgba(212,175,55,0.08)]"
      )}
    >
      {/* Ribbon sinistro di stato */}
      <span className={cn("shrink-0 w-1 self-stretch rounded-l-xl", ribbonColor)} />

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <CornerOrnaments size="xs" className="border-gold/25" />

        {/* Icona + status label */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className={cn("font-heading text-[9px] font-bold tracking-[0.25em] uppercase", labelColor)}>
            ◆ {statusLabel}
          </p>
          {isMaster && isHiddenFromPlayers(entity) && (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-background/80">
              {isLockedEntity(entity)
                ? <Lock className="size-2.5 text-amber-400" />
                : <EyeOff className="size-2.5 text-amber-400" />
              }
            </span>
          )}
        </div>

        {/* Nome */}
        <h3 className="font-heading text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-gold-bright">
          {entity.name}
        </h3>

        {/* Preview obiettivi */}
        {preview && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground italic line-clamp-2">
            {preview}
          </p>
        )}

        {/* Tag e badge in fondo */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          <Badge variant="outline" className={cn("text-[9px]", badgeClass)}>
            {statusLabel}
          </Badge>
          {entity.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="border-gold/18 text-[9px] text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sigillo di stato — angolo in basso a destra */}
      <QuestStatusIcon status={status} />
    </Link>
  );
}

function QuestStatusIcon({ status }: { status: string }) {
  const icons: Record<string, { Icon: typeof Swords; cls: string }> = {
    ACTIVE:    { Icon: Swords,       cls: "text-gold" },
    NEXT:      { Icon: ScrollText,   cls: "text-amber-bright" },
    COMPLETED: { Icon: CheckCircle2, cls: "text-emerald-bright" },
    FAILED:    { Icon: XCircle,      cls: "text-red-400" },
    AVAILABLE: { Icon: ScrollText,   cls: "text-muted-foreground" },
    SECRET:    { Icon: EyeOff,       cls: "text-arcane-bright" },
  };
  const cfg = icons[status] ?? icons.AVAILABLE;
  const { Icon, cls } = cfg;
  return (
    <div className="flex items-end p-3 pb-4">
      <Icon className={cn("size-7 opacity-25 transition-opacity group-hover:opacity-40", cls)} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * CharacterCard — Ritratto Eroico
 * ─────────────────────────────────────────────────────────── */

export function CharacterCard({ entity }: { entity: Entity }) {
  const { isMaster } = useAuth();
  const kind = (entity.fields.kind as CharacterKind) ?? "NPC";
  const status = (entity.fields.status as CharacterStatus) ?? "ALIVE";
  const isDead = entity.fields.isDead === true || status === "DEAD";
  const isPC = kind === "PC";

  const race = String(entity.fields.race ?? "");
  const klass = String(entity.fields.class ?? "");
  const level = Number(entity.fields.level ?? 0);
  const subtitle = [race, klass].filter(Boolean).join(" · ") || null;

  return (
    <Link
      href={`/entita/${entity.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border",
        "bg-gradient-to-b from-stone-surface to-stone-mid/80",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.7)]",
        "transition-all duration-200 hover:-translate-y-1.5",
        isPC
          ? "border-gold/40 hover:border-gold/65 hover:shadow-[0_0_30px_rgba(212,175,55,0.18),0_12px_40px_-8px_rgba(0,0,0,0.8)]"
          : "border-gold/15 hover:border-gold/38 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)]"
      )}
    >
      {/* Striscia superiore */}
      <span className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 h-px",
        isPC
          ? "bg-gradient-to-r from-transparent via-gold/60 to-transparent"
          : "bg-gradient-to-r from-transparent via-gold/25 to-transparent"
      )} />

      {/* Glow permanente per PC */}
      {isPC && (
        <span className="pointer-events-none absolute inset-0 rounded-xl bg-gold/[0.04]" />
      )}

      {/* Ritratto in formato portrait 3:4 */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <FantasyImage
          src={entity.imageUrl}
          alt={entity.name}
          fallbackIcon={isPC ? Sparkles : Shield}
          className={cn("size-full", isDead && "grayscale")}
          sizes="(max-width: 640px) 50vw, 33vw"
          position="top"
        />

        {/* Gradiente bottom-up sull'immagine */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-mid via-stone-mid/30 to-transparent" />

        {/* Badge tipo (PC/NPC) — top-left */}
        <span className={cn(
          "absolute left-2 top-2 z-10 rounded px-1.5 py-0.5 font-heading text-[9px] font-bold tracking-[0.18em] uppercase",
          "border",
          CHARACTER_KIND_BADGES[kind]
        )}>
          {CHARACTER_KIND_SHORT[kind]}
        </span>

        {/* Badge status — top-right (solo se non ALIVE) */}
        {status !== "ALIVE" && (
          <span className={cn(
            "absolute right-2 top-2 z-10 rounded border px-1.5 py-0.5 font-heading text-[9px] font-bold uppercase",
            CHARACTER_STATUS_BADGES[status]
          )}>
            {isDead ? <Skull className="inline size-2.5" /> : null}
            {" "}{CHARACTER_STATUS_LABELS[status]}
          </span>
        )}

        {/* Nome sovrapposto all'immagine in basso */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-3">
          {subtitle && (
            <p className="font-heading text-[9px] tracking-[0.15em] text-gold/70 uppercase">
              {subtitle}
            </p>
          )}
          <h3 className="font-heading text-[15px] font-semibold leading-tight text-foreground transition-colors group-hover:text-gold-bright">
            {entity.name}
          </h3>
        </div>
      </div>

      {/* Footer con livello e info extra */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        {level > 0 ? (
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3 text-gold/60" />
            <span className="font-heading text-[11px] font-semibold text-gold-bright">
              Livello {level}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {entity.fields.alignment ? String(entity.fields.alignment) : "—"}
          </span>
        )}

        {isPC && (
          <span className="flex items-center gap-1">
            <Heart className="size-3 text-emerald/80" />
            <span className="font-heading text-[10px] text-emerald-bright/80">Vivo</span>
          </span>
        )}

        {isMaster && isHiddenFromPlayers(entity) && (
          <span title="Nascosta ai giocatori">
            <EyeOff className="size-3.5 text-amber-400/70" />
          </span>
        )}
      </div>

      <CornerOrnaments size="xs" className="border-gold/25" />
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────
 * MonsterCard — Ritratto del Bestiario (portrait 3:4)
 * ─────────────────────────────────────────────────────────── */

export function MonsterCard({ entity }: { entity: Entity }) {
  const { isMaster } = useAuth();
  const status = String(entity.fields.status ?? "UNKNOWN");
  const creatureType = String(entity.fields.creatureType ?? "");
  const cr = entity.fields.cr ? String(entity.fields.cr) : null;
  const habitat = entity.fields.habitat ? String(entity.fields.habitat) : null;
  const isDead = status === "DEAD";

  const statusBadgeClass = CREATURE_STATUS_BADGES[status] ?? "";
  const statusLabel = CREATURE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  const crNum = cr ? parseFloat(cr) : 0;
  const crBadgeClass = crNum >= 10
    ? "border-crimson-bright/60 bg-crimson/20 text-red-300"
    : crNum >= 5
    ? "border-amber/50 bg-amber-deep/20 text-amber-bright"
    : "border-iron-mid/60 bg-stone-surface/80 text-muted-foreground";

  return (
    <Link
      href={`/entita/${entity.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-crimson/30",
        "bg-gradient-to-b from-stone-surface to-stone-mid/80",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.7)]",
        "transition-all duration-200 hover:-translate-y-1.5 hover:border-crimson/55 hover:shadow-[0_0_24px_rgba(196,49,70,0.12),0_12px_40px_-8px_rgba(0,0,0,0.8)]"
      )}
    >
      {/* Striscia crimson superiore */}
      <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 bg-crimson/80" />
      <span className="pointer-events-none absolute inset-x-0 top-0.5 z-10 h-px bg-gradient-to-r from-transparent via-crimson-bright/30 to-transparent" />

      {/* Portrait 3:4 */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <FantasyImage
          src={entity.imageUrl}
          alt={entity.name}
          fallbackIcon={Skull}
          className={cn("size-full", isDead && "grayscale opacity-70")}
          sizes="(max-width: 640px) 50vw, 33vw"
          position="center"
        />

        {/* Gradiente bottom-up */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-mid via-stone-mid/40 to-black/20" />

        {/* Status badge — top-left */}
        <span className={cn(
          "absolute left-2 top-2 z-10 rounded border px-1.5 py-0.5 font-heading text-[9px] font-bold uppercase",
          statusBadgeClass
        )}>
          {isDead && <Skull className="mr-0.5 inline size-2.5" />}
          {statusLabel}
        </span>

        {/* CR badge — top-right */}
        {cr && (
          <span className={cn(
            "absolute right-2 top-2 z-10 rounded-full border px-2 py-0.5 font-heading text-[10px] font-bold",
            crBadgeClass
          )}>
            CR {cr}
          </span>
        )}

        {/* Icona nascosta — solo master */}
        {isMaster && isHiddenFromPlayers(entity) && (
          <span className="absolute right-2 bottom-12 z-10 flex size-5 items-center justify-center rounded-full border border-amber-500/40 bg-background/80">
            <EyeOff className="size-2.5 text-amber-400" />
          </span>
        )}

        {/* Nome e tipo in overlay sul fondo */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-3">
          {creatureType && (
            <p className="font-heading text-[9px] font-bold tracking-[0.18em] text-crimson-bright/80 uppercase">
              {creatureType}
            </p>
          )}
          <h3 className="font-heading text-[15px] font-semibold leading-tight text-foreground transition-colors group-hover:text-gold-bright">
            {entity.name}
          </h3>
        </div>
      </div>

      {/* Footer: habitat */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {habitat ? (
          <p className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="size-3 shrink-0 text-gold/40" />
            <span className="truncate">{habitat}</span>
          </p>
        ) : (
          <span className="text-[11px] text-muted-foreground/40">—</span>
        )}
        <CornerOrnaments size="xs" className="border-crimson/20" />
      </div>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────
 * FactionCard — Stemma della Fazione (portrait 3:4)
 * ─────────────────────────────────────────────────────────── */

export function FactionCard({ entity }: { entity: Entity }) {
  const { isMaster } = useAuth();
  const factionType = entity.fields.factionType ? String(entity.fields.factionType) : null;
  const influence = entity.fields.influence ? String(entity.fields.influence) : null;

  const INFLUENCE_COLOR: Record<string, string> = {
    Locale:        "border-iron-mid/60 bg-stone-surface/80 text-muted-foreground",
    Regionale:     "border-arcane-bright/50 bg-arcane-blue/20 text-arcane-bright",
    Nazionale:     "border-gold/55 bg-gold/10 text-gold-bright",
    Continentale:  "border-crimson-bright/60 bg-crimson/15 text-red-300",
  };
  const influenceBadge = influence ? (INFLUENCE_COLOR[influence] ?? "border-iron-mid/60 text-muted-foreground") : null;

  return (
    <Link
      href={`/entita/${entity.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-crimson/25",
        "bg-gradient-to-b from-stone-surface to-stone-mid/80",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.7)]",
        "transition-all duration-200 hover:-translate-y-1.5 hover:border-crimson/50 hover:shadow-[0_0_24px_rgba(196,49,70,0.10),0_12px_40px_-8px_rgba(0,0,0,0.8)]"
      )}
    >
      {/* Striscia crimson superiore */}
      <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 bg-gradient-to-r from-transparent via-crimson/80 to-transparent" />

      {/* Portrait 3:4 */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <FantasyImage
          src={entity.imageUrl}
          alt={entity.name}
          fallbackIcon={Flag}
          className="size-full"
          sizes="(max-width: 640px) 50vw, 33vw"
          position="center"
        />

        {/* Gradiente bottom-up */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-mid via-stone-mid/35 to-black/15" />

        {/* Tipo fazione — top-left */}
        {factionType && (
          <span className="absolute left-2 top-2 z-10 rounded border border-crimson/50 bg-crimson/15 px-1.5 py-0.5 font-heading text-[9px] font-bold text-red-300 uppercase">
            {factionType}
          </span>
        )}

        {/* Influenza — top-right */}
        {influence && influenceBadge && (
          <span className={cn(
            "absolute right-2 top-2 z-10 rounded border px-1.5 py-0.5 font-heading text-[9px] font-bold uppercase",
            influenceBadge
          )}>
            {influence}
          </span>
        )}

        {/* Icona nascosta */}
        {isMaster && isHiddenFromPlayers(entity) && (
          <span className="absolute right-2 bottom-12 z-10 flex size-5 items-center justify-center rounded-full border border-amber-500/40 bg-background/80">
            <EyeOff className="size-2.5 text-amber-400" />
          </span>
        )}

        {/* Nome in overlay sul fondo */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-3">
          {factionType && (
            <p className="font-heading text-[9px] font-bold tracking-[0.18em] text-crimson-bright/70 uppercase">
              {factionType}
            </p>
          )}
          <h3 className="font-heading text-[15px] font-semibold leading-tight text-foreground transition-colors group-hover:text-gold-bright">
            {entity.name}
          </h3>
        </div>
      </div>

      {/* Footer: tag */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2.5">
        {entity.tags.length > 0 ? (
          entity.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="border-gold/18 text-[9px] text-muted-foreground">
              {tag}
            </Badge>
          ))
        ) : (
          <span className="text-[11px] text-muted-foreground/40">—</span>
        )}
        <CornerOrnaments size="xs" className="border-crimson/20" />
      </div>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────
 * ItemCard — Il Reliquiario
 * ─────────────────────────────────────────────────────────── */

export function ItemCard({ entity }: { entity: Entity }) {
  const { isMaster } = useAuth();
  const category = String(entity.fields.category ?? "COMMON");
  const value = entity.fields.value ? Number(entity.fields.value) : null;
  const attunement = entity.fields.requiresAttunement === true;
  const isPendingApproval = entity.fields.approvalStatus === "PENDING_APPROVAL";

  const rarityConfig = ITEM_RARITY_CONFIG[category] ?? ITEM_RARITY_CONFIG.COMMON;
  const categoryLabel = ITEM_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
  const badgeClass = ITEM_CATEGORY_BADGES[category] ?? "";

  return (
    <Link
      href={`/entita/${entity.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border",
        "bg-gradient-to-b from-stone-surface to-stone-mid/80",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.7)]",
        "transition-all duration-200 hover:-translate-y-1.5",
        rarityConfig.border,
        rarityConfig.glow,
        "hover:brightness-110"
      )}
    >
      {/* Striscia superiore dorata */}
      <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      {/* Immagine quadrata */}
      <div className="relative aspect-square overflow-hidden">
        <FantasyImage
          src={entity.imageUrl}
          alt={entity.name}
          fallbackIcon={Gem}
          className="size-full"
          sizes="(max-width: 640px) 50vw, 25vw"
          position="center"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-mid via-stone-mid/10 to-transparent" />

        {/* Badge rarità — top-right */}
        <span className={cn(
          "absolute right-2 top-2 z-10 rounded border px-1.5 py-0.5 font-heading text-[9px] font-bold uppercase",
          badgeClass
        )}>
          {categoryLabel}
        </span>

        {/* Pending approval */}
        {isPendingApproval && (
          <span className="absolute left-2 top-2 z-10 rounded border border-amber-500/50 bg-amber-500/10 px-1.5 py-0.5 font-heading text-[9px] font-bold text-amber-300 uppercase">
            Approvazione
          </span>
        )}

        {isMaster && isHiddenFromPlayers(entity) && (
          <span className="absolute left-2 bottom-2 z-10 flex size-5 items-center justify-center rounded-full border border-amber-500/40 bg-background/80">
            <EyeOff className="size-2.5 text-amber-400" />
          </span>
        )}
      </div>

      <div className="p-3.5">
        <CornerOrnaments size="xs" className={cn("border-opacity-30", rarityConfig.border)} />

        {/* Rarity label */}
        <p className={cn("mb-1 font-heading text-[9px] font-bold tracking-[0.22em] uppercase", rarityConfig.labelColor)}>
          ◆ {rarityConfig.label}
        </p>

        {/* Nome */}
        <h3 className="font-heading text-[14px] font-semibold leading-snug text-foreground transition-colors group-hover:text-gold-bright">
          {entity.name}
        </h3>

        {/* Meta: valore + sintonia */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {value !== null && value > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-gold/70">
              🪙 {value.toLocaleString("it-IT")} mo
            </span>
          )}
          {attunement && (
            <span className="text-[10px] text-arcane-bright/80 font-heading uppercase tracking-wide">
              Sintonia
            </span>
          )}
        </div>

        {/* Tag */}
        {entity.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {entity.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="border-gold/18 text-[9px] text-muted-foreground">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────
 * SpecializedEntityCard — Selettore automatico
 * ─────────────────────────────────────────────────────────── */

/**
 * Wrapper che sceglie automaticamente la card specializzata
 * in base al tipo di entità, con fallback alla EntityCard generica.
 */
export function SpecializedEntityCard({
  entity,
  showType = false,
}: {
  entity: Entity;
  showType?: boolean;
}) {
  switch (entity.type) {
    case "quest":     return <QuestCard entity={entity} />;
    case "character": return <CharacterCard entity={entity} />;
    case "creature":  return <MonsterCard entity={entity} />;
    case "item":      return <ItemCard entity={entity} />;
    case "faction":   return <FactionCard entity={entity} />;
    default:          return <EntityCard entity={entity} showType={showType} />;
  }
}

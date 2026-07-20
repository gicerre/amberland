"use client";

/**
 * Layout dei contenuti del dettaglio entità, specifico per tipo, costruito
 * sul "linguaggio del Tomo" (StatGrid / TomePanel / pergamena):
 *   - info CRITICHE in cima (stato quest, stat block creatura, dati chiave);
 *   - dati su pannelli di pietra; narrativa su pergamena.
 *
 * Esporta EntityDetailBody — dispatcher automatico per tipo.
 */

import {
  Coins,
  MapPin,
  Pencil,
  ScrollText,
  Skull,
  Sparkles,
  Swords,
  Target,
  Trophy,
} from "lucide-react";

import { RichTextRenderer } from "@/components/shared/rich-text-lazy";
import {
  isEmptyRichText,
  type RichTextValue,
} from "@/components/shared/rich-text-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  StatGrid,
  TomePanel,
  type StatItem,
  type TomeAccent,
} from "@/design-system";
import { cn } from "@/lib/utils";
import type { Entity, RichText } from "@/types/entities";

import type { EntityTypeConfig, FieldDef } from "../registry";
import {
  CREATURE_STATUS_OPTIONS,
  QUEST_STATUS_BADGES,
  QUEST_STATUS_OPTIONS,
} from "../registry";
import { QuestStatusIcon } from "./quest-status-icon";

/* ────────────────────────────────────────────────────────────
 * Tipi condivisi (mirror di entity-view.tsx)
 * ─────────────────────────────────────────────────────────── */

export interface ShortField {
  def: FieldDef;
  display: string;
}
export interface LongField {
  def: FieldDef;
  rich: RichText;
}

interface BodyProps {
  entity: Entity;
  shortFields: ShortField[];
  longFields: LongField[];
  config: EntityTypeConfig;
  isMaster: boolean;
  onEdit: () => void;
}

/* ────────────────────────────────────────────────────────────
 * Frammenti riusabili
 * ─────────────────────────────────────────────────────────── */

/** Pannello di pergamena per la narrativa (prosa del Tomo). */
function ParchmentPage({
  eyebrow,
  content,
}: {
  eyebrow: string;
  content: RichTextValue;
}) {
  return (
    <section className="parchment relative overflow-hidden rounded-2xl p-5 sm:p-8">
      <p className="mb-3 font-heading text-[9px] font-bold tracking-[0.3em] text-[#7a5c1e] uppercase">
        ◆ {eyebrow} ◆
      </p>
      <RichTextRenderer
        content={content}
        className="text-base leading-relaxed sm:text-lg"
      />
    </section>
  );
}

/** Invito (solo Master) a compilare una sezione vuota. */
function EmptyPrompt({
  icon: Icon,
  text,
  cta,
  onEdit,
}: {
  icon: typeof ScrollText;
  text: string;
  cta: string;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-hairline-strong p-6 text-center">
      <Icon className="mx-auto mb-2 size-8 text-gold/25" />
      <p className="text-sm text-muted-foreground italic">{text}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onEdit}>
        <Pencil className="size-3.5" />
        {cta}
      </Button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * EntityDetailBody — dispatcher
 * ─────────────────────────────────────────────────────────── */

export function EntityDetailBody(props: BodyProps) {
  switch (props.entity.type) {
    case "quest":
      return <QuestBody {...props} />;
    case "creature":
      return <CreatureBody {...props} />;
    default:
      return <DefaultBody {...props} />;
  }
}

/* ────────────────────────────────────────────────────────────
 * QuestBody — Bacheca delle Commesse
 * Critico in sessione: stato → obiettivi → ricompense → cronache.
 * ─────────────────────────────────────────────────────────── */

function QuestBody({ entity, longFields, isMaster, onEdit }: BodyProps) {
  const status = String(entity.fields.status ?? "AVAILABLE");
  const statusLabel =
    QUEST_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  const statusBadge = QUEST_STATUS_BADGES[status] ?? "";

  const objectives = longFields.find((f) => f.def.key === "objectives")?.rich;
  const rewards = longFields.find((f) => f.def.key === "rewards")?.rich;

  const hasDescription = !isEmptyRichText(entity.description as RichTextValue);
  const hasObjectives = objectives && !isEmptyRichText(objectives as RichTextValue);
  const hasRewards = rewards && !isEmptyRichText(rewards as RichTextValue);

  return (
    <div className="space-y-5">
      {/* ── Stato (a colpo d'occhio) ── */}
      <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-gradient-to-r from-gold/10 to-transparent px-4 py-3">
        <QuestStatusIcon status={status} className="size-11 shrink-0" />
        <div className="min-w-0">
          <p className="font-heading text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
            Stato dell&rsquo;incarico
          </p>
          <Badge
            variant="outline"
            className={cn(
              "mt-0.5 font-heading text-sm font-bold tracking-wide uppercase",
              statusBadge
            )}
          >
            {statusLabel}
          </Badge>
        </div>
      </div>

      {/* ── Obiettivi + Ricompense (ciò che serve in sessione) ── */}
      {hasObjectives || hasRewards ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {hasObjectives && (
            <TomePanel icon={Target} title="Obiettivi" accent="gold">
              <RichTextRenderer
                content={objectives as RichTextValue}
                className="text-[15px] leading-relaxed text-foreground/90"
              />
            </TomePanel>
          )}
          {hasRewards && (
            <TomePanel icon={Trophy} title="Ricompense" accent="amber">
              <RichTextRenderer
                content={rewards as RichTextValue}
                className="text-[15px] leading-relaxed text-foreground/90"
              />
            </TomePanel>
          )}
        </div>
      ) : (
        isMaster && (
          <EmptyPrompt
            icon={Target}
            text="Nessun obiettivo o ricompensa definiti per questo incarico."
            cta="Definisci l'impresa"
            onEdit={onEdit}
          />
        )
      )}

      {/* ── Cronache dell'incarico (narrativa, pergamena) ── */}
      {hasDescription ? (
        <ParchmentPage
          eyebrow="Cronache dell'incarico"
          content={entity.description as RichTextValue}
        />
      ) : (
        isMaster && (
          <EmptyPrompt
            icon={ScrollText}
            text="Le cronache tacciono sull'incarico."
            cta="Scrivi le cronache"
            onEdit={onEdit}
          />
        )
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * CreatureBody — Pagina del Bestiario
 * Stat block in cima (GS/Tipo/Habitat/Stato) → narrativa → bottino.
 * ─────────────────────────────────────────────────────────── */

function CreatureBody({ entity, longFields, isMaster, onEdit }: BodyProps) {
  const status = String(entity.fields.status ?? "UNKNOWN");
  const statusLabel =
    CREATURE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  const cr = entity.fields.cr ? String(entity.fields.cr) : null;
  const creatureType = entity.fields.creatureType
    ? String(entity.fields.creatureType)
    : null;
  const habitat = entity.fields.habitat ? String(entity.fields.habitat) : null;

  const loot = longFields.find((f) => f.def.key === "loot")?.rich;
  const hasDescription = !isEmptyRichText(entity.description as RichTextValue);
  const hasLoot = loot && !isEmptyRichText(loot as RichTextValue);

  const crNum = cr ? parseFloat(cr) : 0;
  const crAccent: TomeAccent = crNum >= 10 ? "crimson" : crNum >= 5 ? "amber" : "gold";

  const stats: StatItem[] = [
    cr && { icon: Swords, label: "Grado Sfida", value: cr, accent: crAccent },
    creatureType && { label: "Tipo", value: creatureType },
    habitat && { icon: MapPin, label: "Habitat", value: habitat },
    { label: "Stato", value: statusLabel },
  ].filter(Boolean) as StatItem[];

  return (
    <div className="space-y-5">
      {/* ── Scheda creatura (stat block) ── */}
      <TomePanel icon={Skull} title="Scheda Creatura" accent="crimson">
        <StatGrid items={stats} className="grid-cols-2 sm:grid-cols-4" />
      </TomePanel>

      {/* ── Dal Bestiario (narrativa) ── */}
      {hasDescription ? (
        <ParchmentPage
          eyebrow="Dal Bestiario"
          content={entity.description as RichTextValue}
        />
      ) : (
        isMaster && (
          <EmptyPrompt
            icon={Skull}
            text="Il bestiario non ha ancora voci su questa creatura."
            cta="Scrivi la scheda"
            onEdit={onEdit}
          />
        )
      )}

      {/* ── Bottino ── */}
      {hasLoot && (
        <TomePanel icon={Sparkles} title="Bottino" accent="amber">
          <RichTextRenderer
            content={loot as RichTextValue}
            className="text-[15px] leading-relaxed text-foreground/90"
          />
        </TomePanel>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * DefaultBody — Oggetti, Fazioni, Eventi, Sessioni, geografia…
 * Dati chiave a colpo d'occhio → narrativa → sezioni lunghe.
 * ─────────────────────────────────────────────────────────── */

// Oggetti: l'accento del valore "Categoria" riflette la rarità.
const ITEM_RARITY_ACCENT: Record<string, TomeAccent> = {
  RARE: "arcane",
  MAGIC: "arcane",
  LEGENDARY: "gold",
  ARTIFACT: "crimson",
  STORY: "gold",
};

function DefaultBody({
  entity,
  config,
  shortFields,
  longFields,
  isMaster,
  onEdit,
}: BodyProps) {
  const stats: StatItem[] = shortFields.map(({ def, display }) => {
    let accent: TomeAccent | undefined;
    let icon: StatItem["icon"];
    if (entity.type === "item" && def.key === "category") {
      accent = ITEM_RARITY_ACCENT[String(entity.fields.category ?? "")];
    }
    if (entity.type === "item" && def.key === "value") icon = Coins;
    return { label: def.label, value: display, accent, icon };
  });

  return (
    <div className="space-y-5">
      {/* ── Dati chiave (a colpo d'occhio) ── */}
      {stats.length > 0 && <StatGrid items={stats} />}

      {/* ── Narrativa (pergamena) ── */}
      {!isEmptyRichText(entity.description as RichTextValue) ? (
        <ParchmentPage
          eyebrow="Descrizione"
          content={entity.description as RichTextValue}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-hairline-strong p-6 text-center">
          <config.icon className="mx-auto mb-2 size-8 text-gold/25" />
          <p className="text-sm text-muted-foreground italic">{config.flavor}</p>
          {isMaster && (
            <Button variant="outline" size="sm" className="mt-3" onClick={onEdit}>
              <Pencil className="size-3.5" />
              Scrivi le cronache
            </Button>
          )}
        </div>
      )}

      {/* ── Campi narrativi lunghi ── */}
      {longFields.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {longFields.map(({ def, rich }) => (
            <TomePanel key={def.key} title={def.label}>
              <RichTextRenderer
                content={rich as RichTextValue}
                className="text-[15px] leading-relaxed text-foreground/90"
              />
            </TomePanel>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import {
  Eye,
  Flame,
  Gauge,
  Heart,
  Plus,
  Shield,
  Skull,
  Sparkles,
  Star,
  User,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  CharacterKind,
  CharacterStatus,
  ConditionEntry,
} from "@/types/entities";

import {
  CHARACTER_KIND_BADGES,
  CHARACTER_KIND_LABELS,
  CHARACTER_STATUS_BADGES,
  CHARACTER_STATUS_LABELS,
  CONDITION_KIND_STYLES,
  formatModifier,
} from "../constants";
import { useCodex } from "./codex-context";
import { classesSummary, genId, passivePerception, totalLevel } from "./derive";
import { InlineNumber, InlineText, Stepper } from "./inline-edit";

/* ============================================================
 * CodexDashboard — il colpo d'occhio cinematografico.
 *
 * Il ritratto governa la scena: il suo stesso artwork, sfocato,
 * fa da fondale. Sopra: nome, lignaggio, punti ferita, difese e
 * lo stato vivo (condizioni, risorse, ispirazione). Ogni cifra
 * è un bersaglio di modifica inline; ogni chip apre l'Inspector.
 * ============================================================ */

export function CodexDashboard({
  actions,
  onOpenPortrait,
}: {
  /** Azioni contestuali (Modifica, Stato, menu) rese dal genitore. */
  actions?: ReactNode;
  onOpenPortrait?: () => void;
}) {
  const { entity, sheet, hasSheet, isMaster, inspect } = useCodex();

  const kind = (entity.fields.kind as CharacterKind) ?? "NPC";
  const status = (entity.fields.status as CharacterStatus) ?? "ALIVE";
  const isDead = entity.fields.isDead === true;
  const race = String(entity.fields.race ?? "");
  const klass = String(entity.fields.class ?? "");
  const alignment = String(entity.fields.alignment ?? "");
  const level = totalLevel(hasSheet ? sheet : undefined, Number(entity.fields.level ?? 0));
  const summary = hasSheet && sheet.classes.length > 0 ? classesSummary(sheet) : klass;

  // Chip d'identità: ognuno apre l'Inspector giusto.
  const identityChips = [
    race && { label: race, target: { type: "identity" } as const },
    summary && {
      label: summary,
      target:
        hasSheet && sheet.classes[0]
          ? ({ type: "class", id: sheet.classes[0].id } as const)
          : ({ type: "identity" } as const),
    },
    hasSheet && sheet.background
      ? { label: sheet.background, target: { type: "identity" } as const }
      : null,
    alignment && { label: alignment, target: { type: "identity" } as const },
  ].filter(Boolean) as { label: string; target: Parameters<typeof inspect>[0] }[];

  return (
    <section className="relative overflow-hidden border-b border-hairline">
      {/* ── Fondale: l'artwork del personaggio, sfocato e velato ── */}
      <div aria-hidden className="absolute inset-0">
        {entity.imageUrl ? (
          <Image
            src={entity.imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className={cn(
              "scale-110 object-cover object-[50%_25%] opacity-35 blur-2xl",
              isDead && "grayscale"
            )}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-surface-2 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/75 to-background" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pt-5 pb-7 sm:px-6 sm:pt-6">
        {/* Riga di servizio: sigilli + azioni */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={CHARACTER_KIND_BADGES[kind]}>
              {CHARACTER_KIND_LABELS[kind]}
            </Badge>
            <Badge variant="outline" className={CHARACTER_STATUS_BADGES[status]}>
              {status === "DEAD" && <Skull className="size-3" />}
              {CHARACTER_STATUS_LABELS[status]}
            </Badge>
            {isMaster && entity.visibility !== "PUBLIC" && (
              <Badge
                variant="outline"
                className="border-zinc-500/50 bg-zinc-500/10 text-zinc-300"
              >
                <Eye className="size-3" />
                Non visibile ai giocatori
              </Badge>
            )}
          </div>
          {actions}
        </div>

        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:gap-7">
          {/* ── Ritratto ── */}
          <figure className="relative mx-auto w-44 shrink-0 sm:mx-0 sm:w-48 lg:w-56">
            <button
              type="button"
              onClick={onOpenPortrait}
              disabled={!onOpenPortrait}
              aria-label={`Apri il ritratto di ${entity.name}`}
              className={cn(
                "elev-2 group relative block aspect-[3/4] w-full overflow-hidden rounded-2xl border border-hairline-strong bg-surface-1",
                onOpenPortrait && "cursor-zoom-in"
              )}
            >
              {entity.imageUrl ? (
                <Image
                  src={entity.imageUrl}
                  alt={entity.name}
                  fill
                  priority
                  sizes="(max-width: 640px) 11rem, 14rem"
                  className={cn(
                    "object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.03]",
                    isDead && "grayscale"
                  )}
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-gold/25">
                  <User className="size-16" />
                </span>
              )}
              <span
                aria-hidden
                className="absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-40px_60px_-30px_rgba(0,0,0,0.8)]"
              />
              {isDead && (
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-black/70 py-1.5 text-xs font-semibold tracking-[0.15em] text-crimson-light uppercase">
                  <Skull className="size-3.5" /> Caduto
                </span>
              )}
            </button>
            {/* Sigillo del livello */}
            {level > 0 && (
              <span
                aria-label={`Livello ${level}`}
                className="absolute -top-2.5 -right-2.5 grid size-12 rotate-45 place-items-center rounded-lg border border-gold/60 bg-surface-0 shadow-[0_0_18px_rgba(214,178,94,0.22)]"
              >
                <span className="-rotate-45 font-heading text-lg leading-none font-bold text-gold-bright tabular-nums">
                  {level}
                </span>
              </span>
            )}
          </figure>

          {/* ── Identità e vitali ── */}
          <div className="min-w-0 flex-1">
            <h1 className="text-gold-gradient font-heading text-[clamp(1.9rem,1.2rem+3vw,3.25rem)] leading-[1.05] font-bold tracking-wider">
              {entity.name}
            </h1>

            {identityChips.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1.5 text-sm">
                {identityChips.map((chip, index) => (
                  <span key={chip.label} className="flex items-center gap-1">
                    {index > 0 && (
                      <span aria-hidden className="text-muted-foreground/50">
                        ·
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => inspect(chip.target)}
                      className="rounded-md px-1 py-0.5 text-foreground/90 transition-colors hover:bg-gold/8 hover:text-gold-bright"
                    >
                      {chip.label}
                    </button>
                  </span>
                ))}
              </div>
            )}

            {hasSheet ? (
              <>
                <HpConsole />
                <DefenseRow />
                <VitalsRow />
              </>
            ) : (
              <p className="mt-4 max-w-prose text-sm text-muted-foreground italic">
                Scheda essenziale: le voci complete (caratteristiche, difese,
                inventario) compaiono quando la scheda viene completata.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────
 * HP — la barra della vita, interattiva.
 * ────────────────────────────────────────────────────────── */

function HpConsole() {
  const { sheet, canEdit, patchSheet } = useCodex();
  const { currentHp, maxHp, tempHp } = sheet;
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
  const low = pct <= 25;
  const mid = pct > 25 && pct <= 50;

  const applyDelta = (delta: number) => {
    if (delta < 0) {
      // Il danno consuma prima i PF temporanei (regola 5e).
      let damage = -delta;
      const absorbed = Math.min(tempHp, damage);
      damage -= absorbed;
      patchSheet({
        tempHp: tempHp - absorbed,
        currentHp: Math.max(0, currentHp - damage),
      });
    } else {
      patchSheet({ currentHp: Math.min(maxHp, currentHp + delta) });
    }
  };

  return (
    <div className="mt-5 max-w-xl">
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Heart className="size-4 text-crimson-bright" />
          Punti Ferita
          {tempHp > 0 && (
            <span className="rounded-full border border-arcane-bright/40 bg-arcane-blue/60 px-2 py-0.5 text-[11px] text-arcane-bright">
              +{tempHp} temp
            </span>
          )}
        </span>
        <span className="font-heading text-2xl leading-none font-bold text-parchment tabular-nums">
          <InlineNumber
            value={currentHp}
            min={0}
            max={maxHp || undefined}
            onCommit={(next) => patchSheet({ currentHp: next })}
            disabled={!canEdit}
            ariaLabel="Punti ferita attuali"
          />
          <span className="text-muted-foreground">/</span>
          <InlineNumber
            value={maxHp}
            min={0}
            onCommit={(next) =>
              patchSheet({ maxHp: next, currentHp: Math.min(currentHp, next) })
            }
            disabled={!canEdit}
            ariaLabel="Punti ferita massimi"
            className="text-muted-foreground"
          />
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <div
          role="meter"
          aria-label="Punti ferita"
          aria-valuemin={0}
          aria-valuemax={maxHp}
          aria-valuenow={currentHp}
          className="h-3 flex-1 overflow-hidden rounded-full border border-hairline-strong bg-black/60 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]"
        >
          <div
            className={cn(
              "relative h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out)]",
              low
                ? "bg-gradient-to-r from-crimson to-crimson-bright"
                : mid
                  ? "bg-gradient-to-r from-ember to-ember-bright"
                  : "bg-gradient-to-r from-verdant to-verdant-bright"
            )}
            style={{ width: `${pct}%` }}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 right-0 w-1 rounded-full bg-white/50"
            />
          </div>
        </div>

        {canEdit && (
          <Stepper
            onDecrement={() => applyDelta(-1)}
            onIncrement={() => applyDelta(1)}
            decrementLabel="Subisci 1 danno"
            incrementLabel="Recupera 1 punto ferita"
            className="shrink-0"
          >
            <span className="sr-only">Danno / cura rapidi</span>
            <Heart aria-hidden className="size-3.5 text-muted-foreground" />
          </Stepper>
        )}
      </div>

      {canEdit && (
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>
            PF temporanei:{" "}
            <InlineNumber
              value={tempHp}
              min={0}
              onCommit={(next) => patchSheet({ tempHp: next })}
              disabled={!canEdit}
              ariaLabel="Punti ferita temporanei"
              className="text-arcane-bright"
            />
          </span>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * Difese — CA, iniziativa, velocità, percezione, competenza.
 * ────────────────────────────────────────────────────────── */

function DefenseRow() {
  const { sheet, canEdit, patchSheet, inspect } = useCodex();

  const tiles: {
    key: string;
    icon: typeof Shield;
    label: string;
    content: ReactNode;
  }[] = [
    {
      key: "ac",
      icon: Shield,
      label: "Classe Armatura",
      content: (
        <InlineNumber
          value={sheet.armorClass}
          min={0}
          onCommit={(armorClass) => patchSheet({ armorClass })}
          disabled={!canEdit}
          ariaLabel="Classe armatura"
          className="font-heading text-2xl leading-none font-bold text-parchment"
        />
      ),
    },
    {
      key: "initiative",
      icon: Zap,
      label: "Iniziativa",
      content: (
        <InlineNumber
          value={sheet.initiative}
          onCommit={(initiative) => patchSheet({ initiative })}
          disabled={!canEdit}
          format={formatModifier}
          ariaLabel="Iniziativa"
          className="font-heading text-2xl leading-none font-bold text-parchment"
        />
      ),
    },
    {
      key: "speed",
      icon: Gauge,
      label: "Velocità",
      content: (
        <InlineText
          value={sheet.speed}
          onCommit={(speed) => patchSheet({ speed })}
          disabled={!canEdit}
          align="center"
          ariaLabel="Velocità"
          className="font-heading text-2xl leading-none font-bold text-parchment"
        />
      ),
    },
    {
      key: "perception",
      icon: Eye,
      label: "Perc. passiva",
      content: (
        <button
          type="button"
          onClick={() => inspect({ type: "skill", key: "perception" })}
          aria-label="Percezione passiva — apri il dettaglio"
          className="rounded-md font-heading text-2xl leading-none font-bold text-parchment tabular-nums transition-colors hover:bg-gold/8 hover:text-gold-bright"
        >
          {passivePerception(sheet)}
        </button>
      ),
    },
    {
      key: "proficiency",
      icon: Star,
      label: "Competenza",
      content: (
        <InlineNumber
          value={sheet.proficiencyBonus}
          min={0}
          onCommit={(proficiencyBonus) => patchSheet({ proficiencyBonus })}
          disabled={!canEdit}
          format={formatModifier}
          ariaLabel="Bonus di competenza"
          className="font-heading text-2xl leading-none font-bold text-parchment"
        />
      ),
    },
  ];

  return (
    <div className="mt-5 grid max-w-2xl grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-2.5">
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl border border-hairline bg-surface-1/80 px-1.5 py-2.5 backdrop-blur-[2px]"
        >
          <div className="tabular-nums">{tile.content}</div>
          <span className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            <tile.icon aria-hidden className="size-3" />
            {tile.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
 * Stato vivo — condizioni, risorse, ispirazione.
 * ────────────────────────────────────────────────────────── */

function ConditionChip({ condition }: { condition: ConditionEntry }) {
  const { inspect } = useCodex();
  return (
    <button
      type="button"
      onClick={() => inspect({ type: "condition", id: condition.id })}
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-transform hover:-translate-y-px",
        CONDITION_KIND_STYLES[condition.kind]
      )}
    >
      {condition.name}
      {condition.duration && (
        <span className="opacity-70">· {condition.duration}</span>
      )}
    </button>
  );
}

function VitalsRow() {
  const { sheet, canEdit, patchSheet, inspect } = useCodex();

  const addCondition = () => {
    const entry: ConditionEntry = {
      id: genId(),
      name: "Nuovo effetto",
      kind: "CONDITION",
      detail: "",
      source: "",
      duration: "",
    };
    patchSheet({ conditions: [...sheet.conditions, entry] });
    inspect({ type: "condition", id: entry.id });
  };

  const hasVitals =
    sheet.conditions.length > 0 ||
    sheet.resources.length > 0 ||
    sheet.inspiration ||
    sheet.exhaustion > 0 ||
    canEdit;
  if (!hasVitals) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-1.5">
      {sheet.inspiration && (
        <button
          type="button"
          onClick={() => inspect({ type: "identity" })}
          className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-gold/50 bg-gold-dim px-2.5 py-1 text-xs font-medium text-gold-bright"
        >
          <Sparkles className="size-3" />
          Ispirazione
        </button>
      )}
      {sheet.exhaustion > 0 && (
        <button
          type="button"
          onClick={() => inspect({ type: "identity" })}
          className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-crimson/45 bg-crimson/12 px-2.5 py-1 text-xs font-medium text-crimson-light"
        >
          <Flame className="size-3" />
          Indebolimento {sheet.exhaustion}
        </button>
      )}
      {sheet.conditions.map((condition) => (
        <ConditionChip key={condition.id} condition={condition} />
      ))}
      {sheet.resources.map((resource) => (
        <button
          key={resource.id}
          type="button"
          onClick={() => inspect({ type: "resource", id: resource.id })}
          className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-hairline-strong bg-surface-1/80 px-2.5 py-1 text-xs font-medium text-foreground/90 transition-transform hover:-translate-y-px"
        >
          {resource.name}
          <span className="font-heading font-bold text-gold-bright tabular-nums">
            {resource.current}/{resource.max}
          </span>
        </button>
      ))}
      {canEdit && (
        <button
          type="button"
          onClick={addCondition}
          className="inline-flex min-h-7 items-center gap-1 rounded-full border border-dashed border-hairline-strong px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-gold/50 hover:text-gold-bright"
        >
          <Plus className="size-3" />
          Effetto
        </button>
      )}
    </div>
  );
}

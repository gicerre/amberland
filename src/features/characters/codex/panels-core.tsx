"use client";

import { Dices, Plus, Star, Swords, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ABILITIES, type Ability } from "@/types/entities";

import {
  ABILITY_LABELS,
  ABILITY_SHORT,
  SKILLS,
  SKILL_KEYS,
  formatModifier,
} from "../constants";
import { useCodex } from "./codex-context";
import { CodexPanel, PanelEyebrow } from "./codex-panel";
import {
  abilityMod,
  abilityTotal,
  genId,
  saveMod,
  skillMod,
} from "./derive";
import { InlineText } from "./inline-edit";

/* ============================================================
 * Pannelli fondamentali: Caratteristiche & Abilità + rail.
 * ============================================================ */

/* ── Medaglione di caratteristica: bersaglio dell'Inspector ── */

function AbilityCard({ ability }: { ability: Ability }) {
  const { sheet, inspect } = useCodex();
  const data = sheet.abilities[ability];
  const total = abilityTotal(sheet, ability);
  const mod = abilityMod(sheet, ability);
  const buffed = data.tempBonus !== 0;

  return (
    <button
      type="button"
      onClick={() => inspect({ type: "ability", ability })}
      aria-label={`${ABILITY_LABELS[ability]}: modificatore ${formatModifier(mod)}, punteggio ${total}`}
      className={cn(
        "group elev-1 relative flex flex-col items-center gap-0.5 rounded-xl border bg-gradient-to-b from-surface-2 to-surface-1 px-2 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline-strong hover:elev-2",
        buffed ? "border-arcane-bright/40" : "border-hairline"
      )}
    >
      <span className="font-heading text-[10px] font-bold tracking-[0.18em] text-gold/70">
        {ABILITY_SHORT[ability]}
      </span>
      <span className="font-heading text-[1.7rem] leading-none font-bold text-parchment tabular-nums transition-colors group-hover:text-gold-bright">
        {formatModifier(mod)}
      </span>
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {total}
        {buffed && (
          <span className="text-arcane-bright">
            {" "}
            ({formatModifier(data.tempBonus)})
          </span>
        )}
      </span>
    </button>
  );
}

/* ── Riga skill: dot competenza, etichetta, caratteristica, mod ── */

function SkillRow({ skillKey }: { skillKey: string }) {
  const { sheet, inspect } = useCodex();
  const def = SKILLS[skillKey];
  const proficient = sheet.skills.includes(skillKey);
  const expert = sheet.expertise.includes(skillKey);
  const mod = skillMod(sheet, skillKey);

  return (
    <button
      type="button"
      onClick={() => inspect({ type: "skill", key: skillKey })}
      className="flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors hover:bg-surface-2"
    >
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full transition-colors",
          expert
            ? "bg-gold-bright shadow-[0_0_6px_rgba(214,178,94,0.5)]"
            : proficient
              ? "bg-gold/60"
              : "bg-iron-mid"
        )}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          proficient ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {def.label}
        {expert && (
          <Star
            aria-label="Expertise"
            className="ml-1 inline size-3 fill-gold text-gold"
          />
        )}
      </span>
      <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">
        {ABILITY_SHORT[def.ability]}
      </span>
      <span className="w-8 shrink-0 text-right font-heading font-bold text-gold-bright tabular-nums">
        {formatModifier(mod)}
      </span>
    </button>
  );
}

export function PanelAbilities({ storageScope }: { storageScope: string }) {
  const { sheet, canEdit, patchSheet, inspect } = useCodex();

  const profText = [
    ["Armature", "armorProficiencies"],
    ["Armi", "weaponProficiencies"],
    ["Strumenti", "toolProficiencies"],
  ] as const;
  const showProfText =
    canEdit || profText.some(([, key]) => Boolean(sheet[key]));

  return (
    <CodexPanel
      id="caratteristiche"
      icon={Dices}
      title="Caratteristiche & Abilità"
      storageScope={storageScope}
    >
      {/* Le sei caratteristiche */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-2.5">
        {ABILITIES.map((ability) => (
          <AbilityCard key={ability} ability={ability} />
        ))}
      </div>

      {/* Tiri salvezza */}
      <div className="mt-5">
        <PanelEyebrow>Tiri salvezza</PanelEyebrow>
        <div className="flex flex-wrap gap-1.5">
          {ABILITIES.map((ability) => {
            const proficient = sheet.savingThrows.includes(ability);
            return (
              <button
                key={ability}
                type="button"
                onClick={() => inspect({ type: "ability", ability })}
                className={cn(
                  "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                  proficient
                    ? "border-gold/45 bg-gold-dim text-gold-bright"
                    : "border-hairline text-muted-foreground hover:border-hairline-strong hover:text-foreground"
                )}
              >
                {ABILITY_SHORT[ability]}
                <strong className="font-heading tabular-nums">
                  {formatModifier(saveMod(sheet, ability))}
                </strong>
              </button>
            );
          })}
        </div>
      </div>

      {/* Le diciotto abilità */}
      <div className="mt-5">
        <PanelEyebrow>Abilità</PanelEyebrow>
        <div className="grid gap-x-6 sm:grid-cols-2">
          {SKILL_KEYS.map((key) => (
            <SkillRow key={key} skillKey={key} />
          ))}
        </div>
      </div>

      {/* Competenze testuali */}
      {showProfText && (
        <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
          {profText.map(([label, key]) => (
            <div
              key={key}
              className="rounded-lg border border-hairline bg-surface-0/60 px-3 py-2"
            >
              <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                {label}
              </p>
              <InlineText
                value={sheet[key]}
                onCommit={(next) => patchSheet({ [key]: next })}
                disabled={!canEdit}
                placeholder="—"
                ariaLabel={`Competenze: ${label.toLowerCase()}`}
                className="mt-0.5 block w-full text-sm text-foreground/90"
              />
            </div>
          ))}
        </div>
      )}
    </CodexPanel>
  );
}

/* ============================================================
 * Rail — Identità (riassunto che apre l'Inspector).
 * ============================================================ */

export function RailIdentity() {
  const { entity, sheet, hasSheet, isMaster, isOwner, inspect } = useCodex();

  const ownerName = String(entity.fields.ownerName ?? "");
  const rows = [
    ["Sottorazza", sheet.subrace],
    ["Background", sheet.background],
    ["Divinità", sheet.deity],
    ["Genere", sheet.gender],
    ["Età", sheet.age],
    ["Altezza", sheet.height],
    ["Peso", sheet.weight],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  return (
    <section className="elev-1 rounded-2xl border border-hairline bg-surface-1 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-heading text-sm font-bold tracking-wide text-parchment">
          <User className="size-4 text-gold" />
          Identità
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => inspect({ type: "identity" })}
        >
          Dettagli
        </Button>
      </header>

      {rows.length > 0 || !hasSheet ? (
        <dl className="space-y-1.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="min-w-0 truncate text-right text-sm text-foreground/90">
                {value}
              </dd>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Nessun dettaglio registrato.
            </p>
          )}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Aggiungi background, divinità e aspetto dall&rsquo;Inspector.
        </p>
      )}

      {hasSheet && sheet.languages.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {sheet.languages.map((language) => (
            <Badge
              key={language}
              variant="outline"
              className="border-hairline-strong text-[11px]"
            >
              {language}
            </Badge>
          ))}
        </div>
      )}

      {(isMaster || isOwner) && ownerName && (
        <p className="mt-3 border-t border-hairline pt-2.5 text-xs text-muted-foreground">
          Giocatore: <span className="text-foreground/90">{ownerName}</span>
        </p>
      )}
    </section>
  );
}

/* ============================================================
 * Rail — Classi & progressione.
 * ============================================================ */

export function RailClasses() {
  const { sheet, canEdit, patchSheet, inspect } = useCodex();

  const addClass = () => {
    const entry = { id: genId(), className: "", subclass: "", level: 1 };
    patchSheet({ classes: [...sheet.classes, entry] });
    inspect({ type: "class", id: entry.id });
  };

  return (
    <section className="elev-1 rounded-2xl border border-hairline bg-surface-1 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-heading text-sm font-bold tracking-wide text-parchment">
          <Swords className="size-4 text-gold" />
          Classi
        </h2>
        {canEdit && (
          <Button variant="ghost" size="icon-sm" onClick={addClass} aria-label="Aggiungi classe">
            <Plus />
          </Button>
        )}
      </header>

      {sheet.classes.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Nessuna classe registrata.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {sheet.classes.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => inspect({ type: "class", id: entry.id })}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-hairline bg-surface-0/60 px-3 py-2 text-left transition-colors hover:border-hairline-strong hover:bg-surface-2"
              >
                <span className="min-w-0">
                  <span className="block truncate font-heading text-sm font-semibold text-foreground">
                    {entry.className || "Classe da definire"}
                  </span>
                  {entry.subclass && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {entry.subclass}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-heading text-lg font-bold text-gold-bright tabular-nums">
                  {entry.level}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {sheet.xp > 0 && (
        <p className="mt-3 border-t border-hairline pt-2.5 text-xs text-muted-foreground">
          Esperienza:{" "}
          <span className="font-heading font-bold text-gold-bright tabular-nums">
            {sheet.xp.toLocaleString("it-IT")} PE
          </span>
        </p>
      )}
    </section>
  );
}

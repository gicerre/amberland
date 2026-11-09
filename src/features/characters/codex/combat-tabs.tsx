"use client";

import {
  Backpack,
  Coins,
  Eye,
  FlaskConical,
  Gauge,
  Package,
  Shield,
  ShieldCheck,
  ShieldPlus,
  Skull,
  Sparkles,
  Star,
  Swords,
  Wand2,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { useState } from "react";

import { formatMoney } from "@/features/items/components/fields";
import { TakeFromBagDialog } from "@/features/items/components/take-from-bag-dialog";
import { useItemMutations } from "@/features/items/data";
import { cn } from "@/lib/utils";
import {
  ABILITIES,
  type Ability,
  type EquipmentCategory,
} from "@/types/entities";

import {
  ABILITY_LABELS,
  ABILITY_SHORT,
  CONDITION_KIND_STYLES,
  EQUIPMENT_CATEGORY_LABELS,
  SKILLS,
  SKILL_KEYS,
  formatModifier,
} from "../constants";
import { useCodex } from "./codex-context";
import { Counter, Describe, Panel, Reveal, Stat } from "./combat-ui";
import {
  abilityMod,
  abilityTotal,
  factotum,
  passivePerception,
  saveMod,
  skillMod,
} from "./derive";

/* ============================================================
 * Schede della Modalità Combattimento.
 *  · Arsenale  — armi ed equipaggiamento, con descrizioni
 *  · Magia     — caratteristica, CD, attacco, slot, incantesimi
 *  · Statistiche — caratteristiche, tiri salvezza, abilità
 *  · Stato     — difese, risorse, ispirazione, condizioni
 * ============================================================ */

const EQUIP_ICON: Record<EquipmentCategory, LucideIcon> = {
  weapon: Swords,
  armor: Shield,
  shield: ShieldPlus,
  magic: Sparkles,
  consumable: FlaskConical,
  misc: Package,
};

const CATEGORY_ORDER: EquipmentCategory[] = [
  "weapon",
  "armor",
  "shield",
  "magic",
  "consumable",
  "misc",
];

/* ── Arsenale ─────────────────────────────────────────────── */

export function ArsenalTab() {
  const { items, updateItem, place, money, canEdit } = useCodex();
  const { consume } = useItemMutations();
  const [fromBagOpen, setFromBagOpen] = useState(false);

  // Zaino condiviso (PG): prelievo dalla Borsa e monete sempre a portata.
  const backpackBar = place ? (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline bg-surface-1 px-3 py-2">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Coins aria-hidden className="size-4 text-gold" />
        <span className="font-heading font-semibold text-foreground">{formatMoney(money)}</span>
      </span>
      {canEdit && (
        <button
          type="button"
          onClick={() => setFromBagOpen(true)}
          className="flex min-h-10 items-center gap-1.5 rounded-lg border border-hairline-strong px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
        >
          <Backpack aria-hidden className="size-4" />
          Prendi dalla Borsa
        </button>
      )}
      <TakeFromBagDialog open={fromBagOpen} onOpenChange={setFromBagOpen} to={place} />
    </div>
  ) : null;

  const sorted = [...items].sort(
    (a, b) =>
      Number(b.equipped) - Number(a.equipped) ||
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  );
  const equipped = sorted.filter((item) => item.equipped);
  const carried = sorted.filter((item) => !item.equipped);

  const toggleEquipped = (id: string) => {
    const target = items.find((item) => item.id === id);
    if (target) updateItem(id, { equipped: !target.equipped });
  };

  if (sorted.length === 0) {
    return (
      <div className="space-y-4">
        {backpackBar}
        <p className="rounded-xl border border-dashed border-hairline-strong p-6 text-center text-sm text-muted-foreground italic">
          Lo zaino è vuoto. Prendi qualcosa dalla Borsa o aggiungilo dalla scheda.
        </p>
      </div>
    );
  }

  const group = (title: string, icon: LucideIcon, items: typeof sorted, tone: "crimson" | "gold") =>
    items.length > 0 && (
      <Panel title={`${title} · ${items.length}`} icon={icon} tone={tone}>
        <ul className="space-y-2.5">
          {items.map((item, index) => {
            const Icon = EQUIP_ICON[item.category];
            const on = item.equipped;
            return (
              <Reveal key={item.id} index={index}>
                <li
                  className={cn(
                    "group relative flex gap-3 overflow-hidden rounded-lg border p-3 pl-4 transition-colors",
                    on
                      ? "border-crimson/45 bg-gradient-to-r from-crimson/12 to-surface-1/90"
                      : "border-hairline bg-surface-1/70"
                  )}
                >
                  {/* Lama laterale */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-y-0 left-0 w-1",
                      on
                        ? "bg-gradient-to-b from-crimson-bright via-ember-bright to-crimson"
                        : "bg-iron-mid/70"
                    )}
                  />
                  <span
                    className={cn(
                      "grid size-11 shrink-0 place-items-center rounded-lg border",
                      on
                        ? "border-crimson/50 bg-crimson/20 text-crimson-light"
                        : "border-hairline-strong bg-black/30 text-muted-foreground"
                    )}
                  >
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-heading text-[15px] font-semibold text-foreground">
                        {item.name || "Oggetto"}
                        {item.quantity > 1 && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            ×{item.quantity}
                          </span>
                        )}
                      </p>
                      <span className="rounded border border-hairline-strong px-1.5 py-px text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                        {EQUIPMENT_CATEGORY_LABELS[item.category]}
                      </span>
                      {on && (
                        <span className="rounded border border-crimson/50 bg-crimson/20 px-1.5 py-px text-[10px] font-bold tracking-[0.12em] text-crimson-light uppercase">
                          In uso
                        </span>
                      )}
                    </div>
                    <Describe text={item.notes} className="mt-1" />
                  </div>
                  {place && canEdit && item.category === "consumable" && (
                    <button
                      type="button"
                      onClick={() => consume.mutate({ itemId: item.id, quantity: 1 })}
                      disabled={consume.isPending}
                      aria-label={`Usa ${item.name}`}
                      className="min-h-11 shrink-0 self-start rounded-lg border border-verdant/50 px-3 text-xs font-bold tracking-[0.1em] text-verdant-bright uppercase transition-colors hover:bg-verdant/15 focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none disabled:opacity-40"
                    >
                      Usa
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleEquipped(item.id)}
                    aria-pressed={on}
                    aria-label={
                      on ? `Riponi ${item.name}` : `Impugna o indossa ${item.name}`
                    }
                    className={cn(
                      "min-h-11 shrink-0 self-start rounded-lg border px-3 text-xs font-bold tracking-[0.1em] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none",
                      on
                        ? "border-hairline-strong text-muted-foreground hover:bg-surface-2"
                        : "border-crimson/50 text-crimson-light hover:bg-crimson/15"
                    )}
                  >
                    {on ? "Riponi" : "Impugna"}
                  </button>
                </li>
              </Reveal>
            );
          })}
        </ul>
      </Panel>
    );

  return (
    <div className="space-y-4">
      {backpackBar}
      {group("In uso", Swords, equipped, "crimson")}
      {group("Nello zaino", Package, carried, "gold")}
    </div>
  );
}

/* ── Magia ────────────────────────────────────────────────── */

export function MagicTab() {
  const { sheet, patchSheet } = useCodex();
  const ability = sheet.spellcastingAbility;
  const slots = sheet.spellSlots.filter((slot) => slot.total > 0);
  const hasMagic =
    Boolean(ability) ||
    slots.length > 0 ||
    sheet.spells.length > 0 ||
    sheet.cantrips.length > 0;

  if (!hasMagic) {
    return (
      <p className="rounded-xl border border-dashed border-hairline-strong p-6 text-center text-sm text-muted-foreground italic">
        Questo personaggio non lancia incantesimi.
      </p>
    );
  }

  const mod = ability ? abilityMod(sheet, ability) : 0;
  const spellsByLevel = [...sheet.spells]
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "it"))
    .reduce<Record<number, typeof sheet.spells>>((acc, spell) => {
      (acc[spell.level] ??= []).push(spell);
      return acc;
    }, {});

  return (
    <div className="space-y-4">
      {/* Statistiche da incantatore */}
      <Panel title="Incantatore" icon={Wand2} tone="arcane">
        {ability ? (
          <div className="grid grid-cols-3 gap-2.5">
            <Stat
              label="Caratteristica"
              value={ABILITY_SHORT[ability]}
              sub={`${ABILITY_LABELS[ability]} ${formatModifier(mod)}`}
              tone="arcane"
            />
            <Stat
              label="CD incantesimi"
              value={8 + sheet.proficiencyBonus + mod}
              tone="arcane"
            />
            <Stat
              label="Attacco"
              value={formatModifier(sheet.proficiencyBonus + mod)}
              tone="arcane"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Imposta la caratteristica da incantatore nella scheda per vedere CD e
            attacco.
          </p>
        )}
        {sheet.arcaneFocus && (
          <p className="mt-3 text-xs text-muted-foreground">
            Focus: <span className="text-foreground/90">{sheet.arcaneFocus}</span>
          </p>
        )}
      </Panel>

      {/* Slot */}
      {slots.length > 0 && (
        <Panel title="Slot incantesimo" icon={Sparkles} tone="arcane">
          <ul className="space-y-2.5">
            {slots.map((slot) => {
              const remaining = Math.max(slot.total - slot.used, 0);
              return (
                <li key={slot.level} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 font-heading text-sm font-semibold text-gold-bright">
                    Liv. {slot.level}
                  </span>
                  <div className="flex flex-1 flex-wrap gap-2">
                    {Array.from({ length: slot.total }, (_, index) => {
                      const spent = index >= remaining;
                      return (
                        <button
                          key={index}
                          type="button"
                          aria-pressed={spent}
                          aria-label={
                            spent
                              ? `Slot di livello ${slot.level} speso: clicca per recuperarlo`
                              : `Slot di livello ${slot.level} disponibile: clicca per spenderlo`
                          }
                          onClick={() =>
                            patchSheet((cur) => ({
                              spellSlots: cur.spellSlots.map((entry) =>
                                entry.level === slot.level
                                  ? {
                                      ...entry,
                                      used: spent
                                        ? Math.max(0, entry.used - 1)
                                        : Math.min(entry.total, entry.used + 1),
                                    }
                                  : entry
                              ),
                            }))
                          }
                          className={cn(
                            "size-11 rounded-md border-2 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none",
                            // Rombo: una gemma, piena = carica disponibile
                            "rotate-45 scale-[0.82]",
                            spent
                              ? "border-hairline-strong bg-transparent"
                              : "border-arcane-bright bg-arcane-bright/30 shadow-[0_0_10px_rgba(140,120,255,0.35)]"
                          )}
                        />
                      );
                    })}
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                    {remaining}/{slot.total}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {/* Trucchetti */}
      {sheet.cantrips.length > 0 && (
        <Panel title={`Trucchetti · ${sheet.cantrips.length}`} icon={Zap} tone="arcane">
          <ul className="flex flex-wrap gap-2">
            {sheet.cantrips.map((name, index) => (
              <li
                key={`${name}-${index}`}
                className="rounded-md border border-arcane-bright/40 bg-arcane-blue/40 px-2.5 py-1 text-sm text-foreground"
              >
                {name}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Incantesimi per livello */}
      {Object.entries(spellsByLevel).map(([level, spells]) => (
        <Panel
          key={level}
          title={`Incantesimi · Liv. ${level}`}
          icon={Wand2}
          tone="arcane"
        >
          <ul className="space-y-2">
            {spells.map((spell) => (
              <li
                key={spell.id}
                className="rounded-lg border border-hairline bg-surface-1/70 px-3 py-2"
              >
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {spell.name || "Incantesimo"}
                  {spell.prepared && (
                    <Star
                      aria-label="Preparato"
                      className="size-3.5 fill-gold text-gold"
                    />
                  )}
                </p>
                <Describe text={spell.notes} className="mt-0.5" />
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}

/* ── Statistiche ──────────────────────────────────────────── */

export function StatsTab() {
  const { sheet } = useCodex();
  const jack = factotum(sheet);

  return (
    <div className="space-y-4">
      <Panel title="Caratteristiche" icon={Swords}>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {ABILITIES.map((ability: Ability) => {
            const total = abilityTotal(sheet, ability);
            const buff = sheet.abilities[ability].tempBonus;
            return (
              <div
                key={ability}
                className="relative flex flex-col items-center gap-0.5 overflow-hidden rounded-lg border border-hairline bg-gradient-to-b from-surface-2/80 to-surface-1/90 px-1 py-3"
              >
                <span className="font-heading text-[10px] font-bold tracking-[0.2em] text-crimson-light/90">
                  {ABILITY_SHORT[ability]}
                </span>
                <span className="font-heading text-3xl leading-none font-bold text-parchment tabular-nums">
                  {formatModifier(abilityMod(sheet, ability))}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {total}
                  {buff !== 0 && (
                    <span className="text-arcane-bright"> ({formatModifier(buff)})</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Tiri salvezza" icon={ShieldCheck}>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {ABILITIES.map((ability: Ability) => {
            const proficient = sheet.savingThrows.includes(ability);
            return (
              <div
                key={ability}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-lg border px-1 py-3",
                  proficient
                    ? "border-gold/50 bg-gradient-to-b from-gold/12 to-surface-1/90"
                    : "border-hairline bg-surface-1/70"
                )}
              >
                <span className="font-heading text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
                  {ABILITY_SHORT[ability]}
                </span>
                <span
                  className={cn(
                    "font-heading text-2xl leading-none font-bold tabular-nums",
                    proficient ? "text-gold-bright" : "text-parchment"
                  )}
                >
                  {formatModifier(saveMod(sheet, ability))}
                </span>
                {proficient && (
                  <ShieldCheck
                    aria-label="Competente"
                    className="absolute top-1 right-1 size-3 text-gold"
                  />
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Abilità"
        icon={Star}
        aside={
          jack ? (
            <span className="flex items-center gap-1 text-[11px] text-gold-bright">
              <Sparkles aria-hidden className="size-3" />
              {jack.label} {formatModifier(jack.bonus)}
            </span>
          ) : undefined
        }
      >
        <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {SKILL_KEYS.map((key) => {
            const def = SKILLS[key];
            const proficient = sheet.skills.includes(key);
            const expert = sheet.expertise.includes(key);
            return (
              <li
                key={key}
                className="flex min-h-10 items-center gap-2.5 rounded-md px-2 py-1 odd:bg-surface-2/30 sm:odd:bg-transparent"
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full",
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
                  {jack && !proficient && (
                    <Sparkles
                      aria-label={`${jack.label} ${formatModifier(jack.bonus)}`}
                      className="ml-1 inline size-3 text-gold-bright"
                    />
                  )}
                </span>
                <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">
                  {ABILITY_SHORT[def.ability]}
                </span>
                <span className="w-9 shrink-0 text-right font-heading font-bold text-gold-bright tabular-nums">
                  {formatModifier(skillMod(sheet, key))}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

/* ── Stato ────────────────────────────────────────────────── */

export function StatusTab() {
  const { sheet, patchSheet } = useCodex();
  const jack = factotum(sheet);

  return (
    <div className="space-y-4">
      <section
        aria-label="Difese"
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
      >
        <Stat icon={Shield} label="CA" value={sheet.armorClass || "—"} tone="crimson" />
        <Stat icon={Zap} label="Iniziativa" value={formatModifier(sheet.initiative)} />
        <Stat icon={Gauge} label="Velocità" value={sheet.speed || "—"} />
        <Stat icon={Eye} label="Perc. passiva" value={passivePerception(sheet)} />
        <Stat
          icon={Star}
          label="Competenza"
          value={formatModifier(sheet.proficiencyBonus)}
          tone="gold"
        />
        {jack && (
          <Stat
            icon={Sparkles}
            label={jack.label}
            value={formatModifier(jack.bonus)}
            tone="gold"
          />
        )}
      </section>

      {sheet.resources.length > 0 && (
        <Panel title="Risorse" icon={Zap} tone="gold">
          <ul className="space-y-2">
            {sheet.resources.map((resource) => (
              <li
                key={resource.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="min-w-0 truncate text-sm text-foreground">
                  {resource.name || "Risorsa"}
                </span>
                <Counter
                  value={resource.current}
                  max={resource.max}
                  min={0}
                  label={resource.name || "Risorsa"}
                  onChange={(next) =>
                    patchSheet((cur) => ({
                      resources: cur.resources.map((entry) =>
                        entry.id === resource.id
                          ? {
                              ...entry,
                              current: Math.max(
                                0,
                                Math.min(entry.max || next, next)
                              ),
                            }
                          : entry
                      ),
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Condizioni" icon={Skull}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            aria-pressed={sheet.inspiration}
            onClick={() =>
              patchSheet((cur) => ({ inspiration: !cur.inspiration }))
            }
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none",
              sheet.inspiration
                ? "border-gold/60 bg-gold/15 text-gold-bright"
                : "border-hairline-strong text-muted-foreground hover:bg-surface-2"
            )}
          >
            <Sparkles aria-hidden className="size-4" />
            Ispirazione
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Indebolimento</span>
            <Counter
              value={sheet.exhaustion}
              min={0}
              max={6}
              label="Indebolimento"
              onChange={(next) =>
                patchSheet({
                  exhaustion: Math.max(0, Math.min(6, Math.floor(next))),
                })
              }
            />
          </div>
        </div>

        {sheet.conditions.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {sheet.conditions.map((condition) => (
              <li
                key={condition.id}
                className={cn(
                  "relative flex items-start justify-between gap-3 rounded-lg border px-3 py-2",
                  CONDITION_KIND_STYLES[condition.kind]
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{condition.name}</p>
                  {(condition.detail || condition.duration) && (
                    <p className="mt-0.5 text-xs opacity-80">
                      {[condition.detail, condition.duration]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Rimuovi ${condition.name}`}
                  onClick={() =>
                    patchSheet((cur) => ({
                      conditions: cur.conditions.filter(
                        (entry) => entry.id !== condition.id
                      ),
                    }))
                  }
                  className="grid size-11 shrink-0 place-items-center rounded-lg opacity-80 transition-opacity hover:bg-black/20 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground italic">
            Nessuna condizione attiva.
          </p>
        )}
      </Panel>
    </div>
  );
}

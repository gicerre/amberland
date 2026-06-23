"use client";

import {
  BookOpen,
  ChevronDown,
  Coins,
  FlaskConical,
  Gauge,
  Heart,
  Package,
  Shield,
  ShieldPlus,
  Sparkles,
  Star,
  Swords,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatTile, TomeHeading } from "@/design-system";
import { cn } from "@/lib/utils";
import {
  ABILITIES,
  type Ability,
  type CharacterSheet,
  type EquipmentCategory,
} from "@/types/entities";

import {
  ABILITY_LABELS,
  ABILITY_SHORT,
  EQUIPMENT_CATEGORY_LABELS,
  SKILLS,
  SKILL_KEYS,
  abilityModifier,
  formatModifier,
} from "../constants";
import { CompanionsGrid } from "./companion-sheet";

/* ============================================================
 * Predicati: quali sezioni hanno contenuto (per decidere le tab).
 * ============================================================ */

export function sheetHasInventory(sheet: CharacterSheet): boolean {
  return (
    sheet.equipment.length > 0 ||
    Object.values(sheet.money).some((value) => value > 0)
  );
}

export function sheetHasMagic(sheet: CharacterSheet): boolean {
  return (
    Boolean(sheet.spellcastingAbility) ||
    sheet.spellSlots.length > 0 ||
    sheet.spells.length > 0 ||
    sheet.cantrips.length > 0
  );
}

export function sheetHasBio(sheet: CharacterSheet): boolean {
  return Boolean(
    sheet.backstory ||
      sheet.personalityTraits ||
      sheet.ideals ||
      sheet.bonds ||
      sheet.flaws ||
      sheet.subrace ||
      sheet.deity ||
      sheet.age ||
      sheet.height ||
      sheet.weight ||
      sheet.gender ||
      sheet.languages.length > 0
  );
}

export function sheetHasCompanions(sheet: CharacterSheet): boolean {
  return (sheet.companions?.length ?? 0) > 0;
}

/* ============================================================
 * Helper di calcolo.
 * ============================================================ */

function abilityTotal(sheet: CharacterSheet, ability: Ability): number {
  const data = sheet.abilities[ability];
  return data.score + data.tempBonus;
}

/** Modificatore di una skill: mod caratteristica + competenza (+ expertise). */
function skillModifier(sheet: CharacterSheet, key: string): number {
  const { ability } = SKILLS[key];
  let mod = abilityModifier(abilityTotal(sheet, ability));
  if (sheet.skills.includes(key)) mod += sheet.proficiencyBonus;
  if (sheet.expertise.includes(key)) mod += sheet.proficiencyBonus;
  return mod;
}

/** Arma "principale": prima equipaggiata, altrimenti prima arma in lista. */
function primaryWeapon(sheet: CharacterSheet) {
  return (
    sheet.equipment.find(
      (item) => item.category === "weapon" && item.equipped
    ) ?? sheet.equipment.find((item) => item.category === "weapon")
  );
}

/* ============================================================
 * Primitive visive condivise.
 * ============================================================ */

/** Intestazione di sezione della scheda — delega al linguaggio del Tomo. */
export function SheetHeading({
  icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return <TomeHeading icon={icon} title={title} meta={hint} />;
}

/** Barra dei punti ferita (cuore che si svuota). */
export function HpBar({
  current,
  max,
  temp,
  className,
}: {
  current: number;
  max: number;
  temp?: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const low = pct <= 25;
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-heading tracking-wide text-foreground">
          <Heart className="size-4 text-crimson-bright" />
          Punti Ferita
        </span>
        <span className="font-heading font-bold text-foreground">
          {current}
          <span className="text-muted-foreground">/{max}</span>
          {temp ? (
            <span className="ml-1.5 text-arcane-bright">(+{temp})</span>
          ) : null}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border border-gold/20 bg-black/60 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            low
              ? "bg-gradient-to-r from-crimson to-crimson-bright"
              : "bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-bright"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ============================================================
 * QUICK STATS — colpo d'occhio sotto l'Hero.
 * ============================================================ */

export function QuickStats({ sheet }: { sheet: CharacterSheet }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
      <StatTile
        icon={Shield}
        label="CA"
        value={sheet.armorClass || "—"}
      />
      <StatTile
        icon={Zap}
        label="Iniziativa"
        value={formatModifier(sheet.initiative)}
      />
      <StatTile icon={Gauge} label="Velocità" value={sheet.speed || "—"} />
      <StatTile
        icon={Star}
        label="Competenza"
        value={formatModifier(sheet.proficiencyBonus)}
      />
      <StatTile
        icon={Heart}
        label="PF"
        value={`${sheet.currentHp}/${sheet.maxHp}`}
        sub={sheet.tempHp ? `+${sheet.tempHp} temp` : undefined}
      />
    </div>
  );
}

/* ============================================================
 * ATTRIBUTI — medaglioni esagonali.
 * ============================================================ */

function AbilityMedallion({
  ability,
  score,
  mod,
  buff,
}: {
  ability: Ability;
  score: number;
  mod: number;
  buff: number;
}) {
  return (
    <div className="clip-octagon-md bg-gradient-to-b from-gold/55 via-gold/25 to-gold/10 p-[1.5px] shadow-[0_6px_20px_-10px_rgba(0,0,0,0.7)]">
      <div className="clip-octagon-md flex flex-col items-center justify-center gap-0.5 bg-gradient-to-b from-stone-highlight to-stone-mid px-2 py-3.5 text-center">
        <span className="font-heading text-[10px] font-bold tracking-[0.18em] text-gold/70">
          {ABILITY_SHORT[ability]}
        </span>
        <span className="font-heading text-2xl leading-none font-bold text-gold-bright">
          {formatModifier(mod)}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {score}
          {buff !== 0 && (
            <span className="text-gold"> ({formatModifier(buff)})</span>
          )}
        </span>
      </div>
    </div>
  );
}

export function AbilityMedallions({ sheet }: { sheet: CharacterSheet }) {
  return (
    <section>
      <SheetHeading icon={Sparkles} title="Caratteristiche" />
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {ABILITIES.map((ability) => {
          const data = sheet.abilities[ability];
          const total = data.score + data.tempBonus;
          return (
            <AbilityMedallion
              key={ability}
              ability={ability}
              score={total}
              mod={abilityModifier(total)}
              buff={data.tempBonus}
            />
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================
 * COMBATTIMENTO — pannello tattico.
 * ============================================================ */

export function CombatPanel({ sheet }: { sheet: CharacterSheet }) {
  const weapon = primaryWeapon(sheet);
  return (
    <section>
      <SheetHeading icon={Swords} title="Combattimento" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatTile icon={Shield} label="Classe Armatura" value={sheet.armorClass || "—"} />
        <StatTile icon={Zap} label="Iniziativa" value={formatModifier(sheet.initiative)} />
        <StatTile icon={Gauge} label="Velocità" value={sheet.speed || "—"} />
        <StatTile
          icon={Heart}
          label="PF Temporanei"
          value={sheet.tempHp || "—"}
        />
      </div>
      {weapon && (
        <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-gold/25 bg-gradient-to-r from-gold/10 to-transparent px-4 py-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-night/40 text-gold">
            <Swords className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
              Arma principale
            </p>
            <p className="font-heading font-semibold text-gold-bright">
              {weapon.name || "Arma"}
              {weapon.equipped && (
                <span className="ml-2 align-middle text-[10px] font-normal text-emerald-300">
                  equipaggiata
                </span>
              )}
            </p>
            {weapon.notes && (
              <p className="truncate text-xs text-muted-foreground">
                {weapon.notes}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ============================================================
 * CLASSI.
 * ============================================================ */

export function ClassesRow({ sheet }: { sheet: CharacterSheet }) {
  if (sheet.classes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {sheet.classes.map((entry) => (
        <div
          key={entry.id}
          className="rounded-lg border border-gold/25 bg-gradient-to-b from-stone-surface to-stone-mid px-4 py-2"
        >
          <span className="font-heading font-semibold text-gold-bright">
            {entry.className || "Classe"} {entry.level}
          </span>
          {entry.subclass && (
            <span className="ml-1.5 text-sm text-muted-foreground">
              · {entry.subclass}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
 * ABILITÀ & COMPETENZE — riassunto + drawer "tutte".
 * ============================================================ */

export function SkillsPanel({ sheet }: { sheet: CharacterSheet }) {
  const [open, setOpen] = useState(false);

  const hasAny =
    sheet.savingThrows.length > 0 ||
    sheet.skills.length > 0 ||
    Boolean(sheet.toolProficiencies) ||
    Boolean(sheet.armorProficiencies) ||
    Boolean(sheet.weaponProficiencies);
  if (!hasAny) return null;

  // Competenze (proficient) ordinate per modificatore decrescente — "top skill".
  const proficient = [...sheet.skills]
    .filter((key) => key in SKILLS)
    .sort((a, b) => skillModifier(sheet, b) - skillModifier(sheet, a));

  const profText = [
    sheet.armorProficiencies && ["Armature", sheet.armorProficiencies],
    sheet.weaponProficiencies && ["Armi", sheet.weaponProficiencies],
    sheet.toolProficiencies && ["Strumenti", sheet.toolProficiencies],
  ].filter(Boolean) as [string, string][];

  return (
    <section>
      <SheetHeading icon={Star} title="Abilità & Competenze" />

      {sheet.savingThrows.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[10px] font-semibold tracking-[0.18em] text-gold/60 uppercase">
            Tiri salvezza
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sheet.savingThrows.map((ability) => (
              <Badge key={ability} variant="outline" className="border-gold/30">
                {ABILITY_LABELS[ability]}{" "}
                <span className="ml-1 text-gold-bright">
                  {formatModifier(
                    abilityModifier(abilityTotal(sheet, ability)) +
                      sheet.proficiencyBonus
                  )}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {proficient.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[10px] font-semibold tracking-[0.18em] text-gold/60 uppercase">
            Competenze migliori
          </p>
          <div className="flex flex-wrap gap-1.5">
            {proficient.slice(0, 6).map((key) => {
              const expert = sheet.expertise.includes(key);
              return (
                <span
                  key={key}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm",
                    expert
                      ? "border-gold/55 bg-gold/12 text-gold-bright"
                      : "border-gold/25 bg-night/40 text-foreground/90"
                  )}
                >
                  {expert && <Star className="size-3 fill-gold text-gold" />}
                  {SKILLS[key].label}
                  <strong className="text-gold-bright">
                    {formatModifier(skillModifier(sheet, key))}
                  </strong>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {profText.length > 0 && (
        <dl className="mb-3 grid gap-2 sm:grid-cols-3">
          {profText.map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-gold/12 bg-night/30 px-3 py-2"
            >
              <dt className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="text-sm text-foreground/90">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Gauge className="size-4" />
        Tutte le competenze
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full border-gold/20 bg-popover sm:max-w-md"
        >
          <SheetHeader className="border-b border-gold/15">
            <SheetTitle className="text-gold-gradient flex items-center gap-2">
              <Gauge className="size-5 text-gold" />
              Tutte le competenze
            </SheetTitle>
            <SheetDescription>
              Modificatori già calcolati (caratteristica + competenza).
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            <ul className="p-4">
              {SKILL_KEYS.map((key) => {
                const proficientSkill = sheet.skills.includes(key);
                const expert = sheet.expertise.includes(key);
                const mod = skillModifier(sheet, key);
                return (
                  <li
                    key={key}
                    className="flex items-center gap-3 border-b border-gold/8 py-2 last:border-0"
                  >
                    <span
                      className={cn(
                        "flex size-2 shrink-0 rounded-full",
                        expert
                          ? "bg-gold shadow-[0_0_6px_rgba(212,175,55,0.7)]"
                          : proficientSkill
                            ? "bg-gold/60"
                            : "bg-iron-mid"
                      )}
                    />
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        proficientSkill
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {SKILLS[key].label}
                      {expert && (
                        <Star className="ml-1 inline size-3 fill-gold text-gold" />
                      )}
                    </span>
                    <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">
                      {ABILITY_SHORT[SKILLS[key].ability]}
                    </span>
                    <strong className="w-8 text-right font-heading text-gold-bright">
                      {formatModifier(mod)}
                    </strong>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </section>
  );
}

/* ============================================================
 * EQUIPAGGIAMENTO — inventario visuale.
 * ============================================================ */

const EQUIP_ICON: Record<EquipmentCategory, LucideIcon> = {
  weapon: Swords,
  armor: Shield,
  shield: ShieldPlus,
  magic: Sparkles,
  consumable: FlaskConical,
  misc: Package,
};

const EQUIP_STYLE: Record<EquipmentCategory, string> = {
  weapon: "text-rose-300",
  armor: "text-sky-300",
  shield: "text-sky-300",
  magic: "text-violet-300",
  consumable: "text-emerald-300",
  misc: "text-muted-foreground",
};

const COIN_LABELS: Record<string, string> = {
  pp: "Platino",
  gp: "Oro",
  ep: "Electrum",
  sp: "Argento",
  cp: "Rame",
};

function EquipItemCard({
  item,
}: {
  item: CharacterSheet["equipment"][number];
}) {
  const Icon = EQUIP_ICON[item.category];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-gradient-to-b from-stone-surface to-stone-mid/80 p-3 transition-colors",
        item.equipped ? "border-gold/45" : "border-gold/12"
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-night/40",
          EQUIP_STYLE[item.category]
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-heading font-semibold text-foreground">
          <span className="truncate">{item.name || "Oggetto"}</span>
          {item.quantity > 1 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              ×{item.quantity}
            </span>
          )}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {EQUIPMENT_CATEGORY_LABELS[item.category]}
          {item.equipped && (
            <span className="text-emerald-300">· equipaggiato</span>
          )}
        </p>
        {item.notes && (
          <p className="truncate text-xs text-muted-foreground/80">
            {item.notes}
          </p>
        )}
      </div>
    </div>
  );
}

export function InventoryDisplay({ sheet }: { sheet: CharacterSheet }) {
  const [showAll, setShowAll] = useState(false);
  const equipped = sheet.equipment.filter((item) => item.equipped);
  const rest = sheet.equipment.filter((item) => !item.equipped);
  const hasMoney = Object.values(sheet.money).some((value) => value > 0);

  return (
    <section>
      <SheetHeading
        icon={Package}
        title="Equipaggiamento"
        hint={
          sheet.equipment.length > 0
            ? `${sheet.equipment.length} oggetti`
            : undefined
        }
      />

      {equipped.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-gold/60 uppercase">
            Equipaggiato
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {equipped.map((item) => (
              <EquipItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="mb-2 flex w-full items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-gold/60 uppercase transition-colors hover:text-gold"
          >
            Zaino · {rest.length}
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                showAll && "rotate-180"
              )}
            />
            <span className="ml-auto h-px flex-1 bg-gold/15" />
          </button>
          {showAll && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {rest.map((item) => (
                <EquipItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {hasMoney && (
        <div className="flex flex-wrap gap-2">
          {(["pp", "gp", "ep", "sp", "cp"] as const)
            .filter((coin) => sheet.money[coin] > 0)
            .map((coin) => (
              <div
                key={coin}
                className="flex items-center gap-1.5 rounded-lg border border-gold/20 bg-gradient-to-b from-stone-surface to-stone-mid px-3 py-1.5 text-sm"
              >
                <Coins className="size-3.5 text-gold/60" />
                <strong className="text-gold-bright">{sheet.money[coin]}</strong>
                <span className="text-muted-foreground">
                  {COIN_LABELS[coin]}
                </span>
              </div>
            ))}
        </div>
      )}

      {sheet.equipment.length === 0 && !hasMoney && (
        <p className="text-sm text-muted-foreground italic">
          Lo zaino è vuoto.
        </p>
      )}
    </section>
  );
}

/* ============================================================
 * MAGIE — spell card colorate per livello.
 * ============================================================ */

function spellLevelStyle(level: number): string {
  if (level === 0) return "border-zinc-500/40 bg-zinc-500/10";
  if (level <= 2) return "border-sky-600/45 bg-sky-950/40";
  if (level <= 4) return "border-arcane-bright/50 bg-arcane-blue/45";
  if (level <= 6) return "border-gold/45 bg-gold/10";
  return "border-crimson-bright/45 bg-crimson/15";
}

export function MagicDisplay({ sheet }: { sheet: CharacterSheet }) {
  return (
    <section>
      <SheetHeading icon={Wand2} title="Magie & Incantesimi" />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        {sheet.spellcastingAbility && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-arcane-bright/40 bg-arcane-blue/40 px-3 py-1.5">
            <Wand2 className="size-4 text-arcane-bright" />
            Incantatore:{" "}
            <strong className="text-foreground">
              {ABILITY_LABELS[sheet.spellcastingAbility]}
            </strong>
          </span>
        )}
        {sheet.arcaneFocus && (
          <span className="text-muted-foreground">
            Focus: <span className="text-foreground/90">{sheet.arcaneFocus}</span>
          </span>
        )}
      </div>

      {sheet.spellSlots.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-gold/60 uppercase">
            Slot incantesimo
          </p>
          <div className="flex flex-wrap gap-2">
            {[...sheet.spellSlots]
              .sort((a, b) => a.level - b.level)
              .map((slot) => (
                <div
                  key={slot.level}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm",
                    spellLevelStyle(slot.level)
                  )}
                >
                  <span className="text-muted-foreground">Liv. {slot.level}</span>{" "}
                  <strong className="text-foreground">
                    {Math.max(slot.total - slot.used, 0)}/{slot.total}
                  </strong>
                </div>
              ))}
          </div>
        </div>
      )}

      {sheet.cantrips.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-gold/60 uppercase">
            Trucchetti
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sheet.cantrips.map((cantrip) => (
              <span
                key={cantrip}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-sm text-foreground/90",
                  spellLevelStyle(0)
                )}
              >
                {cantrip}
              </span>
            ))}
          </div>
        </div>
      )}

      {sheet.spells.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-gold/60 uppercase">
            Incantesimi
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {[...sheet.spells]
              .sort((a, b) => a.level - b.level)
              .map((spell) => (
                <div
                  key={spell.id}
                  className={cn(
                    "rounded-xl border p-3",
                    spellLevelStyle(spell.level)
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/15 bg-black/30 font-heading text-sm font-bold text-foreground">
                      {spell.level}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-heading font-semibold text-foreground">
                      {spell.name || "Incantesimo"}
                    </span>
                    {spell.prepared && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-emerald-600/40 text-[10px] text-emerald-300"
                      >
                        Preparato
                      </Badge>
                    )}
                  </div>
                  {spell.notes && (
                    <p className="mt-1.5 text-xs text-foreground/70">
                      {spell.notes}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ============================================================
 * BIOGRAFIA — Tomo del Personaggio.
 * ============================================================ */

export function IdentityDetails({ sheet }: { sheet: CharacterSheet }) {
  const details = [
    ["Sottorazza", sheet.subrace],
    ["Background", sheet.background],
    ["Divinità", sheet.deity],
    ["Età", sheet.age],
    ["Altezza", sheet.height],
    ["Peso", sheet.weight],
    ["Genere", sheet.gender],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  if (details.length === 0 && sheet.languages.length === 0) return null;

  return (
    <div className="space-y-3">
      {details.length > 0 && (
        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {details.map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-gold/12 bg-night/30 px-3 py-2"
            >
              <dt className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="text-sm text-foreground/90">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {sheet.languages.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <BookOpen className="size-4 text-gold/60" />
          <span className="text-sm text-muted-foreground">Lingue:</span>
          {sheet.languages.map((language) => (
            <Badge key={language} variant="outline" className="border-gold/25">
              {language}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

const TOME_PAGES: { label: string; key: keyof CharacterSheet; accent: string }[] =
  [
    { label: "Storia", key: "backstory", accent: "text-gold" },
    { label: "Tratti caratteriali", key: "personalityTraits", accent: "text-sky-300" },
    { label: "Ideali", key: "ideals", accent: "text-emerald-300" },
    { label: "Legami", key: "bonds", accent: "text-violet-300" },
    { label: "Difetti", key: "flaws", accent: "text-rose-300" },
  ];

export function BiographyTome({ sheet }: { sheet: CharacterSheet }) {
  const pages = TOME_PAGES.map((page) => ({
    ...page,
    value: String(sheet[page.key] ?? ""),
  })).filter((page) => page.value);

  if (pages.length === 0) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {pages.map((page) => (
        <article
          key={page.key}
          className="fantasy-stripe-top relative overflow-hidden rounded-xl border border-gold/15 bg-gradient-to-b from-stone-surface to-stone-mid/80 p-5 shadow-[0_6px_24px_-12px_rgba(0,0,0,0.7)]"
        >
          <h3
            className={cn(
              "mb-2 font-heading text-sm font-bold tracking-[0.18em] uppercase",
              page.accent
            )}
          >
            {page.label}
          </h3>
          <p className="text-[15px] leading-relaxed whitespace-pre-line text-foreground/90">
            {page.value}
          </p>
        </article>
      ))}
    </div>
  );
}

/* ============================================================
 * COMPAGNI / FAMIGLI.
 * ============================================================ */

export function CompanionsSection({
  sheet,
  ownerName,
}: {
  sheet: CharacterSheet;
  ownerName?: string;
}) {
  if ((sheet.companions?.length ?? 0) === 0) return null;
  return (
    <section>
      <SheetHeading icon={Heart} title="Famigli e compagni" />
      <CompanionsGrid companions={sheet.companions} ownerName={ownerName} />
    </section>
  );
}

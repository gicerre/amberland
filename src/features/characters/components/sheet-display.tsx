"use client";

import {
  BookOpen,
  Coins,
  Shield,
  Sparkles,
  Swords,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SectionDivider } from "@/components/shared/fantasy-card";
import { cn } from "@/lib/utils";
import {
  ABILITIES,
  type CharacterSheet,
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

const COIN_LABELS: Record<string, string> = {
  pp: "Platino",
  gp: "Oro",
  ep: "Electrum",
  sp: "Argento",
  cp: "Rame",
};

/** Visualizzazione in sola lettura della scheda D&D completa. */
export function CharacterSheetDisplay({ sheet }: { sheet: CharacterSheet }) {
  const totalLevel = sheet.classes.reduce(
    (sum, entry) => sum + (entry.level || 0),
    0
  );
  const hasMoney = Object.values(sheet.money).some((value) => value > 0);
  const hasMagic =
    Boolean(sheet.spellcastingAbility) ||
    sheet.spellSlots.length > 0 ||
    sheet.spells.length > 0 ||
    sheet.cantrips.length > 0;

  return (
    <div className="space-y-8">
      {/* Caratteristiche */}
      <section>
        <SectionTitle title="Caratteristiche" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ABILITIES.map((ability) => {
            const data = sheet.abilities[ability];
            const total = data.score + data.tempBonus;
            const mod = abilityModifier(total);
            return (
              <div
                key={ability}
                className="rounded-xl border border-gold/20 bg-card/60 p-3 text-center"
              >
                <p className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                  {ABILITY_SHORT[ability]}
                </p>
                <p className="font-heading text-2xl font-bold text-gold-bright">
                  {formatModifier(mod)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {total}
                  {data.tempBonus !== 0 && (
                    <span className="text-gold">
                      {" "}
                      ({formatModifier(data.tempBonus)})
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Combattimento */}
      <section>
        <SectionTitle title="Combattimento" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat icon={<Shield className="size-4" />} label="CA" value={sheet.armorClass} />
          <Stat
            label="Punti Ferita"
            value={`${sheet.currentHp}/${sheet.maxHp}${
              sheet.tempHp ? ` (+${sheet.tempHp})` : ""
            }`}
          />
          <Stat label="Iniziativa" value={formatModifier(sheet.initiative)} />
          <Stat label="Velocità" value={sheet.speed || "—"} />
          <Stat
            label="Comp."
            value={formatModifier(sheet.proficiencyBonus)}
          />
          {totalLevel > 0 && <Stat label="Livello" value={totalLevel} />}
        </div>
      </section>

      {/* Classi */}
      {sheet.classes.length > 0 && (
        <section>
          <SectionTitle title="Classi" />
          <div className="flex flex-wrap gap-2">
            {sheet.classes.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-gold/20 bg-card/60 px-4 py-2"
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
        </section>
      )}

      {/* Competenze */}
      {(sheet.savingThrows.length > 0 ||
        sheet.skills.length > 0 ||
        sheet.toolProficiencies ||
        sheet.armorProficiencies ||
        sheet.weaponProficiencies) && (
        <section>
          <SectionTitle title="Competenze" />
          <div className="grid gap-4 lg:grid-cols-2">
            {sheet.savingThrows.length > 0 && (
              <Block label="Tiri salvezza">
                <div className="flex flex-wrap gap-1.5">
                  {sheet.savingThrows.map((ability) => (
                    <Badge
                      key={ability}
                      variant="outline"
                      className="border-gold/30 text-xs"
                    >
                      {ABILITY_LABELS[ability]}
                    </Badge>
                  ))}
                </div>
              </Block>
            )}
            {sheet.skills.length > 0 && (
              <Block label="Abilità">
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_KEYS.filter((key) => sheet.skills.includes(key)).map(
                    (key) => {
                      const expert = sheet.expertise.includes(key);
                      return (
                        <Badge
                          key={key}
                          variant="outline"
                          className={cn(
                            "text-xs",
                            expert
                              ? "border-gold/60 bg-gold/15 text-gold-bright"
                              : "border-gold/30"
                          )}
                        >
                          {SKILLS[key].label}
                          {expert && " ★"}
                        </Badge>
                      );
                    }
                  )}
                </div>
              </Block>
            )}
            {sheet.armorProficiencies && (
              <TextBlock label="Armature" text={sheet.armorProficiencies} />
            )}
            {sheet.weaponProficiencies && (
              <TextBlock label="Armi" text={sheet.weaponProficiencies} />
            )}
            {sheet.toolProficiencies && (
              <TextBlock label="Strumenti" text={sheet.toolProficiencies} />
            )}
          </div>
        </section>
      )}

      {/* Equipaggiamento */}
      {(sheet.equipment.length > 0 || hasMoney) && (
        <section>
          <SectionTitle title="Equipaggiamento" />
          {sheet.equipment.length > 0 && (
            <ul className="mb-4 space-y-1.5">
              {sheet.equipment.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-gold/15 bg-card/60 px-4 py-2"
                >
                  <Swords className="size-3.5 shrink-0 text-gold/60" />
                  <span className="font-medium">{item.name || "Oggetto"}</span>
                  {item.quantity > 1 && (
                    <span className="text-sm text-muted-foreground">
                      ×{item.quantity}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className="border-gold/20 text-[10px] text-muted-foreground"
                  >
                    {EQUIPMENT_CATEGORY_LABELS[item.category]}
                  </Badge>
                  {item.equipped && (
                    <Badge
                      variant="outline"
                      className="border-emerald-600/40 text-[10px] text-emerald-300"
                    >
                      Equipaggiato
                    </Badge>
                  )}
                  {item.notes && (
                    <span className="w-full text-sm text-muted-foreground">
                      {item.notes}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {hasMoney && (
            <div className="flex flex-wrap gap-2">
              {(["pp", "gp", "ep", "sp", "cp"] as const)
                .filter((coin) => sheet.money[coin] > 0)
                .map((coin) => (
                  <div
                    key={coin}
                    className="flex items-center gap-1.5 rounded-lg border border-gold/20 bg-card/60 px-3 py-1.5 text-sm"
                  >
                    <Coins className="size-3.5 text-gold/60" />
                    <strong className="text-gold-bright">
                      {sheet.money[coin]}
                    </strong>
                    <span className="text-muted-foreground">
                      {COIN_LABELS[coin]}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* Magia */}
      {hasMagic && (
        <section>
          <SectionTitle title="Magia" />
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {sheet.spellcastingAbility && (
                <span className="flex items-center gap-1.5">
                  <Wand2 className="size-4 text-gold/70" />
                  Incantatore:{" "}
                  <strong className="text-gold-bright">
                    {ABILITY_LABELS[sheet.spellcastingAbility]}
                  </strong>
                </span>
              )}
              {sheet.arcaneFocus && (
                <span className="text-muted-foreground">
                  Focus: {sheet.arcaneFocus}
                </span>
              )}
            </div>

            {sheet.spellSlots.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {[...sheet.spellSlots]
                  .sort((a, b) => a.level - b.level)
                  .map((slot) => (
                    <div
                      key={slot.level}
                      className="rounded-lg border border-gold/20 bg-card/60 px-3 py-1.5 text-sm"
                    >
                      <span className="text-muted-foreground">
                        Liv. {slot.level}:
                      </span>{" "}
                      <strong className="text-gold-bright">
                        {Math.max(slot.total - slot.used, 0)}/{slot.total}
                      </strong>
                    </div>
                  ))}
              </div>
            )}

            {sheet.cantrips.length > 0 && (
              <Block label="Trucchetti">
                <div className="flex flex-wrap gap-1.5">
                  {sheet.cantrips.map((cantrip) => (
                    <Badge
                      key={cantrip}
                      variant="outline"
                      className="border-gold/30 text-xs"
                    >
                      {cantrip}
                    </Badge>
                  ))}
                </div>
              </Block>
            )}

            {sheet.spells.length > 0 && (
              <Block label="Incantesimi">
                <ul className="space-y-1">
                  {[...sheet.spells]
                    .sort((a, b) => a.level - b.level)
                    .map((spell) => (
                      <li
                        key={spell.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Sparkles className="size-3 shrink-0 text-gold/50" />
                        <span className="text-muted-foreground">
                          [{spell.level}]
                        </span>
                        <span>{spell.name || "Incantesimo"}</span>
                        {spell.prepared && (
                          <Badge
                            variant="outline"
                            className="border-emerald-600/40 text-[10px] text-emerald-300"
                          >
                            Preparato
                          </Badge>
                        )}
                        {spell.notes && (
                          <span className="text-xs text-muted-foreground">
                            — {spell.notes}
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </Block>
            )}
          </div>
        </section>
      )}

      {/* Narrativa / dettagli */}
      <SheetNarrative sheet={sheet} />
    </div>
  );
}

function SheetNarrative({ sheet }: { sheet: CharacterSheet }) {
  const details = [
    ["Sottorazza", sheet.subrace],
    ["Background", sheet.background],
    ["Divinità", sheet.deity],
    ["Età", sheet.age],
    ["Altezza", sheet.height],
    ["Peso", sheet.weight],
    ["Genere", sheet.gender],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  const narrative = [
    ["Tratti caratteriali", sheet.personalityTraits],
    ["Ideali", sheet.ideals],
    ["Legami", sheet.bonds],
    ["Difetti", sheet.flaws],
    ["Storia", sheet.backstory],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  if (
    details.length === 0 &&
    narrative.length === 0 &&
    sheet.languages.length === 0
  )
    return null;

  return (
    <section>
      <SectionTitle title="Dettagli & narrativa" />
      {details.length > 0 && (
        <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {details.map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-gold/15 bg-card/60 px-3 py-2"
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
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <BookOpen className="size-4 text-gold/60" />
          <span className="text-sm text-muted-foreground">Lingue:</span>
          {sheet.languages.map((language) => (
            <Badge
              key={language}
              variant="outline"
              className="border-gold/25 text-xs"
            >
              {language}
            </Badge>
          ))}
        </div>
      )}
      {narrative.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {narrative.map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-gold/15 bg-card/60 p-5"
            >
              <h3 className="font-heading mb-2 text-sm font-bold tracking-[0.2em] text-gold uppercase">
                {label}
              </h3>
              <p className="text-[15px] leading-relaxed whitespace-pre-line text-foreground/90">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center gap-4">
      <h2 className="font-heading text-xl font-semibold tracking-wider text-foreground">
        {title}
      </h2>
      <SectionDivider className="flex-1" />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gold/15 bg-card/60 px-4 py-3 text-center">
      <p className="flex items-center justify-center gap-1 text-[11px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-heading text-lg font-bold text-gold-bright">
        {value}
      </p>
    </div>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gold/15 bg-card/60 p-4">
      <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <Block label={label}>
      <p className="text-sm whitespace-pre-line text-foreground/90">{text}</p>
    </Block>
  );
}

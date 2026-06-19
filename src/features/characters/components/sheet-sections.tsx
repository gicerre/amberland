"use client";

import { Plus, Star, Trash2 } from "lucide-react";

import { ImageUpload } from "@/components/shared/image-upload";
import { TagInput } from "@/components/shared/tag-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ABILITIES,
  EQUIPMENT_CATEGORIES,
  type Ability,
  type CharacterSheet,
  type ClassEntry,
  type Companion,
  type EquipmentItem,
  type SpellEntry,
  type SpellSlot,
} from "@/types/entities";

import {
  ABILITY_LABELS,
  ABILITY_SHORT,
  DND_CLASSES,
  EQUIPMENT_CATEGORY_LABELS,
  SKILL_KEYS,
  SKILLS,
  abilityModifier,
  formatModifier,
} from "../constants";

type Patch = (partial: Partial<CharacterSheet>) => void;

function genId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Modificatore totale di una caratteristica (punteggio + bonus temporaneo). */
function totalModifier(score: number, tempBonus: number): number {
  return abilityModifier(score + tempBonus);
}

/* ----------------------- Anagrafe estesa ----------------------- */

export function IdentitySheetSection({
  sheet,
  patch,
}: {
  sheet: CharacterSheet;
  patch: Patch;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Sottorazza">
          <Input
            value={sheet.subrace}
            onChange={(event) => patch({ subrace: event.target.value })}
          />
        </Field>
        <Field label="Background">
          <Input
            value={sheet.background}
            onChange={(event) => patch({ background: event.target.value })}
          />
        </Field>
        <Field label="Divinità">
          <Input
            value={sheet.deity}
            onChange={(event) => patch({ deity: event.target.value })}
          />
        </Field>
        <Field label="Genere">
          <Input
            value={sheet.gender}
            onChange={(event) => patch({ gender: event.target.value })}
          />
        </Field>
        <Field label="Età">
          <Input
            value={sheet.age}
            onChange={(event) => patch({ age: event.target.value })}
          />
        </Field>
        <Field label="Altezza">
          <Input
            value={sheet.height}
            onChange={(event) => patch({ height: event.target.value })}
          />
        </Field>
        <Field label="Peso">
          <Input
            value={sheet.weight}
            onChange={(event) => patch({ weight: event.target.value })}
          />
        </Field>
      </div>

      <Field label="Lingue">
        <TagInput
          value={sheet.languages}
          onChange={(languages) => patch({ languages })}
          placeholder="Comune, elfico…"
        />
      </Field>

      <div className="space-y-4 border-t border-gold/15 pt-4">
        <Field label="Tratti caratteriali">
          <Textarea
            value={sheet.personalityTraits}
            onChange={(event) =>
              patch({ personalityTraits: event.target.value })
            }
            rows={2}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ideali">
            <Textarea
              value={sheet.ideals}
              onChange={(event) => patch({ ideals: event.target.value })}
              rows={2}
            />
          </Field>
          <Field label="Legami">
            <Textarea
              value={sheet.bonds}
              onChange={(event) => patch({ bonds: event.target.value })}
              rows={2}
            />
          </Field>
        </div>
        <Field label="Difetti">
          <Textarea
            value={sheet.flaws}
            onChange={(event) => patch({ flaws: event.target.value })}
            rows={2}
          />
        </Field>
        <Field label="Storia">
          <Textarea
            value={sheet.backstory}
            onChange={(event) => patch({ backstory: event.target.value })}
            rows={6}
          />
        </Field>
      </div>
    </div>
  );
}

/* ----------------- Caratteristiche + combattimento ----------------- */

export function AbilitiesSection({
  sheet,
  patch,
}: {
  sheet: CharacterSheet;
  patch: Patch;
}) {
  const setAbility = (
    ability: Ability,
    key: "score" | "tempBonus",
    value: number
  ) =>
    patch({
      abilities: {
        ...sheet.abilities,
        [ability]: { ...sheet.abilities[ability], [key]: value },
      },
    });

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {ABILITIES.map((ability) => {
          const data = sheet.abilities[ability];
          const mod = totalModifier(data.score, data.tempBonus);
          return (
            <div
              key={ability}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded-lg border border-gold/15 bg-night/30 px-3 py-2"
            >
              <span className="font-heading text-sm font-semibold">
                {ABILITY_LABELS[ability]}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({ABILITY_SHORT[ability]})
                </span>
              </span>
              <NumberInput
                aria-label={`${ABILITY_LABELS[ability]} punteggio`}
                value={data.score}
                onChange={(value) => setAbility(ability, "score", value)}
                className="w-16"
              />
              <NumberInput
                aria-label={`${ABILITY_LABELS[ability]} bonus temporaneo`}
                value={data.tempBonus}
                onChange={(value) => setAbility(ability, "tempBonus", value)}
                className="w-16"
                title="Bonus temporaneo"
              />
              <span className="w-10 text-right font-heading font-bold text-gold-bright">
                {formatModifier(mod)}
              </span>
            </div>
          );
        })}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-3 px-3 text-[10px] tracking-wider text-muted-foreground uppercase">
          <span />
          <span className="w-16 text-center">Punt.</span>
          <span className="w-16 text-center">Temp.</span>
          <span className="w-10 text-right">Mod.</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-gold/15 pt-4 sm:grid-cols-3">
        <NumField
          label="Bonus competenza"
          value={sheet.proficiencyBonus}
          onChange={(proficiencyBonus) => patch({ proficiencyBonus })}
        />
        <NumField
          label="Classe Armatura"
          value={sheet.armorClass}
          onChange={(armorClass) => patch({ armorClass })}
        />
        <NumField
          label="Iniziativa"
          value={sheet.initiative}
          onChange={(initiative) => patch({ initiative })}
        />
        <NumField
          label="PF massimi"
          value={sheet.maxHp}
          onChange={(maxHp) => patch({ maxHp })}
        />
        <NumField
          label="PF attuali"
          value={sheet.currentHp}
          onChange={(currentHp) => patch({ currentHp })}
        />
        <NumField
          label="PF temporanei"
          value={sheet.tempHp}
          onChange={(tempHp) => patch({ tempHp })}
        />
      </div>
      <Field label="Velocità">
        <Input
          value={sheet.speed}
          onChange={(event) => patch({ speed: event.target.value })}
          placeholder="9 m"
        />
      </Field>
    </div>
  );
}

/* ----------------------- Competenze ----------------------- */

export function ProficienciesSection({
  sheet,
  patch,
}: {
  sheet: CharacterSheet;
  patch: Patch;
}) {
  const toggle = (list: string[], value: string): string[] =>
    list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];

  const toggleSave = (ability: Ability) =>
    patch({ savingThrows: toggle(sheet.savingThrows, ability) as Ability[] });

  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-2 block">Tiri salvezza competenti</Label>
        <div className="flex flex-wrap gap-1.5">
          {ABILITIES.map((ability) => (
            <Toggle
              key={ability}
              active={sheet.savingThrows.includes(ability)}
              label={ABILITY_LABELS[ability]}
              onClick={() => toggleSave(ability)}
            />
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Abilità (skill)</Label>
        <div className="space-y-1">
          {SKILL_KEYS.map((key) => {
            const skilled = sheet.skills.includes(key);
            const expert = sheet.expertise.includes(key);
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-2 rounded-md border border-gold/10 px-3 py-1.5"
              >
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={skilled}
                    onCheckedChange={() =>
                      patch({ skills: toggle(sheet.skills, key) })
                    }
                  />
                  {SKILLS[key].label}
                  <span className="text-xs text-muted-foreground">
                    ({ABILITY_SHORT[SKILLS[key].ability]})
                  </span>
                </label>
                <label
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    skilled ? "text-muted-foreground" : "opacity-40"
                  )}
                >
                  <Checkbox
                    checked={expert}
                    disabled={!skilled}
                    onCheckedChange={() =>
                      patch({ expertise: toggle(sheet.expertise, key) })
                    }
                  />
                  Expertise
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 border-t border-gold/15 pt-4">
        <Field label="Competenze negli strumenti">
          <Textarea
            value={sheet.toolProficiencies}
            onChange={(event) =>
              patch({ toolProficiencies: event.target.value })
            }
            rows={2}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Competenze armature">
            <Textarea
              value={sheet.armorProficiencies}
              onChange={(event) =>
                patch({ armorProficiencies: event.target.value })
              }
              rows={2}
            />
          </Field>
          <Field label="Competenze armi">
            <Textarea
              value={sheet.weaponProficiencies}
              onChange={(event) =>
                patch({ weaponProficiencies: event.target.value })
              }
              rows={2}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Multiclasse ----------------------- */

export function ClassesSection({
  sheet,
  patch,
}: {
  sheet: CharacterSheet;
  patch: Patch;
}) {
  const total = sheet.classes.reduce((sum, entry) => sum + (entry.level || 0), 0);

  const update = (id: string, partial: Partial<ClassEntry>) =>
    patch({
      classes: sheet.classes.map((entry) =>
        entry.id === id ? { ...entry, ...partial } : entry
      ),
    });

  const add = () =>
    patch({
      classes: [
        ...sheet.classes,
        { id: genId(), className: "", subclass: "", level: 1 },
      ],
    });

  const remove = (id: string) =>
    patch({ classes: sheet.classes.filter((entry) => entry.id !== id) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Livello totale:{" "}
          <strong className="text-gold-bright">{total}</strong>
        </span>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="size-3.5" />
          Classe
        </Button>
      </div>

      {sheet.classes.length === 0 ? (
        <EmptyHint text="Nessuna classe. Aggiungine una per il supporto multiclasse." />
      ) : (
        <ul className="space-y-2">
          {sheet.classes.map((entry) => (
            <li
              key={entry.id}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-end gap-2 rounded-lg border border-gold/15 bg-night/30 p-3"
            >
              <Field label="Classe">
                <Input
                  value={entry.className}
                  onChange={(event) =>
                    update(entry.id, { className: event.target.value })
                  }
                  list="dnd-class-suggestions"
                  placeholder="Guerriero"
                />
              </Field>
              <Field label="Sottoclasse">
                <Input
                  value={entry.subclass}
                  onChange={(event) =>
                    update(entry.id, { subclass: event.target.value })
                  }
                  placeholder="Campione"
                />
              </Field>
              <Field label="Liv.">
                <NumberInput
                  value={entry.level}
                  onChange={(level) => update(entry.id, { level })}
                  className="w-16"
                />
              </Field>
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                aria-label="Rimuovi classe"
                onClick={() => remove(entry.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <datalist id="dnd-class-suggestions">
        {DND_CLASSES.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
  );
}

/* ----------------------- Equipaggiamento ----------------------- */

export function EquipmentSection({
  sheet,
  patch,
}: {
  sheet: CharacterSheet;
  patch: Patch;
}) {
  const update = (id: string, partial: Partial<EquipmentItem>) =>
    patch({
      equipment: sheet.equipment.map((item) =>
        item.id === id ? { ...item, ...partial } : item
      ),
    });

  const add = () =>
    patch({
      equipment: [
        ...sheet.equipment,
        {
          id: genId(),
          name: "",
          category: "misc",
          quantity: 1,
          equipped: false,
          notes: "",
        },
      ],
    });

  const remove = (id: string) =>
    patch({ equipment: sheet.equipment.filter((item) => item.id !== id) });

  const setMoney = (coin: keyof CharacterSheet["money"], value: number) =>
    patch({ money: { ...sheet.money, [coin]: value } });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Label>Inventario</Label>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="size-3.5" />
          Oggetto
        </Button>
      </div>

      {sheet.equipment.length === 0 ? (
        <EmptyHint text="Zaino vuoto." />
      ) : (
        <ul className="space-y-2">
          {sheet.equipment.map((item) => (
            <li
              key={item.id}
              className="space-y-2 rounded-lg border border-gold/15 bg-night/30 p-3"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
                <Field label="Nome">
                  <Input
                    value={item.name}
                    onChange={(event) =>
                      update(item.id, { name: event.target.value })
                    }
                  />
                </Field>
                <Field label="Q.tà">
                  <NumberInput
                    value={item.quantity}
                    onChange={(quantity) => update(item.id, { quantity })}
                    className="w-16"
                  />
                </Field>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  aria-label="Rimuovi oggetto"
                  onClick={() => remove(item.id)}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={item.category}
                  onValueChange={(value) =>
                    update(item.id, {
                      category: value as EquipmentItem["category"],
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {EQUIPMENT_CATEGORY_LABELS[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  Equipaggiato
                  <Switch
                    checked={item.equipped}
                    onCheckedChange={(equipped) =>
                      update(item.id, { equipped })
                    }
                  />
                </label>
              </div>
              <Input
                value={item.notes}
                onChange={(event) =>
                  update(item.id, { notes: event.target.value })
                }
                placeholder="Note (effetti, sintonia…)"
              />
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-gold/15 pt-4">
        <Label className="mb-2 block">Denaro</Label>
        <div className="grid grid-cols-5 gap-2">
          {(["pp", "gp", "ep", "sp", "cp"] as const).map((coin) => (
            <Field key={coin} label={coin.toUpperCase()}>
              <NumberInput
                value={sheet.money[coin]}
                onChange={(value) => setMoney(coin, value)}
              />
            </Field>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Magia ----------------------- */

export function MagicSection({
  sheet,
  patch,
}: {
  sheet: CharacterSheet;
  patch: Patch;
}) {
  const updateSlot = (level: number, partial: Partial<SpellSlot>) =>
    patch({
      spellSlots: sheet.spellSlots.map((slot) =>
        slot.level === level ? { ...slot, ...partial } : slot
      ),
    });

  const addSlot = () => {
    const nextLevel =
      sheet.spellSlots.reduce((max, slot) => Math.max(max, slot.level), 0) + 1;
    patch({
      spellSlots: [
        ...sheet.spellSlots,
        { level: nextLevel, total: 0, used: 0 },
      ],
    });
  };

  const removeSlot = (level: number) =>
    patch({ spellSlots: sheet.spellSlots.filter((slot) => slot.level !== level) });

  const updateSpell = (id: string, partial: Partial<SpellEntry>) =>
    patch({
      spells: sheet.spells.map((spell) =>
        spell.id === id ? { ...spell, ...partial } : spell
      ),
    });

  const addSpell = () =>
    patch({
      spells: [
        ...sheet.spells,
        { id: genId(), name: "", level: 1, prepared: false, notes: "" },
      ],
    });

  const removeSpell = (id: string) =>
    patch({ spells: sheet.spells.filter((spell) => spell.id !== id) });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Caratteristica da incantatore">
          <Select
            value={sheet.spellcastingAbility || "none"}
            onValueChange={(value) =>
              patch({
                spellcastingAbility: value === "none" ? "" : (value as Ability),
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nessuna</SelectItem>
              {ABILITIES.map((ability) => (
                <SelectItem key={ability} value={ability}>
                  {ABILITY_LABELS[ability]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Focus arcano">
          <Input
            value={sheet.arcaneFocus}
            onChange={(event) => patch({ arcaneFocus: event.target.value })}
            placeholder="Bacchetta, totem…"
          />
        </Field>
      </div>

      <Field label="Trucchetti">
        <TagInput
          value={sheet.cantrips}
          onChange={(cantrips) => patch({ cantrips })}
          placeholder="Mano magica, luce…"
        />
      </Field>

      {/* Slot incantesimo */}
      <div className="border-t border-gold/15 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <Label>Slot incantesimo</Label>
          <Button type="button" size="sm" variant="outline" onClick={addSlot}>
            <Plus className="size-3.5" />
            Livello
          </Button>
        </div>
        {sheet.spellSlots.length === 0 ? (
          <EmptyHint text="Nessuno slot." />
        ) : (
          <ul className="space-y-2">
            {[...sheet.spellSlots]
              .sort((a, b) => a.level - b.level)
              .map((slot) => (
                <li
                  key={slot.level}
                  className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 rounded-lg border border-gold/15 bg-night/30 p-2.5"
                >
                  <span className="pb-2 text-sm font-semibold">
                    Liv. {slot.level}
                  </span>
                  <Field label="Totali">
                    <NumberInput
                      value={slot.total}
                      onChange={(total) => updateSlot(slot.level, { total })}
                    />
                  </Field>
                  <Field label="Usati">
                    <NumberInput
                      value={slot.used}
                      onChange={(used) => updateSlot(slot.level, { used })}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    aria-label="Rimuovi slot"
                    onClick={() => removeSlot(slot.level)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Incantesimi conosciuti / preparati */}
      <div className="border-t border-gold/15 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <Label>Incantesimi</Label>
          <Button type="button" size="sm" variant="outline" onClick={addSpell}>
            <Plus className="size-3.5" />
            Incantesimo
          </Button>
        </div>
        {sheet.spells.length === 0 ? (
          <EmptyHint text="Nessun incantesimo conosciuto." />
        ) : (
          <ul className="space-y-2">
            {sheet.spells.map((spell) => (
              <li
                key={spell.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-end gap-2 rounded-lg border border-gold/15 bg-night/30 p-3"
              >
                <Field label="Nome">
                  <Input
                    value={spell.name}
                    onChange={(event) =>
                      updateSpell(spell.id, { name: event.target.value })
                    }
                  />
                </Field>
                <Field label="Liv.">
                  <NumberInput
                    value={spell.level}
                    onChange={(level) => updateSpell(spell.id, { level })}
                    className="w-14"
                  />
                </Field>
                <label className="flex flex-col items-center gap-1 pb-1.5 text-[10px] text-muted-foreground">
                  Prep.
                  <Switch
                    checked={spell.prepared}
                    onCheckedChange={(prepared) =>
                      updateSpell(spell.id, { prepared })
                    }
                  />
                </label>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  aria-label="Rimuovi incantesimo"
                  onClick={() => removeSpell(spell.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ----------------------- Famigli / Compagni ----------------------- */

export function CompanionsSection({
  sheet,
  patch,
}: {
  sheet: CharacterSheet;
  patch: Patch;
}) {
  const companions = sheet.companions ?? [];

  const update = (id: string, partial: Partial<Companion>) =>
    patch({
      companions: companions.map((c) =>
        c.id === id ? { ...c, ...partial } : c
      ),
    });
  const add = () =>
    patch({
      companions: [
        ...companions,
        {
          id: genId(),
          name: "",
          kind: "",
          size: "",
          alignment: "",
          abilities: Object.fromEntries(
            ABILITIES.map((a) => [a, 10])
          ) as Record<Ability, number>,
          armorClass: "",
          hitPoints: "",
          speed: "",
          senses: "",
          languages: "",
          traits: [],
          attacks: [],
          description: "",
          imageUrl: "",
          featured: false,
        },
      ],
    });
  const remove = (id: string) =>
    patch({ companions: companions.filter((c) => c.id !== id) });

  // Compagno in evidenza: uno solo accanto alla card del Party.
  const setFeatured = (cid: string, on: boolean) =>
    patch({
      companions: companions.map((c) => ({
        ...c,
        featured: c.id === cid ? on : on ? false : c.featured,
      })),
    });
  const setAbility = (cid: string, ability: Ability, value: number) => {
    const c = companions.find((x) => x.id === cid);
    if (!c) return;
    update(cid, {
      abilities: {
        ...(c.abilities ?? ({} as Record<Ability, number>)),
        [ability]: Math.max(1, Math.min(30, value)),
      } as Record<Ability, number>,
    });
  };

  const addTrait = (cid: string) => {
    const c = companions.find((x) => x.id === cid);
    if (!c) return;
    update(cid, {
      traits: [...(c.traits ?? []), { id: genId(), name: "", detail: "" }],
    });
  };
  const updateTrait = (
    cid: string,
    tid: string,
    partial: Partial<{ name: string; detail: string }>
  ) => {
    const c = companions.find((x) => x.id === cid);
    if (!c) return;
    update(cid, {
      traits: (c.traits ?? []).map((t) =>
        t.id === tid ? { ...t, ...partial } : t
      ),
    });
  };
  const removeTrait = (cid: string, tid: string) => {
    const c = companions.find((x) => x.id === cid);
    if (!c) return;
    update(cid, { traits: (c.traits ?? []).filter((t) => t.id !== tid) });
  };

  const addAttack = (cid: string) => {
    const c = companions.find((x) => x.id === cid);
    if (!c) return;
    update(cid, {
      attacks: [...(c.attacks ?? []), { id: genId(), name: "", detail: "" }],
    });
  };
  const updateAttack = (
    cid: string,
    aid: string,
    partial: Partial<{ name: string; detail: string }>
  ) => {
    const c = companions.find((x) => x.id === cid);
    if (!c) return;
    update(cid, {
      attacks: (c.attacks ?? []).map((a) =>
        a.id === aid ? { ...a, ...partial } : a
      ),
    });
  };
  const removeAttack = (cid: string, aid: string) => {
    const c = companions.find((x) => x.id === cid);
    if (!c) return;
    update(cid, { attacks: (c.attacks ?? []).filter((a) => a.id !== aid) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Famigli e compagni che porti con te.
        </span>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="size-3.5" />
          Famiglio
        </Button>
      </div>

      {companions.length === 0 ? (
        <EmptyHint text="Nessun famiglio. Aggiungine uno con le sue caratteristiche e i suoi attacchi." />
      ) : (
        <ul className="space-y-4">
          {companions.map((companion) => (
            <li
              key={companion.id}
              className="space-y-3 rounded-lg border border-gold/15 bg-night/30 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <Field label="Nome">
                    <Input
                      value={companion.name}
                      onChange={(event) =>
                        update(companion.id, { name: event.target.value })
                      }
                      placeholder="Argo"
                    />
                  </Field>
                  <Field label="Tipo">
                    <Input
                      value={companion.kind}
                      onChange={(event) =>
                        update(companion.id, { kind: event.target.value })
                      }
                      placeholder="Lupo, pseudodrago…"
                    />
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  aria-label="Rimuovi famiglio"
                  onClick={() => remove(companion.id)}
                >
                  <Trash2 />
                </Button>
              </div>

              <label className="flex items-center justify-between gap-2 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2">
                <span className="flex items-center gap-2 text-sm">
                  <Star className="size-4 text-gold/70" />
                  Compagno in evidenza (accanto alla card del Party)
                </span>
                <Switch
                  checked={companion.featured ?? false}
                  onCheckedChange={(on) => setFeatured(companion.id, on)}
                />
              </label>

              <Field label="Immagine (opzionale)">
                <ImageUpload
                  value={companion.imageUrl}
                  onChange={(url) => update(companion.id, { imageUrl: url })}
                  folder="character"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Taglia">
                  <Input
                    value={companion.size ?? ""}
                    onChange={(event) =>
                      update(companion.id, { size: event.target.value })
                    }
                    placeholder="Grande"
                  />
                </Field>
                <Field label="Allineamento">
                  <Input
                    value={companion.alignment ?? ""}
                    onChange={(event) =>
                      update(companion.id, { alignment: event.target.value })
                    }
                    placeholder="Senza allineamento"
                  />
                </Field>
              </div>

              {/* Caratteristiche */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Caratteristiche
                </Label>
                <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {ABILITIES.map((ability) => {
                    const score = companion.abilities?.[ability] ?? 10;
                    return (
                      <div
                        key={ability}
                        className="rounded-lg border border-gold/15 bg-night/20 p-2 text-center"
                      >
                        <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
                          {ABILITY_SHORT[ability]}
                        </p>
                        <NumberInput
                          value={score}
                          onChange={(v) => setAbility(companion.id, ability, v)}
                          className="mt-1 h-8 text-center"
                        />
                        <p className="mt-0.5 text-[10px] font-semibold text-gold-bright">
                          {formatModifier(abilityModifier(score))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Field label="Classe Armatura">
                  <Input
                    value={companion.armorClass ?? ""}
                    onChange={(event) =>
                      update(companion.id, { armorClass: event.target.value })
                    }
                    placeholder="11 (armatura naturale)"
                  />
                </Field>
                <Field label="Punti Ferita">
                  <Input
                    value={companion.hitPoints ?? ""}
                    onChange={(event) =>
                      update(companion.id, { hitPoints: event.target.value })
                    }
                    placeholder="45 (6d10 + 12)"
                  />
                </Field>
                <Field label="Velocità">
                  <Input
                    value={companion.speed ?? ""}
                    onChange={(event) =>
                      update(companion.id, { speed: event.target.value })
                    }
                    placeholder="12 m"
                  />
                </Field>
                <Field label="Sensi">
                  <Input
                    value={companion.senses ?? ""}
                    onChange={(event) =>
                      update(companion.id, { senses: event.target.value })
                    }
                    placeholder="Percezione passiva 11"
                  />
                </Field>
                <Field label="Linguaggi">
                  <Input
                    value={companion.languages ?? ""}
                    onChange={(event) =>
                      update(companion.id, { languages: event.target.value })
                    }
                    placeholder="–"
                  />
                </Field>
              </div>

              {/* Tratti */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Tratti</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addTrait(companion.id)}
                  >
                    <Plus className="size-3.5" />
                    Tratto
                  </Button>
                </div>
                {(companion.traits ?? []).length === 0 ? (
                  <EmptyHint text="Nessun tratto speciale." />
                ) : (
                  <ul className="space-y-2">
                    {(companion.traits ?? []).map((trait) => (
                      <li
                        key={trait.id}
                        className="space-y-1.5 rounded-lg border border-gold/15 bg-night/20 p-2"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            value={trait.name}
                            onChange={(event) =>
                              updateTrait(companion.id, trait.id, {
                                name: event.target.value,
                              })
                            }
                            placeholder="Carica"
                            className="h-8"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            aria-label="Rimuovi tratto"
                            onClick={() => removeTrait(companion.id, trait.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                        <Textarea
                          value={trait.detail}
                          onChange={(event) =>
                            updateTrait(companion.id, trait.id, {
                              detail: event.target.value,
                            })
                          }
                          rows={2}
                          placeholder="Descrizione del tratto…"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Azioni / attacchi */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Azioni / attacchi
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addAttack(companion.id)}
                  >
                    <Plus className="size-3.5" />
                    Attacco
                  </Button>
                </div>
                {(companion.attacks ?? []).length === 0 ? (
                  <EmptyHint text="Nessun attacco." />
                ) : (
                  <ul className="space-y-2">
                    {(companion.attacks ?? []).map((attack) => (
                      <li
                        key={attack.id}
                        className="space-y-1.5 rounded-lg border border-gold/15 bg-night/20 p-2"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            value={attack.name}
                            onChange={(event) =>
                              updateAttack(companion.id, attack.id, {
                                name: event.target.value,
                              })
                            }
                            placeholder="Incornata"
                            className="h-8"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            aria-label="Rimuovi attacco"
                            onClick={() => removeAttack(companion.id, attack.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                        <Textarea
                          value={attack.detail}
                          onChange={(event) =>
                            updateAttack(companion.id, attack.id, {
                              detail: event.target.value,
                            })
                          }
                          rows={2}
                          placeholder="+7 a colpire, portata 1,5 m. 14 (2d8+5) danni contundenti."
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Field label="Note (opzionale)">
                <Textarea
                  value={companion.description ?? ""}
                  onChange={(event) =>
                    update(companion.id, { description: event.target.value })
                  }
                  rows={2}
                  placeholder="Note libere…"
                />
              </Field>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------- Helper UI ----------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  className,
  ...rest
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
} & Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
>) {
  return (
    <Input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) =>
        onChange(
          Number.isNaN(event.target.valueAsNumber)
            ? 0
            : event.target.valueAsNumber
        )
      }
      className={className}
      {...rest}
    />
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <NumberInput value={value} onChange={onChange} />
    </Field>
  );
}

function Toggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-gold/60 bg-gold/15 font-semibold text-gold-bright"
          : "border-gold/20 text-muted-foreground hover:border-gold/40"
      )}
    >
      {label}
    </button>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-gold/15 px-3 py-4 text-center text-sm text-muted-foreground italic">
      {text}
    </p>
  );
}

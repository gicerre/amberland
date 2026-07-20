import type { Ability, CharacterSheet, Entity } from "@/types/entities";

import { SKILLS, abilityModifier } from "../constants";

/* ============================================================
 * Codex del Personaggio — derivazioni pure.
 *
 * Tutti i valori "aggregati" mostrati dal Codex (modificatori,
 * percezione passiva, livello totale, slot residui…) nascono qui:
 * un'unica fonte di calcolo, mai duplicata nei componenti.
 * ============================================================ */

export function genId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Punteggio effettivo di caratteristica: base + bonus temporaneo. */
export function abilityTotal(sheet: CharacterSheet, ability: Ability): number {
  const data = sheet.abilities[ability];
  return (data?.score ?? 10) + (data?.tempBonus ?? 0);
}

export function abilityMod(sheet: CharacterSheet, ability: Ability): number {
  return abilityModifier(abilityTotal(sheet, ability));
}

/** Modificatore skill: caratteristica + competenza (+ expertise). */
export function skillMod(sheet: CharacterSheet, key: string): number {
  const def = SKILLS[key];
  if (!def) return 0;
  let mod = abilityMod(sheet, def.ability);
  if (sheet.skills.includes(key)) mod += sheet.proficiencyBonus;
  if (sheet.expertise.includes(key)) mod += sheet.proficiencyBonus;
  return mod;
}

/** Modificatore del tiro salvezza (con competenza se presente). */
export function saveMod(sheet: CharacterSheet, ability: Ability): number {
  return (
    abilityMod(sheet, ability) +
    (sheet.savingThrows.includes(ability) ? sheet.proficiencyBonus : 0)
  );
}

/** Percezione passiva 5e: 10 + mod Percezione (competenza inclusa). */
export function passivePerception(sheet: CharacterSheet): number {
  return 10 + skillMod(sheet, "perception");
}

/** Livello totale dalla multiclasse, con fallback sui fields. */
export function totalLevel(
  sheet: CharacterSheet | undefined,
  fallback: number
): number {
  if (!sheet || sheet.classes.length === 0) return fallback;
  return sheet.classes.reduce((sum, entry) => sum + (entry.level || 0), 0);
}

/** Riepilogo classi: "Guerriero 5 · Mago 3". */
export function classesSummary(sheet: CharacterSheet): string {
  return sheet.classes
    .map((entry) => `${entry.className || "Classe"} ${entry.level}`)
    .join(" · ");
}

/** Arma principale: prima equipaggiata, altrimenti prima in lista. */
export function primaryWeapon(sheet: CharacterSheet) {
  return (
    sheet.equipment.find(
      (item) => item.category === "weapon" && item.equipped
    ) ?? sheet.equipment.find((item) => item.category === "weapon")
  );
}

/** Slot incantesimo residui totali (per il riepilogo risorse). */
export function remainingSlots(sheet: CharacterSheet): {
  remaining: number;
  total: number;
} {
  return sheet.spellSlots.reduce(
    (acc, slot) => ({
      remaining: acc.remaining + Math.max(slot.total - slot.used, 0),
      total: acc.total + slot.total,
    }),
    { remaining: 0, total: 0 }
  );
}

/** Ricchezza espressa in monete d'oro (pp=10, ep=0.5, sp=0.1, cp=0.01). */
export function goldValue(sheet: CharacterSheet): number {
  const { pp, gp, ep, sp, cp } = sheet.money;
  return pp * 10 + gp + ep * 0.5 + sp * 0.1 + cp * 0.01;
}

/** Normalizzazione nome per il match con le entità del Codex mondo. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Trova l'entità (oggetto, creatura…) con lo stesso nome, se esiste. */
export function matchEntityByName(
  entities: Entity[] | undefined,
  name: string
): Entity | undefined {
  if (!entities || !name.trim()) return undefined;
  const target = normalizeName(name);
  return entities.find((entity) => normalizeName(entity.name) === target);
}

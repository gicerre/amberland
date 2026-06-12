import type {
  Ability,
  CharacterHistoryType,
  CharacterKind,
  CharacterStatus,
  EquipmentCategory,
} from "@/types/entities";

/* ============================================================
 * Costanti condivise del Sistema Unificato dei Personaggi.
 * Etichette IT, badge, regole D&D 5e (caratteristiche, skill,
 * classi) e piccoli helper di calcolo.
 * ============================================================ */

export const CHARACTER_KIND_LABELS: Record<CharacterKind, string> = {
  PC: "Personaggio Giocante",
  NPC: "PNG",
};

/** Etichetta breve per badge/colonne strette. */
export const CHARACTER_KIND_SHORT: Record<CharacterKind, string> = {
  PC: "PC",
  NPC: "NPC",
};

export const CHARACTER_KIND_BADGES: Record<CharacterKind, string> = {
  PC: "border-gold/50 bg-gold/15 text-gold-bright",
  NPC: "border-parchment/40 bg-parchment/10 text-parchment",
};

/** Tipo di scheda NPC. */
export const NPC_TYPE_LABELS = {
  SIMPLE: "Scheda semplice",
  COMPLETE: "Scheda completa",
} as const;

export const CHARACTER_STATUS_LABELS: Record<CharacterStatus, string> = {
  ALIVE: "Vivo",
  DEAD: "Morto",
  MISSING: "Disperso",
  UNKNOWN: "Sconosciuto",
  RETIRED: "Ritirato",
};

export const CHARACTER_STATUS_BADGES: Record<CharacterStatus, string> = {
  ALIVE: "border-emerald-600/50 bg-emerald-900/25 text-emerald-300",
  DEAD: "border-red-500/50 bg-red-500/10 text-red-300",
  MISSING: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  UNKNOWN: "border-zinc-500/50 bg-zinc-500/10 text-zinc-300",
  RETIRED: "border-sky-500/50 bg-sky-500/10 text-sky-300",
};

export const CHARACTER_STATUS_OPTIONS = (
  Object.keys(CHARACTER_STATUS_LABELS) as CharacterStatus[]
).map((value) => ({ value, label: CHARACTER_STATUS_LABELS[value] }));

/** Caratteristica: chiave → etichetta IT (lunga e breve). */
export const ABILITY_LABELS: Record<Ability, string> = {
  str: "Forza",
  dex: "Destrezza",
  con: "Costituzione",
  int: "Intelligenza",
  wis: "Saggezza",
  cha: "Carisma",
};

export const ABILITY_SHORT: Record<Ability, string> = {
  str: "FOR",
  dex: "DES",
  con: "COS",
  int: "INT",
  wis: "SAG",
  cha: "CAR",
};

/** Skill 5e: chiave → { etichetta IT, caratteristica associata }. */
export const SKILLS: Record<string, { label: string; ability: Ability }> = {
  acrobatics: { label: "Acrobazia", ability: "dex" },
  animalHandling: { label: "Addestrare Animali", ability: "wis" },
  arcana: { label: "Arcano", ability: "int" },
  athletics: { label: "Atletica", ability: "str" },
  deception: { label: "Inganno", ability: "cha" },
  history: { label: "Storia", ability: "int" },
  insight: { label: "Intuizione", ability: "wis" },
  intimidation: { label: "Intimidire", ability: "cha" },
  investigation: { label: "Indagare", ability: "int" },
  medicine: { label: "Medicina", ability: "wis" },
  nature: { label: "Natura", ability: "int" },
  perception: { label: "Percezione", ability: "wis" },
  performance: { label: "Intrattenere", ability: "cha" },
  persuasion: { label: "Persuasione", ability: "cha" },
  religion: { label: "Religione", ability: "int" },
  sleightOfHand: { label: "Rapidità di Mano", ability: "dex" },
  stealth: { label: "Furtività", ability: "dex" },
  survival: { label: "Sopravvivenza", ability: "wis" },
};

/** Chiavi delle skill in ordine alfabetico per etichetta IT. */
export const SKILL_KEYS = Object.keys(SKILLS).sort((a, b) =>
  SKILLS[a].label.localeCompare(SKILLS[b].label, "it")
);

/** Allineamenti D&D (etichette IT). */
export const ALIGNMENT_OPTIONS = [
  "Legale Buono",
  "Neutrale Buono",
  "Caotico Buono",
  "Legale Neutrale",
  "Neutrale Puro",
  "Caotico Neutrale",
  "Legale Malvagio",
  "Neutrale Malvagio",
  "Caotico Malvagio",
].map((value) => ({ value, label: value }));

/** Classi base D&D 5e (suggerimenti). */
export const DND_CLASSES = [
  "Barbaro",
  "Bardo",
  "Chierico",
  "Druido",
  "Guerriero",
  "Ladro",
  "Mago",
  "Monaco",
  "Paladino",
  "Ranger",
  "Stregone",
  "Warlock",
  "Artificiere",
];

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  weapon: "Arma",
  armor: "Armatura",
  shield: "Scudo",
  magic: "Oggetto magico",
  consumable: "Consumabile",
  misc: "Inventario",
};

export const HISTORY_TYPE_LABELS: Record<CharacterHistoryType, string> = {
  LEVEL_UP: "Passaggio di livello",
  EQUIPMENT: "Equipaggiamento",
  FACTION: "Cambio fazione",
  DEATH: "Morte",
  RESURRECTION: "Resurrezione",
  CLASS_CHANGE: "Cambio classe",
  ABILITY: "Nuova capacità",
  STATUS: "Cambio di stato",
  NOTE: "Nota",
};

/* ---------------------- Helper di calcolo ---------------------- */

/** Modificatore D&D di un punteggio di caratteristica: floor((score-10)/2). */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Formatta un modificatore con segno esplicito (+3, -1, +0). */
export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

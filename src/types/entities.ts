import type { Timestamp } from "firebase/firestore";

import type { ChronicleData } from "./chronicles";

/* ============================================================
 * Sistema Universale delle Entità — campagna Amberland
 *
 * Tutti gli elementi dell'ambientazione (mondi, regioni, città,
 * luoghi, personaggi, fazioni, quest, oggetti, creature, eventi,
 * sessioni) vivono in un'unica collection `entities`, collegati
 * tra loro tramite la collection `relations`.
 * ============================================================ */

export const ENTITY_TYPES = [
  "world",
  "region",
  "city",
  "location",
  "character",
  "faction",
  "quest",
  "item",
  "creature",
  "event",
  "chronicle",
  "session",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

/** Livelli geografici, in ordine gerarchico (parent → child). */
export const GEO_TYPES: EntityType[] = ["world", "region", "city", "location"];

/**
 * Sistema di visibilità a 4 livelli:
 *  - PUBLIC:      visibile a tutti gli utenti autenticati
 *  - PARTY_ONLY:  visibile ai membri del party (in questa campagna ≈ tutti
 *                 gli autenticati); distinto da PUBLIC per usi futuri
 *  - MASTER_ONLY: visibile solo a Master e Admin (con `unlockAfterId`
 *                 valorizzato funge da "bloccata, da rivelare dopo una quest")
 *  - OWNER_ONLY:  visibile solo al proprietario (ownerId) e al Master
 */
export const VISIBILITIES = [
  "PUBLIC",
  "PARTY_ONLY",
  "MASTER_ONLY",
  "OWNER_ONLY",
] as const;
export type Visibility = (typeof VISIBILITIES)[number];

/** Livelli leggibili da un giocatore (non-master) senza proprietà. */
export const PLAYER_VISIBLE: Visibility[] = ["PUBLIC", "PARTY_ONLY"];

/**
 * Contenuto testuale ricco: stringa (legacy) o documento strutturato
 * (Tiptap JSON, serializzato come map). Renderizzato con RichTextRenderer.
 */
export type RichText = string | Record<string, unknown>;

/** Valori ammessi nei campi dinamici specifici per tipo. */
export type FieldValue = string | number | boolean | Record<string, unknown>;

/* ============================================================
 * Sistema Unificato dei Personaggi (PC & NPC)
 *
 * Un personaggio è un'entità `type: "character"`. La distinzione
 * PC/NPC, lo stato e un sottoinsieme "leggero" (razza, classe,
 * livello…) vivono in `fields` per alimentare card/liste/filtri;
 * la scheda D&D completa vive nel campo tipizzato `sheet`, mentre
 * la progressione è in `history`.
 * ============================================================ */

export const CHARACTER_KINDS = ["PC", "NPC"] as const;
export type CharacterKind = (typeof CHARACTER_KINDS)[number];

export const CHARACTER_STATUSES = [
  "ALIVE",
  "DEAD",
  "MISSING",
  "UNKNOWN",
  "RETIRED",
] as const;
export type CharacterStatus = (typeof CHARACTER_STATUSES)[number];

/** Le sei caratteristiche, in ordine canonico. */
export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type Ability = (typeof ABILITIES)[number];

export interface AbilityScore {
  score: number;
  /** Bonus temporaneo (buff/malus): si somma al punteggio per il modificatore. */
  tempBonus: number;
}

/** Una classe del personaggio (supporto multiclasse). */
export interface ClassEntry {
  id: string;
  className: string;
  subclass: string;
  level: number;
}

export const EQUIPMENT_CATEGORIES = [
  "weapon",
  "armor",
  "shield",
  "magic",
  "consumable",
  "misc",
] as const;
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export interface EquipmentItem {
  id: string;
  name: string;
  category: EquipmentCategory;
  quantity: number;
  equipped: boolean;
  notes: string;
}

/** Azione/attacco di un famiglio/compagno. */
export interface CompanionAttack {
  id: string;
  name: string;
  detail: string;
}

/** Tratto speciale di un famiglio (es. "Carica"). */
export interface CompanionTrait {
  id: string;
  name: string;
  detail: string;
}

/**
 * Famiglio/compagno che il PG porta con sé: vero stat block in stile mostro
 * (taglia, tipo, allineamento, caratteristiche, CA/PF, sensi, tratti, azioni).
 */
export interface Companion {
  id: string;
  name: string;
  /** Tipo (es. "Bestia"). */
  kind: string;
  /** Taglia (es. "Grande"). */
  size: string;
  alignment: string;
  /** Punteggi delle sei caratteristiche (il modificatore è calcolato). */
  abilities: Record<Ability, number>;
  /** Classe Armatura (testo libero, es. "11 (armatura naturale)"). */
  armorClass: string;
  /** Punti Ferita (testo libero, es. "45 (6d10 + 12)"). */
  hitPoints: string;
  speed: string;
  senses: string;
  languages: string;
  /** Tratti speciali (es. Carica). */
  traits: CompanionTrait[];
  /** Azioni/attacchi. */
  attacks: CompanionAttack[];
  /** Note libere aggiuntive. */
  description: string;
  imageUrl: string;
  /** Se true, è il compagno mostrato accanto alla card del Party (uno solo). */
  featured: boolean;
}

/** Denaro (platino/oro/electrum/argento/rame). */
export interface Money {
  pp: number;
  gp: number;
  ep: number;
  sp: number;
  cp: number;
}

export interface SpellSlot {
  level: number;
  total: number;
  used: number;
}

/* ── Stato vivo del personaggio: condizioni, effetti e risorse ── */

export const CONDITION_KINDS = ["BUFF", "DEBUFF", "CONDITION"] as const;
export type ConditionKind = (typeof CONDITION_KINDS)[number];

/** Effetto temporaneo o condizione attiva (benedizione, veleno, prono…). */
export interface ConditionEntry {
  id: string;
  name: string;
  kind: ConditionKind;
  /** Effetto meccanico/descrizione ("+1d4 ai tiri per colpire"). */
  detail: string;
  /** Origine (incantesimo, oggetto, mostro…). */
  source: string;
  /** Durata in testo libero ("3 turni", "fino a lungo riposo"). */
  duration: string;
}

export const RESOURCE_RECHARGES = [
  "SHORT_REST",
  "LONG_REST",
  "DAILY",
  "MANUAL",
] as const;
export type ResourceRecharge = (typeof RESOURCE_RECHARGES)[number];

/** Risorsa di classe/oggetto con carica (Ira, Ki, Punizione Divina…). */
export interface ResourceEntry {
  id: string;
  name: string;
  current: number;
  max: number;
  recharge: ResourceRecharge;
}

export interface SpellEntry {
  id: string;
  name: string;
  level: number;
  prepared: boolean;
  notes: string;
}

/** Scheda D&D completa — valorizzata per PC e NPC «completi». */
export interface CharacterSheet {
  // Identità estesa
  subrace: string;
  background: string;
  deity: string;
  age: string;
  height: string;
  weight: string;
  gender: string;
  languages: string[];
  // Narrativa
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  backstory: string;
  // Caratteristiche
  abilities: Record<Ability, AbilityScore>;
  // Combattimento
  armorClass: number;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  initiative: number;
  speed: string;
  // Stato vivo (Codex): progressione e ciò che è attivo ORA
  xp: number;
  inspiration: boolean;
  /** Livelli di indebolimento 5e (0–6). */
  exhaustion: number;
  conditions: ConditionEntry[];
  resources: ResourceEntry[];
  // Competenze
  proficiencyBonus: number;
  /** Caratteristiche con competenza nei tiri salvezza. */
  savingThrows: Ability[];
  /** Skill con competenza (chiavi da SKILLS). */
  skills: string[];
  /** Skill con expertise (competenza doppia). */
  expertise: string[];
  toolProficiencies: string;
  armorProficiencies: string;
  weaponProficiencies: string;
  // Multiclasse
  classes: ClassEntry[];
  // Famigli/compagni
  companions: Companion[];
  // Equipaggiamento
  equipment: EquipmentItem[];
  money: Money;
  // Magia
  spellcastingAbility: Ability | "";
  spellSlots: SpellSlot[];
  spells: SpellEntry[];
  cantrips: string[];
  arcaneFocus: string;
  // Aspetto
  tokenUrl: string;
  altPortraits: string[];
}

export const CHARACTER_HISTORY_TYPES = [
  "LEVEL_UP",
  "EQUIPMENT",
  "FACTION",
  "DEATH",
  "RESURRECTION",
  "CLASS_CHANGE",
  "ABILITY",
  "STATUS",
  "NOTE",
] as const;
export type CharacterHistoryType = (typeof CHARACTER_HISTORY_TYPES)[number];

/** Voce della timeline di progressione del personaggio. */
export interface CharacterHistoryEntry {
  id: string;
  /** Data in formato ISO (i serverTimestamp non sono ammessi negli array). */
  date: string;
  type: CharacterHistoryType;
  title: string;
  detail: string;
}

/** Documento `entities/{id}`. */
export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  description: RichText;
  imageUrl: string;
  /** Galleria immagini aggiuntive (URL). */
  gallery: string[];
  tags: string[];
  visibility: Visibility;
  /** Id di una quest/sessione dopo la quale l'entità andrebbe rivelata. */
  unlockAfterId: string | null;
  /** Solo per i tipi geografici: id dell'entità genitore. */
  parentId: string | null;
  /** Campi specifici del tipo (vedi registry): razza, CR, stato quest… */
  fields: Record<string, FieldValue>;
  /** Solo PC: uid del giocatore proprietario (può gestire la propria scheda). */
  ownerId?: string | null;
  /** Solo personaggi: scheda D&D completa (PC e NPC «completi»). */
  sheet?: CharacterSheet;
  /** Solo personaggi: timeline di progressione. */
  history?: CharacterHistoryEntry[];
  /** Solo cronache: dati del Libro delle Cronache (vedi types/chronicles). */
  chronicle?: ChronicleData;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/**
 * Documento `entities/{id}/private/master` — contenuti riservati:
 * leggibile e scrivibile SOLO da Master/Admin (Security Rules).
 * Per gli NPC ospita anche la scheda riservata (vedi reservedSheet).
 */
export interface EntityPrivate {
  masterNotes: RichText;
  secrets: RichText;
  /** NPC: scheda D&D riservata (statistiche, equip…), mai vista dai player. */
  reservedSheet?: CharacterSheet;
  /** NPC: razza nascosta (mostrata ai player solo se showRace). */
  reservedRace?: string;
  /** NPC: classe nascosta (mostrata ai player solo se showClass). */
  reservedClass?: string;
}

/**
 * Documento `entities/{id}/public/card` — proiezione PUBBLICA di un PC
 * (la cui scheda principale è OWNER_ONLY). Leggibile da tutti gli
 * autenticati: ciò che gli altri giocatori possono vedere di un PC.
 */
export interface EntityPublicCard {
  name: string;
  imageUrl: string;
  tokenUrl: string;
  kind: CharacterKind;
  partyMember: boolean;
  status: CharacterStatus;
  isDead: boolean;
  race: string;
  /** Es. "Guerriero 5 · Mago 3" (multiclasse). */
  classesSummary: string;
  level: number;
  /** Sottoclassi separate da virgola. */
  subclasses: string;
  /** Nomi dell'equipaggiamento pubblico (oggetti equipaggiati). */
  publicEquipment: string[];
  ownerName: string;
  /** Compagno in evidenza, mostrato accanto alla card del Party. */
  companion?: { name: string; imageUrl: string };
}

/**
 * Documento `relations/{id}` — collegamento bidirezionale tra due
 * entità, con etichetta libera ("si trova a", "membro di", …).
 * I nomi sono denormalizzati per il rendering; vengono risincronizzati
 * quando un'entità viene rinominata.
 */
export interface Relation {
  id: string;
  aId: string;
  aType: EntityType;
  aName: string;
  bId: string;
  bType: EntityType;
  bName: string;
  label: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

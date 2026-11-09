import type { Timestamp } from "firebase/firestore";

import type { EquipmentCategory, Money } from "./entities";

/* ============================================================
 * Oggetti del party — modello unico di possesso e collocazione.
 *
 * Ogni oggetto posseduto è UN documento di `party_items` che dice
 * dove si trova: nella Borsa Conservante o nello zaino di un PG.
 * Borsa, zaini e vista globale sono filtri sulla stessa collection:
 * il totale del party è sempre la somma, per costruzione.
 *
 * Il denaro segue lo stesso principio in `purses` (una borsa di
 * monete per collocazione: id "BAG" = tesoro del party, altrimenti
 * l'id del PG). Ogni movimento è registrato in `item_log`.
 * Vedi docs/PROPOSTA_INVENTARIO.md.
 * ============================================================ */

/** Rarità (dal catalogo oggetti). */
export const ITEM_RARITIES = [
  "COMMON",
  "RARE",
  "MAGIC",
  "LEGENDARY",
  "ARTIFACT",
  "STORY",
] as const;
export type ItemRarity = (typeof ITEM_RARITIES)[number];

export type ItemLocation = "BAG" | "PC";

/** Destinazione di un'operazione: la Borsa o lo zaino di un PG. */
export type ItemPlace =
  | { location: "BAG" }
  | { location: "PC"; characterId: string };

export const BAG_PLACE: ItemPlace = { location: "BAG" };

export interface ItemCharges {
  current: number;
  max: number;
}

/** Documento `party_items/{id}`. */
export interface PartyItem {
  id: string;
  /** Modello nel catalogo (`entities` type item); null = oggetto libero. */
  catalogId: string | null;
  name: string;
  type: EquipmentCategory;
  rarity: ItemRarity | null;
  imageUrl: string;
  /** ≥ 1. Gli oggetti unici hanno sempre 1. */
  quantity: number;
  /** Pile (pozioni, frecce) sì; oggetti con identità propria no. */
  stackable: boolean;
  location: ItemLocation;
  /** Valorizzato solo se location = "PC". */
  characterId: string | null;
  equipped: boolean;
  attuned: boolean;
  notes: string;
  charges: ItemCharges | null;
  updatedBy: string;
  updatedByName: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Documento `purses/{id}` — id "BAG" (tesoro) oppure id del PG. */
export interface Purse extends Money {
  id: string;
  location: ItemLocation;
  characterId: string | null;
  updatedBy: string;
  updatedByName: string;
  updatedAt: Timestamp | null;
}

export const ITEM_LOG_ACTIONS = [
  "ACQUIRE",
  "TRANSFER",
  "CONSUME",
  "REMOVE",
  "UPDATE",
  "MONEY_IN",
  "MONEY_OUT",
  "MONEY_TRANSFER",
] as const;
export type ItemLogAction = (typeof ITEM_LOG_ACTIONS)[number];

/** Documento `item_log/{id}` — cronologia append-only dei movimenti. */
export interface ItemLogEntry {
  id: string;
  action: ItemLogAction;
  /** Oggetto coinvolto (vuoto per i movimenti di denaro). */
  itemName: string;
  quantity: number;
  /** Denaro coinvolto (solo movimenti di denaro). */
  coins: Money | null;
  /** Etichette leggibili: "Borsa", "Syl"… */
  fromLabel: string;
  toLabel: string;
  reason: string;
  byId: string;
  byName: string;
  createdAt: Timestamp | null;
}

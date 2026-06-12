import type { Timestamp } from "firebase/firestore";

import type { EntityType, RichText } from "./entities";

/* ============================================================
 * Modelli dell'Area Personale "ricca": inventario personale,
 * obiettivi strutturati e preferiti. Il diario personale riusa il
 * sistema Note (note OWNER_ONLY dell'autore) — vedi src/types/notes.ts.
 * ============================================================ */

/* ----------------------------- Inventario ----------------------------- */

/**
 * Voce dell'inventario personale (`inventory_items`): possesso di un
 * oggetto del catalogo (`entities` type=item, `conservabile`) da parte di
 * un singolo giocatore. Un oggetto sta nell'inventario personale OPPURE
 * nella Borsa Conservante, mai in entrambi.
 */
export interface InventoryItem {
  id: string;
  ownerId: string;
  ownerName: string;
  itemId: string;
  itemName: string;
  itemImage: string;
  itemCategory: string;
  quantity: number;
  notes: string;
  /** Oggetto attualmente equipaggiato dal personaggio. */
  equipped: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/* ------------------------------ Obiettivi ------------------------------ */

export const GOAL_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "FAILED",
  "ABANDONED",
] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type GoalPriority = (typeof GOAL_PRIORITIES)[number];

/** Collegamento denormalizzato di un obiettivo a un'entità. */
export interface GoalLink {
  entityId: string;
  entityType: EntityType;
  entityName: string;
}

/** Documento `goals/{id}` — obiettivo personale del giocatore. */
export interface Goal {
  id: string;
  ownerId: string;
  title: string;
  description: RichText;
  gallery: string[];
  tags: string[];
  priority: GoalPriority;
  status: GoalStatus;
  links: GoalLink[];
  /** Valorizzato quando lo stato passa a DONE. */
  completedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/* ------------------------------ Preferiti ------------------------------ */

export const FAVORITE_KINDS = ["item", "note", "goal", "character"] as const;
export type FavoriteKind = (typeof FAVORITE_KINDS)[number];

/** Voce salvata nei preferiti dell'utente (in `personal_areas/{uid}`). */
export interface Favorite {
  kind: FavoriteKind;
  /** Id della risorsa (itemId del catalogo, noteId, goalId, entityId del PC). */
  id: string;
  /** Etichetta denormalizzata per la visualizzazione. */
  label: string;
}

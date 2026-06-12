import type { Role } from "@/types/models";

/** Nomi delle collection Firestore — unico punto di verità. */
export const COLLECTIONS = {
  users: "users",
  /** Sistema universale delle entità (mondi, PNG, quest, oggetti…). */
  entities: "entities",
  /** Collegamenti bidirezionali tra entità. */
  relations: "relations",
  personalAreas: "personal_areas",
  /** Inventario personale: oggetti che il singolo PC porta con sé. */
  inventoryItems: "inventory_items",
  /** Obiettivi personali del giocatore. */
  goals: "goals",
  /** Configurazioni globali (es. identità del Party). */
  settings: "settings",
  /** Borsa Conservante: deposito condiviso del party. */
  bagItems: "bag_items",
  /** Cronologia movimenti della Borsa Conservante. */
  bagLog: "bag_log",
  /** Diario di Campagna: note condivise. */
  notes: "notes",
  /** Collegamenti bidirezionali nota ↔ entità. */
  noteLinks: "note_links",
  /** Cronologia operazioni sulle note. */
  noteLog: "note_log",
} as const;

/**
 * Dominio fittizio per mappare username → email Firebase Auth
 * (Firebase non supporta il login con username nativo).
 */
export const AUTH_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN ?? "amberland.app";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Custode del Regno",
  MASTER: "Dungeon Master",
  PLAYER: "Giocatore",
  VISITOR: "Visitatore",
};

export const ROLE_BADGE_CLASSES: Record<Role, string> = {
  ADMIN: "border-crimson-bright/50 bg-crimson/20 text-red-300",
  MASTER: "border-gold/50 bg-gold/15 text-gold-bright",
  PLAYER: "border-sky-700/60 bg-night/80 text-sky-300",
  VISITOR: "border-zinc-500/50 bg-zinc-500/10 text-zinc-300",
};

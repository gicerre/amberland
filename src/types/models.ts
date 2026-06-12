import type { Timestamp } from "firebase/firestore";

/* ============================================================
 * Modelli account e area personale.
 * I contenuti dell'ambientazione (mondi, PNG, quest, oggetti…)
 * vivono nel Sistema Universale delle Entità: vedi
 * src/types/entities.ts e src/features/entities/.
 * ============================================================ */

// ---------- Ruoli e utenti ----------

export const ROLES = ["ADMIN", "MASTER", "PLAYER", "VISITOR"] as const;
export type Role = (typeof ROLES)[number];

/** Documento `users/{uid}` — il profilo applicativo di un account Firebase Auth. */
export interface UserProfile {
  id: string;
  username: string;
  role: Role;
  disabled: boolean;
  mustChangePassword: boolean;
  createdAt: Timestamp | null;
  lastLogin: Timestamp | null;
}

/** Rappresentazione JSON-safe di un utente restituita dalle API admin. */
export interface AdminUserDto {
  id: string;
  username: string;
  role: Role;
  disabled: boolean;
  mustChangePassword: boolean;
  /** millisecondi epoch, null se mai valorizzato */
  createdAt: number | null;
  lastLogin: number | null;
}

// ---------- Area personale ----------

export interface InventoryEntry {
  id: string;
  name: string;
  quantity: number;
  notes: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  /** data in formato ISO (i serverTimestamp non sono ammessi dentro gli array) */
  date: string;
}

export interface Goal {
  id: string;
  text: string;
  completed: boolean;
}

/**
 * Documento `personal_areas/{userId}` — id documento = uid del proprietario.
 * Visibile e modificabile esclusivamente dal proprietario (Security Rules).
 */
export interface PersonalArea {
  id: string;
  userId: string;
  notes: string;
  inventory: InventoryEntry[];
  journal: JournalEntry[];
  goals: Goal[];
  updatedAt: Timestamp | null;
}

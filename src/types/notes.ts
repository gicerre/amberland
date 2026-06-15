import type { JSONContent } from "@tiptap/react";
import type { Timestamp } from "firebase/firestore";

import type { EntityType, Visibility } from "./entities";

/* ============================================================
 * Diario di Campagna — note condivise collegabili a qualunque entità.
 * Una nota è unica: compare nel Diario e su tutte le entità collegate
 * (collegamento bidirezionale via `note_links`).
 * ============================================================ */

/** Contenuto rich (Tiptap JSON) o stringa legacy. */
export type NoteContent = JSONContent | string;

export interface Note {
  id: string;
  title: string;
  content: NoteContent;
  /** Testo semplice denormalizzato per la ricerca full-text. */
  contentText: string;
  visibility: Visibility;
  authorId: string;
  authorName: string;
  lastEditedBy: string;
  lastEditedByName: string;
  /**
   * Se valorizzato, la nota è un evento automatico legato al cambio di stato
   * di una quest (es. "ACTIVE"): il Diario la mostra con colore e icona dedicati.
   */
  questStatus?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Documento `note_links/{id}` — collegamento nota ↔ entità. */
export interface NoteLink {
  id: string;
  noteId: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export const NOTE_LOG_ACTIONS = [
  "CREATE",
  "EDIT",
  "LINK",
  "UNLINK",
  "VISIBILITY",
  "DELETE",
] as const;
export type NoteLogAction = (typeof NOTE_LOG_ACTIONS)[number];

/** Documento `note_log/{id}` — cronologia operazioni sulle note. */
export interface NoteLogEntry {
  id: string;
  noteId: string;
  action: NoteLogAction;
  detail: string;
  byId: string;
  byName: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

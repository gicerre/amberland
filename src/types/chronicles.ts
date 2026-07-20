import type { Timestamp } from "firebase/firestore";

/* ============================================================
 * Libro delle Cronache — il codex narrativo ufficiale del mondo.
 *
 * Una cronaca è un'entità `type: "chronicle"` (collection `entities`):
 * titolo = name, corpo = description, copertina = imageUrl. I dati
 * specifici del Libro (categoria, data del calendario fantasy, arco
 * narrativo, canonizzazione…) vivono nel campo tipizzato `chronicle`
 * — stesso precedente della scheda personaggio (`sheet`).
 * ============================================================ */

export const CHRONICLE_CATEGORIES = [
  "HISTORICAL_EVENT",
  "QUEST",
  "DIARY",
  "LETTER",
  "REPORT",
  "LEGEND",
  "MYTH",
  "PROPHECY",
  "BATTLE",
  "WAR",
  "POLITICS",
  "RELIGION",
  "EXPLORATION",
  "PERSON",
  "PLACE",
  "DOCUMENT",
  "OTHER",
] as const;
export type ChronicleCategory = (typeof CHRONICLE_CATEGORIES)[number];

/**
 * Data del calendario fantasy. Mese e giorno possono restare ignoti
 * (null): la voce si ordina comunque all'inizio del periodo indicato.
 */
export interface WorldDate {
  /** Id di un'era della CalendarDefinition; null = nessuna era. */
  eraId: string | null;
  /** Anno (anche negativo, relativo all'era). */
  year: number;
  /** Mese 1-based nella definizione del calendario; null = ignoto. */
  month: number | null;
  /** Giorno 1-based; null = ignoto. */
  day: number | null;
}

export const CHRONICLE_CANON_STATUSES = ["CANON", "PROPOSED"] as const;
export type ChronicleCanonStatus = (typeof CHRONICLE_CANON_STATUSES)[number];

/** Dati del Libro sul documento entità (campo `chronicle`). */
export interface ChronicleData {
  subtitle: string;
  /** Autore nel mondo di gioco (es. "Archivista Elrin") — testo libero. */
  authorInWorld: string;
  category: ChronicleCategory;
  /** null = data ignota: la voce finisce nel gruppo "Tempo immemore". */
  date: WorldDate | null;
  /** Chiave d'ordinamento derivata dalla data (vedi encodeSortKey). */
  sortKey: number;
  /** Spareggio manuale tra capitoli paralleli nella stessa data. */
  sequence: number;
  /** Etichetta della data, denormalizzata al salvataggio (formatWorldDate). */
  dateLabel: string;
  /** Data testuale ereditata dai vecchi Eventi (fields.eventDate). */
  legacyDateLabel: string;
  /** Arco narrativo: id da settings/chronicles.arcs; null = nessuno. */
  arcId: string | null;
  /** Sessione di gioco collegata (entità type "session"); null = nessuna. */
  sessionId: string | null;
  /** PROPOSED finché il Master non canonizza le voci dei giocatori. */
  canonStatus: ChronicleCanonStatus;
  /** Bozza generata automaticamente (quest conclusa, caduta di un PG…). */
  draft: boolean;
  /** Testo semplice denormalizzato per la ricerca (pattern Note.contentText). */
  contentText: string;
}

/* ------------------------------------------------------------------ */
/* Calendario configurabile — documento `settings/calendar`             */
/* ------------------------------------------------------------------ */

export interface CalendarEra {
  id: string;
  name: string;
  /** Sigla mostrata accanto all'anno (es. "T.E."). */
  abbreviation: string;
}

export interface CalendarMonth {
  id: string;
  name: string;
  days: number;
}

export interface CalendarDefinition {
  /** Ere in ordine cronologico: l'indice determina l'ordinamento. */
  eras: CalendarEra[];
  /** Mesi in ordine; array vuoto = calendario a soli anni. */
  months: CalendarMonth[];
  /** Suffisso dell'anno quando non c'è era (es. "E.R."). */
  yearSuffix: string;
  updatedAt: Timestamp | null;
}

/* ------------------------------------------------------------------ */
/* Archi narrativi — documento `settings/chronicles`                    */
/* ------------------------------------------------------------------ */

export interface NarrativeArc {
  id: string;
  name: string;
  description: string;
  order: number;
}

/* ------------------------------------------------------------------ */
/* Cronologia modifiche — collection `chronicle_log` (pattern note_log) */
/* ------------------------------------------------------------------ */

export const CHRONICLE_LOG_ACTIONS = [
  "CREATE",
  "EDIT",
  "VISIBILITY",
  "CANONIZE",
  "MIGRATE",
  "AUTO",
] as const;
export type ChronicleLogAction = (typeof CHRONICLE_LOG_ACTIONS)[number];

export interface ChronicleLogEntry {
  id: string;
  chronicleId: string;
  action: ChronicleLogAction;
  detail: string;
  byId: string;
  byName: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

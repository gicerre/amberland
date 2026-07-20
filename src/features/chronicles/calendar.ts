import type {
  CalendarDefinition,
  CalendarMonth,
  WorldDate,
} from "@/types/chronicles";
import type { Entity } from "@/types/entities";

/* ============================================================
 * Calendario di Amberland — funzioni PURE (nessun accesso a
 * Firestore/React): codifica dell'ordinamento, formattazione
 * delle date e confronto tra capitoli del Libro.
 * ============================================================ */

/** Calendario minimo (soli anni) usato finché il Master non ne definisce uno. */
export const DEFAULT_CALENDAR: CalendarDefinition = {
  eras: [],
  months: [],
  yearSuffix: "",
  updatedAt: null,
};

/** Le date ignote finiscono in coda al Libro ("Tempo immemore"). */
export const UNKNOWN_DATE_SORT_KEY = Number.MAX_SAFE_INTEGER;

/** Offset per supportare anni negativi (fino a -50.000). */
const YEAR_OFFSET = 50_000;
/** Capienza anni per era (±): mantiene la chiave sotto MAX_SAFE_INTEGER. */
const ERA_SPAN = 200_000;

/**
 * Codifica una data fantasy in una chiave numerica totale:
 * era → anno → mese → giorno. Mese/giorno ignoti valgono 0, quindi
 * «nel 1247» precede «1247, 1° mese» (convenzione: inizio periodo).
 * La chiave deriva SOLO dalla data: mai rinumerazioni manuali.
 */
export function encodeSortKey(
  date: WorldDate | null,
  calendar: CalendarDefinition
): number {
  if (!date) return UNKNOWN_DATE_SORT_KEY;
  const eraIndex = date.eraId
    ? calendar.eras.findIndex((era) => era.id === date.eraId)
    : 0;
  const eraOrder = Math.max(0, eraIndex);
  return (
    ((eraOrder * ERA_SPAN + (date.year + YEAR_OFFSET)) * 100 +
      (date.month ?? 0)) *
      100 +
    (date.day ?? 0)
  );
}

/** Mese della definizione corrispondente alla data (se noto). */
export function monthOf(
  date: WorldDate,
  calendar: CalendarDefinition
): CalendarMonth | null {
  if (date.month === null) return null;
  return calendar.months[date.month - 1] ?? null;
}

/**
 * Formatta una data per il Libro, omettendo le parti ignote:
 * "12 di Luna Rossa, 1247 E.R." · "Luna Rossa, 1247" · "Anno 1247".
 * L'era è aggiunta come sigla (o nome, se manca la sigla).
 */
export function formatWorldDate(
  date: WorldDate | null,
  calendar: CalendarDefinition
): string {
  if (!date) return "";
  const month = monthOf(date, calendar);
  const era = date.eraId
    ? calendar.eras.find((candidate) => candidate.id === date.eraId)
    : undefined;
  const eraSuffix = era ? era.abbreviation || era.name : calendar.yearSuffix;
  const year = `${date.year}${eraSuffix ? ` ${eraSuffix}` : ""}`;

  if (month && date.day !== null) return `${date.day} di ${month.name}, ${year}`;
  if (month) return `${month.name}, ${year}`;
  return `Anno ${year}`;
}

/** Etichetta mostrata su card e timeline (data formattata o legacy). */
export function chronicleDateLabel(entity: Entity): string {
  const data = entity.chronicle;
  if (!data) return "";
  return data.dateLabel || data.legacyDateLabel;
}

/**
 * Ordine di lettura del Libro: chiave cronologica, poi lo spareggio
 * manuale per i capitoli paralleli, infine il titolo (collazione it).
 */
export function compareChronicles(a: Entity, b: Entity): number {
  const aData = a.chronicle;
  const bData = b.chronicle;
  const bySortKey =
    (aData?.sortKey ?? UNKNOWN_DATE_SORT_KEY) -
    (bData?.sortKey ?? UNKNOWN_DATE_SORT_KEY);
  if (bySortKey !== 0) return bySortKey;
  const bySequence = (aData?.sequence ?? 0) - (bData?.sequence ?? 0);
  if (bySequence !== 0) return bySequence;
  return a.name.localeCompare(b.name, "it");
}

/** Anno di raggruppamento per l'indice (null = data ignota). */
export function chronicleYear(entity: Entity): number | null {
  return entity.chronicle?.date?.year ?? null;
}

/** Era di raggruppamento per l'indice (null = nessuna era / ignota). */
export function chronicleEraId(entity: Entity): string | null {
  return entity.chronicle?.date?.eraId ?? null;
}

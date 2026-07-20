"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";

import {
  richTextToPlainText,
  type RichTextValue,
} from "@/components/shared/rich-text-utils";
import { useAuth } from "@/features/auth/auth-provider";
import {
  ENTITIES_KEY,
  RELATIONS_KEY,
  entityService,
  fetchEntitiesByIds,
  syncNoteLinkNames,
  syncRelationNames,
  useEntitiesByType,
  type EntityInput,
} from "@/features/entities/data";
import { COLLECTIONS } from "@/lib/constants";
import { db } from "@/lib/firebase/client";
import { createCrudService } from "@/lib/firebase/firestore";
import type {
  CalendarDefinition,
  ChronicleCategory,
  ChronicleData,
  ChronicleLogAction,
  ChronicleLogEntry,
  NarrativeArc,
  WorldDate,
} from "@/types/chronicles";
import type { Entity, RichText, Visibility } from "@/types/entities";

import {
  DEFAULT_CALENDAR,
  compareChronicles,
  encodeSortKey,
  formatWorldDate,
} from "./calendar";

/* ============================================================
 * Libro delle Cronache — data layer.
 * Le cronache sono entità (`type: "chronicle"`): qui vivono i
 * calcoli derivati (sortKey, dateLabel, contentText), il registro
 * delle modifiche, il calendario/archi in `settings` e la
 * migrazione dei vecchi Eventi.
 * ============================================================ */

type ChronicleLogInput = Omit<ChronicleLogEntry, "id" | "createdAt" | "updatedAt">;

const chronicleLogService = createCrudService<ChronicleLogEntry, ChronicleLogInput>(
  COLLECTIONS.chronicleLog
);

export const CALENDAR_KEY = "chronicle-calendar";
export const ARCS_KEY = "chronicle-arcs";
const CALENDAR_DOC_ID = "calendar";
const ARCS_DOC_ID = "chronicles";

/** Etichetta della relazione creata dai collegamenti dell'editor. */
export const CITED_RELATION_LABEL = "Citato in";

/* ----------------------------- Lettura ----------------------------- */

/** Tutte le cronache leggibili, in ordine di lettura del Libro. */
export function useChronicles() {
  const result = useEntitiesByType("chronicle");
  const data = result.data
    ? [...result.data].sort(compareChronicles)
    : undefined;
  return { ...result, data };
}

/** Cronologia modifiche di una cronaca (pattern note_log). */
export function useChronicleLog(chronicleId: string | undefined) {
  return useQuery({
    queryKey: [ENTITIES_KEY, "chronicle-log", chronicleId ?? ""],
    enabled: Boolean(chronicleId),
    queryFn: async () => {
      const entries = await chronicleLogService.list(
        where("chronicleId", "==", chronicleId)
      );
      return entries.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
      );
    },
  });
}

/** Entità citate dalla cronaca (relazioni «Citato in»), per l'editor. */
export function useCitedEntities(chronicleId: string | undefined) {
  return useQuery({
    queryKey: [RELATIONS_KEY, "cited", chronicleId ?? ""],
    enabled: Boolean(chronicleId),
    queryFn: async (): Promise<Entity[]> => {
      const documents = await fetchCitedRelations(chronicleId!);
      const ids = documents.map((document) => {
        const data = document.data();
        return (data.aId === chronicleId ? data.bId : data.aId) as string;
      });
      return fetchEntitiesByIds([...new Set(ids)]);
    },
  });
}

/* --------------------- Calendario & archi (settings) ---------------- */

export function useCalendar() {
  const { role } = useAuth();
  return useQuery({
    queryKey: [CALENDAR_KEY],
    enabled: role !== null,
    queryFn: async (): Promise<CalendarDefinition> => {
      const snapshot = await getDoc(
        doc(db, COLLECTIONS.settings, CALENDAR_DOC_ID)
      );
      if (!snapshot.exists()) return DEFAULT_CALENDAR;
      const data = snapshot.data();
      return {
        eras: (data.eras as CalendarDefinition["eras"]) ?? [],
        months: (data.months as CalendarDefinition["months"]) ?? [],
        yearSuffix: (data.yearSuffix as string) ?? "",
        updatedAt: (data.updatedAt as CalendarDefinition["updatedAt"]) ?? null,
      };
    },
  });
}

export function useCalendarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<CalendarDefinition, "updatedAt">>) => {
      await setDoc(
        doc(db, COLLECTIONS.settings, CALENDAR_DOC_ID),
        { ...patch, updatedAt: serverTimestamp() },
        { merge: true }
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CALENDAR_KEY] });
      toast.success("Calendario di Amberland aggiornato", {
        description:
          "Se hai riordinato ere o mesi, esegui «Ricalcola date» per riallineare il Libro.",
      });
    },
    onError: (error: Error) =>
      toast.error("Salvataggio non riuscito", { description: error.message }),
  });
}

export function useArcs() {
  const { role } = useAuth();
  return useQuery({
    queryKey: [ARCS_KEY],
    enabled: role !== null,
    queryFn: async (): Promise<NarrativeArc[]> => {
      const snapshot = await getDoc(doc(db, COLLECTIONS.settings, ARCS_DOC_ID));
      if (!snapshot.exists()) return [];
      const arcs = (snapshot.data().arcs as NarrativeArc[]) ?? [];
      return [...arcs].sort((a, b) => a.order - b.order);
    },
  });
}

export function useArcsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (arcs: NarrativeArc[]) => {
      await setDoc(
        doc(db, COLLECTIONS.settings, ARCS_DOC_ID),
        { arcs, updatedAt: serverTimestamp() },
        { merge: true }
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ARCS_KEY] });
      toast.success("Archi narrativi aggiornati");
    },
    onError: (error: Error) =>
      toast.error("Salvataggio non riuscito", { description: error.message }),
  });
}

/* ------------------- "Nuovo dall'ultima visita" --------------------- */

export function useChroniclesLastSeen() {
  const { user, role } = useAuth();
  const uid = user?.uid;
  return useQuery({
    queryKey: [ENTITIES_KEY, "chronicles-seen", uid ?? ""],
    enabled: role !== null && Boolean(uid),
    queryFn: async (): Promise<Timestamp | null> => {
      const snapshot = await getDoc(doc(db, COLLECTIONS.personalAreas, uid!));
      if (!snapshot.exists()) return null;
      return (snapshot.data().chroniclesLastSeenAt as Timestamp) ?? null;
    },
  });
}

export function useMarkChroniclesSeen() {
  const { user, isVisitor } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // I visitatori non hanno un'area personale scrivibile.
      if (!user?.uid || isVisitor) return;
      await setDoc(
        doc(db, COLLECTIONS.personalAreas, user.uid),
        { chroniclesLastSeenAt: serverTimestamp() },
        { merge: true }
      );
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: [ENTITIES_KEY, "chronicles-seen"],
      }),
    onError: () => undefined, // segnale non critico
  });
}

/* --------------------------- Mutazioni ------------------------------ */

/** Campi editabili di una cronaca (l'editor compila questi, il resto è derivato). */
export interface ChronicleDraft {
  name: string;
  subtitle: string;
  authorInWorld: string;
  category: ChronicleCategory;
  date: WorldDate | null;
  sequence: number;
  legacyDateLabel: string;
  arcId: string | null;
  sessionId: string | null;
  description: RichText;
  imageUrl: string;
  gallery: string[];
  tags: string[];
  visibility: Visibility;
}

function buildChronicleData(
  draft: ChronicleDraft,
  calendar: CalendarDefinition,
  base?: ChronicleData
): ChronicleData {
  return {
    subtitle: draft.subtitle.trim(),
    authorInWorld: draft.authorInWorld.trim(),
    category: draft.category,
    date: draft.date,
    sortKey: encodeSortKey(draft.date, calendar),
    sequence: draft.sequence,
    dateLabel: formatWorldDate(draft.date, calendar),
    legacyDateLabel: draft.legacyDateLabel.trim(),
    arcId: draft.arcId,
    sessionId: draft.sessionId,
    canonStatus: base?.canonStatus ?? "CANON",
    draft: base?.draft ?? false,
    contentText: richTextToPlainText(draft.description as RichTextValue),
  };
}

/** Input completo per `entities` a partire dai campi dell'editor. */
export function buildChronicleInput(
  draft: ChronicleDraft,
  calendar: CalendarDefinition,
  opts: { ownerId?: string; base?: ChronicleData } = {}
): EntityInput {
  return {
    type: "chronicle",
    name: draft.name.trim(),
    description: draft.description,
    imageUrl: draft.imageUrl,
    gallery: draft.gallery,
    tags: draft.tags,
    visibility: draft.visibility,
    unlockAfterId: null,
    parentId: null,
    fields: {},
    ...(opts.ownerId ? { ownerId: opts.ownerId } : {}),
    chronicle: buildChronicleData(draft, calendar, opts.base),
  };
}

async function fetchCitedRelations(chronicleId: string) {
  const relationsRef = collection(db, COLLECTIONS.relations);
  const [asA, asB] = await Promise.all([
    getDocs(query(relationsRef, where("aId", "==", chronicleId))),
    getDocs(query(relationsRef, where("bId", "==", chronicleId))),
  ]);
  return [...asA.docs, ...asB.docs].filter(
    (document) => document.data().label === CITED_RELATION_LABEL
  );
}

/**
 * Allinea le relazioni «Citato in» della cronaca all'elenco di entità
 * scelte nell'editor (crea le mancanti, rimuove le tolte).
 */
async function syncCitedRelations(chronicle: Entity, linked: Entity[]) {
  const existing = await fetchCitedRelations(chronicle.id);
  const wantedIds = new Set(linked.map((entity) => entity.id));
  const batch = writeBatch(db);
  const keptIds = new Set<string>();

  for (const document of existing) {
    const data = document.data();
    const otherId = data.aId === chronicle.id ? data.bId : data.aId;
    if (wantedIds.has(otherId as string)) {
      keptIds.add(otherId as string);
    } else {
      batch.delete(document.ref);
    }
  }
  for (const entity of linked) {
    if (keptIds.has(entity.id)) continue;
    batch.set(doc(collection(db, COLLECTIONS.relations)), {
      aId: chronicle.id,
      aType: chronicle.type,
      aName: chronicle.name,
      bId: entity.id,
      bType: entity.type,
      bName: entity.name,
      label: CITED_RELATION_LABEL,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export function useChronicleMutations() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const me = { id: user?.uid ?? "", name: profile?.username ?? "" };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [ENTITIES_KEY] });
    void queryClient.invalidateQueries({ queryKey: [RELATIONS_KEY] });
  };

  // Best-effort: la cronologia non deve mai far fallire l'operazione.
  const log = async (
    chronicleId: string,
    action: ChronicleLogAction,
    detail = ""
  ) => {
    try {
      await chronicleLogService.create({
        chronicleId,
        action,
        detail,
        byId: me.id,
        byName: me.name,
      });
    } catch {
      /* cronologia non critica */
    }
  };

  const create = useMutation({
    mutationFn: async ({
      draft,
      calendar,
      links,
      asPlayer,
    }: {
      draft: ChronicleDraft;
      calendar: CalendarDefinition;
      /** Entità citate, collegate con relazioni «Citato in». */
      links: Entity[];
      /** Voce proposta da un giocatore: nasce PROPOSED e di sua proprietà. */
      asPlayer?: boolean;
    }) => {
      const input = buildChronicleInput(draft, calendar);
      if (asPlayer) {
        input.ownerId = me.id;
        input.chronicle = { ...input.chronicle!, canonStatus: "PROPOSED" };
      }
      const id = await entityService.create(input);
      await log(id, "CREATE");
      if (links.length > 0) {
        await syncCitedRelations(
          { ...input, id, createdAt: null, updatedAt: null } as Entity,
          links
        );
      }
      return id;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Capitolo scritto nel Libro delle Cronache");
    },
    onError: (error: Error) =>
      toast.error("Scrittura non riuscita", { description: error.message }),
  });

  const update = useMutation({
    mutationFn: async ({
      entity,
      draft,
      calendar,
      links,
    }: {
      entity: Entity;
      draft: ChronicleDraft;
      calendar: CalendarDefinition;
      links: Entity[];
    }) => {
      const input = buildChronicleInput(draft, calendar, {
        base: entity.chronicle,
      });
      // Solo le chiavi editabili: `fields` (sourceKey, dati legacy) e
      // ownerId/canonStatus/draft restano quelli correnti (li cambia canonize).
      const patch = {
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        gallery: input.gallery,
        tags: input.tags,
        visibility: input.visibility,
        chronicle: input.chronicle,
      };
      await entityService.update(entity.id, patch);
      await log(entity.id, "EDIT");
      if (entity.visibility !== draft.visibility) {
        await log(entity.id, "VISIBILITY", draft.visibility);
      }
      if (patch.name && patch.name !== entity.name) {
        await Promise.all([
          syncRelationNames(entity.id, patch.name),
          syncNoteLinkNames(entity.id, patch.name),
        ]);
      }
      await syncCitedRelations({ ...entity, name: patch.name }, links);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Capitolo aggiornato");
    },
    onError: (error: Error) =>
      toast.error("Aggiornamento non riuscito", { description: error.message }),
  });

  /** Il Master promuove una proposta (o rifinisce una bozza automatica). */
  const canonize = useMutation({
    mutationFn: async ({
      entity,
      makePublic,
    }: {
      entity: Entity;
      makePublic: boolean;
    }) => {
      if (!entity.chronicle) throw new Error("Non è una cronaca.");
      await entityService.update(entity.id, {
        chronicle: { ...entity.chronicle, canonStatus: "CANON", draft: false },
        ...(makePublic ? { visibility: "PUBLIC" as Visibility } : {}),
      });
      await log(entity.id, "CANONIZE", makePublic ? "PUBLIC" : "");
    },
    onSuccess: () => {
      invalidate();
      toast.success("Cronaca canonizzata", {
        description: "Ora fa parte della storia ufficiale di Amberland.",
      });
    },
    onError: (error: Error) =>
      toast.error("Canonizzazione non riuscita", { description: error.message }),
  });

  return { create, update, canonize };
}

/* --------------------- Migrazione Eventi → Cronache ----------------- */

const BATCH_LIMIT = 400;

async function commitInChunks(
  operations: ((batch: ReturnType<typeof writeBatch>) => void)[]
) {
  for (let index = 0; index < operations.length; index += BATCH_LIMIT) {
    const batch = writeBatch(db);
    operations
      .slice(index, index + BATCH_LIMIT)
      .forEach((operation) => operation(batch));
    await batch.commit();
  }
}

/**
 * Converte in place i vecchi Eventi in Cronache (categoria «Evento
 * Storico»), allineando i tipi denormalizzati in relazioni e note.
 * `fields.eventDate/eventOrder` restano sul documento (rollback).
 */
export function useMigrateEvents() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const events = await entityService.list(where("type", "==", "event"));
      if (events.length === 0) return 0;

      const operations: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];

      for (const event of events) {
        const order = Number(event.fields.eventOrder);
        const hasOrder = Number.isFinite(order);
        // L'ordine cronologico legacy diventa l'anno della nuova data.
        const date: WorldDate | null = hasOrder
          ? { eraId: null, year: order, month: null, day: null }
          : null;
        const chronicle: ChronicleData = {
          subtitle: "",
          authorInWorld: "",
          category: "HISTORICAL_EVENT",
          date,
          sortKey: encodeSortKey(date, DEFAULT_CALENDAR),
          sequence: 0,
          dateLabel: "",
          legacyDateLabel:
            typeof event.fields.eventDate === "string"
              ? event.fields.eventDate
              : "",
          arcId: null,
          sessionId: null,
          canonStatus: "CANON",
          draft: false,
          contentText: richTextToPlainText(event.description as RichTextValue),
        };
        operations.push((batch) =>
          batch.update(doc(db, COLLECTIONS.entities, event.id), {
            type: "chronicle",
            chronicle,
            updatedAt: serverTimestamp(),
          })
        );
      }

      // Tipi denormalizzati nelle relazioni e nei collegamenti nota.
      const relationsRef = collection(db, COLLECTIONS.relations);
      const linksRef = collection(db, COLLECTIONS.noteLinks);
      for (const event of events) {
        const [asA, asB, links] = await Promise.all([
          getDocs(query(relationsRef, where("aId", "==", event.id))),
          getDocs(query(relationsRef, where("bId", "==", event.id))),
          getDocs(query(linksRef, where("entityId", "==", event.id))),
        ]);
        asA.docs.forEach((document) =>
          operations.push((batch) =>
            batch.update(document.ref, { aType: "chronicle" })
          )
        );
        asB.docs.forEach((document) =>
          operations.push((batch) =>
            batch.update(document.ref, { bType: "chronicle" })
          )
        );
        links.docs.forEach((document) =>
          operations.push((batch) =>
            batch.update(document.ref, { entityType: "chronicle" })
          )
        );
      }

      await commitInChunks(operations);

      // Cronologia best-effort, fuori dai batch.
      for (const event of events) {
        try {
          await chronicleLogService.create({
            chronicleId: event.id,
            action: "MIGRATE",
            detail: "Da Evento del mondo",
            byId: user?.uid ?? "",
            byName: profile?.username ?? "",
          });
        } catch {
          /* non critica */
        }
      }
      return events.length;
    },
    onSuccess: (count) => {
      void queryClient.invalidateQueries({ queryKey: [ENTITIES_KEY] });
      void queryClient.invalidateQueries({ queryKey: [RELATIONS_KEY] });
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["note_links"] });
      toast.success(
        count > 0
          ? `${count} eventi trascritti nel Libro delle Cronache`
          : "Nessun evento da migrare"
      );
    },
    onError: (error: Error) =>
      toast.error("Migrazione non riuscita", { description: error.message }),
  });
}

/**
 * Ricalcola sortKey e dateLabel di tutte le cronache con il calendario
 * corrente (da eseguire dopo aver riordinato ere o mesi).
 */
export function useRecomputeDates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (calendar: CalendarDefinition) => {
      const chronicles = await entityService.list(
        where("type", "==", "chronicle")
      );
      const operations = chronicles
        .filter((entity) => entity.chronicle)
        .map((entity) => {
          const data = entity.chronicle!;
          return (batch: ReturnType<typeof writeBatch>) =>
            batch.update(doc(db, COLLECTIONS.entities, entity.id), {
              "chronicle.sortKey": encodeSortKey(data.date, calendar),
              "chronicle.dateLabel": formatWorldDate(data.date, calendar),
            });
        });
      await commitInChunks(operations);
      return operations.length;
    },
    onSuccess: (count) => {
      void queryClient.invalidateQueries({ queryKey: [ENTITIES_KEY] });
      toast.success(`Date ricalcolate per ${count} cronache`);
    },
    onError: (error: Error) =>
      toast.error("Ricalcolo non riuscito", { description: error.message }),
  });
}

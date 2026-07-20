"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-provider";
import { COLLECTIONS } from "@/lib/constants";
import { db } from "@/lib/firebase/client";
import { createCrudService, sortByName } from "@/lib/firebase/firestore";
import {
  PLAYER_VISIBLE,
  type Entity,
  type EntityPrivate,
  type EntityType,
  type Relation,
} from "@/types/entities";

import { ENTITY_REGISTRY } from "./registry";

export type EntityInput = Omit<Entity, "id" | "createdAt" | "updatedAt">;
export type RelationInput = Omit<Relation, "id" | "createdAt" | "updatedAt">;

export const entityService = createCrudService<Entity, EntityInput>(
  COLLECTIONS.entities
);
const relationService = createCrudService<Relation, RelationInput>(
  COLLECTIONS.relations
);

export const ENTITIES_KEY = "entities";
export const RELATIONS_KEY = "relations";

/* ------------------------------------------------------------------ */
/* Lettura — tutte le query sono consapevoli della visibilità:         */
/* i giocatori interrogano SOLO documenti con visibility == PLAYERS    */
/* (richiesto anche dalle Security Rules).                             */
/* ------------------------------------------------------------------ */

function useVisibility() {
  const { isMaster, role } = useAuth();
  return { isMaster, ready: role !== null };
}

/** Tutte le entità leggibili (ordinate per nome). Base di ricerca e grafo. */
export function useAllEntities() {
  const { isMaster, ready } = useVisibility();
  return useQuery({
    queryKey: [ENTITIES_KEY, "all", isMaster],
    enabled: ready,
    queryFn: async () =>
      sortByName(
        await entityService.list(
          ...(isMaster ? [] : [where("visibility", "in", PLAYER_VISIBLE)])
        )
      ),
  });
}

/** Entità di un tipo, ordinate per nome. */
export function useEntitiesByType(type: EntityType, enabled = true) {
  const { isMaster, ready } = useVisibility();
  return useQuery({
    queryKey: [ENTITIES_KEY, "type", type, isMaster],
    enabled: ready && enabled,
    queryFn: async () =>
      sortByName(
        await entityService.list(
          where("type", "==", type),
          ...(isMaster ? [] : [where("visibility", "in", PLAYER_VISIBLE)])
        )
      ),
  });
}

/** Figlie dirette di un'entità geografica. */
export function useChildren(parentId: string | undefined) {
  const { isMaster, ready } = useVisibility();
  return useQuery({
    queryKey: [ENTITIES_KEY, "children", parentId ?? "", isMaster],
    enabled: ready && Boolean(parentId),
    queryFn: async () =>
      sortByName(
        await entityService.list(
          where("parentId", "==", parentId),
          ...(isMaster ? [] : [where("visibility", "in", PLAYER_VISIBLE)])
        )
      ),
  });
}

/** Singola entità; null se inesistente o non leggibile (permessi). */
export function useEntity(id: string | undefined) {
  const { ready, isMaster } = useVisibility();
  return useQuery({
    queryKey: [ENTITIES_KEY, "one", id ?? "", isMaster],
    enabled: ready && Boolean(id),
    queryFn: async () => {
      try {
        return await entityService.get(id!);
      } catch {
        return null;
      }
    },
  });
}

/** Catena degli antenati geografici (Mondo → … → genitore) per breadcrumb. */
export function useGeoChain(entity: Entity | null | undefined) {
  return useQuery({
    queryKey: [ENTITIES_KEY, "chain", entity?.id ?? "", entity?.parentId ?? ""],
    enabled: Boolean(entity?.parentId),
    queryFn: async () => {
      const chain: Entity[] = [];
      let currentId: string | null = entity!.parentId;
      for (let depth = 0; depth < 5 && currentId; depth++) {
        try {
          const parent = await entityService.get(currentId);
          if (!parent) break;
          chain.unshift(parent);
          currentId = parent.parentId;
        } catch {
          break; // antenato non leggibile: la catena si interrompe
        }
      }
      return chain;
    },
  });
}

/** Carica più entità per id, scartando quelle non leggibili. */
export async function fetchEntitiesByIds(ids: string[]): Promise<Entity[]> {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        return await entityService.get(id);
      } catch {
        return null;
      }
    })
  );
  return results.filter((entity): entity is Entity => entity !== null);
}

/* ------------------------------------------------------------------ */
/* Contenuti privati del Master (subcollection `private/master`)       */
/* ------------------------------------------------------------------ */

const EMPTY_PRIVATE: EntityPrivate = { masterNotes: "", secrets: "" };

function privateDocRef(entityId: string) {
  return doc(db, COLLECTIONS.entities, entityId, "private", "master");
}

export function useEntityPrivate(entityId: string | undefined) {
  const { isMaster } = useAuth();
  return useQuery({
    queryKey: [ENTITIES_KEY, "private", entityId ?? ""],
    enabled: isMaster && Boolean(entityId),
    queryFn: async (): Promise<EntityPrivate> => {
      const snapshot = await getDoc(privateDocRef(entityId!));
      if (!snapshot.exists()) return EMPTY_PRIVATE;
      const data = snapshot.data();
      return {
        masterNotes: (data.masterNotes as EntityPrivate["masterNotes"]) ?? "",
        secrets: (data.secrets as EntityPrivate["secrets"]) ?? "",
        reservedSheet: data.reservedSheet as EntityPrivate["reservedSheet"],
        reservedRace: (data.reservedRace as string) ?? "",
        reservedClass: (data.reservedClass as string) ?? "",
      };
    },
  });
}

async function savePrivate(entityId: string, data: EntityPrivate) {
  await setDoc(privateDocRef(entityId), data, { merge: true });
}

/* ------------------------------------------------------------------ */
/* Mutazioni entità                                                    */
/* ------------------------------------------------------------------ */

export async function syncRelationNames(entityId: string, newName: string) {
  const relationsRef = collection(db, COLLECTIONS.relations);
  const [asA, asB] = await Promise.all([
    getDocs(query(relationsRef, where("aId", "==", entityId))),
    getDocs(query(relationsRef, where("bId", "==", entityId))),
  ]);
  if (asA.empty && asB.empty) return;
  const batch = writeBatch(db);
  asA.docs.forEach((document) => batch.update(document.ref, { aName: newName }));
  asB.docs.forEach((document) => batch.update(document.ref, { bName: newName }));
  await batch.commit();
}

/** Aggiorna il nome denormalizzato dell'entità in tutti i collegamenti nota. */
export async function syncNoteLinkNames(entityId: string, newName: string) {
  const linksRef = collection(db, COLLECTIONS.noteLinks);
  const snapshot = await getDocs(
    query(linksRef, where("entityId", "==", entityId))
  );
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.docs.forEach((document) =>
    batch.update(document.ref, { entityName: newName })
  );
  await batch.commit();
}

async function deleteEntityCascade(entity: Entity) {
  // Blocca l'eliminazione se esistono figli geografici
  const children = await getDocs(
    query(
      collection(db, COLLECTIONS.entities),
      where("parentId", "==", entity.id),
      limit(1)
    )
  );
  if (!children.empty) {
    throw new Error(
      "Questa voce contiene altre voci dell'atlante: elimina o sposta prima i contenuti."
    );
  }

  // Rimuove le relazioni in entrambe le direzioni
  const relationsRef = collection(db, COLLECTIONS.relations);
  const [asA, asB] = await Promise.all([
    getDocs(query(relationsRef, where("aId", "==", entity.id))),
    getDocs(query(relationsRef, where("bId", "==", entity.id))),
  ]);
  const batch = writeBatch(db);
  [...asA.docs, ...asB.docs].forEach((document) => batch.delete(document.ref));
  batch.delete(privateDocRef(entity.id));
  batch.delete(doc(db, COLLECTIONS.entities, entity.id, "public", "card"));
  batch.delete(doc(db, COLLECTIONS.entities, entity.id));
  await batch.commit();
}

export function useEntityMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [ENTITIES_KEY] });
    void queryClient.invalidateQueries({ queryKey: [RELATIONS_KEY] });
    // Le note collegate denormalizzano il nome dell'entità: rinfrescale.
    void queryClient.invalidateQueries({ queryKey: ["notes"] });
    void queryClient.invalidateQueries({ queryKey: ["note_links"] });
  };

  const create = useMutation({
    mutationFn: async ({
      data,
      privateData,
    }: {
      data: EntityInput;
      privateData?: EntityPrivate;
    }) => {
      const id = await entityService.create(data);
      if (privateData) await savePrivate(id, privateData);
      return id;
    },
    onSuccess: (_id, variables) => {
      invalidate();
      toast.success("Scritto nelle cronache", {
        description: `${ENTITY_REGISTRY[variables.data.type].label}: ${variables.data.name}`,
      });
    },
    onError: (error: Error) =>
      toast.error("Creazione non riuscita", { description: error.message }),
  });

  const update = useMutation({
    mutationFn: async ({
      entity,
      data,
      privateData,
    }: {
      entity: Entity;
      data: Partial<EntityInput>;
      privateData?: EntityPrivate;
    }) => {
      await entityService.update(entity.id, data);
      if (privateData) await savePrivate(entity.id, privateData);
      if (data.name && data.name !== entity.name) {
        // I collegamenti sono per ID (mai persi); qui allineiamo il nome
        // denormalizzato in relazioni e note collegate.
        await Promise.all([
          syncRelationNames(entity.id, data.name),
          syncNoteLinkNames(entity.id, data.name),
        ]);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Modifiche salvate");
    },
    onError: (error: Error) =>
      toast.error("Salvataggio non riuscito", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: (entity: Entity) => deleteEntityCascade(entity),
    onSuccess: (_data, entity) => {
      invalidate();
      toast.success("Rimosso dalle cronache", { description: entity.name });
    },
    onError: (error: Error) =>
      toast.error("Eliminazione non riuscita", { description: error.message }),
  });

  /** Cambio rapido di visibilità (rivela/nascondi). */
  const setVisibility = useMutation({
    mutationFn: ({
      entity,
      visibility,
    }: {
      entity: Entity;
      visibility: Entity["visibility"];
    }) => entityService.update(entity.id, { visibility }),
    onSuccess: (_data, { visibility }) => {
      invalidate();
      toast.success(
        visibility === "PUBLIC"
          ? "Rivelato ai giocatori"
          : "Nascosto ai giocatori"
      );
    },
    onError: (error: Error) =>
      toast.error("Operazione non riuscita", { description: error.message }),
  });

  return { create, update, remove, setVisibility };
}

/* ------------------------------------------------------------------ */
/* Relazioni                                                           */
/* ------------------------------------------------------------------ */

/** Tutte le relazioni che toccano un'entità (entrambe le direzioni). */
export function useRelations(entityId: string | undefined) {
  return useQuery({
    queryKey: [RELATIONS_KEY, entityId ?? ""],
    enabled: Boolean(entityId),
    queryFn: async () => {
      const [asA, asB] = await Promise.all([
        relationService.list(where("aId", "==", entityId)),
        relationService.list(where("bId", "==", entityId)),
      ]);
      return [...asA, ...asB];
    },
  });
}

/** Tutte le relazioni (vista grafo). */
export function useAllRelations() {
  return useQuery({
    queryKey: [RELATIONS_KEY, "all"],
    queryFn: () => relationService.list(),
  });
}

export function useRelationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: [RELATIONS_KEY] });

  const add = useMutation({
    mutationFn: async ({
      from,
      to,
      label,
    }: {
      from: Entity;
      to: Entity;
      label: string;
    }) => {
      await relationService.create({
        aId: from.id,
        aType: from.type,
        aName: from.name,
        bId: to.id,
        bType: to.type,
        bName: to.name,
        label: label.trim(),
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Collegamento creato");
    },
    onError: (error: Error) =>
      toast.error("Collegamento non riuscito", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: (relationId: string) =>
      deleteDoc(doc(db, COLLECTIONS.relations, relationId)),
    onSuccess: () => {
      invalidate();
      toast.success("Collegamento rimosso");
    },
    onError: (error: Error) =>
      toast.error("Rimozione non riuscita", { description: error.message }),
  });

  return { add, remove };
}

/** Crea un'entità con i default del registro (creazione rapida). */
export function buildEntityInput(
  type: EntityType,
  name: string,
  parentId: string | null = null,
  visibility?: Entity["visibility"]
): EntityInput {
  return {
    type,
    name: name.trim(),
    description: "",
    imageUrl: "",
    gallery: [],
    tags: [],
    visibility: visibility ?? ENTITY_REGISTRY[type].defaultVisibility,
    unlockAfterId: null,
    parentId,
    fields: {},
  };
}

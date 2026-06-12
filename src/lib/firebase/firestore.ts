import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  type FirestoreDataConverter,
  type QueryConstraint,
  type Timestamp,
  type UpdateData,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";

/** Campi comuni a tutti i documenti gestiti dal servizio CRUD generico. */
export interface DocumentBase {
  id: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

function createConverter<T extends DocumentBase>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (value) => {
      // L'id non viene mai persistito tra i campi del documento.
      const data = { ...value } as Partial<T>;
      delete data.id;
      return data;
    },
    fromFirestore: (snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as T,
  };
}

/**
 * Factory di servizi CRUD tipizzati su una collection Firestore.
 * Centralizza converter, timestamp automatici e costruzione query:
 * ogni feature (missioni, mondo, oggetti, personaggi…) ne crea
 * un'istanza con i propri tipi.
 */
export function createCrudService<
  T extends DocumentBase,
  TCreate extends object = Omit<T, "id" | "createdAt" | "updatedAt">,
>(collectionName: string) {
  const converter = createConverter<T>();
  const typedCollection = () =>
    collection(db, collectionName).withConverter(converter);
  const rawDocRef = (id: string) => doc(db, collectionName, id);

  return {
    collectionName,

    async list(...constraints: QueryConstraint[]): Promise<T[]> {
      const snapshot = await getDocs(
        constraints.length
          ? query(typedCollection(), ...constraints)
          : typedCollection()
      );
      return snapshot.docs.map((document) => document.data());
    },

    async get(id: string): Promise<T | null> {
      const snapshot = await getDoc(rawDocRef(id).withConverter(converter));
      return snapshot.exists() ? snapshot.data() : null;
    },

    async create(data: TCreate): Promise<string> {
      const reference = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return reference.id;
    },

    async update(id: string, data: Partial<TCreate>): Promise<void> {
      await updateDoc(rawDocRef(id), {
        ...data,
        updatedAt: serverTimestamp(),
      } as UpdateData<Record<string, unknown>>);
    },

    async remove(id: string): Promise<void> {
      await deleteDoc(rawDocRef(id));
    },
  };
}

export type CrudService<
  T extends DocumentBase,
  TCreate extends object = Omit<T, "id" | "createdAt" | "updatedAt">,
> = ReturnType<typeof createCrudService<T, TCreate>>;

/** Ordina per nome (collazione italiana) lato client, per evitare indici composti. */
export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "it"));
}

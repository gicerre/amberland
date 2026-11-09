"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Transaction,
} from "firebase/firestore";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-provider";
import { usePartyPublicCards } from "@/features/characters/data";
import { COLLECTIONS } from "@/lib/constants";
import { db } from "@/lib/firebase/client";
import { slugify } from "@/lib/utils";
import type { Money } from "@/types/entities";
import {
  BAG_PLACE,
  type ItemLogAction,
  type ItemLogEntry,
  type ItemPlace,
  type PartyItem,
  type Purse,
} from "@/types/items";

/* ============================================================
 * Oggetti e denaro del party — data layer.
 *
 * - Lettura: un'unica sottoscrizione in tempo reale (PartyItemsSync,
 *   montata nell'AppShell) scrive nella cache React Query; gli hook
 *   leggono da lì. Tutte le viste (Borsa, zaini, totale) restano
 *   allineate su tutti i dispositivi.
 * - Scrittura: ogni movimento è UNA transazione Firestore che legge
 *   le quantità correnti, verifica e scrive origine, destinazione e
 *   cronologia insieme. Niente duplicazioni né perdite.
 * - Pile: un oggetto impilabile ha id DETERMINISTICO per collocazione
 *   (`BAG__pozione-di-guarigione`), così una transazione può trovare
 *   e incrementare la pila di destinazione senza fare query.
 * ============================================================ */

export const ITEMS_KEY = "party-items";
export const PURSES_KEY = "purses";
export const ITEM_LOG_KEY = "item-log";

export const EMPTY_MONEY: Money = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
const COINS = ["pp", "gp", "ep", "sp", "cp"] as const;

const itemsCol = () => collection(db, COLLECTIONS.partyItems);
const pursesCol = () => collection(db, COLLECTIONS.purses);
const logCol = () => collection(db, COLLECTIONS.itemLog);

/* ----------------------------- Utilità ----------------------------- */

/** Chiave della collocazione: "BAG" oppure l'id del PG. */
export function placeKey(place: ItemPlace): string {
  return place.location === "BAG" ? "BAG" : place.characterId;
}

export function placeOf(item: Pick<PartyItem, "location" | "characterId">): ItemPlace {
  return item.location === "PC" && item.characterId
    ? { location: "PC", characterId: item.characterId }
    : { location: "BAG" };
}

export function samePlace(a: ItemPlace, b: ItemPlace): boolean {
  return placeKey(a) === placeKey(b);
}

/** Identità di una pila: il modello del catalogo, o il nome normalizzato. */
function stackKey(item: Pick<PartyItem, "catalogId" | "name">): string {
  return item.catalogId ?? `free-${slugify(item.name) || "oggetto"}`;
}

export function stackDocId(
  place: ItemPlace,
  item: Pick<PartyItem, "catalogId" | "name">
): string {
  return `${placeKey(place)}__${stackKey(item)}`;
}

function placeFields(place: ItemPlace) {
  return place.location === "BAG"
    ? { location: "BAG" as const, characterId: null }
    : { location: "PC" as const, characterId: place.characterId };
}

function fromSnapshot<T>(document: QueryDocumentSnapshot<DocumentData>): T {
  return { id: document.id, ...document.data() } as T;
}

function sortItems(items: PartyItem[]): PartyItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "it"));
}

export function moneyIsEmpty(money: Money): boolean {
  return COINS.every((coin) => !money[coin]);
}

/** Valore in monete d'oro (pp=10, ep=0.5, sp=0.1, cp=0.01). */
export function moneyInGold(money: Money): number {
  return money.pp * 10 + money.gp + money.ep * 0.5 + money.sp * 0.1 + money.cp * 0.01;
}

export function addMoney(a: Money, b: Money, sign = 1): Money {
  return {
    pp: (a.pp ?? 0) + sign * (b.pp ?? 0),
    gp: (a.gp ?? 0) + sign * (b.gp ?? 0),
    ep: (a.ep ?? 0) + sign * (b.ep ?? 0),
    sp: (a.sp ?? 0) + sign * (b.sp ?? 0),
    cp: (a.cp ?? 0) + sign * (b.cp ?? 0),
  };
}

function hasNegative(money: Money): boolean {
  return COINS.some((coin) => money[coin] < 0);
}

function pickMoney(data: DocumentData | undefined): Money {
  return {
    pp: Number(data?.pp ?? 0),
    gp: Number(data?.gp ?? 0),
    ep: Number(data?.ep ?? 0),
    sp: Number(data?.sp ?? 0),
    cp: Number(data?.cp ?? 0),
  };
}

/* ------------------------- Sincronizzazione ------------------------ */

/**
 * Sottoscrizione in tempo reale a oggetti e borse del party.
 * Va montata UNA volta (AppShell): scrive nella cache React Query.
 */
export function PartyItemsSync() {
  const queryClient = useQueryClient();
  const { role } = useAuth();

  useEffect(() => {
    if (!role) return;
    const stopItems = onSnapshot(
      itemsCol(),
      (snapshot) =>
        queryClient.setQueryData(
          [ITEMS_KEY],
          sortItems(snapshot.docs.map((d) => fromSnapshot<PartyItem>(d)))
        ),
      (error) => console.error("[party_items]", error)
    );
    const stopPurses = onSnapshot(
      pursesCol(),
      (snapshot) =>
        queryClient.setQueryData(
          [PURSES_KEY],
          snapshot.docs.map((d) => fromSnapshot<Purse>(d))
        ),
      (error) => console.error("[purses]", error)
    );
    return () => {
      stopItems();
      stopPurses();
    };
  }, [role, queryClient]);

  return null;
}

/* ----------------------------- Lettura ----------------------------- */

/** Tutti gli oggetti posseduti dal party (in tempo reale). */
export function usePartyItems() {
  const { role } = useAuth();
  return useQuery({
    queryKey: [ITEMS_KEY],
    enabled: role !== null,
    staleTime: Infinity,
    queryFn: async () =>
      sortItems((await getDocs(itemsCol())).docs.map((d) => fromSnapshot<PartyItem>(d))),
  });
}

/** Oggetti in una collocazione (Borsa o zaino di un PG). */
export function useItemsAt(place: ItemPlace | null) {
  const result = usePartyItems();
  const key = place ? placeKey(place) : null;
  const data = useMemo(
    () =>
      key === null
        ? []
        : (result.data ?? []).filter((item) =>
            key === "BAG" ? item.location === "BAG" : item.characterId === key
          ),
    [result.data, key]
  );
  return { ...result, data };
}

/** Tutte le borse di monete (tesoro + PG), in tempo reale. */
export function usePurses() {
  const { role } = useAuth();
  return useQuery({
    queryKey: [PURSES_KEY],
    enabled: role !== null,
    staleTime: Infinity,
    queryFn: async () =>
      (await getDocs(pursesCol())).docs.map((d) => fromSnapshot<Purse>(d)),
  });
}

/** Monete di una collocazione (zero se la borsa non esiste ancora). */
export function usePurse(place: ItemPlace | null): Money {
  const { data } = usePurses();
  const key = place ? placeKey(place) : null;
  return useMemo(() => {
    const found = (data ?? []).find((purse) => purse.id === key);
    return found ? pickMoney(found) : EMPTY_MONEY;
  }, [data, key]);
}

/** Cronologia dei movimenti (ultimi 200). */
export function useItemLog(enabled = true) {
  const { role } = useAuth();
  return useQuery({
    queryKey: [ITEM_LOG_KEY],
    enabled: enabled && role !== null,
    queryFn: async () => {
      const snapshot = await getDocs(
        query(logCol(), orderBy("createdAt", "desc"), limit(200))
      );
      return snapshot.docs.map((d) => fromSnapshot<ItemLogEntry>(d));
    },
  });
}

export interface PartyMemberOption {
  id: string;
  name: string;
}

/** PG del party (per destinazioni ed etichette). */
export function usePartyMembers() {
  const { data, ...rest } = usePartyPublicCards();
  const members = useMemo<PartyMemberOption[]>(
    () =>
      (data ?? [])
        .map((entry) => ({ id: entry.id, name: entry.card.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "it")),
    [data]
  );
  return { ...rest, data: members };
}

/** Etichetta leggibile di una collocazione ("Borsa", "Syl"…). */
export function usePlaceLabel() {
  const { data: members } = usePartyMembers();
  return useMemo(() => {
    const names = new Map(members.map((m) => [m.id, m.name]));
    return (place: ItemPlace) =>
      place.location === "BAG"
        ? "Borsa Conservante"
        : (names.get(place.characterId) ?? "Personaggio");
  }, [members]);
}

/* ---------------------------- Scrittura ---------------------------- */

/** Dati descrittivi di un oggetto nuovo (dal catalogo o libero). */
export type ItemDraft = Pick<
  PartyItem,
  "catalogId" | "name" | "type" | "rarity" | "imageUrl" | "stackable" | "notes" | "charges"
>;

export function useItemMutations() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const labelOf = usePlaceLabel();
  const me = { id: user?.uid ?? "", name: profile?.username ?? "" };

  const writeLog = (
    tx: Transaction,
    entry: Omit<ItemLogEntry, "id" | "createdAt" | "byId" | "byName">
  ) =>
    tx.set(doc(logCol()), {
      ...entry,
      byId: me.id,
      byName: me.name,
      createdAt: serverTimestamp(),
    });

  const stamp = () => ({
    updatedBy: me.id,
    updatedByName: me.name,
    updatedAt: serverTimestamp(),
  });

  const settle = () => {
    void queryClient.invalidateQueries({ queryKey: [ITEM_LOG_KEY] });
  };
  const fail = (title: string) => (error: Error) =>
    toast.error(title, { description: error.message });

  const newItemFields = (draft: ItemDraft, to: ItemPlace, quantity: number) => ({
    ...draft,
    name: draft.name.trim() || "Oggetto",
    quantity,
    ...placeFields(to),
    equipped: false,
    attuned: false,
    createdAt: serverTimestamp(),
    ...stamp(),
  });

  /** Nuovo oggetto: nella Borsa (nessun destinatario) o nello zaino di un PG. */
  const acquire = useMutation({
    mutationFn: async ({
      draft,
      quantity,
      to,
    }: {
      draft: ItemDraft;
      quantity: number;
      to: ItemPlace;
    }) => {
      const amount = Math.max(1, Math.floor(quantity));
      let createdId = "";
      await runTransaction(db, async (tx) => {
        if (draft.stackable) {
          const ref = doc(itemsCol(), stackDocId(to, draft));
          createdId = ref.id;
          const existing = await tx.get(ref);
          if (existing.exists()) {
            tx.update(ref, {
              quantity: Number(existing.data().quantity ?? 0) + amount,
              ...stamp(),
            });
          } else {
            tx.set(ref, newItemFields(draft, to, amount));
          }
        } else {
          // Oggetti unici: N documenti distinti, ognuno con la sua identità.
          for (let index = 0; index < amount; index += 1) {
            const ref = doc(itemsCol());
            if (index === 0) createdId = ref.id;
            tx.set(ref, newItemFields(draft, to, 1));
          }
        }
        writeLog(tx, {
          action: "ACQUIRE",
          itemName: draft.name.trim(),
          quantity: amount,
          coins: null,
          fromLabel: "",
          toLabel: labelOf(to),
          reason: "",
        });
      });
      return createdId;
    },
    onSuccess: (_id, { to }) => {
      settle();
      toast.success(`Aggiunto: ${labelOf(to)}`);
    },
    onError: fail("Aggiunta non riuscita"),
  });

  /** Sposta N unità (o l'oggetto unico) verso un'altra collocazione. */
  const transfer = useMutation({
    mutationFn: async ({
      itemId,
      quantity,
      to,
    }: {
      itemId: string;
      quantity: number;
      to: ItemPlace;
    }) => {
      await runTransaction(db, async (tx) => {
        const sourceRef = doc(itemsCol(), itemId);
        const sourceSnap = await tx.get(sourceRef);
        if (!sourceSnap.exists()) throw new Error("L'oggetto non è più lì.");
        const source = { id: sourceSnap.id, ...sourceSnap.data() } as PartyItem;
        const from = placeOf(source);
        if (samePlace(from, to)) throw new Error("È già in quella posizione.");

        const amount = source.stackable ? Math.floor(quantity) : source.quantity;
        if (amount < 1) throw new Error("Quantità non valida.");
        if (amount > source.quantity) {
          throw new Error(`Ne restano solo ${source.quantity}.`);
        }

        if (!source.stackable) {
          // Oggetto unico: cambia solo la collocazione, l'identità resta.
          tx.update(sourceRef, {
            ...placeFields(to),
            equipped: false,
            attuned: false,
            ...stamp(),
          });
        } else {
          const destRef = doc(itemsCol(), stackDocId(to, source));
          const destSnap = await tx.get(destRef);
          if (destSnap.exists()) {
            tx.update(destRef, {
              quantity: Number(destSnap.data().quantity ?? 0) + amount,
              ...stamp(),
            });
          } else {
            tx.set(destRef, {
              catalogId: source.catalogId,
              name: source.name,
              type: source.type,
              rarity: source.rarity ?? null,
              imageUrl: source.imageUrl ?? "",
              stackable: true,
              notes: source.notes ?? "",
              charges: source.charges ?? null,
              ...placeFields(to),
              quantity: amount,
              equipped: false,
              attuned: false,
              createdAt: serverTimestamp(),
              ...stamp(),
            });
          }
          if (amount === source.quantity) tx.delete(sourceRef);
          else tx.update(sourceRef, { quantity: source.quantity - amount, ...stamp() });
        }

        writeLog(tx, {
          action: "TRANSFER",
          itemName: source.name,
          quantity: amount,
          coins: null,
          fromLabel: labelOf(from),
          toLabel: labelOf(to),
          reason: "",
        });
      });
    },
    onSuccess: (_r, { to }) => {
      settle();
      toast.success(`Spostato: ${labelOf(to)}`);
    },
    onError: fail("Spostamento non riuscito"),
  });

  /** Consuma, perde o elimina N unità (a 0 l'oggetto sparisce). */
  const consume = useMutation({
    mutationFn: async ({
      itemId,
      quantity,
      action = "CONSUME",
      reason = "",
    }: {
      itemId: string;
      quantity: number;
      action?: Extract<ItemLogAction, "CONSUME" | "REMOVE">;
      reason?: string;
    }) => {
      await runTransaction(db, async (tx) => {
        const ref = doc(itemsCol(), itemId);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error("L'oggetto non è più lì.");
        const item = { id: snap.id, ...snap.data() } as PartyItem;
        const amount = Math.min(Math.max(1, Math.floor(quantity)), item.quantity);
        if (amount >= item.quantity) tx.delete(ref);
        else tx.update(ref, { quantity: item.quantity - amount, ...stamp() });
        writeLog(tx, {
          action,
          itemName: item.name,
          quantity: amount,
          coins: null,
          fromLabel: labelOf(placeOf(item)),
          toLabel: "",
          reason,
        });
      });
    },
    onSuccess: (_r, { action }) => {
      settle();
      toast.success(action === "REMOVE" ? "Oggetto eliminato" : "Oggetto usato");
    },
    onError: fail("Operazione non riuscita"),
  });

  /** Modifica descrittiva (nome, tipo, note, equipaggiato, cariche…). */
  const update = useMutation({
    mutationFn: async ({
      itemId,
      patch,
    }: {
      itemId: string;
      patch: Partial<
        Pick<
          PartyItem,
          | "name"
          | "type"
          | "rarity"
          | "notes"
          | "equipped"
          | "attuned"
          | "charges"
          | "quantity"
          | "stackable"
          | "imageUrl"
        >
      >;
    }) => {
      if (patch.quantity !== undefined && patch.quantity < 1) {
        throw new Error("La quantità minima è 1: per togliere l'oggetto usa Elimina.");
      }
      await updateDoc(doc(itemsCol(), itemId), { ...patch, ...stamp() });
    },
    onError: fail("Salvataggio non riuscito"),
  });

  /* ------------------------------ Denaro ------------------------------ */

  /** Incassa (delta positivo) o spende (delta negativo) da una borsa. */
  const adjustMoney = useMutation({
    mutationFn: async ({
      place,
      delta,
      reason = "",
    }: {
      place: ItemPlace;
      delta: Money;
      reason?: string;
    }) => {
      await runTransaction(db, async (tx) => {
        const ref = doc(pursesCol(), placeKey(place));
        const snap = await tx.get(ref);
        const next = addMoney(pickMoney(snap.data()), delta);
        if (hasNegative(next)) throw new Error("Monete insufficienti.");
        tx.set(ref, { ...next, ...placeFields(place), ...stamp() });
        const positive = COINS.some((coin) => delta[coin] > 0);
        writeLog(tx, {
          action: positive ? "MONEY_IN" : "MONEY_OUT",
          itemName: "",
          quantity: 0,
          coins: positive ? delta : addMoney(EMPTY_MONEY, delta, -1),
          fromLabel: positive ? "" : labelOf(place),
          toLabel: positive ? labelOf(place) : "",
          reason,
        });
      });
    },
    onSuccess: () => settle(),
    onError: fail("Operazione sul denaro non riuscita"),
  });

  /** Sposta monete fra due borse. */
  const transferMoney = useMutation({
    mutationFn: async ({
      from,
      to,
      coins,
    }: {
      from: ItemPlace;
      to: ItemPlace;
      coins: Money;
    }) => {
      if (samePlace(from, to)) throw new Error("Origine e destinazione coincidono.");
      await runTransaction(db, async (tx) => {
        const fromRef = doc(pursesCol(), placeKey(from));
        const toRef = doc(pursesCol(), placeKey(to));
        const fromSnap = await tx.get(fromRef);
        const toSnap = await tx.get(toRef);
        const nextFrom = addMoney(pickMoney(fromSnap.data()), coins, -1);
        if (hasNegative(nextFrom)) throw new Error("Monete insufficienti.");
        const nextTo = addMoney(pickMoney(toSnap.data()), coins);
        tx.set(fromRef, { ...nextFrom, ...placeFields(from), ...stamp() });
        tx.set(toRef, { ...nextTo, ...placeFields(to), ...stamp() });
        writeLog(tx, {
          action: "MONEY_TRANSFER",
          itemName: "",
          quantity: 0,
          coins,
          fromLabel: labelOf(from),
          toLabel: labelOf(to),
          reason: "",
        });
      });
    },
    onSuccess: () => {
      settle();
      toast.success("Monete trasferite");
    },
    onError: fail("Trasferimento non riuscito"),
  });

  /** Divide un incasso fra i PG indicati; il resto va al tesoro. */
  const splitMoney = useMutation({
    mutationFn: async ({
      coins,
      characterIds,
    }: {
      coins: Money;
      characterIds: string[];
    }) => {
      if (characterIds.length === 0) throw new Error("Scegli almeno un personaggio.");
      const share = { ...EMPTY_MONEY };
      const rest = { ...EMPTY_MONEY };
      for (const coin of COINS) {
        share[coin] = Math.floor(coins[coin] / characterIds.length);
        rest[coin] = coins[coin] - share[coin] * characterIds.length;
      }
      const targets: ItemPlace[] = [
        ...characterIds.map(
          (characterId): ItemPlace => ({ location: "PC", characterId })
        ),
        { location: "BAG" },
      ];
      await runTransaction(db, async (tx) => {
        const refs = targets.map((place) => doc(pursesCol(), placeKey(place)));
        const snaps: DocumentSnapshot<DocumentData>[] = [];
        for (const ref of refs) snaps.push(await tx.get(ref));
        targets.forEach((place, index) => {
          const delta = place.location === "BAG" ? rest : share;
          if (moneyIsEmpty(delta)) return;
          tx.set(refs[index], {
            ...addMoney(pickMoney(snaps[index].data()), delta),
            ...placeFields(place),
            ...stamp(),
          });
        });
        writeLog(tx, {
          action: "MONEY_IN",
          itemName: "",
          quantity: 0,
          coins,
          fromLabel: "",
          toLabel: `Diviso fra ${characterIds.length} PG`,
          reason: "",
        });
      });
    },
    onSuccess: () => {
      settle();
      toast.success("Bottino diviso");
    },
    onError: fail("Divisione non riuscita"),
  });

  /**
   * Il PG lascia il party (o viene eliminato): zaino e monete tornano
   * nella Borsa e nel tesoro. Un oggetto alla volta, ognuno in una
   * transazione con la sua voce di cronologia.
   */
  const returnToBag = useMutation({
    mutationFn: async (characterId: string) => {
      const from: ItemPlace = { location: "PC", characterId };
      const owned = (queryClient.getQueryData<PartyItem[]>([ITEMS_KEY]) ?? []).filter(
        (item) => item.characterId === characterId
      );
      for (const item of owned) {
        await transfer.mutateAsync({
          itemId: item.id,
          quantity: item.quantity,
          to: BAG_PLACE,
        });
      }
      const purse = (queryClient.getQueryData<Purse[]>([PURSES_KEY]) ?? []).find(
        (entry) => entry.id === characterId
      );
      if (purse && !moneyIsEmpty(pickMoney(purse))) {
        await transferMoney.mutateAsync({
          from,
          to: BAG_PLACE,
          coins: pickMoney(purse),
        });
      }
      return owned.length;
    },
    onSuccess: (count) => {
      if (count > 0) toast.success(`${count} oggetti tornati nella Borsa`);
    },
    onError: fail("Svuotamento dello zaino non riuscito"),
  });

  return {
    acquire,
    transfer,
    consume,
    update,
    adjustMoney,
    transferMoney,
    splitMoney,
    returnToBag,
  };
}

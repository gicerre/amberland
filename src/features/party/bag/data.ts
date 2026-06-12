"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-provider";
import {
  buildEntityInput,
  entityService,
  useEntitiesByType,
} from "@/features/entities/data";
import { COLLECTIONS } from "@/lib/constants";
import {
  createCrudService,
  type DocumentBase,
} from "@/lib/firebase/firestore";
import type { Entity } from "@/types/entities";

/* ============================================================
 * Borsa Conservante — deposito condiviso del party.
 * Gli oggetti sono modelli nel catalogo (`entities` type=item) con
 * `fields.conservabile`; il possesso vive in `bag_items`. Gli oggetti
 * creati dai giocatori entrano in `PENDING_APPROVAL`.
 * ============================================================ */

export interface BagItem extends DocumentBase {
  itemId: string;
  itemName: string;
  itemImage: string;
  itemCategory: string;
  quantity: number;
  notes: string;
  insertedBy: string;
  insertedByName: string;
  updatedBy: string;
  updatedByName: string;
}

export type BagLogAction = "ADD" | "UPDATE" | "REMOVE" | "APPROVE";

export interface BagLogEntry extends DocumentBase {
  itemId: string;
  itemName: string;
  action: BagLogAction;
  quantity: number;
  byId: string;
  byName: string;
}

type BagItemInput = Omit<BagItem, "id" | "createdAt" | "updatedAt">;
type BagLogInput = Omit<BagLogEntry, "id" | "createdAt" | "updatedAt">;

export const bagItemService = createCrudService<BagItem, BagItemInput>(
  COLLECTIONS.bagItems
);
const bagLogService = createCrudService<BagLogEntry, BagLogInput>(
  COLLECTIONS.bagLog
);

export const BAG_KEY = "bag";

/* ----------------------------- Lettura ----------------------------- */

/** Voci della Borsa (ordinate per nome oggetto). */
export function useBagItems() {
  const { role } = useAuth();
  return useQuery({
    queryKey: [BAG_KEY, "items"],
    enabled: role !== null,
    queryFn: async () => {
      const items = await bagItemService.list();
      return items.sort((a, b) => a.itemName.localeCompare(b.itemName, "it"));
    },
  });
}

/** Oggetti del catalogo marcati come conservabili (per l'inserimento). */
export function useStorableItems(enabled = true) {
  const query = useEntitiesByType("item", enabled);
  return {
    ...query,
    data: (query.data ?? []).filter(
      (item) => item.fields.conservabile === true
    ),
  };
}

/** Cronologia movimenti (tutta; filtrabile per oggetto lato client). */
export function useBagLog() {
  const { role } = useAuth();
  return useQuery({
    queryKey: [BAG_KEY, "log"],
    enabled: role !== null,
    queryFn: async () => {
      const entries = await bagLogService.list();
      return entries.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
    },
  });
}

/* --------------------------- Mutazioni ----------------------------- */

export function useBagMutations() {
  const queryClient = useQueryClient();
  const { user, profile, isMaster } = useAuth();
  const me = {
    id: user?.uid ?? "",
    name: profile?.username ?? "",
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [BAG_KEY] });
    void queryClient.invalidateQueries({ queryKey: ["entities"] });
  };

  const log = (entry: BagLogInput) => bagLogService.create(entry);

  /** Inserisce in Borsa un oggetto già presente nel catalogo. */
  const addExisting = useMutation({
    mutationFn: async ({
      item,
      quantity,
      notes,
    }: {
      item: Entity;
      quantity: number;
      notes: string;
    }) => {
      await bagItemService.create({
        itemId: item.id,
        itemName: item.name,
        itemImage: item.imageUrl,
        itemCategory: String(item.fields.category ?? ""),
        quantity,
        notes: notes.trim(),
        insertedBy: me.id,
        insertedByName: me.name,
        updatedBy: me.id,
        updatedByName: me.name,
      });
      await log({
        itemId: item.id,
        itemName: item.name,
        action: "ADD",
        quantity,
        byId: me.id,
        byName: me.name,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Aggiunto alla Borsa");
    },
    onError: (error: Error) =>
      toast.error("Inserimento non riuscito", { description: error.message }),
  });

  /** Crea un nuovo oggetto nel catalogo e lo inserisce in Borsa. */
  const createAndAdd = useMutation({
    mutationFn: async ({
      name,
      category,
      imageUrl,
      quantity,
      notes,
    }: {
      name: string;
      category: string;
      imageUrl: string;
      quantity: number;
      notes: string;
    }) => {
      const input = buildEntityInput("item", name);
      input.imageUrl = imageUrl;
      input.visibility = "PUBLIC";
      input.fields = {
        category,
        conservabile: true,
        approvalStatus: isMaster ? "APPROVED" : "PENDING_APPROVAL",
      };
      const itemId = await entityService.create(input);
      await bagItemService.create({
        itemId,
        itemName: name.trim(),
        itemImage: imageUrl,
        itemCategory: category,
        quantity,
        notes: notes.trim(),
        insertedBy: me.id,
        insertedByName: me.name,
        updatedBy: me.id,
        updatedByName: me.name,
      });
      await log({
        itemId,
        itemName: name.trim(),
        action: "ADD",
        quantity,
        byId: me.id,
        byName: me.name,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success(
        isMaster
          ? "Oggetto creato e aggiunto"
          : "Creato: in attesa di approvazione del Master"
      );
    },
    onError: (error: Error) =>
      toast.error("Creazione non riuscita", { description: error.message }),
  });

  /** Aggiorna quantità/note di una voce. */
  const updateEntry = useMutation({
    mutationFn: async ({
      entry,
      quantity,
      notes,
    }: {
      entry: BagItem;
      quantity: number;
      notes: string;
    }) => {
      await bagItemService.update(entry.id, {
        quantity,
        notes: notes.trim(),
        updatedBy: me.id,
        updatedByName: me.name,
      });
      await log({
        itemId: entry.itemId,
        itemName: entry.itemName,
        action: "UPDATE",
        quantity,
        byId: me.id,
        byName: me.name,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Voce aggiornata");
    },
    onError: (error: Error) =>
      toast.error("Aggiornamento non riuscito", { description: error.message }),
  });

  /** Rimuove una voce dalla Borsa. */
  const removeEntry = useMutation({
    mutationFn: async (entry: BagItem) => {
      await bagItemService.remove(entry.id);
      await log({
        itemId: entry.itemId,
        itemName: entry.itemName,
        action: "REMOVE",
        quantity: entry.quantity,
        byId: me.id,
        byName: me.name,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Rimosso dalla Borsa");
    },
    onError: (error: Error) =>
      toast.error("Rimozione non riuscita", { description: error.message }),
  });

  /** Master: approva un oggetto creato da un giocatore. */
  const approveItem = useMutation({
    mutationFn: async (entry: BagItem) => {
      const item = await entityService.get(entry.itemId);
      if (!item) throw new Error("Oggetto non trovato nel catalogo");
      await entityService.update(entry.itemId, {
        fields: { ...item.fields, approvalStatus: "APPROVED" },
      });
      await log({
        itemId: entry.itemId,
        itemName: entry.itemName,
        action: "APPROVE",
        quantity: entry.quantity,
        byId: me.id,
        byName: me.name,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Oggetto approvato");
    },
    onError: (error: Error) =>
      toast.error("Approvazione non riuscita", { description: error.message }),
  });

  return { addExisting, createAndAdd, updateEntry, removeEntry, approveItem };
}

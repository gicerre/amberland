"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { where } from "firebase/firestore";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-provider";
import { useEntitiesByType } from "@/features/entities/data";
import { BAG_KEY, bagItemService, useBagItems, type BagItem } from "@/features/party/bag/data";
import { COLLECTIONS } from "@/lib/constants";
import { createCrudService } from "@/lib/firebase/firestore";
import type { Entity } from "@/types/entities";
import type { InventoryItem } from "@/types/personal";

/* ============================================================
 * Inventario personale — oggetti che il singolo PC porta con sé.
 * Possesso in `inventory_items` (con `ownerId`); modelli nel catalogo
 * (`entities` type=item, `conservabile`). Mutua esclusione con la Borsa
 * Conservante: un oggetto sta in un solo posto alla volta.
 * ============================================================ */

type InventoryItemInput = Omit<InventoryItem, "id" | "createdAt" | "updatedAt">;

const inventoryService = createCrudService<InventoryItem, InventoryItemInput>(
  COLLECTIONS.inventoryItems
);

export const INVENTORY_KEY = "inventory";

/* ----------------------------- Lettura ----------------------------- */

/** Inventario personale dell'utente corrente. */
export function useInventory() {
  const { user, role } = useAuth();
  const uid = user?.uid;
  return useQuery({
    queryKey: [INVENTORY_KEY, uid ?? ""],
    enabled: role !== null && Boolean(uid),
    queryFn: async () => {
      const items = await inventoryService.list(where("ownerId", "==", uid));
      return items.sort((a, b) => {
        const cat = a.itemCategory.localeCompare(b.itemCategory, "it");
        return cat !== 0 ? cat : a.itemName.localeCompare(b.itemName, "it");
      });
    },
  });
}

/**
 * Oggetti del catalogo conservabili disponibili per l'inventario personale:
 * conservabili, non già nella Borsa e non già nel mio inventario.
 */
export function useAvailableForInventory() {
  const items = useEntitiesByType("item");
  const { data: bag } = useBagItems();
  const { data: mine } = useInventory();

  const occupied = new Set<string>();
  (bag ?? []).forEach((b) => occupied.add(b.itemId));
  (mine ?? []).forEach((m) => occupied.add(m.itemId));

  return {
    ...items,
    data: (items.data ?? []).filter(
      (item) =>
        item.fields.conservabile === true && !occupied.has(item.id)
    ),
  };
}

/* --------------------------- Mutazioni ----------------------------- */

export function useInventoryMutations() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const me = { id: user?.uid ?? "", name: profile?.username ?? "" };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
    void queryClient.invalidateQueries({ queryKey: [BAG_KEY] });
  };

  /** Aggiunge all'inventario un oggetto conservabile del catalogo. */
  const addExisting = useMutation({
    mutationFn: ({
      item,
      quantity,
      notes,
    }: {
      item: Entity;
      quantity: number;
      notes: string;
    }) =>
      inventoryService.create({
        ownerId: me.id,
        ownerName: me.name,
        itemId: item.id,
        itemName: item.name,
        itemImage: item.imageUrl,
        itemCategory: String(item.fields.category ?? ""),
        quantity: Math.max(1, quantity),
        notes: notes.trim(),
        equipped: false,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Aggiunto allo zaino");
    },
    onError: (error: Error) =>
      toast.error("Inserimento non riuscito", { description: error.message }),
  });

  /** Aggiorna quantità/note di una voce. */
  const updateEntry = useMutation({
    mutationFn: ({
      entry,
      quantity,
      notes,
    }: {
      entry: InventoryItem;
      quantity: number;
      notes: string;
    }) =>
      inventoryService.update(entry.id, {
        quantity: Math.max(1, quantity),
        notes: notes.trim(),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Voce aggiornata");
    },
    onError: (error: Error) =>
      toast.error("Aggiornamento non riuscito", { description: error.message }),
  });

  /** Equipaggia / rimuove dall'equipaggiamento. */
  const toggleEquip = useMutation({
    mutationFn: (entry: InventoryItem) =>
      inventoryService.update(entry.id, { equipped: !entry.equipped }),
    onSuccess: () => invalidate(),
    onError: (error: Error) =>
      toast.error("Operazione non riuscita", { description: error.message }),
  });

  /** Rimuove una voce dall'inventario. */
  const removeEntry = useMutation({
    mutationFn: (entry: InventoryItem) => inventoryService.remove(entry.id),
    onSuccess: () => {
      invalidate();
      toast.success("Rimosso dallo zaino");
    },
    onError: (error: Error) =>
      toast.error("Rimozione non riuscita", { description: error.message }),
  });

  /** Sposta una voce dalla Borsa Conservante all'inventario personale. */
  const moveFromBag = useMutation({
    mutationFn: async (bagItem: BagItem) => {
      await inventoryService.create({
        ownerId: me.id,
        ownerName: me.name,
        itemId: bagItem.itemId,
        itemName: bagItem.itemName,
        itemImage: bagItem.itemImage,
        itemCategory: bagItem.itemCategory,
        quantity: bagItem.quantity,
        notes: bagItem.notes,
        equipped: false,
      });
      await bagItemService.remove(bagItem.id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Spostato nello zaino");
    },
    onError: (error: Error) =>
      toast.error("Spostamento non riuscito", { description: error.message }),
  });

  /** Sposta una voce dall'inventario personale alla Borsa Conservante. */
  const moveToBag = useMutation({
    mutationFn: async (entry: InventoryItem) => {
      await bagItemService.create({
        itemId: entry.itemId,
        itemName: entry.itemName,
        itemImage: entry.itemImage,
        itemCategory: entry.itemCategory,
        quantity: entry.quantity,
        notes: entry.notes,
        insertedBy: me.id,
        insertedByName: me.name,
        updatedBy: me.id,
        updatedByName: me.name,
      });
      await inventoryService.remove(entry.id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Spostato nella Borsa Conservante");
    },
    onError: (error: Error) =>
      toast.error("Spostamento non riuscito", { description: error.message }),
  });

  return {
    addExisting,
    updateEntry,
    toggleEquip,
    removeEntry,
    moveFromBag,
    moveToBag,
  };
}

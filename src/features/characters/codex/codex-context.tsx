"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { useCelebration } from "@/components/shared/celebration";
import { useAuth } from "@/features/auth/auth-provider";
import { ENTITIES_KEY, entityService } from "@/features/entities/data";
import {
  EMPTY_MONEY,
  useItemMutations,
  useItemsAt,
  usePurse,
} from "@/features/items/data";
import type {
  Ability,
  CharacterHistoryEntry,
  CharacterSheet,
  Entity,
  EntityPrivate,
  EquipmentItem,
  FieldValue,
  Money,
} from "@/types/entities";
import type { ItemPlace, PartyItem } from "@/types/items";

import {
  makeHistoryEntry,
  normalizeSheet,
  writePublicCard,
  writeReserved,
} from "../data";
import { genId, totalLevel } from "./derive";

/* ============================================================
 * CodexProvider — il sistema nervoso della Scheda Personaggio.
 *
 * Un solo posto per: permessi, scheda normalizzata, salvataggio
 * granulare con optimistic update (inline editing), stato
 * dell'Inspector (pannello di ispezione universale).
 * ============================================================ */

/** Ciò che l'Inspector può mettere a fuoco. Le voci nuove vengono
 *  create dai pannelli (patchSheet) e subito messe a fuoco per id. */
export type InspectorTarget =
  | { type: "item"; id: string }
  | { type: "spell"; id: string }
  | { type: "skill"; key: string }
  | { type: "ability"; ability: Ability }
  | { type: "condition"; id: string }
  | { type: "resource"; id: string }
  | { type: "class"; id: string }
  | { type: "identity" }
  | { type: "entity"; id: string };

interface SavePayload {
  /** Scheda completa già aggiornata (il Codex lavora per merge). */
  sheet?: CharacterSheet;
  /** Patch dei fields dell'entità (razza, allineamento, livello…). */
  fields?: Record<string, FieldValue>;
  /** Storico completo già aggiornato. */
  history?: CharacterHistoryEntry[];
}

/** Patch parziale, o funzione (scheda attuale) → patch parziale. */
export type SheetPatch =
  | Partial<CharacterSheet>
  | ((current: CharacterSheet) => Partial<CharacterSheet>);

interface CodexContextValue {
  entity: Entity;
  /** Scheda normalizzata (mai undefined nei campi nuovi). */
  sheet: CharacterSheet;
  /** Esiste una scheda D&D completa (PC sempre; NPC solo «completi»). */
  hasSheet: boolean;
  isPC: boolean;
  isMaster: boolean;
  isOwner: boolean;
  canEdit: boolean;
  /** Salvataggi in corso (per il segnale "sto scrivendo…"). */
  saving: boolean;
  /**
   * Applica una patch alla scheda e salva (optimistic). Accetta anche una
   * funzione che riceve la scheda più recente: serve quando il nuovo valore
   * dipende dal precedente (danno/cura ripetuti in rapida successione).
   */
  patchSheet: (
    patch: SheetPatch,
    options?: { history?: CharacterHistoryEntry }
  ) => void;
  /** Patch dei fields dell'entità (razza, allineamento…). */
  patchFields: (fields: Record<string, FieldValue>) => void;
  /**
   * Oggetti portati. PC: lo zaino in `party_items` (condiviso col party,
   * in tempo reale). NPC: l'equipaggiamento della scheda riservata.
   */
  items: CodexItem[];
  /** Collocazione dello zaino (solo PC): destinazione dei trasferimenti. */
  place: ItemPlace | null;
  /** Crea un oggetto vuoto e ne restituisce l'id. */
  addItem: () => Promise<string>;
  updateItem: (id: string, patch: CodexItemPatch) => void;
  removeItem: (id: string) => void;
  /** Duplica un oggetto e restituisce l'id della copia. */
  duplicateItem: (id: string) => Promise<string>;
  /** Monete. PC: la sua borsa in `purses`. NPC: la scheda. */
  money: Money;
  setCoin: (coin: keyof Money, value: number) => void;
  /** Mette a fuoco un elemento nell'Inspector (null = chiude). */
  inspect: (target: InspectorTarget | null) => void;
  inspectorTarget: InspectorTarget | null;
}

/** Oggetto come lo vede il Codex: forma comune a PC (party_items) e NPC. */
export interface CodexItem extends EquipmentItem {
  catalogId: string | null;
  imageUrl: string;
  stackable: boolean;
  attuned: boolean;
}

export type CodexItemPatch = Partial<
  Pick<CodexItem, "name" | "category" | "quantity" | "equipped" | "notes" | "stackable" | "attuned">
>;

function fromPartyItem(item: PartyItem): CodexItem {
  return {
    id: item.id,
    name: item.name,
    category: item.type,
    quantity: item.quantity,
    equipped: item.equipped,
    notes: item.notes ?? "",
    catalogId: item.catalogId,
    imageUrl: item.imageUrl ?? "",
    stackable: item.stackable,
    attuned: item.attuned ?? false,
  };
}

function fromEquipment(item: EquipmentItem): CodexItem {
  return { ...item, catalogId: null, imageUrl: "", stackable: false, attuned: false };
}

const CodexContext = createContext<CodexContextValue | null>(null);

export function useCodex(): CodexContextValue {
  const context = useContext(CodexContext);
  if (!context) {
    throw new Error("useCodex deve essere usato dentro CodexProvider");
  }
  return context;
}

export function CodexProvider({
  entity,
  reservedSheet,
  children,
}: {
  entity: Entity;
  /** NPC: scheda riservata (private/master), se caricata. */
  reservedSheet?: CharacterSheet;
  children: ReactNode;
}) {
  const { isMaster, user } = useAuth();
  const { trigger: triggerCelebration } = useCelebration();
  const queryClient = useQueryClient();

  const isPC = entity.fields.kind === "PC";
  const isOwner = Boolean(entity.ownerId && entity.ownerId === user?.uid);
  const canEdit = isMaster || isOwner;
  const hasSheet = isPC
    ? Boolean(entity.sheet)
    : entity.fields.npcComplete === true && Boolean(reservedSheet);

  const sheet = useMemo(
    () => normalizeSheet(isPC ? entity.sheet : reservedSheet),
    [isPC, entity.sheet, reservedSheet]
  );

  const [inspectorTarget, setInspectorTarget] =
    useState<InspectorTarget | null>(null);

  const entityKey = [ENTITIES_KEY, "one", entity.id, isMaster];
  const privateKey = [ENTITIES_KEY, "private", entity.id];

  /* ── Oggetti e monete: PC su party_items/purses, NPC sulla scheda ── */
  const place = useMemo<ItemPlace | null>(
    () => (isPC ? { location: "PC", characterId: entity.id } : null),
    [isPC, entity.id]
  );
  const { data: partyItems } = useItemsAt(place);
  const purse = usePurse(place);
  const itemOps = useItemMutations();
  const items = useMemo<CodexItem[]>(
    () =>
      isPC
        ? partyItems.map(fromPartyItem)
        : sheet.equipment.map(fromEquipment),
    [isPC, partyItems, sheet.equipment]
  );
  const money = isPC ? purse : (sheet.money ?? EMPTY_MONEY);
  // Nomi degli oggetti equipaggiati: alimentano la card pubblica del PC.
  const equippedNamesRef = useRef<string[]>([]);
  equippedNamesRef.current = items
    .filter((item) => item.equipped)
    .map((item) => item.name)
    .filter(Boolean);

  const save = useMutation({
    mutationFn: async (payload: SavePayload) => {
      const { sheet: nextSheet, fields, history } = payload;
      const docPatch: Record<string, unknown> = {};
      if (fields) docPatch.fields = fields;
      if (history) docPatch.history = history;

      if (isPC) {
        if (nextSheet) docPatch.sheet = nextSheet;
        await entityService.update(entity.id, docPatch);
        // La card pubblica è ciò che gli altri giocatori vedono del PC.
        await writePublicCard(
          entity.id,
          {
            name: entity.name,
            imageUrl: entity.imageUrl,
            fields: fields ?? entity.fields,
            sheet: nextSheet ?? entity.sheet,
          },
          equippedNamesRef.current
        );
      } else {
        // NPC: la scheda è riservata al Master (private/master).
        if (nextSheet) await writeReserved(entity.id, { reservedSheet: nextSheet });
        if (Object.keys(docPatch).length > 0) {
          await entityService.update(entity.id, docPatch);
        }
      }
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: [ENTITIES_KEY] });
      const previousEntity = queryClient.getQueryData<Entity | null>(entityKey);
      const previousPrivate =
        queryClient.getQueryData<EntityPrivate>(privateKey);

      // Optimistic: la UI riflette subito la modifica inline.
      if (previousEntity) {
        queryClient.setQueryData<Entity>(entityKey, {
          ...previousEntity,
          ...(payload.fields ? { fields: payload.fields } : {}),
          ...(payload.history ? { history: payload.history } : {}),
          ...(isPC && payload.sheet ? { sheet: payload.sheet } : {}),
        });
      }
      if (!isPC && payload.sheet && previousPrivate) {
        queryClient.setQueryData<EntityPrivate>(privateKey, {
          ...previousPrivate,
          reservedSheet: payload.sheet,
        });
      }
      return { previousEntity, previousPrivate };
    },
    onError: (error: Error, _payload, context) => {
      if (context?.previousEntity) {
        queryClient.setQueryData(entityKey, context.previousEntity);
      }
      if (context?.previousPrivate) {
        queryClient.setQueryData(privateKey, context.previousPrivate);
      }
      toast.error("Il Codex ha rifiutato la modifica", {
        description: error.message,
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [ENTITIES_KEY] });
    },
  });

  const { mutate: saveMutate } = save;

  // Ultima scheda promessa: si riallinea a quella reale solo quando non ci
  // sono salvataggi in corso (altrimenti un refetch vecchio la riporterebbe
  // indietro e le modifiche rapide si perderebbero a vicenda).
  const latestSheetRef = useRef<CharacterSheet>(sheet);
  useEffect(() => {
    if (!save.isPending) latestSheetRef.current = sheet;
  }, [sheet, save.isPending]);

  const patchSheet = useCallback(
    (
      patchOrUpdater: SheetPatch,
      options?: { history?: CharacterHistoryEntry }
    ) => {
      if (!canEdit) return;
      // Si fonde sull'ultima scheda "promessa" (non su quella dell'ultimo
      // render): due modifiche rapide su campi diversi non si sovrascrivono.
      const base = latestSheetRef.current;
      const patch =
        typeof patchOrUpdater === "function"
          ? patchOrUpdater(base)
          : patchOrUpdater;
      const nextSheet: CharacterSheet = { ...base, ...patch };
      latestSheetRef.current = nextSheet;
      const payload: SavePayload = { sheet: nextSheet };
      let celebrateLevel = 0;

      // Le classi guidano i fields derivati (classe primaria, livello).
      if (patch.classes) {
        const previousLevel = totalLevel(base, Number(entity.fields.level ?? 0));
        const nextLevel = totalLevel(nextSheet, previousLevel);
        payload.fields = {
          ...entity.fields,
          class: nextSheet.classes[0]?.className ?? "",
          level: nextLevel,
        };
        if (nextLevel > previousLevel) {
          celebrateLevel = nextLevel;
          payload.history = [
            ...(entity.history ?? []),
            makeHistoryEntry("LEVEL_UP", `Salito a livello ${nextLevel}`),
          ];
        }
      }
      if (options?.history) {
        payload.history = [
          ...(payload.history ?? entity.history ?? []),
          options.history,
        ];
      }

      saveMutate(payload, {
        onSuccess: () => {
          if (celebrateLevel > 0) {
            triggerCelebration({
              type: "level-up",
              characterName: entity.name,
              level: celebrateLevel,
            });
          }
        },
      });
    },
    [canEdit, entity, saveMutate, triggerCelebration]
  );

  const patchFields = useCallback(
    (fields: Record<string, FieldValue>) => {
      if (!canEdit) return;
      saveMutate({ fields: { ...entity.fields, ...fields } });
    },
    [canEdit, entity.fields, saveMutate]
  );

  /* ── Operazioni sugli oggetti ── */
  const { acquire, update: updatePartyItem, consume, adjustMoney } = itemOps;

  // Card pubblica del PC: gli altri giocatori vedono cosa ha equipaggiato.
  const refreshPublicCard = useCallback(
    (equippedNames: string[]) => {
      if (!isPC || !canEdit) return;
      void writePublicCard(
        entity.id,
        {
          name: entity.name,
          imageUrl: entity.imageUrl,
          fields: entity.fields,
          sheet: entity.sheet,
        },
        equippedNames
      ).catch(() => undefined);
    },
    [isPC, canEdit, entity]
  );

  const addItem = useCallback(async (): Promise<string> => {
    if (!canEdit) return "";
    if (place) {
      return acquire.mutateAsync({
        draft: {
          catalogId: null,
          name: "Nuovo oggetto",
          type: "misc",
          rarity: null,
          imageUrl: "",
          stackable: false,
          notes: "",
          charges: null,
        },
        quantity: 1,
        to: place,
      });
    }
    const item: EquipmentItem = {
      id: genId(),
      name: "Nuovo oggetto",
      category: "misc",
      quantity: 1,
      equipped: false,
      notes: "",
    };
    patchSheet((cur) => ({ equipment: [...cur.equipment, item] }));
    return item.id;
  }, [canEdit, place, acquire, patchSheet]);

  const updateItem = useCallback(
    (id: string, patch: CodexItemPatch) => {
      if (!canEdit) return;
      if (place) {
        const { category, ...rest } = patch;
        updatePartyItem.mutate(
          { itemId: id, patch: { ...rest, ...(category ? { type: category } : {}) } },
          {
            onSuccess: () => {
              if (patch.equipped === undefined && patch.name === undefined) return;
              refreshPublicCard(
                items
                  .map((item) => (item.id === id ? { ...item, ...patch } : item))
                  .filter((item) => item.equipped)
                  .map((item) => item.name)
                  .filter(Boolean)
              );
            },
          }
        );
        return;
      }
      patchSheet((cur) => ({
        equipment: cur.equipment.map((entry) =>
          entry.id === id ? { ...entry, ...patch } : entry
        ),
      }));
    },
    [canEdit, place, updatePartyItem, refreshPublicCard, items, patchSheet]
  );

  const removeItem = useCallback(
    (id: string) => {
      if (!canEdit) return;
      if (place) {
        const target = items.find((item) => item.id === id);
        consume.mutate(
          { itemId: id, quantity: target?.quantity ?? 1, action: "REMOVE" },
          {
            onSuccess: () => {
              if (target?.equipped) {
                refreshPublicCard(equippedNamesRef.current.filter((n) => n !== target.name));
              }
            },
          }
        );
        return;
      }
      patchSheet((cur) => ({
        equipment: cur.equipment.filter((entry) => entry.id !== id),
      }));
    },
    [canEdit, place, items, consume, refreshPublicCard, patchSheet]
  );

  const duplicateItem = useCallback(
    async (id: string): Promise<string> => {
      const source = items.find((item) => item.id === id);
      if (!canEdit || !source) return "";
      if (place) {
        return acquire.mutateAsync({
          draft: {
            catalogId: source.catalogId,
            name: `${source.name} (copia)`,
            type: source.category,
            rarity: null,
            imageUrl: source.imageUrl,
            stackable: false,
            notes: source.notes,
            charges: null,
          },
          quantity: 1,
          to: place,
        });
      }
      const copy: EquipmentItem = {
        id: genId(),
        name: `${source.name} (copia)`,
        category: source.category,
        quantity: source.quantity,
        equipped: false,
        notes: source.notes,
      };
      patchSheet((cur) => ({ equipment: [...cur.equipment, copy] }));
      return copy.id;
    },
    [canEdit, items, place, acquire, patchSheet]
  );

  const setCoin = useCallback(
    (coin: keyof Money, value: number) => {
      if (!canEdit) return;
      const next = Math.max(0, Math.floor(value));
      if (place) {
        const delta = next - (money[coin] ?? 0);
        if (delta === 0) return;
        adjustMoney.mutate({
          place,
          delta: { ...EMPTY_MONEY, [coin]: delta },
          reason: "Correzione dalla scheda",
        });
        return;
      }
      patchSheet((cur) => ({ money: { ...cur.money, [coin]: next } }));
    },
    [canEdit, place, money, adjustMoney, patchSheet]
  );

  const inspect = useCallback(
    (target: InspectorTarget | null) => setInspectorTarget(target),
    []
  );

  const value = useMemo<CodexContextValue>(
    () => ({
      entity,
      sheet,
      hasSheet,
      isPC,
      isMaster,
      isOwner,
      canEdit,
      saving: save.isPending,
      patchSheet,
      patchFields,
      items,
      place,
      addItem,
      updateItem,
      removeItem,
      duplicateItem,
      money,
      setCoin,
      inspect,
      inspectorTarget,
    }),
    [
      items,
      place,
      addItem,
      updateItem,
      removeItem,
      duplicateItem,
      money,
      setCoin,
      entity,
      sheet,
      hasSheet,
      isPC,
      isMaster,
      isOwner,
      canEdit,
      save.isPending,
      patchSheet,
      patchFields,
      inspect,
      inspectorTarget,
    ]
  );

  return <CodexContext.Provider value={value}>{children}</CodexContext.Provider>;
}

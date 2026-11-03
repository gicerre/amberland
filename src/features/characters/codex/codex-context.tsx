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
import type {
  Ability,
  CharacterHistoryEntry,
  CharacterSheet,
  Entity,
  EntityPrivate,
  FieldValue,
} from "@/types/entities";

import {
  makeHistoryEntry,
  normalizeSheet,
  writePublicCard,
  writeReserved,
} from "../data";
import { totalLevel } from "./derive";

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
  /** Mette a fuoco un elemento nell'Inspector (null = chiude). */
  inspect: (target: InspectorTarget | null) => void;
  inspectorTarget: InspectorTarget | null;
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
        await writePublicCard(entity.id, {
          name: entity.name,
          imageUrl: entity.imageUrl,
          fields: fields ?? entity.fields,
          sheet: nextSheet ?? entity.sheet,
        });
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
      inspect,
      inspectorTarget,
    }),
    [
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

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  where,
} from "firebase/firestore";
import { useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-provider";
import { COLLECTIONS } from "@/lib/constants";
import { auth, db } from "@/lib/firebase/client";
import { createCrudService } from "@/lib/firebase/firestore";
import {
  BATTLE_PUBLIC_STATUSES,
  DEFAULT_CAMPAIGN_ID,
  type Battle,
  type BattleStatus,
  type Combatant,
  type CombatantSecret,
} from "@/types/battle";

import type { SaveMapValues } from "./map-schemas";
import type {
  CreateBattleValues,
  CreateCombatantValues,
  MoveCombatantValues,
  UpdateBattleValues,
  UpdateCombatantValues,
} from "./schemas";

/* ============================================================
 * Accesso ai dati del Campo di Battaglia.
 *
 * Lettura: direttamente da Firestore (le Rules la consentono, e i
 * giocatori vedono solo le battaglie pubblicate).
 * Scrittura: SEMPRE via API Route con l'Admin SDK — su `battles/**` le
 * Rules impongono `allow write: if false`, perché una regola non sa
 * validare un pathfinding né arbitrare un turno.
 * ============================================================ */

export type BattleInput = Omit<Battle, "id" | "createdAt" | "updatedAt">;

const battleService = createCrudService<Battle, BattleInput>(
  COLLECTIONS.battles
);

export const BATTLES_KEY = "battles";

/** Client delle API di combattimento: Bearer token su ogni chiamata. */
async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sessione scaduta: accedi di nuovo");

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Errore imprevisto del server");
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* ------------------------------ Lettura ---------------------------- */

/**
 * Elenco delle battaglie visibili a chi guarda.
 *
 * I giocatori interrogano SOLO gli stati pubblici: le Rules rifiutano la
 * query senza quel filtro, esattamente come accade con `visibility` su
 * `entities`. Il vincolo campagna + stato + `updatedAt` corrisponde
 * all'indice dichiarato in `firestore.indexes.json`.
 */
export function useBattles() {
  const { isMaster, role } = useAuth();
  return useQuery({
    queryKey: [BATTLES_KEY, "list", isMaster],
    enabled: role !== null,
    queryFn: async () => {
      if (isMaster) {
        // Il Master vede anche le bozze: ordina e filtra la campagna
        // lato client, così non serve un secondo indice composto.
        const all = await battleService.list(orderBy("updatedAt", "desc"));
        return all.filter(
          (battle) => (battle.campaignId ?? DEFAULT_CAMPAIGN_ID) === DEFAULT_CAMPAIGN_ID
        );
      }
      return battleService.list(
        where("campaignId", "==", DEFAULT_CAMPAIGN_ID),
        where("status", "in", BATTLE_PUBLIC_STATUSES),
        orderBy("updatedAt", "desc")
      );
    },
  });
}

/**
 * Una singola battaglia, in tempo reale: griglia, regole e — soprattutto
 * — stato del turno arrivano a tutti gli schermi senza ricaricare.
 */
export function useBattle(id: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!id) return;
    return onSnapshot(
      doc(db, COLLECTIONS.battles, id),
      (snapshot) => {
        queryClient.setQueryData(
          [BATTLES_KEY, "detail", id],
          snapshot.exists()
            ? ({ id: snapshot.id, ...snapshot.data() } as Battle)
            : null
        );
      },
      (error) =>
        toast.error("Battaglia non sincronizzata", {
          description: error.message,
        })
    );
  }, [id, queryClient]);

  return useQuery({
    queryKey: [BATTLES_KEY, "detail", id],
    enabled: Boolean(id),
    queryFn: () => battleService.get(id as string),
  });
}

/* ----------------------------- Scrittura --------------------------- */

function useInvalidateBattles() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: [BATTLES_KEY, "list"] });
    if (id) {
      void queryClient.invalidateQueries({
        queryKey: [BATTLES_KEY, "detail", id],
      });
    }
  };
}

export function useCreateBattle() {
  const invalidate = useInvalidateBattles();
  return useMutation({
    mutationFn: (values: CreateBattleValues) =>
      authedFetch<{ id: string }>("/api/battles", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Campo di battaglia tracciato");
    },
    onError: (error: Error) =>
      toast.error("Creazione non riuscita", { description: error.message }),
  });
}

export function useUpdateBattle(id: string) {
  const invalidate = useInvalidateBattles();
  return useMutation({
    mutationFn: (values: UpdateBattleValues) =>
      authedFetch<{ id: string }>(`/api/battles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: () => invalidate(id),
    onError: (error: Error) =>
      toast.error("Modifica non salvata", { description: error.message }),
  });
}

export function useSetBattleStatus(id: string) {
  const invalidate = useInvalidateBattles();
  return useMutation({
    mutationFn: (status: BattleStatus) =>
      authedFetch<{ id: string; status: BattleStatus }>(
        `/api/battles/${id}/state`,
        { method: "POST", body: JSON.stringify({ status }) }
      ),
    onSuccess: () => invalidate(id),
    onError: (error: Error) =>
      toast.error("Cambio di stato rifiutato", { description: error.message }),
  });
}

export function useDeleteBattle() {
  const invalidate = useInvalidateBattles();
  return useMutation({
    mutationFn: (id: string) =>
      authedFetch<void>(`/api/battles/${id}`, { method: "DELETE" }),
    onSuccess: (_result, id) => {
      invalidate(id);
      toast.success("Campo di battaglia smantellato");
    },
    onError: (error: Error) =>
      toast.error("Eliminazione non riuscita", { description: error.message }),
  });
}

/* ---------------------------- Combattenti -------------------------- */

/**
 * Le pedine del campo, in tempo reale.
 *
 * `onSnapshot` non sostituisce React Query: gli scrive dentro. La cache
 * resta l'unica sorgente per i componenti (niente doppio stato), e in
 * cambio si ottiene l'aggiornamento immediato quando un altro giocatore
 * muove — senza aggiungere una sola dipendenza.
 */
export function useCombatants(battleId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!battleId) return;
    const reference = collection(
      db,
      COLLECTIONS.battles,
      battleId,
      "combatants"
    );
    return onSnapshot(
      reference,
      (snapshot) => {
        const combatants = snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as Combatant
        );
        queryClient.setQueryData(
          [BATTLES_KEY, "combatants", battleId],
          sortCombatants(combatants)
        );
      },
      (error) => {
        // Un errore di permessi qui significa Rules non pubblicate:
        // meglio dirlo subito che restare con un campo vuoto e muto.
        toast.error("Campo non sincronizzato", { description: error.message });
      }
    );
  }, [battleId, queryClient]);

  return useQuery({
    queryKey: [BATTLES_KEY, "combatants", battleId],
    enabled: Boolean(battleId),
    queryFn: async () => {
      const snapshot = await getDocs(
        collection(db, COLLECTIONS.battles, battleId as string, "combatants")
      );
      return sortCombatants(
        snapshot.docs.map(
          (document) => ({ id: document.id, ...document.data() }) as Combatant
        )
      );
    },
  });
}

/** Ordine stabile: prima le fazioni, poi il nome. Niente salti a ogni snapshot. */
function sortCombatants(combatants: Combatant[]): Combatant[] {
  const rank: Record<string, number> = { PC: 0, ALLY: 1, NEUTRAL: 2, ENEMY: 3 };
  return [...combatants].sort(
    (a, b) =>
      (rank[a.side] ?? 9) - (rank[b.side] ?? 9) ||
      a.publicName.localeCompare(b.publicName, "it")
  );
}

/**
 * Dati riservati di UNA pedina: si caricano solo quando il Master apre la
 * scheda. Le Rules li negano a chiunque altro, quindi non c'è nulla da
 * nascondere lato client — c'è solo da non sprecare letture.
 */
export function useCombatantSecret(
  battleId: string | null,
  combatantId: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: [BATTLES_KEY, "secret", battleId, combatantId],
    enabled: Boolean(battleId && combatantId && enabled),
    queryFn: async () => {
      const snapshot = await getDoc(
        doc(
          db,
          COLLECTIONS.battles,
          battleId as string,
          "combatants",
          combatantId as string,
          "secret",
          "master"
        )
      );
      return snapshot.exists() ? (snapshot.data() as CombatantSecret) : null;
    },
  });
}

function useInvalidateCombatants(battleId: string) {
  const queryClient = useQueryClient();
  return (combatantId?: string) => {
    void queryClient.invalidateQueries({
      queryKey: [BATTLES_KEY, "combatants", battleId],
    });
    if (combatantId) {
      void queryClient.invalidateQueries({
        queryKey: [BATTLES_KEY, "secret", battleId, combatantId],
      });
    }
  };
}

export function useCreateCombatants(battleId: string) {
  const invalidate = useInvalidateCombatants(battleId);
  return useMutation({
    mutationFn: (values: CreateCombatantValues) =>
      authedFetch<{ ids: string[] }>(`/api/battles/${battleId}/combatants`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: ({ ids }) => {
      invalidate();
      toast.success(
        ids.length > 1 ? `${ids.length} pedine sul campo` : "Pedina sul campo"
      );
    },
    onError: (error: Error) =>
      toast.error("Pedina non creata", { description: error.message }),
  });
}

export function useUpdateCombatant(battleId: string) {
  const invalidate = useInvalidateCombatants(battleId);
  return useMutation({
    mutationFn: ({
      combatantId,
      values,
    }: {
      combatantId: string;
      values: UpdateCombatantValues;
    }) =>
      authedFetch<{ id: string }>(
        `/api/battles/${battleId}/combatants/${combatantId}`,
        { method: "PATCH", body: JSON.stringify(values) }
      ),
    onSuccess: ({ id }) => invalidate(id),
    onError: (error: Error) =>
      toast.error("Modifica non salvata", { description: error.message }),
  });
}

export function useDeleteCombatant(battleId: string) {
  const invalidate = useInvalidateCombatants(battleId);
  return useMutation({
    mutationFn: (combatantId: string) =>
      authedFetch<void>(
        `/api/battles/${battleId}/combatants/${combatantId}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      invalidate();
      toast.success("Pedina rimossa dal campo");
    },
    onError: (error: Error) =>
      toast.error("Rimozione non riuscita", { description: error.message }),
  });
}

/**
 * Movimento. Il chiamante ha già validato in locale con `engine/movement`
 * e mostrato la pedina alla nuova posizione: qui si aspetta solo la
 * conferma del server, che resta l'unico arbitro.
 */
export function useMoveCombatant(battleId: string) {
  return useMutation({
    mutationFn: ({
      combatantId,
      ...body
    }: MoveCombatantValues & { combatantId: string }) =>
      authedFetch<{ duplicate: boolean; cost?: number; overBudget?: boolean }>(
        `/api/battles/${battleId}/combatants/${combatantId}/move`,
        { method: "POST", body: JSON.stringify(body) }
      ),
    onError: (error: Error) =>
      toast.error("Movimento rifiutato", { description: error.message }),
  });
}

/** Identificativo di un'azione: rende innocuo un retry di rete. */
export function newActionId(): string {
  return `act-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/* ------------------------------- Mappa ----------------------------- */

/**
 * Salvataggio della mappa tattica. L'editor invia la mappa intera:
 * il server la valida, la scrive e ricalcola la proiezione legacy
 * `terrain` per chi la legge ancora.
 */
export function useSaveBattleMap(battleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SaveMapValues) =>
      authedFetch<{ id: string; bytes: number }>(
        `/api/battles/${battleId}/map`,
        { method: "PUT", body: JSON.stringify(values) }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [BATTLES_KEY, "detail", battleId],
      });
      toast.success("Mappa salvata");
    },
    onError: (error: Error) =>
      toast.error("Mappa non salvata", { description: error.message }),
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { serverTimestamp, where } from "firebase/firestore";
import { toast } from "sonner";

import type { RichTextValue } from "@/components/shared/rich-text-utils";
import { useAuth } from "@/features/auth/auth-provider";
import { COLLECTIONS } from "@/lib/constants";
import { createCrudService } from "@/lib/firebase/firestore";
import type { Goal, GoalLink, GoalPriority, GoalStatus } from "@/types/personal";

import { GOAL_PRIORITY_WEIGHT } from "../constants";

/* ============================================================
 * Obiettivi personali — bacheca delle missioni del giocatore.
 * Documenti in `goals` con `ownerId`; collegamenti alle entità
 * denormalizzati nell'array `links`.
 * ============================================================ */

type GoalInput = Omit<Goal, "id" | "createdAt" | "updatedAt">;

const goalService = createCrudService<Goal, GoalInput>(COLLECTIONS.goals);

export const GOALS_KEY = "goals";

/** Ordina per priorità (alta prima), poi per data di creazione (recenti prima). */
function sortGoals(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    const w = GOAL_PRIORITY_WEIGHT[a.priority] - GOAL_PRIORITY_WEIGHT[b.priority];
    if (w !== 0) return w;
    return (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);
  });
}

/* ----------------------------- Lettura ----------------------------- */

/** Obiettivi dell'utente corrente. */
export function useGoals() {
  const { user, role } = useAuth();
  const uid = user?.uid;
  return useQuery({
    queryKey: [GOALS_KEY, uid ?? ""],
    enabled: role !== null && Boolean(uid),
    queryFn: async () =>
      sortGoals(await goalService.list(where("ownerId", "==", uid))),
  });
}

/* --------------------------- Mutazioni ----------------------------- */

export interface GoalDraft {
  title: string;
  description: RichTextValue;
  gallery: string[];
  tags: string[];
  priority: GoalPriority;
  status: GoalStatus;
  links: GoalLink[];
}

/** Normalizza il contenuto rich per la persistenza (no undefined/null). */
function normalizeDescription(value: RichTextValue): Goal["description"] {
  return (value ?? "") as Goal["description"];
}

export function useGoalMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: [GOALS_KEY] });

  const create = useMutation({
    mutationFn: (draft: GoalDraft) =>
      goalService.create({
        ownerId: uid,
        title: draft.title.trim(),
        description: normalizeDescription(draft.description),
        gallery: draft.gallery,
        tags: draft.tags,
        priority: draft.priority,
        status: draft.status,
        links: draft.links,
        completedAt:
          draft.status === "DONE"
            ? (serverTimestamp() as unknown as null)
            : null,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Obiettivo aggiunto alla bacheca");
    },
    onError: (error: Error) =>
      toast.error("Creazione non riuscita", { description: error.message }),
  });

  const update = useMutation({
    mutationFn: ({ goal, draft }: { goal: Goal; draft: GoalDraft }) =>
      goalService.update(goal.id, {
        title: draft.title.trim(),
        description: normalizeDescription(draft.description),
        gallery: draft.gallery,
        tags: draft.tags,
        priority: draft.priority,
        status: draft.status,
        links: draft.links,
        ...(draft.status === "DONE" && goal.status !== "DONE"
          ? { completedAt: serverTimestamp() as unknown as null }
          : draft.status !== "DONE"
            ? { completedAt: null }
            : {}),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Obiettivo aggiornato");
    },
    onError: (error: Error) =>
      toast.error("Aggiornamento non riuscito", { description: error.message }),
  });

  /** Cambio rapido di stato (es. checkbox di completamento). */
  const setStatus = useMutation({
    mutationFn: ({ goal, status }: { goal: Goal; status: GoalStatus }) =>
      goalService.update(goal.id, {
        status,
        ...(status === "DONE"
          ? { completedAt: serverTimestamp() as unknown as null }
          : { completedAt: null }),
      }),
    onSuccess: () => invalidate(),
    onError: (error: Error) =>
      toast.error("Operazione non riuscita", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: (goal: Goal) => goalService.remove(goal.id),
    onSuccess: () => {
      invalidate();
      toast.success("Obiettivo rimosso");
    },
    onError: (error: Error) =>
      toast.error("Rimozione non riuscita", { description: error.message }),
  });

  return { create, update, setStatus, remove };
}

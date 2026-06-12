"use client";

import { useMemo } from "react";

import { useNotes } from "@/features/party/diary/data";

import { useGoals } from "../goals/data";
import { useInventory } from "../inventory/data";

/* ============================================================
 * Timeline automatica — eventi salienti derivati dai dati esistenti:
 * oggetti ottenuti, obiettivi completati, note create. Nessuna nuova
 * collezione: è una proiezione ordinata di ciò che già esiste.
 * ============================================================ */

export type TimelineKind = "ITEM" | "GOAL" | "NOTE";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  title: string;
  detail: string;
  at: number;
}

function ms(ts: { toMillis?: () => number } | null | undefined): number {
  return ts?.toMillis?.() ?? 0;
}

export function useTimeline(limit = 30): {
  events: TimelineEvent[];
  isLoading: boolean;
} {
  const { data: inventory, isLoading: l1 } = useInventory();
  const { data: goals, isLoading: l2 } = useGoals();
  const { data: notes, isLoading: l3 } = useNotes();

  const events = useMemo<TimelineEvent[]>(() => {
    const list: TimelineEvent[] = [];

    (inventory ?? []).forEach((item) => {
      list.push({
        id: `item:${item.id}`,
        kind: "ITEM",
        title: item.itemName,
        detail: "Ottenuto nello zaino",
        at: ms(item.createdAt),
      });
    });

    (goals ?? [])
      .filter((goal) => goal.status === "DONE")
      .forEach((goal) => {
        list.push({
          id: `goal:${goal.id}`,
          kind: "GOAL",
          title: goal.title,
          detail: "Obiettivo completato",
          at: ms(goal.completedAt) || ms(goal.updatedAt),
        });
      });

    (notes ?? []).forEach((note) => {
      list.push({
        id: `note:${note.id}`,
        kind: "NOTE",
        title: note.title,
        detail: `Nota di ${note.authorName}`,
        at: ms(note.createdAt),
      });
    });

    return list.sort((a, b) => b.at - a.at).slice(0, limit);
  }, [inventory, goals, notes, limit]);

  return { events, isLoading: l1 || l2 || l3 };
}

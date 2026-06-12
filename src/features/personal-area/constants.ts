import type { GoalPriority, GoalStatus } from "@/types/personal";

/* Etichette e stili degli obiettivi personali. */

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  TODO: "Da fare",
  IN_PROGRESS: "In corso",
  DONE: "Completato",
  FAILED: "Fallito",
  ABANDONED: "Abbandonato",
};

export const GOAL_STATUS_BADGES: Record<GoalStatus, string> = {
  TODO: "border-sky-700/50 bg-night/70 text-sky-300",
  IN_PROGRESS: "border-gold/50 bg-gold/15 text-gold-bright",
  DONE: "border-emerald-600/50 bg-emerald-950/40 text-emerald-300",
  FAILED: "border-crimson-bright/50 bg-crimson/20 text-red-300",
  ABANDONED: "border-muted-foreground/40 bg-muted/30 text-muted-foreground",
};

export const GOAL_PRIORITY_LABELS: Record<GoalPriority, string> = {
  LOW: "Bassa",
  MEDIUM: "Media",
  HIGH: "Alta",
};

export const GOAL_PRIORITY_BADGES: Record<GoalPriority, string> = {
  LOW: "border-muted-foreground/40 bg-muted/30 text-muted-foreground",
  MEDIUM: "border-amber-600/50 bg-amber-950/30 text-amber-300",
  HIGH: "border-crimson-bright/50 bg-crimson/20 text-red-300",
};

/** Ordine di priorità per l'ordinamento (alta prima). */
export const GOAL_PRIORITY_WEIGHT: Record<GoalPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

/** Stati considerati "aperti" (non chiusi). */
export const OPEN_GOAL_STATUSES: GoalStatus[] = ["TODO", "IN_PROGRESS"];

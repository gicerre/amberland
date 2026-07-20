"use client";

import { CalendarCheck, CalendarClock, Flag, Loader2, Target } from "lucide-react";

import { useCelebration } from "@/components/shared/celebration";
import { useAuth } from "@/features/auth/auth-provider";
import { useNoteMutations } from "@/features/party/diary/data";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

import { useEntityMutations } from "../data";
import { QUEST_STATUS_BADGES, QUEST_STATUS_OPTIONS } from "../registry";
import { QuestStatusIcon } from "./quest-status-icon";

/** Formatta una data (stringa ISO o Timestamp Firestore) in IT. */
function formatDate(value: unknown): string | null {
  let ms: number | null = null;
  if (typeof value === "string" && value) {
    const parsed = Date.parse(value);
    ms = Number.isNaN(parsed) ? null : parsed;
  } else if (
    value &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    ms = (value as { toMillis: () => number }).toMillis();
  }
  if (!ms) return null;
  return new Date(ms).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * "Presa in carico" di una quest: il Master ne cambia lo stato con un clic e
 * il sistema registra le date (inizio/fine) e annota un evento nel Diario di
 * Campagna. Le date sono visibili a tutti; i pulsanti solo al Master.
 */
export function QuestStatusBar({ entity }: { entity: Entity }) {
  const { canContribute } = useAuth();
  const { trigger: triggerCelebration } = useCelebration();
  const { update } = useEntityMutations();
  const { syncQuestEvent } = useNoteMutations();

  const current = String(entity.fields.status ?? "AVAILABLE");
  const startedAt = formatDate(entity.fields.startedAt);
  const completedAt = formatDate(entity.fields.completedAt);
  const updatedAt = formatDate(entity.updatedAt);

  const setStatus = (status: string) => {
    if (status === current || update.isPending) return;
    const nowIso = new Date().toISOString();
    const fields: Entity["fields"] = { ...entity.fields, status };
    // Data di presa in carico: alla prima attivazione.
    if (status === "ACTIVE" && !entity.fields.startedAt) {
      fields.startedAt = nowIso;
    }
    // Data di fine: completamento o fallimento.
    if (status === "COMPLETED" || status === "FAILED") {
      fields.completedAt = nowIso;
    }
    // Riapertura: azzera la data di fine.
    if (status === "AVAILABLE" || status === "ACTIVE") {
      fields.completedAt = "";
    }
    update.mutate(
      { entity, data: { fields } },
      {
        onSuccess: () => {
          syncQuestEvent.mutate({ entity: { ...entity, fields }, status });
          if (status === "COMPLETED") {
            triggerCelebration({ type: "quest-complete", questName: entity.name });
          }
        },
      }
    );
  };

  const hasDates = Boolean(startedAt || completedAt || updatedAt);
  if (!canContribute && !hasDates) return null;

  return (
    <div className="space-y-3 rounded-xl border border-hairline-strong bg-card/50 px-4 py-3">
      {canContribute && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
            <Target className="size-3.5 text-gold" />
            Stato dell&rsquo;incarico
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUEST_STATUS_OPTIONS.map((option) => {
              const active = current === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  disabled={update.isPending}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs transition-colors",
                    active
                      ? cn("font-semibold", QUEST_STATUS_BADGES[option.value])
                      : "border-hairline-strong bg-black/20 text-muted-foreground hover:border-gold/45 hover:text-foreground"
                  )}
                >
                  <QuestStatusIcon status={option.value} className="size-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
          {update.isPending && (
            <Loader2 className="size-4 animate-spin text-gold/70" />
          )}
        </div>
      )}

      {hasDates && (
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          {startedAt && (
            <span className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5 text-gold/70" />
              Presa in carico: <strong className="text-foreground">{startedAt}</strong>
            </span>
          )}
          {updatedAt && (
            <span className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5 text-gold/70" />
              Ultimo aggiornamento:{" "}
              <strong className="text-foreground">{updatedAt}</strong>
            </span>
          )}
          {completedAt && (
            <span className="flex items-center gap-1.5">
              {current === "FAILED" ? (
                <Flag className="size-3.5 text-red-400" />
              ) : (
                <CalendarCheck className="size-3.5 text-emerald-400" />
              )}
              {current === "FAILED" ? "Fallita il" : "Conclusa il"}:{" "}
              <strong className="text-foreground">{completedAt}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { Loader2, Skull } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

import { useEntityMutations } from "../data";
import { CREATURE_STATUS_BADGES, CREATURE_STATUS_OPTIONS } from "../registry";

/** Cambio rapido dello stato di una creatura del Bestiario (solo Master). */
export function CreatureStatusBar({ entity }: { entity: Entity }) {
  const { isMaster } = useAuth();
  const { update } = useEntityMutations();

  if (!isMaster) return null;

  const current = String(entity.fields.status ?? "");
  const setStatus = (status: string) => {
    if (status === current || update.isPending) return;
    update.mutate({ entity, data: { fields: { ...entity.fields, status } } });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/20 bg-card/50 px-4 py-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
        <Skull className="size-3.5 text-gold" />
        Stato della creatura
      </span>
      <div className="flex flex-wrap gap-1.5">
        {CREATURE_STATUS_OPTIONS.map((option) => {
          const active = current === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              disabled={update.isPending}
              className={cn(
                "rounded-full border px-3.5 py-2 text-xs transition-colors",
                active
                  ? cn("font-semibold", CREATURE_STATUS_BADGES[option.value])
                  : "border-gold/20 bg-black/20 text-muted-foreground hover:border-gold/45 hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {update.isPending && (
        <Loader2 className="size-4 animate-spin text-gold/70" />
      )}
    </div>
  );
}

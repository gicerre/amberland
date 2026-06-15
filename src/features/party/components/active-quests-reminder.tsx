"use client";

import { ChevronDown, ScrollText } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useEntitiesByType } from "@/features/entities/data";
import { cn } from "@/lib/utils";

/**
 * Promemoria delle missioni attive, mostrato nel Party: "ci sono N missioni
 * attive" ed espandendolo elenca quali (con link alla scheda). Rispetta la
 * visibilità: i giocatori vedono solo le quest attive party/pubbliche.
 */
export function ActiveQuestsReminder() {
  const { data: quests } = useEntitiesByType("quest");
  const [open, setOpen] = useState(false);

  const active = useMemo(
    () =>
      (quests ?? []).filter(
        (quest) => String(quest.fields.status ?? "") === "ACTIVE"
      ),
    [quests]
  );

  if (active.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gold/30 bg-gradient-to-r from-gold/12 to-transparent">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-gold/5"
      >
        <span className="flex items-center gap-2.5 font-heading font-semibold text-gold-bright">
          <ScrollText className="size-5 text-gold" />
          {active.length === 1
            ? "C'è 1 missione attiva"
            : `Ci sono ${active.length} missioni attive`}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-gold/70 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <ul className="space-y-1 border-t border-gold/15 p-2">
          {active.map((quest) => (
            <li key={quest.id}>
              <Link
                href={`/entita/${quest.id}`}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-gold/10 hover:text-gold-bright"
              >
                <ScrollText className="size-3.5 shrink-0 text-gold/60" />
                <span className="truncate">{quest.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

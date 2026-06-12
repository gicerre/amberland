"use client";

import { BookText, History, Package, Target } from "lucide-react";

import { cn } from "@/lib/utils";

import { useTimeline, type TimelineKind } from "./data";

const KIND_ICON: Record<TimelineKind, typeof Package> = {
  ITEM: Package,
  GOAL: Target,
  NOTE: BookText,
};

const KIND_COLOR: Record<TimelineKind, string> = {
  ITEM: "text-amber-300",
  GOAL: "text-emerald-300",
  NOTE: "text-sky-300",
};

function when(at: number): string {
  if (!at) return "";
  return new Date(at).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Cronologia automatica delle gesta recenti dell'avventuriero. */
export function TimelinePanel({ limit = 12 }: { limit?: number }) {
  const { events, isLoading } = useTimeline(limit);

  if (isLoading || events.length === 0) return null;

  return (
    <section className="mt-8 rounded-2xl border border-gold/15 bg-card/50 p-5 sm:p-6">
      <h2 className="font-heading mb-4 flex items-center gap-2 text-lg font-semibold tracking-wider">
        <History className="size-5 text-gold" />
        Le tue gesta recenti
      </h2>
      <ol className="relative space-y-4 border-l border-gold/20 pl-5">
        {events.map((event) => {
          const Icon = KIND_ICON[event.kind];
          return (
            <li key={event.id} className="relative">
              <span className="absolute top-0.5 -left-[27px] flex size-6 items-center justify-center rounded-full border border-gold/30 bg-night/80">
                <Icon className={cn("size-3.5", KIND_COLOR[event.kind])} />
              </span>
              <p className="text-sm font-medium text-foreground">{event.title}</p>
              <p className="text-xs text-muted-foreground">
                {event.detail}
                {event.at ? ` · ${when(event.at)}` : ""}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

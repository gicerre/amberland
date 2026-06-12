"use client";

import { ChevronRight, Globe } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

import { ENTITY_REGISTRY } from "../registry";

/**
 * Percorso geografico prominente: Mondo → Regione → Città → Luogo.
 * Ogni livello mostra icona, colore del tipo e nome; il nodo corrente è
 * evidenziato. Permette di capire a colpo d'occhio "dove siamo" nel mondo.
 */
export function GeoTrail({
  chain,
  current,
}: {
  chain: Entity[];
  current: Entity;
}) {
  const steps = [...chain, current];

  return (
    <nav
      aria-label="Posizione nel mondo"
      className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 via-card/60 to-card/40 px-3 py-2.5 sm:px-4"
    >
      <Link
        href="/mondo"
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-gold"
        title="Atlante"
      >
        <Globe className="size-4 text-gold/70" />
      </Link>
      <ChevronRight className="size-4 shrink-0 text-gold/30" />

      {steps.map((step, index) => {
        const config = ENTITY_REGISTRY[step.type];
        const Icon = config.icon;
        const isCurrent = index === steps.length - 1;
        const content = (
          <span
            className={cn(
              "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors",
              isCurrent
                ? "bg-gold/15"
                : "border-transparent hover:bg-gold/5"
            )}
            style={
              isCurrent ? { borderColor: `${config.accent}80` } : undefined
            }
          >
            <Icon
              className="size-4 shrink-0"
              style={{ color: config.accent }}
            />
            <span className="flex flex-col leading-tight">
              <span
                className="text-[9px] font-bold tracking-[0.18em] uppercase"
                style={{ color: config.accent }}
              >
                {config.label}
              </span>
              <span
                className={cn(
                  "max-w-[10rem] truncate text-sm",
                  isCurrent
                    ? "font-heading font-semibold text-foreground"
                    : "text-foreground/85"
                )}
              >
                {step.name}
              </span>
            </span>
          </span>
        );

        return (
          <span key={step.id} className="flex items-center">
            {isCurrent ? (
              content
            ) : (
              <Link href={`/entita/${step.id}`}>{content}</Link>
            )}
            {!isCurrent && (
              <ChevronRight className="mx-0.5 size-4 shrink-0 text-gold/30" />
            )}
          </span>
        );
      })}
    </nav>
  );
}

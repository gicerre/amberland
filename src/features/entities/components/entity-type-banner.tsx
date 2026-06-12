"use client";

import type { Entity } from "@/types/entities";

import { ENTITY_REGISTRY } from "../registry";

/**
 * Banner identificativo della tipologia di entità: grande, colorato e
 * inequivocabile. Mostra la categoria in maiuscolo ("PERSONAGGIO",
 * "EVENTO", "CITTÀ"…) con l'icona e il colore dedicati del tipo.
 */
export function EntityTypeBanner({ entity }: { entity: Entity }) {
  const config = ENTITY_REGISTRY[entity.type];
  const Icon = config.icon;
  const accent = config.accent;

  return (
    <div
      className="relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 sm:p-5"
      style={{
        borderColor: `${accent}66`,
        background: `linear-gradient(90deg, ${accent}26, ${accent}0d 45%, transparent 80%)`,
      }}
    >
      <span
        className="flex size-12 shrink-0 items-center justify-center rounded-xl border shadow-inner sm:size-14"
        style={{
          borderColor: `${accent}99`,
          backgroundColor: `${accent}26`,
          color: accent,
        }}
      >
        <Icon className="size-6 sm:size-7" />
      </span>
      <div className="min-w-0">
        <p
          className="font-heading text-sm font-extrabold tracking-[0.3em] uppercase sm:text-base"
          style={{ color: accent }}
        >
          {config.label}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
          {config.flavor}
        </p>
      </div>
    </div>
  );
}

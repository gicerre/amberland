"use client";

import { EyeOff, Lock, Skull } from "lucide-react";
import Link from "next/link";

import { FantasyImage } from "@/components/shared/fantasy-image";
import { FALLEN_FILTER } from "@/components/shared/immersive-hero";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

import { ENTITY_REGISTRY, isHiddenFromPlayers, isLockedEntity } from "../registry";

/**
 * Card universale di un'entità: immagine, tipo, meta dinamiche e tag.
 * Per il Master mostra anche lo stato di visibilità (nascosta/bloccata).
 */
export function EntityCard({
  entity,
  showType = true,
  className,
}: {
  entity: Entity;
  showType?: boolean;
  className?: string;
}) {
  const { isMaster } = useAuth();
  const config = ENTITY_REGISTRY[entity.type];
  const Icon = config.icon;
  const accent = config.accent;
  const meta = config.cardMeta?.(entity) ?? {};
  const isDead = entity.type === "character" && entity.fields.isDead === true;


  return (
    <Link
      href={`/entita/${entity.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-hairline bg-gradient-to-b from-stone-surface to-stone-mid/80",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.7)]",
        "transition-all duration-200 hover:-translate-y-1.5 hover:border-gold/45 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8),0_0_30px_rgba(212,175,55,0.1)]",
        className
      )}
    >
      {/* Striscia colore tipologia — più sottile e raffinata */}
      <span
        className="absolute inset-x-0 top-0 z-20 h-0.5 opacity-90"
        style={{ backgroundColor: accent }}
      />
      {/* Striscia dorata sotto il colore tipologia */}
      <span className="absolute inset-x-0 top-0.5 z-20 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      <FantasyImage
        src={entity.imageUrl}
        alt={entity.name}
        fallbackIcon={Icon}
        className={cn("h-40", isDead && FALLEN_FILTER)}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />

      {/* Gradiente sull'immagine */}
      <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-black/10 via-transparent to-stone-mid/60" />


      {isDead && (
        <span
          className="absolute top-2 left-2 z-10 flex size-6 items-center justify-center rounded-full border border-crimson-bright/50 bg-background/90"
          title="Personaggio morto"
        >
          <Skull className="size-3 text-crimson-light" />
        </span>
      )}

      {isMaster && isHiddenFromPlayers(entity) && (
        <span
          className="absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-full border border-ember-bright/50 bg-background/90"
          title={
            isLockedEntity(entity)
              ? "Bloccata: nascosta ai giocatori"
              : "Nascosta ai giocatori"
          }
        >
          {isLockedEntity(entity) ? (
            <Lock className="size-3 text-ember-bright" />
          ) : (
            <EyeOff className="size-3 text-ember-bright" />
          )}
        </span>
      )}

      <div className="p-4">
        {showType && (
          <p
            className="mb-1.5 flex items-center gap-1 font-heading text-[9px] font-bold tracking-[0.22em] uppercase"
            style={{ color: accent }}
          >
            <Icon className="size-2.5" />
            {config.label}
          </p>
        )}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-gold-bright">
            {entity.name}
          </h3>
          {meta.badge && (
            <Badge
              variant="outline"
              className={cn("shrink-0 text-[9px]", meta.badge.className)}
            >
              {meta.badge.label}
            </Badge>
          )}
        </div>

        {meta.subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{meta.subtitle}</p>
        )}

      </div>
    </Link>
  );
}

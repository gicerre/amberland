"use client";

import { EyeOff, Lock, Skull } from "lucide-react";
import Link from "next/link";

import { CornerOrnaments } from "@/components/shared/fantasy-card";
import { FantasyImage } from "@/components/shared/fantasy-image";
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
        "group relative block overflow-hidden rounded-xl border border-gold/20 bg-card transition-all hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_0_35px_rgba(212,175,55,0.12)]",
        className
      )}
    >
      {/* Striscia colore della tipologia */}
      <span
        className="absolute inset-x-0 top-0 z-20 h-1"
        style={{ backgroundColor: accent }}
      />
      <FantasyImage
        src={entity.imageUrl}
        alt={entity.name}
        fallbackIcon={Icon}
        className={cn("h-40", isDead && "grayscale")}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      <CornerOrnaments className="z-10" />

      {isDead && (
        <span
          className="absolute top-2.5 left-2.5 z-10 flex size-7 items-center justify-center rounded-full border border-red-500/50 bg-background/85 backdrop-blur-sm"
          title="Personaggio morto"
        >
          <Skull className="size-3.5 text-red-400" />
        </span>
      )}

      {isMaster && isHiddenFromPlayers(entity) && (
        <span
          className="absolute top-2.5 right-2.5 z-10 flex size-7 items-center justify-center rounded-full border border-amber-500/50 bg-background/85 backdrop-blur-sm"
          title={
            isLockedEntity(entity)
              ? "Bloccata: nascosta ai giocatori"
              : "Nascosta ai giocatori"
          }
        >
          {isLockedEntity(entity) ? (
            <Lock className="size-3.5 text-amber-400" />
          ) : (
            <EyeOff className="size-3.5 text-amber-400" />
          )}
        </span>
      )}

      <div className="p-4">
        {showType && (
          <p
            className="mb-1 flex items-center gap-1 font-heading text-[10px] font-bold tracking-[0.18em] uppercase"
            style={{ color: accent }}
          >
            <Icon className="size-3" />
            {config.label}
          </p>
        )}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading font-semibold text-foreground group-hover:text-gold-bright">
            {entity.name}
          </h3>
          {meta.badge && (
            <Badge
              variant="outline"
              className={cn("shrink-0 text-[10px]", meta.badge.className)}
            >
              {meta.badge.label}
            </Badge>
          )}
        </div>

        {meta.subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{meta.subtitle}</p>
        )}

        {entity.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {entity.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="border-gold/20 text-[10px] text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

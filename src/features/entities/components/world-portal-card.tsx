"use client";

import { ArrowRight, Globe } from "lucide-react";
import Link from "next/link";

import { CornerOrnaments } from "@/components/shared/fantasy-card";
import { FantasyImage } from "@/components/shared/fantasy-image";
import {
  richTextToPlainText,
  type RichTextValue,
} from "@/components/shared/rich-text-utils";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

import { ENTITY_REGISTRY } from "../registry";

/**
 * Card "portale per un mondo": copertina cinematografica, atmosfera arcana,
 * emblema con alone pulsante e invito a "varcare la soglia". Pensata per
 * l'Atlante dei Mondi (/mondo) — più ricca della EntityCard generica.
 */
export function WorldPortalCard({
  entity,
  featured,
}: {
  entity: Entity;
  featured?: boolean;
}) {
  const Icon = ENTITY_REGISTRY.world.icon;
  const genre =
    typeof entity.fields.genre === "string" && entity.fields.genre.trim()
      ? entity.fields.genre
      : "Piano d'esistenza";
  const snippet =
    richTextToPlainText(entity.description as RichTextValue).slice(0, 220) ||
    ENTITY_REGISTRY.world.flavor;

  return (
    <Link
      href={`/entita/${entity.id}`}
      className={cn(
        "group relative isolate block overflow-hidden rounded-2xl border border-gold/20",
        "shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]",
        "transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/55",
        "hover:shadow-[0_0_50px_rgba(124,92,255,0.14),0_24px_60px_-18px_rgba(0,0,0,0.95)]",
        featured && "sm:col-span-2"
      )}
    >
      {/* Copertina */}
      <FantasyImage
        src={entity.imageUrl}
        alt={entity.name}
        fallbackIcon={Globe}
        position="center"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
        className={cn(
          "transition-transform duration-[1.2s] ease-out group-hover:scale-[1.06]",
          featured ? "h-80 sm:h-[26rem]" : "h-72 sm:h-80"
        )}
      />

      {/* Foschia dal basso per la leggibilità del testo */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-deep via-stone-deep/55 to-transparent" />
      {/* Vignetta cinematografica */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,transparent_35%,rgba(6,7,10,0.82)_100%)]" />
      {/* Alone arcano dall'alto — tocco mistico */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-arcane-bright/15 to-transparent" />
      {/* Riflesso dorato che attraversa la card al passaggio del mouse */}
      <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-gold/15 to-transparent opacity-0 transition-all duration-1000 ease-out group-hover:left-[110%] group-hover:opacity-100" />

      {/* Filo dorato superiore + angoli incisi */}
      <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-gold/55 to-transparent" />
      <CornerOrnaments size="md" className="z-20 border-gold/45" />

      {/* Emblema del mondo con alone pulsante */}
      <div className="absolute top-4 right-4 z-20 flex size-14 items-center justify-center">
        <span className="animate-glow-pulse absolute inset-0 rounded-full border border-gold/40 bg-night/50 shadow-[0_0_24px_rgba(212,175,55,0.25)] backdrop-blur-sm" />
        <Icon className="relative size-7 opacity-90 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
      </div>

      {/* Contenuto in basso */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-7">
        <p className="font-heading text-[10px] font-semibold tracking-[0.35em] text-arcane-bright/85 uppercase">
          {genre}
        </p>
        <h3 className="text-gold-gradient mt-1 font-heading text-2xl font-bold tracking-wider drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-3xl lg:text-4xl">
          {entity.name}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-prose text-sm leading-relaxed text-parchment-dark/80">
          {snippet}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 font-heading text-xs font-bold tracking-[0.2em] text-gold uppercase transition-colors group-hover:text-gold-bright">
          Varca la soglia
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

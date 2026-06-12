"use client";

import { Heart, Shield, Skull, Sparkles, User } from "lucide-react";
import Link from "next/link";

import { CornerOrnaments } from "@/components/shared/fantasy-card";
import { FantasyImage } from "@/components/shared/fantasy-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CHARACTER_STATUS_BADGES,
  CHARACTER_STATUS_LABELS,
} from "@/features/characters/constants";
import { useMyCharacter } from "@/features/characters/data";
import { cn } from "@/lib/utils";
import type { CharacterStatus } from "@/types/entities";

/**
 * Pannello del Personaggio Giocante, sempre visibile in alto a destra
 * nella Home dell'Area Personale. Il token è l'elemento dominante; nome
 * cliccabile → scheda completa.
 */
export function PcHeaderPanel() {
  const { data: pc, isLoading } = useMyCharacter();

  if (isLoading) {
    return (
      <div className="h-full min-h-44 animate-pulse rounded-2xl border border-gold/20 bg-card/60" />
    );
  }

  if (!pc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-gold/25 bg-card/60 p-6 text-center">
        <User className="size-8 text-gold/60" />
        <p className="text-sm text-muted-foreground">
          Nessun personaggio associato.
        </p>
      </div>
    );
  }

  const token = pc.sheet?.tokenUrl || pc.imageUrl;
  const race = String(pc.fields.race ?? "");
  const klass = String(pc.fields.class ?? "");
  const level = Number(pc.fields.level ?? 0);
  const status = (pc.fields.status as CharacterStatus) ?? "ALIVE";
  const isDead = pc.fields.isDead === true || status === "DEAD";

  return (
    <div className="relative flex h-full flex-col items-center gap-3 overflow-hidden rounded-2xl border border-gold/35 bg-gradient-to-b from-gold/10 to-night/60 p-5 text-center">
      <CornerOrnaments className="size-5 border-gold/55" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.16),transparent_65%)]" />

      {/* Token — elemento dominante */}
      <Link
        href={`/entita/${pc.id}`}
        className="relative z-10 mt-1 block size-28 overflow-hidden rounded-2xl border-2 border-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.25)] transition-transform hover:scale-105"
      >
        <FantasyImage
          src={token}
          alt={pc.name}
          fallbackIcon={User}
          className={cn("size-28", isDead && "grayscale")}
          sizes="112px"
        />
        {isDead && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Skull className="size-8 text-red-400" />
          </span>
        )}
      </Link>

      <div className="relative z-10">
        <Link
          href={`/entita/${pc.id}`}
          className="font-heading text-xl font-bold tracking-wide text-gold-bright hover:underline"
        >
          {pc.name}
        </Link>
        <p className="mt-0.5 text-sm text-foreground/90">
          {[race, klass].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-center gap-2">
        {level > 0 && (
          <Badge
            variant="outline"
            className="border-gold/40 bg-gold/10 text-gold-bright"
          >
            <Sparkles className="size-3" />
            Livello {level}
          </Badge>
        )}
        <Badge variant="outline" className={CHARACTER_STATUS_BADGES[status]}>
          {isDead ? (
            <Skull className="size-3" />
          ) : (
            <Heart className="size-3" />
          )}
          {CHARACTER_STATUS_LABELS[status]}
        </Badge>
      </div>

      <Button
        asChild
        variant="outline"
        size="sm"
        className="relative z-10 mt-auto w-full border-gold/30"
      >
        <Link href={`/entita/${pc.id}`}>
          <Shield className="size-3.5" />
          Apri la scheda
        </Link>
      </Button>
    </div>
  );
}

"use client";

import { ChevronRight, Lock, Skull, Swords } from "lucide-react";
import Link from "next/link";

import { ImmersiveHero } from "@/components/shared/immersive-hero";
import { Badge } from "@/components/ui/badge";
import { ENTITY_REGISTRY } from "@/features/entities/registry";
import type { EntityPublicCard } from "@/types/entities";

import {
  CHARACTER_STATUS_BADGES,
  CHARACTER_STATUS_LABELS,
} from "../constants";

/**
 * Vista pubblica di un PC per gli altri giocatori: solo le informazioni
 * condivisibili. La scheda completa resta riservata a proprietario e Master.
 */
export function PublicCharacterView({ card }: { card: EntityPublicCard }) {
  const portrait = card.tokenUrl || card.imageUrl;
  return (
    <div className="space-y-8">
      {/* Ritratto a banner pieno, in cima */}
      {portrait && (
        <div className="relative left-1/2 -mt-4 w-screen -translate-x-1/2 sm:-mt-6 lg:-mt-10 lg:w-[calc(100vw-18rem)]">
          <ImmersiveHero
            src={portrait}
            alt={card.name}
            accent={ENTITY_REGISTRY.character.accent}
            fallen={card.isDead}
            priority
            className="rounded-none border-0"
          />
        </div>
      )}

      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/party" className="transition-colors hover:text-gold">
          Party
        </Link>
        <ChevronRight className="size-3.5 text-gold/40" />
        <span className="font-medium text-foreground">{card.name}</span>
      </nav>

      <header>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-gold-gradient font-heading text-3xl font-bold tracking-wider sm:text-4xl">
            {card.name}
          </h1>
          {card.isDead && <Skull className="size-6 text-red-400" />}
          {card.status !== "ALIVE" && (
            <Badge variant="outline" className={CHARACTER_STATUS_BADGES[card.status]}>
              {CHARACTER_STATUS_LABELS[card.status]}
            </Badge>
          )}
        </div>
        {card.ownerName && (
          <p className="mt-1 text-sm text-muted-foreground">
            Giocatore: {card.ownerName}
          </p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {card.race && <Stat label="Razza" value={card.race} />}
        {card.classesSummary && <Stat label="Classe" value={card.classesSummary} />}
        {card.level > 0 && <Stat label="Livello" value={card.level} />}
        {card.subclasses && <Stat label="Sottoclasse" value={card.subclasses} />}
      </dl>

      {card.publicEquipment.length > 0 && (
        <section>
          <h2 className="font-heading mb-3 text-lg font-semibold tracking-wider">
            Equipaggiamento
          </h2>
          <ul className="flex flex-wrap gap-2">
            {card.publicEquipment.map((item, index) => (
              <li
                key={`${item}-${index}`}
                className="flex items-center gap-1.5 rounded-lg border border-hairline bg-card/60 px-3 py-1.5 text-sm"
              >
                <Swords className="size-3.5 text-gold/60" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-hairline bg-night/30 px-4 py-3 text-sm text-muted-foreground">
        <Lock className="size-4 text-gold/60" />
        La scheda completa di questo personaggio è riservata al suo
        proprietario e al Master.
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-hairline bg-card/60 px-4 py-3">
      <dt className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-heading font-semibold text-gold-bright">{value}</dd>
    </div>
  );
}

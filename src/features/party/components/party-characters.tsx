"use client";

import { Plus, Search, Skull, Star, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { FantasyImage } from "@/components/shared/fantasy-image";
import { FALLEN_FILTER, FallenOverlay } from "@/components/shared/immersive-hero";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { CharacterCreateDialog } from "@/features/characters/components/character-create-dialog";
import {
  useCharacterMutations,
  useCharacters,
  useMyCharacter,
  usePartyPublicCards,
  type PartyCardEntry,
} from "@/features/characters/data";
import {
  CHARACTER_STATUS_BADGES,
  CHARACTER_STATUS_LABELS,
} from "@/features/characters/constants";
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from "@/features/personal-area/favorites/data";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

/**
 * Personaggi del Party: griglia delle card pubbliche dei PC. Tutti i
 * membri vedono nome/ritratto/razza/classe/livello/equip pubblico; la
 * scheda completa è visibile solo a proprietario e Master (pagina PC).
 */
export function PartyCharacters() {
  const { isMaster, user, canContribute } = useAuth();
  const { data: cards, isLoading } = usePartyPublicCards();
  const { data: myCharacter } = useMyCharacter();
  // Solo il Master: tutti i PC (anche quelli fuori dal party).
  const { data: allCharacters } = useCharacters(isMaster);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const hasOwnPc = Boolean(myCharacter);
  const canCreate = (isMaster || !hasOwnPc) && canContribute;

  // PC esistenti ma non (ancora) nel party: visibili solo al Master.
  const reservePcs = useMemo(
    () =>
      isMaster
        ? (allCharacters ?? []).filter(
            (character) =>
              character.fields.kind === "PC" &&
              character.fields.partyMember !== true
          )
        : [],
    [allCharacters, isMaster]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = cards ?? [];
    if (!term) return list;
    return list.filter(
      (entry) =>
        entry.card.name.toLowerCase().includes(term) ||
        entry.card.race.toLowerCase().includes(term) ||
        entry.card.classesSummary.toLowerCase().includes(term)
    );
  }, [cards, search]);

  return (
    <div>
      <PageHeader
        title="Personaggi del Party"
        subtitle="Gli eroi delle cronache: i personaggi giocanti del gruppo."
        actions={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {isMaster ? "Personaggio" : "Crea il mio personaggio"}
            </Button>
          ) : myCharacter ? (
            <Button variant="outline" asChild>
              <Link href={`/entita/${myCharacter.id}`}>Il mio personaggio</Link>
            </Button>
          ) : undefined
        }
      />

      {/* Promemoria primo accesso per il giocatore senza PC */}
      {!isMaster && !hasOwnPc && canContribute && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3">
          <p className="text-sm text-foreground/90">
            Non hai ancora un personaggio. Creane uno per unirti al party.
          </p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            Crea il mio personaggio
          </Button>
        </div>
      )}

      <div className="mb-6 max-w-xs">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gold/60" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca tra i PC…"
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[3/4] rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Il party non si è ancora riunito"
          description="Quando i giocatori creeranno i loro personaggi, compariranno qui."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => (
            <PartyCharacterCard
              key={entry.id}
              entry={entry}
              isMine={Boolean(user && myCharacter?.id === entry.id)}
            />
          ))}
        </div>
      )}

      {/* Riserva: PC fuori dal party — solo Master */}
      {isMaster && reservePcs.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus className="size-4.5 text-gold" />
            <h2 className="font-heading text-lg font-semibold tracking-wider">
              Fuori dal Party
            </h2>
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-300"
            >
              Solo Master
            </Badge>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Personaggi creati ma non ancora nel party. Aggiungili quando vuoi.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reservePcs.map((character) => (
              <ReserveCard key={character.id} character={character} />
            ))}
          </div>
        </section>
      )}

      {canCreate && (
        <CharacterCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          lockKind="PC"
        />
      )}
    </div>
  );
}

function ReserveCard({ character }: { character: Entity }) {
  const { setPartyMember } = useCharacterMutations();
  const race = String(character.fields.race ?? "");
  const klass = String(character.fields.class ?? "");
  const subtitle = [race, klass].filter(Boolean).join(" • ") || "—";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-hairline-strong bg-card p-3">
      <Link
        href={`/entita/${character.id}`}
        className="size-14 shrink-0 overflow-hidden rounded-lg border border-hairline"
      >
        <FantasyImage
          src={character.imageUrl}
          alt={character.name}
          fallbackIcon={Users}
          className="size-14"
          sizes="56px"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/entita/${character.id}`}
          className="block truncate font-heading font-semibold text-foreground hover:text-gold-bright"
        >
          {character.name}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        {character.fields.ownerName ? (
          <p className="truncate text-[11px] text-muted-foreground/80">
            {String(character.fields.ownerName)}
          </p>
        ) : (
          <p className="truncate text-[11px] text-amber-300/80">
            Nessun proprietario
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={() => setPartyMember.mutate({ entity: character, member: true })}
        disabled={setPartyMember.isPending}
      >
        <Plus className="size-3.5" />
        Al party
      </Button>
    </div>
  );
}

function PartyCharacterCard({
  entry,
  isMine,
}: {
  entry: PartyCardEntry;
  isMine: boolean;
}) {
  const { card } = entry;
  const portrait = card.tokenUrl || card.imageUrl;
  const { canContribute } = useAuth();
  const { data: favorites } = useFavorites();
  const toggleFav = useToggleFavorite();
  const fav = isFavorite(favorites, "character", entry.id);
  const hasCompanion = Boolean(card.companion?.imageUrl);

  return (
    <Link
      href={`/entita/${entry.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border",
        "bg-gradient-to-b from-stone-surface to-stone-mid/80",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.7)]",
        "transition-all duration-200 hover:-translate-y-0.5",
        "border-gold/40 hover:border-gold/65 hover:shadow-[inset_0_1px_0_rgba(232,201,121,0.22),0_12px_40px_-8px_rgba(0,0,0,0.8)]"
      )}
    >
      {/* Striscia dorata superiore */}
      <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <span className="pointer-events-none absolute inset-0 rounded-xl bg-gold/[0.03]" />

      {/* Portrait 3:4 */}
      <div className="relative isolate aspect-[3/4] overflow-hidden">
        <FantasyImage
          src={portrait}
          alt={card.name}
          fallbackIcon={Users}
          className={cn("size-full", card.isDead && FALLEN_FILTER)}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          position="top"
        />

        {/* Trattamento dark-horror per i caduti */}
        {card.isDead && <FallenOverlay />}

        {/* Gradiente bottom-up */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-mid via-stone-mid/30 to-transparent" />

        {/* Dead skull o status badge — top-left */}
        {card.isDead ? (
          <span className="absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-full border border-crimson-bright/50 bg-background/90">
            <Skull className="size-3.5 text-crimson-light" />
          </span>
        ) : card.status !== "ALIVE" ? (
          <span className={cn(
            "absolute left-2 top-2 z-10 rounded border px-1.5 py-0.5 font-heading text-[9px] font-bold uppercase",
            CHARACTER_STATUS_BADGES[card.status]
          )}>
            {CHARACTER_STATUS_LABELS[card.status]}
          </span>
        ) : null}

        {/* Stella preferiti — top-right */}
        {canContribute && (
          <button
            type="button"
            aria-label={fav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleFav.mutate({ kind: "character", id: entry.id, label: card.name });
            }}
            className="absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-full border border-gold/40 bg-background/90 text-gold/80 transition-colors hover:text-gold"
          >
            <Star className={cn("size-3.5", fav && "fill-gold text-gold")} />
          </button>
        )}

        {/* Famiglio — cerchio dorato sovrapposto in basso a destra */}
        {hasCompanion && (
          <span
            className="absolute bottom-9 right-2.5 z-20 flex size-11 items-center justify-center overflow-hidden rounded-full border-2 border-gold/65 bg-background shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
            title={`Famiglio: ${card.companion!.name}`}
          >
            <FantasyImage
              src={card.companion!.imageUrl}
              alt={card.companion!.name}
              fallbackIcon={Users}
              className="size-11"
              sizes="44px"
            />
          </span>
        )}

        {/* Nome + race/class in overlay sul fondo */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-3">
          <p className="font-heading text-[9px] tracking-[0.15em] text-gold/70 uppercase">
            {[card.race, card.classesSummary].filter(Boolean).join(" · ") || "—"}
          </p>
          <h3 className="font-heading text-[15px] font-semibold leading-tight text-foreground transition-colors group-hover:text-gold-bright">
            {card.name}
            {isMine && (
              <Badge variant="outline" className="ml-2 border-gold/50 text-[10px] text-gold-bright">
                Tu
              </Badge>
            )}
          </h3>
        </div>
      </div>

      {/* Footer: giocatore + famiglio */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          {card.ownerName ? (
            <p className="truncate font-heading text-[11px] text-muted-foreground">
              {card.ownerName}
            </p>
          ) : (
            <span className="text-[11px] text-muted-foreground/40">—</span>
          )}
          {card.companion?.name && (
            <p className="truncate text-[10px] text-gold/55">
              Famiglio: {card.companion.name}
            </p>
          )}
        </div>
      </div>

    </Link>
  );
}

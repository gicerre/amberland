"use client";

import { Network, Plus, ScrollText, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ImmersiveHero } from "@/components/shared/immersive-hero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { useEntitiesByType } from "@/features/entities/data";
import { QuestBoardCard } from "@/features/entities/components/quest-board-card";
import { QuickCreateDialog } from "@/features/entities/components/quick-create-dialog";

/** Sezioni della bacheca, in ordine di urgenza narrativa. */
const STATUS_GROUPS: {
  label: string;
  values: string[];
  accent: string;
}[] = [
  { label: "In corso", values: ["ACTIVE"], accent: "#d4af37" },
  { label: "Prossime imprese", values: ["NEXT"], accent: "#ff7a18" },
  { label: "Trame segrete", values: ["SECRET"], accent: "#7c5cff" },
  { label: "Sulla bacheca", values: ["AVAILABLE"], accent: "#9a907c" },
  { label: "Negli annali", values: ["COMPLETED", "FAILED"], accent: "#c8a75d" },
];

/**
 * Bacheca delle Commesse e delle Imprese: le quest del party, raccolte per
 * stato in un albo dark-fantasy cinematografico.
 */
export default function QuestsPage() {
  const { isMaster } = useAuth();
  const { data: quests, isLoading } = useEntitiesByType("quest");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (quests ?? []).filter(
      (quest) =>
        !term ||
        quest.name.toLowerCase().includes(term) ||
        quest.tags.some((tag) => tag.toLowerCase().includes(term))
    );
  }, [quests, search]);

  const groups = useMemo(
    () =>
      STATUS_GROUPS.map((group) => ({
        ...group,
        items: filtered.filter((quest) =>
          group.values.includes(String(quest.fields.status ?? "AVAILABLE"))
        ),
      })).filter((group) => group.items.length > 0),
    [filtered]
  );

  return (
    <div>
      {/* ════════ Hero immersivo a piena larghezza, con titolo sovrapposto ════════ */}
      <div className="relative left-1/2 -mt-4 mb-7 w-screen -translate-x-1/2 sm:-mt-6 lg:-mt-10 lg:w-[calc(100vw-18rem)]">
        <ImmersiveHero
          src="/images/albo-delle-imprese.webp"
          alt="Albo delle Imprese"
          accent="#9b59b6"
          priority
          className="rounded-none border-0"
        >
          <div className="max-w-3xl">
            <p className="font-heading text-[11px] font-semibold tracking-[0.45em] text-arcane-bright/90 uppercase sm:text-xs">
              Bacheca delle commesse
            </p>
            <h1 className="text-gold-gradient mt-3 font-heading text-4xl font-black tracking-wider drop-shadow-[0_2px_20px_rgba(0,0,0,0.85)] sm:text-5xl lg:text-6xl">
              L&rsquo;Albo delle Imprese
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-parchment-dark/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-base">
              Incarichi, misteri e chiamate all&rsquo;avventura del party,
              raccolti per stato: ciò che arde adesso, ciò che attende e ciò che
              è ormai leggenda.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/grafo">
                <Network className="size-4" />
                Vista rete
              </Link>
            </Button>
            {isMaster && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Nuova quest
              </Button>
            )}
          </div>
        </ImmersiveHero>
      </div>

      {/* Ricerca */}
      <div className="relative mb-7 w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gold/60" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cerca tra le imprese…"
          className="pl-9"
        />
      </div>

      {/* Contenuto */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-60 rounded-2xl bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nessuna quest nelle cronache"
          description="Le bacheche delle taverne sono vuote. Il Master sta tramando qualcosa…"
          action={
            isMaster ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Aggiungi una quest
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-9">
          {groups.map((group) => (
            <section key={group.label}>
              <QuestSectionHeading
                label={group.label}
                count={group.items.length}
                accent={group.accent}
              />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((quest) => (
                  <QuestBoardCard key={quest.id} entity={quest} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {isMaster && (
        <QuickCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          type="quest"
        />
      )}
    </div>
  );
}

/** Intestazione di sezione con barra-glow nel colore dello stato. */
function QuestSectionHeading({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        aria-hidden
        className="h-5 w-1 shrink-0 rounded-full"
        style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
      />
      <h2 className="font-heading text-xl font-semibold tracking-wider whitespace-nowrap text-foreground">
        {label}
      </h2>
      <span className="rounded-full border border-gold/25 bg-night/40 px-2 py-0.5 font-heading text-xs text-gold/70">
        {count}
      </span>
      <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
    </div>
  );
}

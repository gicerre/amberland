"use client";

import { Network, Plus, ScrollText, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ListPageHero } from "@/components/shared/list-page-hero";
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
  { label: "In corso", values: ["ACTIVE"], accent: "var(--status-active)" },
  { label: "Prossime imprese", values: ["NEXT"], accent: "var(--status-next)" },
  { label: "Trame segrete", values: ["SECRET"], accent: "var(--status-secret)" },
  { label: "Sulla bacheca", values: ["AVAILABLE"], accent: "var(--status-available)" },
  { label: "Negli annali", values: ["COMPLETED", "FAILED"], accent: "var(--status-archive)" },
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
      {/* Hero di sala (ridotto, con Targa sticky al collasso) */}
      <ListPageHero
        src="/images/albo-delle-imprese.webp"
        alt="Albo delle Imprese"
        accent="var(--arcane-bright)"
        eyebrow="Bacheca delle commesse"
        title="L'Albo delle Imprese"
        subtitle={
          <>
            Incarichi, misteri e chiamate all&rsquo;avventura del party,
            raccolti per stato: ciò che arde adesso, ciò che attende e ciò che
            è ormai leggenda.
          </>
        }
        actions={
          <>
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
          </>
        }
      />

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
        <div className="space-y-10">
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

/**
 * Intestazione di sezione Obsidian: indicatore di stato minimale
 * (barra 2px nel colore-token) + conteggio in un counter pill quieto.
 */
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
        className="h-5 w-0.5 shrink-0 rounded-full"
        style={{ background: accent }}
      />
      <h2 className="font-heading text-lg font-semibold tracking-wide whitespace-nowrap text-parchment">
        {label}
      </h2>
      <span className="rounded-full border border-hairline bg-surface-1 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
        {count}
      </span>
      <span aria-hidden className="h-px flex-1 bg-hairline" />
    </div>
  );
}

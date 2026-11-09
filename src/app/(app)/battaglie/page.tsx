"use client";

import { Plus, Swords } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ListPageHero } from "@/components/shared/list-page-hero";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { BattleCard } from "@/features/battle/components/battle-card";
import { BattleCreateDialog } from "@/features/battle/components/battle-create-dialog";
import { useBattles } from "@/features/battle/data";
import { BATTLE_EDITABLE_STATUSES, type Battle } from "@/types/battle";

/**
 * Campi di Battaglia: l'elenco degli scontri della campagna.
 * Il Master vede anche le bozze; il party solo ciò che è stato aperto.
 */
export default function BattlesPage() {
  const { isMaster } = useAuth();
  const { data: battles, isLoading } = useBattles();
  const [createOpen, setCreateOpen] = useState(false);

  // In preparazione sopra, in corso e concluse sotto: il Master guarda
  // quasi sempre l'ultima mappa che stava disegnando.
  const { drafts, published } = useMemo(() => {
    const list = battles ?? [];
    return {
      drafts: list.filter((battle) =>
        BATTLE_EDITABLE_STATUSES.includes(battle.status)
      ),
      published: list.filter(
        (battle) => !BATTLE_EDITABLE_STATUSES.includes(battle.status)
      ),
    };
  }, [battles]);

  const hrefFor = (battle: Battle) =>
    isMaster ? `/battaglie/${battle.id}/editor` : undefined;

  return (
    <div>
      <ListPageHero
        eyebrow="Dove si decide tutto"
        title="Campi di Battaglia"
        subtitle="Mappe, schiere e turni: qui gli scontri prendono forma prima di prendere sangue."
        actions={
          isMaster ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nuovo campo</span>
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-60 w-full rounded-2xl" />
          ))}
        </div>
      ) : (battles ?? []).length === 0 ? (
        <EmptyState
          icon={Swords}
          title="Nessun campo tracciato"
          description={
            isMaster
              ? "Apri il primo campo: carichi l'immagine della mappa, allinei la griglia e configuri gli elementi che vi sono disegnati."
              : "Quando il Master aprirà uno scontro, lo troverai qui."
          }
        />
      ) : (
        <div className="space-y-9">
          {isMaster && drafts.length > 0 && (
            <Section title="In preparazione" count={drafts.length}>
              {drafts.map((battle) => (
                <BattleCard
                  key={battle.id}
                  battle={battle}
                  href={hrefFor(battle)}
                />
              ))}
            </Section>
          )}

          {published.length > 0 && (
            <Section title="Cronaca degli scontri" count={published.length}>
              {published.map((battle) => (
                <BattleCard
                  key={battle.id}
                  battle={battle}
                  href={hrefFor(battle)}
                />
              ))}
            </Section>
          )}
        </div>
      )}

      {isMaster && (
        <BattleCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-heading text-sm tracking-[0.14em] text-muted-foreground uppercase">
          {title}
        </h2>
        <span className="inline-flex min-w-5 items-center justify-center rounded-full border border-hairline px-1.5 py-px font-heading text-[11px] leading-none text-muted-foreground">
          {count}
        </span>
        <div className="h-px flex-1 bg-hairline" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

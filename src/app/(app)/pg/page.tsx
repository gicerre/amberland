"use client";

import { ScrollText, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CodexProvider } from "@/features/characters/codex/codex-context";
import {
  CombatScreen,
  isTableTab,
  type TableTab,
} from "@/features/characters/codex/combat-mode";
import { useMyCharacter } from "@/features/characters/data";
import { useEntity } from "@/features/entities/data";

/**
 * /pg — il proprio personaggio, pronto per il tavolo.
 * Indirizzo stabile: blocco schermo, refresh o "indietro" riportano
 * esattamente qui, sulla stessa scheda (?t=magic …).
 */
export default function MyCharacterPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <MyCharacterTable />
    </Suspense>
  );
}

function MyCharacterTable() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("t");
  const tab: TableTab = isTableTab(raw) ? raw : "arsenal";

  const { data: mine, isLoading: mineLoading } = useMyCharacter();
  // La query della singola entità è quella che il Codex aggiorna in modo
  // ottimistico: i PF cambiano sullo schermo nell'istante del tocco.
  const { data: entity, isLoading } = useEntity(mine?.id);

  const setTab = useCallback(
    (next: TableTab) => {
      const query = new URLSearchParams(params.toString());
      query.set("t", next);
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  if (mineLoading || (mine && isLoading)) return <TableSkeleton />;

  if (!mine || !entity) {
    return (
      <EmptyState
        icon={Users}
        title="Nessun personaggio"
        description="Questa vista mostra il tuo eroe durante la sessione. Non hai ancora un personaggio collegato al tuo account."
        action={
          <Button variant="outline" asChild>
            <Link href="/party">Vai al Party</Link>
          </Button>
        }
      />
    );
  }

  return (
    <CodexProvider entity={entity}>
      <CombatScreen
        tab={tab}
        onTabChange={setTab}
        stickyClassName="top-12 sm:top-13 lg:top-0"
        exit={
          <Button variant="outline" size="sm" asChild className="min-h-11 shrink-0">
            <Link href={`/entita/${entity.id}`} aria-label="Apri la scheda completa">
              <ScrollText className="size-4" />
              <span className="hidden sm:inline">Scheda</span>
            </Link>
          </Button>
        }
      />
    </CodexProvider>
  );
}

function TableSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

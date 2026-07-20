"use client";

import { BookOpen, Plus, ScrollText } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ListPageHero } from "@/components/shared/list-page-hero";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/auth-provider";
import { ChroniclesBook } from "@/features/chronicles/components/chronicles-book";
import { useChronicles } from "@/features/chronicles/data";
import { EntityCard } from "@/features/entities/components/entity-card";
import { QuickCreateDialog } from "@/features/entities/components/quick-create-dialog";
import { useEntitiesByType } from "@/features/entities/data";

/**
 * Cronache: il Libro della Storia di Amberland — il codex narrativo
 * ufficiale della campagna — e il diario delle sessioni di gioco.
 */
export default function ChroniclesPage() {
  const { isMaster } = useAuth();
  const [sessionOpen, setSessionOpen] = useState(false);

  const { data: chronicles } = useChronicles();
  const { data: sessions, isLoading: sessionsLoading } =
    useEntitiesByType("session");

  const sortedSessions = useMemo(
    () =>
      [...(sessions ?? [])].sort(
        (a, b) =>
          Number(b.fields.sessionNumber ?? 0) -
          Number(a.fields.sessionNumber ?? 0)
      ),
    [sessions]
  );

  return (
    <div>
      {/* TODO sfondo: src="/images/cronache.webp" */}
      <ListPageHero
        eyebrow="Ciò che è stato"
        title="Cronache"
        subtitle="Il Libro della Storia di Amberland: guerre, leggende, diari e profezie, incisi per sempre."
        accent="var(--gold-light)"
      />

      <Tabs defaultValue="libro">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="libro" className="gap-2">
              <ScrollText className="size-4" />
              Il Libro delle Cronache
              <TabCountSeal count={(chronicles ?? []).length} />
            </TabsTrigger>
            <TabsTrigger value="sessioni" className="gap-2">
              <BookOpen className="size-4" />
              Diario delle sessioni
              <TabCountSeal count={sortedSessions.length} />
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ------------------------- Il Libro ------------------------ */}
        <TabsContent value="libro">
          <ChroniclesBook />
        </TabsContent>

        {/* ------------------------ Sessioni ------------------------ */}
        <TabsContent value="sessioni">
          {isMaster && (
            <div className="mb-5 flex justify-end">
              <Button onClick={() => setSessionOpen(true)}>
                <Plus className="size-4" />
                Sessione
              </Button>
            </div>
          )}
          {sessionsLoading ? (
            <Skeleton className="h-64 w-full rounded-xl bg-muted/60" />
          ) : sortedSessions.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nessuna sessione registrata"
              description="Dopo ogni serata di gioco, il recap finisce qui: il diario collettivo della campagna."
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sortedSessions.map((session) => (
                <EntityCard key={session.id} entity={session} showType={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {isMaster && (
        <QuickCreateDialog
          open={sessionOpen}
          onOpenChange={setSessionOpen}
          type="session"
          stay
        />
      )}
    </div>
  );
}

/** Conteggio in un sigillo sul nastro del segnalibro (niente "(12)"). */
function TabCountSeal({ count }: { count: number }) {
  return (
    <span className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full border border-gold/30 bg-night px-1.5 py-px font-heading text-[11px] leading-none text-gold/80">
      {count}
    </span>
  );
}

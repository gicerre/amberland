"use client";

import { BookOpen, CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { richTextToPlainText } from "@/components/shared/rich-text-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/auth-provider";
import { EntityCard } from "@/features/entities/components/entity-card";
import { QuickCreateDialog } from "@/features/entities/components/quick-create-dialog";
import { useEntitiesByType } from "@/features/entities/data";
import type { Entity, EntityType } from "@/types/entities";

/**
 * Cronache del regno: la timeline degli eventi storici
 * e il diario delle sessioni di gioco.
 */
export default function ChroniclesPage() {
  const { isMaster } = useAuth();
  const [createType, setCreateType] = useState<EntityType | null>(null);

  const { data: events, isLoading: eventsLoading } = useEntitiesByType("event");
  const { data: sessions, isLoading: sessionsLoading } =
    useEntitiesByType("session");

  const sortedEvents = useMemo(
    () =>
      [...(events ?? [])].sort(
        (a, b) =>
          Number(a.fields.eventOrder ?? 0) - Number(b.fields.eventOrder ?? 0)
      ),
    [events]
  );

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
      <PageHeader
        title="Cronache"
        subtitle="La storia del mondo e il diario del party: ciò che è stato, inciso per sempre."
      />

      <Tabs defaultValue="eventi">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="eventi" className="gap-2">
              <CalendarDays className="size-4" />
              Eventi ({sortedEvents.length})
            </TabsTrigger>
            <TabsTrigger value="sessioni" className="gap-2">
              <BookOpen className="size-4" />
              Sessioni ({sortedSessions.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ------------------------- Eventi ------------------------- */}
        <TabsContent value="eventi">
          {isMaster && (
            <div className="mb-5 flex justify-end">
              <Button onClick={() => setCreateType("event")}>
                <Plus className="size-4" />
                Evento
              </Button>
            </div>
          )}
          {eventsLoading ? (
            <Skeleton className="h-64 w-full rounded-xl bg-muted/60" />
          ) : sortedEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="La storia non è ancora stata scritta"
              description="Guerre, incoronazioni, cataclismi: gli eventi del mondo appariranno qui in ordine cronologico."
            />
          ) : (
            <Timeline events={sortedEvents} />
          )}
        </TabsContent>

        {/* ------------------------ Sessioni ------------------------ */}
        <TabsContent value="sessioni">
          {isMaster && (
            <div className="mb-5 flex justify-end">
              <Button onClick={() => setCreateType("session")}>
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

      {isMaster && createType && (
        <QuickCreateDialog
          open={createType !== null}
          onOpenChange={(open) => !open && setCreateType(null)}
          type={createType}
          stay
        />
      )}
    </div>
  );
}

/** Timeline verticale degli eventi storici. */
function Timeline({ events }: { events: Entity[] }) {
  return (
    <ol className="relative ml-3 space-y-6 border-l border-gold/25 pl-8">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            aria-hidden
            className="absolute top-2 -left-[39px] size-3 rotate-45 border border-gold bg-gold/30"
          />
          <Link
            href={`/entita/${event.id}`}
            className="group block rounded-xl border border-gold/15 bg-card/60 p-5 transition-all hover:-translate-y-0.5 hover:border-gold/45"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              {typeof event.fields.eventDate === "string" &&
                event.fields.eventDate && (
                  <Badge
                    variant="outline"
                    className="border-gold/40 bg-gold/10 font-heading text-gold-bright"
                  >
                    {event.fields.eventDate}
                  </Badge>
                )}
              <h3 className="font-heading text-lg font-semibold text-foreground group-hover:text-gold-bright">
                {event.name}
              </h3>
            </div>
            {richTextToPlainText(event.description) && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {richTextToPlainText(event.description)}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}

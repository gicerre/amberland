"use client";

import {
  BookOpen,
  CalendarCog,
  Feather,
  Hourglass,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { useEntitiesByType } from "@/features/entities/data";
import { cn } from "@/lib/utils";
import type { ChronicleCategory } from "@/types/chronicles";
import type { Entity } from "@/types/entities";

import { UNKNOWN_DATE_SORT_KEY } from "../calendar";
import { CHRONICLE_CATEGORY_META } from "../constants";
import {
  useArcs,
  useCalendar,
  useChronicles,
  useChroniclesLastSeen,
  useMarkChroniclesSeen,
} from "../data";
import { CalendarArcsDialog } from "./calendar-arcs-dialog";
import { ChronicleCard } from "./chronicle-card";
import { ChronicleEditor } from "./chronicle-editor";
import { MigrateEventsDialog } from "./migrate-events-dialog";

type GroupMode = "tempo" | "arco" | "sessione" | "categoria";

const GROUP_MODES: { value: GroupMode; label: string }[] = [
  { value: "tempo", label: "Cronologia" },
  { value: "arco", label: "Archi" },
  { value: "sessione", label: "Sessioni" },
  { value: "categoria", label: "Categorie" },
];

interface BookGroup {
  key: string;
  label: string;
  entries: Entity[];
}

/**
 * L'indice del Libro delle Cronache: capitoli ordinati per calendario
 * fantasy, raggruppati per anno/arco/sessione/categoria, con ricerca
 * e filtri per categoria.
 */
export function ChroniclesBook() {
  const { isMaster, canContribute } = useAuth();
  const { data: chronicles, isLoading } = useChronicles();
  const { data: calendar } = useCalendar();
  const { data: arcs } = useArcs();
  const { data: sessions } = useEntitiesByType("session");
  const { data: legacyEvents } = useEntitiesByType("event", isMaster);

  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<ChronicleCategory | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>("tempo");
  const [createOpen, setCreateOpen] = useState(false);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Spartiacque "Nuovo": fissato al primo caricamento, poi il segnalibro
  // dell'utente viene spostato a ora (i visitatori non scrivono nulla).
  const { data: lastSeen, isSuccess: seenLoaded } = useChroniclesLastSeen();
  const markSeen = useMarkChroniclesSeen();
  const [watermark, setWatermark] = useState<number | null>(null);
  useEffect(() => {
    if (!seenLoaded || watermark !== null) return;
    setWatermark(lastSeen?.toMillis() ?? 0);
    markSeen.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenLoaded, watermark]);

  const isNew = (entity: Entity) =>
    watermark !== null &&
    watermark > 0 &&
    (entity.createdAt?.toMillis() ?? 0) > watermark;

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return (chronicles ?? []).filter((entity) => {
      const data = entity.chronicle;
      if (category && data?.category !== category) return false;
      if (!needle) return true;
      return (
        entity.name.toLowerCase().includes(needle) ||
        (data?.subtitle ?? "").toLowerCase().includes(needle) ||
        (data?.contentText ?? "").toLowerCase().includes(needle) ||
        entity.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [chronicles, term, category]);

  const groups = useMemo<BookGroup[]>(() => {
    const map = new Map<string, BookGroup>();
    const push = (key: string, label: string, entity: Entity) => {
      const group = map.get(key) ?? { key, label, entries: [] };
      group.entries.push(entity);
      map.set(key, group);
    };

    for (const entity of filtered) {
      const data = entity.chronicle;
      switch (groupMode) {
        case "tempo": {
          if (!data?.date || data.sortKey === UNKNOWN_DATE_SORT_KEY) {
            push("zz-immemore", "Tempo immemore", entity);
            break;
          }
          const era = data.date.eraId
            ? (calendar?.eras ?? []).find((e) => e.id === data.date!.eraId)
            : undefined;
          const suffix = era
            ? ` ${era.abbreviation || era.name}`
            : calendar?.yearSuffix
              ? ` ${calendar.yearSuffix}`
              : "";
          // Tronca mese/giorno dalla chiave: un gruppo per era+anno.
          const yearKey = Math.floor(data.sortKey / 10_000);
          push(
            `anno-${String(yearKey).padStart(12, "0")}`,
            `Anno ${data.date.year}${suffix}`,
            entity
          );
          break;
        }
        case "arco": {
          const arc = data?.arcId
            ? (arcs ?? []).find((candidate) => candidate.id === data.arcId)
            : undefined;
          if (arc) {
            push(
              `arco-${String(arc.order).padStart(6, "0")}-${arc.id}`,
              arc.name,
              entity
            );
          } else {
            push("zz-senza-arco", "Fuori dagli archi", entity);
          }
          break;
        }
        case "sessione": {
          const session = data?.sessionId
            ? (sessions ?? []).find((s) => s.id === data.sessionId)
            : undefined;
          if (session) {
            const number = Number(session.fields.sessionNumber ?? 0);
            push(
              `sessione-${String(number).padStart(6, "0")}-${session.id}`,
              session.name,
              entity
            );
          } else {
            push("zz-senza-sessione", "Fuori dalle sessioni", entity);
          }
          break;
        }
        case "categoria": {
          const meta = data
            ? CHRONICLE_CATEGORY_META[data.category]
            : undefined;
          push(
            `categoria-${data?.category ?? "OTHER"}`,
            meta?.label ?? "Altro",
            entity
          );
          break;
        }
      }
    }

    return [...map.values()].sort((a, b) =>
      a.key.localeCompare(b.key, "it")
    );
  }, [filtered, groupMode, calendar, arcs, sessions]);

  // Per anno l'ordine è già cronologico grazie al prefisso sulla chiave;
  // le voci dentro ogni gruppo conservano l'ordine di lettura del Libro.

  const hasLegacyEvents = isMaster && (legacyEvents ?? []).length > 0;

  return (
    <div className="space-y-6">
      {/* Barra degli strumenti del Libro */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gold/60" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Cerca nel Libro… (titolo, testo, tag)"
            className="pl-9"
          />
        </div>
        <div className="flex rounded-full border border-hairline bg-surface-0 p-0.5">
          {GROUP_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setGroupMode(mode.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                groupMode === mode.value
                  ? "bg-surface-3 text-parchment"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
        {isMaster ? (
          <>
            <Button
              variant="outline"
              size="icon"
              aria-label="Calendario e archi narrativi"
              title="Calendario e archi narrativi"
              onClick={() => setSettingsOpen(true)}
            >
              <CalendarCog className="size-4" />
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Feather className="size-4" />
              Nuova cronaca
            </Button>
          </>
        ) : (
          canContribute && (
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Feather className="size-4" />
              Proponi un capitolo
            </Button>
          )
        )}
      </div>

      {/* Filtri per categoria */}
      <div className="flex flex-wrap gap-1.5">
        <CategoryChip
          active={category === null}
          label="Tutte"
          onClick={() => setCategory(null)}
        />
        {(
          Object.entries(CHRONICLE_CATEGORY_META) as [
            ChronicleCategory,
            (typeof CHRONICLE_CATEGORY_META)[ChronicleCategory],
          ][]
        ).map(([value, meta]) => (
          <CategoryChip
            key={value}
            active={category === value}
            label={meta.label}
            onClick={() => setCategory(category === value ? null : value)}
          />
        ))}
      </div>

      {/* Migrazione dei vecchi Eventi (solo Master, finché ne esistono) */}
      {hasLegacyEvents && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-amber-200">
            <Hourglass className="size-4" />
            {(legacyEvents ?? []).length} eventi del vecchio archivio attendono
            di essere trascritti nel Libro.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/50 text-amber-200 hover:bg-amber-500/15"
            onClick={() => setMigrateOpen(true)}
          >
            Trascrivi nel Libro
          </Button>
        </div>
      )}

      {/* Indice */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={
            (chronicles ?? []).length === 0
              ? "Il Libro attende il primo capitolo"
              : "Nessun capitolo corrisponde alla ricerca"
          }
          description={
            (chronicles ?? []).length === 0
              ? "Guerre, leggende, diari e profezie: la storia di Amberland verrà scritta qui."
              : "Prova a cambiare parole, categoria o raggruppamento."
          }
          action={
            (isMaster || canContribute) && (chronicles ?? []).length === 0 ? (
              <Button
                variant={isMaster ? "default" : "outline"}
                onClick={() => setCreateOpen(true)}
              >
                <Feather className="size-4" />
                {isMaster ? "Scrivi il primo capitolo" : "Proponi un capitolo"}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-3 flex items-center gap-4">
                <h2 className="font-heading text-lg font-semibold tracking-wider text-foreground">
                  {group.label}
                </h2>
                <span className="h-px flex-1 bg-hairline" aria-hidden />
                <span className="font-heading text-xs text-muted-foreground">
                  {group.entries.length}
                </span>
              </div>
              <div className="space-y-2.5">
                {group.entries.map((entity) => (
                  <ChronicleCard
                    key={entity.id}
                    entity={entity}
                    isNew={isNew(entity)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ChronicleEditor
        open={createOpen}
        onOpenChange={setCreateOpen}
        entity={null}
      />
      <MigrateEventsDialog open={migrateOpen} onOpenChange={setMigrateOpen} />
      {isMaster && (
        <CalendarArcsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}
    </div>
  );
}

function CategoryChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-gold/50 bg-gold/15 text-gold-bright"
          : "border-hairline text-muted-foreground hover:border-hairline-strong hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

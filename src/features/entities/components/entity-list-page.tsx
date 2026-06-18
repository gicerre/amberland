"use client";

import { LayoutGrid, Plus, Search, Table as TableIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import type { Entity, EntityType } from "@/types/entities";

import { useEntitiesByType } from "../data";
import { ENTITY_REGISTRY } from "../registry";
import { QuickCreateDialog } from "./quick-create-dialog";
import { SpecializedEntityCard } from "./specialized-cards";

interface EntityListPageProps {
  type: EntityType;
  title?: string;
  subtitle?: string;
  /** Filtro aggiuntivo (es. solo membri del party). */
  filter?: (entity: Entity) => boolean;
  /** Chiave di un campo select del registro da usare come filtro a chip. */
  chipFieldKey?: string;
  /**
   * Chiave di un campo select del registro su cui RAGGRUPPARE l'elenco in
   * sezioni (es. lo stato delle quest). Sostituisce i filtri a chip.
   */
  groupByFieldKey?: string;
  /**
   * Sezioni personalizzate (ordine + accorpamenti) sul campo di raggruppamento:
   * ogni voce ha un'etichetta e i valori che vi confluiscono. Le sezioni vuote
   * sono nascoste (es. "Segrete" sparisce per i giocatori).
   */
  customGroups?: { label: string; values: string[] }[];
  emptyTitle?: string;
  emptyDescription?: string;
  /** Nasconde il pulsante di creazione (es. pagina Party). */
  hideCreate?: boolean;
}

/**
 * Pagina elenco universale per un tipo di entità: ricerca locale,
 * filtri a chip su un campo del registro e creazione rapida (Master).
 */
export function EntityListPage({
  type,
  title,
  subtitle,
  filter,
  chipFieldKey,
  groupByFieldKey,
  customGroups,
  emptyTitle,
  emptyDescription,
  hideCreate = false,
}: EntityListPageProps) {
  const config = ENTITY_REGISTRY[type];
  const { isMaster } = useAuth();
  const { data: entities, isLoading } = useEntitiesByType(type);

  const [search, setSearch] = useState("");
  const [chip, setChip] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  // Vista card/tabella, ricordata tra le liste.
  const [view, setView] = useState<"card" | "table">("card");
  useEffect(() => {
    const saved = localStorage.getItem("amberland:list-view");
    if (saved === "table" || saved === "card") setView(saved);
  }, []);
  const changeView = (next: "card" | "table") => {
    setView(next);
    try {
      localStorage.setItem("amberland:list-view", next);
    } catch {
      /* ignora */
    }
  };

  const chipDef = chipFieldKey
    ? config.fields.find(
        (field) => field.key === chipFieldKey && field.kind === "select"
      )
    : undefined;

  const groupDef = groupByFieldKey
    ? config.fields.find(
        (field) => field.key === groupByFieldKey && field.kind === "select"
      )
    : undefined;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (entities ?? [])
      .filter((entity) => (filter ? filter(entity) : true))
      .filter((entity) =>
        chip && chipDef ? entity.fields[chipDef.key] === chip : true
      )
      .filter(
        (entity) =>
          !term ||
          entity.name.toLowerCase().includes(term) ||
          entity.tags.some((tag) => tag.toLowerCase().includes(term))
      );
  }, [entities, filter, chip, chipDef, search]);

  // Raggruppamento per stato (es. quest): sezioni in ordine di opzione.
  const groups = useMemo(() => {
    if (!groupDef) return null;
    const options = groupDef.options ?? [];
    const firstValue = options[0]?.value ?? "";
    const valueOf = (entity: Entity) =>
      String(entity.fields[groupDef.key] ?? "") || firstValue;
    // Sezioni personalizzate (ordine + accorpamenti) se richieste.
    if (customGroups) {
      return customGroups
        .map((group) => ({
          label: group.label,
          value: group.label,
          items: filtered.filter((entity) =>
            group.values.includes(valueOf(entity))
          ),
        }))
        .filter((group) => group.items.length > 0);
    }
    const known = options.map((option) => ({
      label: option.label,
      value: option.value,
      items: filtered.filter((entity) => valueOf(entity) === option.value),
    }));
    const others = filtered.filter(
      (entity) => !options.some((option) => option.value === valueOf(entity))
    );
    if (others.length > 0) {
      known.push({ label: "Altro", value: "__other__", items: others });
    }
    return known.filter((group) => group.items.length > 0);
  }, [groupDef, filtered, customGroups]);

  return (
    <div>
      <PageHeader
        title={title ?? config.plural}
        subtitle={subtitle ?? config.flavor}
        actions={
          isMaster && !hideCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {config.label}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative w-full min-w-0 flex-1 sm:min-w-48 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gold/60" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Cerca tra: ${config.plural.toLowerCase()}…`}
            className="pl-9"
          />
        </div>

        {chipDef && (
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              active={chip === null}
              label="Tutti"
              onClick={() => setChip(null)}
            />
            {(chipDef.options ?? []).map((option) => (
              <FilterChip
                key={option.value}
                active={chip === option.value}
                label={option.label}
                onClick={() =>
                  setChip(chip === option.value ? null : option.value)
                }
              />
            ))}
          </div>
        )}

        <div className="ml-auto shrink-0 inline-flex rounded-lg border border-gold/20 bg-night/30 p-1">
          <ViewToggle
            active={view === "card"}
            onClick={() => changeView("card")}
            label="Card"
            icon={<LayoutGrid className="size-4" />}
          />
          <ViewToggle
            active={view === "table"}
            onClick={() => changeView("table")}
            label="Tabella"
            icon={<TableIcon className="size-4" />}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-60 rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={config.icon}
          title={emptyTitle ?? `Nessuna voce tra: ${config.plural.toLowerCase()}`}
          description={
            emptyDescription ??
            "Le cronache attendono ancora di essere scritte."
          }
          action={
            isMaster && !hideCreate ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {`Aggiungi: ${config.label}`}
              </Button>
            ) : undefined
          }
        />
      ) : groups ? (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.value}>
              <h2 className="font-heading mb-3 flex items-center gap-2 text-lg font-semibold tracking-wider">
                {group.label}
                <span className="text-sm font-normal text-muted-foreground">
                  ({group.items.length})
                </span>
              </h2>
              {view === "card" ? (
                
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((entity) => (
                    <SpecializedEntityCard
                      key={entity.id}
                      entity={entity}
                      showType={false}
                    />
                  ))}
                </div>
              ) : (
                <EntityTable entities={group.items} />
              )}
            </section>
          ))}
        </div>
      ) : view === "card" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entity) => (
            <SpecializedEntityCard key={entity.id} entity={entity} showType={false} />
          ))}
        </div>
      ) : (
        <EntityTable entities={filtered} />
      )}

      {isMaster && (
        <QuickCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          type={type}
        />
      )}
    </div>
  );
}

/** Vista a tabella/lista di entità (alternativa alle card). */
function EntityTable({ entities }: { entities: Entity[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gold/15">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden sm:table-cell">Dettagli</TableHead>
            <TableHead>Stato</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity) => {
            const config = ENTITY_REGISTRY[entity.type];
            const meta = config.cardMeta?.(entity) ?? {};
            return (
              <TableRow key={entity.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/entita/${entity.id}`}
                    className="flex items-center gap-2 hover:text-gold-bright"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: config.accent }}
                    />
                    <span className="truncate">{entity.name}</span>
                  </Link>
                </TableCell>
                <TableCell className="hidden max-w-[10rem] truncate text-muted-foreground sm:table-cell">
                  {meta.subtitle ?? "—"}
                </TableCell>
                <TableCell>
                  {meta.badge ? (
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", meta.badge.className)}
                    >
                      {meta.badge.label}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-gold/20 text-gold-bright"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function FilterChip({
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
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-gold/60 bg-gold/15 font-semibold text-gold-bright"
          : "border-gold/20 text-muted-foreground hover:border-gold/40 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

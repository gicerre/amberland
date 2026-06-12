"use client";

import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import type { Entity, EntityType } from "@/types/entities";

import { useEntitiesByType } from "../data";
import { ENTITY_REGISTRY } from "../registry";
import { EntityCard } from "./entity-card";
import { QuickCreateDialog } from "./quick-create-dialog";

interface EntityListPageProps {
  type: EntityType;
  title?: string;
  subtitle?: string;
  /** Filtro aggiuntivo (es. solo membri del party). */
  filter?: (entity: Entity) => boolean;
  /** Chiave di un campo select del registro da usare come filtro a chip. */
  chipFieldKey?: string;
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

  const chipDef = chipFieldKey
    ? config.fields.find(
        (field) => field.key === chipFieldKey && field.kind === "select"
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

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
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
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entity) => (
            <EntityCard key={entity.id} entity={entity} showType={false} />
          ))}
        </div>
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

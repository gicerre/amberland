"use client";

import { LayoutGrid, Plus, Search, Table as TableIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { LeverToggle } from "@/components/shared/lever-toggle";
import { ListPageHero } from "@/components/shared/list-page-hero";
import { PageHeader } from "@/components/shared/page-header";
import { SealChip } from "@/components/shared/seal-chip";
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
import { TomeHeading } from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import type { Entity, EntityType } from "@/types/entities";

/** Tipi con card "ritratto" (codex denso): 2 colonne anche su mobile. */
const DENSE_TYPES = new Set<EntityType>([
  "character",
  "creature",
  "faction",
  "item",
]);

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
  /**
   * Se presente, mostra la testata immersiva (ImmersiveHero a piena larghezza)
   * al posto del PageHeader. `src` è lo sfondo WebP (facoltativo per ora).
   */
  hero?: { eyebrow?: string; src?: string; accent?: string };
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
  hero,
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

  // Griglia adattiva: codex denso (2 col su mobile) per le card "ritratto",
  // griglia ampia (1 col su mobile) per quest e schede generiche.
  const dense = DENSE_TYPES.has(type);
  const gridClass = dense
    ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4"
    : "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3";

  const createButton =
    isMaster && !hideCreate ? (
      <Button onClick={() => setCreateOpen(true)}>
        <Plus className="size-4" />
        {config.label}
      </Button>
    ) : undefined;

  return (
    <div>
      {hero ? (
        <ListPageHero
          eyebrow={hero.eyebrow}
          title={title ?? config.plural}
          subtitle={subtitle ?? config.flavor}
          src={hero.src}
          accent={hero.accent}
          actions={createButton}
        />
      ) : (
        <PageHeader
          title={title ?? config.plural}
          subtitle={subtitle ?? config.flavor}
          actions={createButton}
        />
      )}

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
            <SealChip
              active={chip === null}
              label="Tutti"
              onClick={() => setChip(null)}
            />
            {(chipDef.options ?? []).map((option) => (
              <SealChip
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

        {/* Leva d'archivio: Codex (card illustrate) / Registro (consultazione) */}
        <LeverToggle
          className="ml-auto shrink-0"
          label="Vista dell'archivio"
          value={view}
          onChange={changeView}
          options={[
            { value: "card", label: "Codex", icon: <LayoutGrid className="size-4" /> },
            { value: "table", label: "Registro", icon: <TableIcon className="size-4" /> },
          ]}
        />
      </div>

      {isLoading ? (
        <div className={gridClass}>
          {Array.from({ length: dense ? 6 : 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                "rounded-xl bg-muted/60",
                dense ? "aspect-[3/4]" : "h-52"
              )}
            />
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
              <TomeHeading title={group.label} meta={group.items.length} />
              {view === "card" ? (
                <div className={gridClass}>
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
        <div className={gridClass}>
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

/** Ordinali romani per le righe del Registro (I, II, III…). */
const ROMAN: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
function toRoman(n: number): string {
  let rest = n;
  let out = "";
  for (const [value, glyph] of ROMAN) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}

/**
 * Vista "Registro": libro mastro dell'archivista (DESIGN_SYSTEM_V2 §4.13).
 * Intestazione incisa in Cinzel, righe rigate come un libro contabile,
 * ordinale romano e glifo+etichetta del tipo (mai solo un pallino colorato:
 * il colore da solo è una violazione di accessibilità).
 */
function EntityTable({ entities }: { entities: Entity[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-hairline-strong shadow-[inset_0_1px_0_rgba(232,201,121,0.10)]">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-strong bg-stone-surface hover:bg-stone-surface">
            <TableHead className="w-12 text-center font-heading text-xs tracking-[0.14em] text-gold/60 uppercase">
              N.
            </TableHead>
            <TableHead className="font-heading text-xs tracking-[0.14em] text-gold/80 uppercase">
              Nome
            </TableHead>
            <TableHead className="hidden font-heading text-xs tracking-[0.14em] text-gold/80 uppercase sm:table-cell">
              Dettagli
            </TableHead>
            <TableHead className="font-heading text-xs tracking-[0.14em] text-gold/80 uppercase">
              Stato
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity, index) => {
            const config = ENTITY_REGISTRY[entity.type];
            const meta = config.cardMeta?.(entity) ?? {};
            const Icon = config.icon;
            return (
              <TableRow
                key={entity.id}
                className="h-12 border-b border-gold-dim/20 transition-colors hover:bg-gold/[0.04]"
              >
                <TableCell className="text-center font-heading text-xs text-ash">
                  {toRoman(index + 1)}
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/entita/${entity.id}`}
                    className="flex items-center gap-2.5 hover:text-gold-bright"
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    <span className="truncate">{entity.name}</span>
                    <span className="sr-only">({config.label})</span>
                  </Link>
                </TableCell>
                <TableCell className="hidden max-w-[12rem] truncate text-muted-foreground sm:table-cell">
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


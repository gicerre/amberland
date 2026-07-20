"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Link2, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { FantasyImage } from "@/components/shared/fantasy-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConsoleField, ImmersiveModal } from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import { withAlpha } from "@/lib/color";
import { cn } from "@/lib/utils";
import type { Entity, Relation } from "@/types/entities";

import {
  fetchEntitiesByIds,
  useAllEntities,
  useRelationMutations,
  useRelations,
} from "../data";
import { ENTITY_REGISTRY, RELATION_LABEL_SUGGESTIONS } from "../registry";

interface ResolvedRelation {
  relation: Relation;
  other: Entity;
}

/**
 * Tessera-legame: medaglione (ritratto dell'entità o sigillo araldico col
 * colore del tipo), nome inciso ed etichetta del legame come iscrizione.
 * Bordo e bagliore derivano dall'accento del tipo; l'hover simula il peso
 * di una reliquia che si solleva (nessun rimbalzo — Design Constitution).
 */
function RelationTile({
  relation,
  other,
  index,
  isMaster,
  onRemove,
}: {
  relation: Relation;
  other: Entity;
  index: number;
  isMaster: boolean;
  onRemove: () => void;
}) {
  const reduce = useReducedMotion();
  const config = ENTITY_REGISTRY[other.type];
  const Icon = config.icon;
  const accent = config.accent;

  const accentVars = {
    "--accent": accent,
    "--edge": withAlpha(accent, 0.28),
    "--tint": withAlpha(accent, 0.12),
  } as React.CSSProperties;

  return (
    <motion.li
      style={accentVars}
      className="group relative"
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.045, 0.36),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        href={`/entita/${other.id}`}
        className={cn(
          "relative flex items-center gap-3.5 overflow-hidden rounded-lg p-2.5 pr-9",
          "border border-[color:var(--edge)] bg-gradient-to-br from-stone-surface/90 to-stone-mid/70",
          "shadow-[0_6px_22px_-12px_rgba(0,0,0,0.85)]",
          "transition-[transform,box-shadow,border-color] duration-300",
          "hover:-translate-y-0.5 hover:border-[color:var(--accent)]",
          "hover:shadow-[inset_0_1px_0_rgba(232,201,121,0.18),0_10px_30px_-10px_rgba(0,0,0,0.9)]"
        )}
      >
        {/* Filo verticale: il legame che corre lungo il bordo */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px] opacity-70 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(to bottom, transparent, var(--accent), transparent)",
          }}
        />
        {/* Velo luminoso che scorre all'hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        />

        {/* Medaglione: ritratto o sigillo araldico */}
        <span className="relative size-14 shrink-0">
          <span
            className="relative block size-full overflow-hidden rounded-full ring-1 ring-[color:var(--edge)] transition-all duration-300 group-hover:ring-2 group-hover:ring-[color:var(--accent)]"
            style={{ backgroundColor: "var(--tint)" }}
          >
            {other.imageUrl ? (
              <FantasyImage
                src={other.imageUrl}
                alt={other.name}
                className="size-full transition-transform duration-500 group-hover:scale-110"
                sizes="56px"
                position="top"
              />
            ) : (
              <span className="flex size-full items-center justify-center">
                <Icon className="size-7 opacity-80" />
              </span>
            )}
          </span>
          {/* Vignetta interna del medaglione */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-black/40"
          />
        </span>

        {/* Iscrizioni: legame · nome · tipo */}
        <span className="min-w-0 flex-1">
          {relation.label && (
            <span
              className="mb-0.5 inline-flex max-w-full items-center truncate rounded-full border border-[color:var(--edge)] px-2 py-px font-heading text-[9px] font-semibold tracking-[0.18em] text-[color:var(--accent)] uppercase"
              style={{ backgroundColor: "var(--tint)" }}
            >
              {relation.label}
            </span>
          )}
          <span className="block truncate font-heading text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-gold-bright">
            {other.name}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Icon className="size-3 opacity-70" />
            {config.label}
          </span>
        </span>
      </Link>

      {isMaster && (
        <button
          type="button"
          aria-label="Spezza il legame"
          onClick={onRemove}
          className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border border-transparent text-muted-foreground opacity-0 transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      )}
    </motion.li>
  );
}

/**
 * Pannello "Entità correlate": mostra i collegamenti dell'entità
 * (filtrati per visibilità tramite le Security Rules) e permette al
 * Master di crearne o rimuoverne.
 */
export function RelationPanel({ entity }: { entity: Entity }) {
  const { isMaster } = useAuth();
  const { data: relations, isLoading } = useRelations(entity.id);
  const { remove } = useRelationMutations();
  const [addOpen, setAddOpen] = useState(false);

  // Risolve le entità collegate: quelle non leggibili (permessi)
  // vengono scartate automaticamente.
  const { data: resolved } = useQuery({
    queryKey: [
      "relations-resolved",
      entity.id,
      (relations ?? []).map((relation) => relation.id).join(","),
    ],
    enabled: relations !== undefined,
    queryFn: async (): Promise<ResolvedRelation[]> => {
      const items = relations ?? [];
      const otherIds = items.map((relation) =>
        relation.aId === entity.id ? relation.bId : relation.aId
      );
      const entities = await fetchEntitiesByIds(otherIds);
      const byId = new Map(entities.map((item) => [item.id, item]));
      return items
        .map((relation) => {
          const otherId =
            relation.aId === entity.id ? relation.bId : relation.aId;
          const other = byId.get(otherId);
          return other ? { relation, other } : null;
        })
        .filter((item): item is ResolvedRelation => item !== null);
    },
  });

  const groups = useMemo(() => {
    const map = new Map<string, ResolvedRelation[]>();
    for (const item of resolved ?? []) {
      const key = item.other.type;
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [resolved]);

  if (!isMaster && (resolved ?? []).length === 0) return null;

  const total = (resolved ?? []).length;

  return (
    <section className="fantasy-stripe-top relative overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-gold/12 via-card to-night/70 p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)] sm:p-6">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.14),transparent_60%)]"
      />
      <div className="relative z-0 mb-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading flex items-center gap-2 text-lg font-semibold tracking-wider">
            <Link2 className="size-4.5 text-gold" />
            Entità correlate
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground/80 italic">
            I fili che la legano al resto del mondo conosciuto.
          </p>
        </div>
        {isMaster && (
          <Button size="sm" variant="default" onClick={() => setAddOpen(true)}>
            <Link2 className="size-3.5" />
            <span className="sm:inline hidden">Collega</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto my-6 size-5 animate-spin text-gold" />
      ) : total === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground italic">
          Nessun collegamento… per ora. Ogni storia è una ragnatela di fili.
        </p>
      ) : (
        <div className="relative z-0 space-y-6">
          {groups.map(([type, items]) => {
            const config = ENTITY_REGISTRY[type as Entity["type"]];
            const Icon = config.icon;
            const headerVars = {
              "--accent": config.accent,
              "--edge": withAlpha(config.accent, 0.4),
            } as React.CSSProperties;
            return (
              <div key={type}>
                {/* Targa incisa del raggruppamento */}
                <div
                  style={headerVars}
                  className="mb-2.5 flex items-center gap-3"
                >
                  <span className="flex shrink-0 items-center gap-2 font-heading text-xs font-semibold tracking-[0.2em] text-foreground/90 uppercase">
                    <Icon className="size-4 text-[color:var(--accent)]" />
                    {config.plural}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-[color:var(--edge)] via-[color:var(--edge)]/40 to-transparent" />
                  <span className="shrink-0 font-heading text-[11px] text-muted-foreground tabular-nums">
                    {items.length}
                  </span>
                </div>
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {items.map(({ relation, other }, index) => (
                    <RelationTile
                      key={relation.id}
                      relation={relation}
                      other={other}
                      index={index}
                      isMaster={isMaster}
                      onRemove={() => remove.mutate(relation.id)}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {isMaster && (
        <AddRelationDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          from={entity}
        />
      )}
    </section>
  );
}

function AddRelationDialog({
  open,
  onOpenChange,
  from,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  from: Entity;
}) {
  const { data: allEntities } = useAllEntities();
  const { add } = useRelationMutations();

  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (allEntities ?? [])
      .filter((candidate) => candidate.id !== from.id)
      .filter(
        (candidate) =>
          !term ||
          candidate.name.toLowerCase().includes(term) ||
          ENTITY_REGISTRY[candidate.type].label.toLowerCase().includes(term)
      )
      .slice(0, 40);
  }, [allEntities, from.id, search]);

  const target = (allEntities ?? []).find((item) => item.id === targetId);

  const handleSubmit = () => {
    if (!target) return;
    add.mutate(
      { from, to: target, label },
      {
        onSuccess: () => {
          setSearch("");
          setTargetId(null);
          setLabel("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <ImmersiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      icon={<Link2 />}
      title={`Collega «${from.name}»`}
      description="Scegli un'entità e descrivi il legame che le unisce."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={!target || add.isPending}>
            {add.isPending && <Loader2 className="size-4 animate-spin" />}
            {target ? `Collega a «${target.name}»` : "Collega"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <ConsoleField label="Cerca entità">
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome o tipo…"
          />
          <ScrollArea className="mt-2 h-56 rounded-lg border border-hairline bg-black/20">
            <ul className="p-1">
              {candidates.map((candidate) => {
                const config = ENTITY_REGISTRY[candidate.type];
                const Icon = config.icon;
                return (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      onClick={() => setTargetId(candidate.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                        targetId === candidate.id
                          ? "bg-gold/15 text-gold-bright"
                          : "hover:bg-accent"
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-gold/70" />
                      <span className="min-w-0 flex-1 truncate">
                        {candidate.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {config.label}
                      </span>
                    </button>
                  </li>
                );
              })}
              {candidates.length === 0 && (
                <li className="px-2.5 py-4 text-center text-sm text-muted-foreground italic">
                  Nessuna entità trovata.
                </li>
              )}
            </ul>
          </ScrollArea>
        </ConsoleField>

        <ConsoleField label="Etichetta del legame">
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Si trova a, membro di, nemico di…"
            list="relation-label-suggestions"
          />
          <datalist id="relation-label-suggestions">
            {RELATION_LABEL_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </ConsoleField>
      </div>
    </ImmersiveModal>
  );
}

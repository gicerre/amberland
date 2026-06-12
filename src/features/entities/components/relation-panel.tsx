"use client";

import { useQuery } from "@tanstack/react-query";
import { Link2, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/features/auth/auth-provider";
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

  return (
    <section className="rounded-xl border border-gold/15 bg-card/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-heading flex items-center gap-2 text-lg font-semibold tracking-wider">
          <Link2 className="size-4.5 text-gold" />
          Entità correlate
        </h2>
        {isMaster && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" />
            Collega
          </Button>
        )}
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto my-6 size-5 animate-spin text-gold" />
      ) : (resolved ?? []).length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground italic">
          Nessun collegamento… per ora. Ogni storia è una ragnatela di fili.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(([type, items]) => {
            const config = ENTITY_REGISTRY[type as Entity["type"]];
            const Icon = config.icon;
            return (
              <div key={type}>
                <p className="mb-1.5 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                  {config.plural}
                </p>
                <ul className="space-y-1">
                  {items.map(({ relation, other }) => (
                    <li
                      key={relation.id}
                      className="group flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-1.5 transition-colors hover:border-gold/25 hover:bg-gold/5"
                    >
                      <Icon className="size-4 shrink-0 text-gold/70" />
                      <Link
                        href={`/entita/${other.id}`}
                        className="min-w-0 flex-1 truncate font-medium text-foreground transition-colors hover:text-gold-bright"
                      >
                        {other.name}
                      </Link>
                      {relation.label && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-gold/25 text-[10px] text-muted-foreground"
                        >
                          {relation.label}
                        </Badge>
                      )}
                      {isMaster && (
                        <button
                          type="button"
                          aria-label="Rimuovi collegamento"
                          onClick={() => remove.mutate(relation.id)}
                          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </li>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Collega «{from.name}»
          </DialogTitle>
          <DialogDescription>
            Scegli un&rsquo;entità e descrivi il legame che le unisce.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cerca entità</Label>
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome o tipo…"
            />
            <ScrollArea className="h-48 rounded-lg border border-gold/15">
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
          </div>

          <div className="space-y-2">
            <Label>Etichetta del legame</Label>
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={!target || add.isPending}>
            {add.isPending && <Loader2 className="size-4 animate-spin" />}
            {target ? `Collega a «${target.name}»` : "Collega"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

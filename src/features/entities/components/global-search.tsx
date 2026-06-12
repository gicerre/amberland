"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { richTextToPlainText } from "@/components/shared/rich-text-utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ENTITY_TYPES, type Entity, type EntityType } from "@/types/entities";

import { useAllEntities } from "../data";
import { ENTITY_REGISTRY } from "../registry";

/**
 * Ricerca globale istantanea (Ctrl/Cmd + K): cerca su nome, tag e
 * descrizione di tutte le entità leggibili, con filtro per tipo.
 */
export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { data: entities } = useAllEntities();

  const [term, setTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<EntityType | null>(null);

  useEffect(() => {
    if (!open) {
      setTerm("");
      setTypeFilter(null);
    }
  }, [open]);

  const results = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const pool = (entities ?? []).filter(
      (entity) => !typeFilter || entity.type === typeFilter
    );
    if (!needle) return pool.slice(0, 30);
    const scored = pool
      .map((entity) => {
        const name = entity.name.toLowerCase();
        let score = 0;
        if (name.startsWith(needle)) score = 3;
        else if (name.includes(needle)) score = 2;
        else if (entity.tags.some((tag) => tag.toLowerCase().includes(needle)))
          score = 1.5;
        else if (
          richTextToPlainText(entity.description).toLowerCase().includes(needle)
        )
          score = 1;
        return { entity, score };
      })
      .filter((item) => item.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 30).map((item) => item.entity);
  }, [entities, term, typeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<EntityType, Entity[]>();
    for (const entity of results) {
      map.set(entity.type, [...(map.get(entity.type) ?? []), entity]);
    }
    return [...map.entries()];
  }, [results]);

  const navigate = (entity: Entity) => {
    onOpenChange(false);
    router.push(`/entita/${entity.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Ricerca nel regno</DialogTitle>
          <DialogDescription>
            Cerca tra tutte le entità delle cronache
          </DialogDescription>
        </DialogHeader>

        <div className="relative border-b border-gold/15">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-gold/60" />
          <Input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Cerca nel regno… (nome, tag, descrizione)"
            className="h-13 rounded-none border-0 bg-transparent pl-11 text-base focus-visible:ring-0"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-gold/15 px-4 py-2.5">
          <TypeChip
            active={typeFilter === null}
            label="Tutto"
            onClick={() => setTypeFilter(null)}
          />
          {ENTITY_TYPES.map((type) => {
            const config = ENTITY_REGISTRY[type];
            return (
              <TypeChip
                key={type}
                active={typeFilter === type}
                label={config.plural}
                onClick={() =>
                  setTypeFilter(typeFilter === type ? null : type)
                }
              />
            );
          })}
        </div>

        <ScrollArea className="h-80">
          {grouped.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground italic">
              Nessuna pagina delle cronache corrisponde alla ricerca.
            </p>
          ) : (
            <div className="p-2">
              {grouped.map(([type, items]) => {
                const config = ENTITY_REGISTRY[type];
                const Icon = config.icon;
                return (
                  <div key={type} className="mb-2">
                    <p className="px-2.5 py-1 text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                      {config.plural}
                    </p>
                    <ul>
                      {items.map((entity) => (
                        <li key={entity.id}>
                          <button
                            type="button"
                            onClick={() => navigate(entity)}
                            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-gold/10"
                          >
                            <Icon className="size-4 shrink-0 text-gold/70" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-foreground">
                                {entity.name}
                              </span>
                              {entity.tags.length > 0 && (
                                <span className="block truncate text-xs text-muted-foreground">
                                  {entity.tags.join(" · ")}
                                </span>
                              )}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn("shrink-0 text-[10px]", config.badgeClass)}
                            >
                              {config.label}
                            </Badge>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function TypeChip({
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
        "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
        active
          ? "border-gold/60 bg-gold/15 font-semibold text-gold-bright"
          : "border-gold/20 text-muted-foreground hover:border-gold/40 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

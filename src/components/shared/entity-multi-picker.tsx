"use client";

import { Check, Link2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAllEntities } from "@/features/entities/data";
import { ENTITY_REGISTRY } from "@/features/entities/registry";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

/**
 * Selettore riusabile di collegamenti: cerca e collega QUALSIASI entità
 * dell'app (personaggi, luoghi, oggetti, eventi, fazioni, mostri…), senza
 * restrizioni di tipo. Mostra i collegamenti scelti come chip rimovibili.
 */
export function EntityMultiPicker({
  value,
  onChange,
  placeholder = "Cerca un'entità da collegare…",
  excludeId,
}: {
  value: Entity[];
  onChange: (entities: Entity[]) => void;
  placeholder?: string;
  /** Esclude un'entità dai risultati (es. sé stessa). */
  excludeId?: string;
}) {
  const { data: entities } = useAllEntities();
  const [search, setSearch] = useState("");

  const pickedIds = useMemo(() => new Set(value.map((e) => e.id)), [value]);

  // Mostriamo anche le entità già scelte (marcate): cliccando si togglano,
  // così se ne possono selezionare più d'una senza chiudere la lista.
  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return (entities ?? [])
      .filter((e) => e.id !== excludeId && e.name.toLowerCase().includes(term))
      .slice(0, 10);
  }, [entities, search, excludeId]);

  const toggle = (entity: Entity) => {
    if (pickedIds.has(entity.id)) {
      onChange(value.filter((e) => e.id !== entity.id));
    } else {
      onChange([...value, entity]);
    }
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((entity) => {
            const Icon = ENTITY_REGISTRY[entity.type]?.icon ?? Link2;
            return (
              <span
                key={entity.id}
                className="flex items-center gap-1 rounded-full border border-gold/25 bg-night/40 px-2 py-0.5 text-xs"
              >
                <Icon className="size-3 text-gold/70" />
                {entity.name}
                <button
                  type="button"
                  aria-label="Rimuovi collegamento"
                  onClick={() =>
                    onChange(value.filter((e) => e.id !== entity.id))
                  }
                  className="ml-0.5 text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={placeholder}
      />
      {candidates.length > 0 && (
        <ScrollArea className="max-h-48 rounded-lg border border-gold/15">
          <ul className="p-1">
            {candidates.map((entity) => {
              const Icon = ENTITY_REGISTRY[entity.type]?.icon ?? Link2;
              const selected = pickedIds.has(entity.id);
              return (
                <li key={entity.id}>
                  <button
                    type="button"
                    onClick={() => toggle(entity)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                      selected
                        ? "bg-gold/15 text-gold-bright"
                        : "hover:bg-accent"
                    )}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      {selected ? (
                        <Check className="size-4 text-gold" />
                      ) : (
                        <Icon className="size-4 text-gold/70" />
                      )}
                    </span>
                    <span className="flex-1 truncate">{entity.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {ENTITY_REGISTRY[entity.type]?.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}

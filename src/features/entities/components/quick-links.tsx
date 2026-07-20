"use client";

import { Link2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { useEntityNotes } from "@/features/party/diary/data";
import { cn } from "@/lib/utils";
import type { Entity, EntityType } from "@/types/entities";

import { useRelations } from "../data";
import { ENTITY_REGISTRY } from "../registry";

interface QuickLink {
  id: string;
  type: EntityType;
  name: string;
}

/**
 * Collegamenti rapidi: chip in cima all'entità per raggiungere al volo
 * personaggi/luoghi/oggetti/eventi correlati e le note collegate.
 * Deriva dai dati denormalizzati delle relazioni (nessuna query extra pesante).
 */
export function QuickLinks({ entity }: { entity: Entity }) {
  const { data: relations } = useRelations(entity.id);
  const { data: noteData } = useEntityNotes(entity.id);

  const links = useMemo<QuickLink[]>(() => {
    const seen = new Set<string>();
    const result: QuickLink[] = [];
    for (const relation of relations ?? []) {
      const other: QuickLink =
        relation.aId === entity.id
          ? { id: relation.bId, type: relation.bType, name: relation.bName }
          : { id: relation.aId, type: relation.aType, name: relation.aName };
      if (other.id === entity.id || seen.has(other.id)) continue;
      seen.add(other.id);
      result.push(other);
    }
    return result;
  }, [relations, entity.id]);

  const noteCount = noteData?.notes.length ?? 0;

  if (links.length === 0 && noteCount === 0) return null;

  // Raggruppa per tipo, mantenendo l'ordine del registro.
  const byType = new Map<EntityType, QuickLink[]>();
  for (const link of links) {
    byType.set(link.type, [...(byType.get(link.type) ?? []), link]);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-card/40 px-4 py-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
        <Link2 className="size-3.5 text-gold" />
        Collegamenti rapidi
      </span>
      {[...byType.entries()].map(([type, group]) => {
        const config = ENTITY_REGISTRY[type];
        const Icon = config.icon;
        return group.slice(0, 4).map((link) => (
          <Link
            key={link.id}
            href={`/entita/${link.id}`}
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-hairline-strong bg-night/40 px-3 py-1 text-xs transition-colors hover:border-gold/55 hover:text-gold-bright"
            )}
            title={config.label}
          >
            <Icon className="size-3.5 text-gold/70" />
            {link.name}
          </Link>
        ));
      })}
      {noteCount > 0 && (
        <span className="flex items-center gap-1.5 rounded-full border border-hairline-strong bg-night/40 px-3 py-1 text-xs text-muted-foreground">
          {noteCount} {noteCount === 1 ? "nota collegata" : "note collegate"}
        </span>
      )}
    </div>
  );
}

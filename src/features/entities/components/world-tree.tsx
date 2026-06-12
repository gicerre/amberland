"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

import { useChildren, useEntitiesByType } from "../data";
import { ENTITY_REGISTRY } from "../registry";

/**
 * Albero dinamico dell'atlante per la sidebar:
 * Mondi → Regioni → Città → Luoghi, generato dai dati su Firestore.
 * I rami si caricano pigramente all'espansione.
 */
export function WorldTree({ onNavigate }: { onNavigate?: () => void }) {
  const { data: worlds } = useEntitiesByType("world");

  if (!worlds || worlds.length === 0) return null;

  return (
    <ul className="mt-1 ml-[26px] space-y-0.5 border-l border-gold/15 pl-2">
      {worlds.map((world) => (
        <TreeNode key={world.id} entity={world} onNavigate={onNavigate} depth={0} />
      ))}
    </ul>
  );
}

function TreeNode({
  entity,
  onNavigate,
  depth,
}: {
  entity: Entity;
  onNavigate?: () => void;
  depth: number;
}) {
  const pathname = usePathname();
  const href = `/entita/${entity.id}`;
  const active = pathname === href;

  const config = ENTITY_REGISTRY[entity.type];
  const hasChildType = config.childType !== null;

  const [expanded, setExpanded] = useState(false);
  const { data: children } = useChildren(
    hasChildType && expanded ? entity.id : undefined
  );

  const Icon = config.icon;

  return (
    <li>
      <div className="flex items-center gap-0.5">
        {hasChildType ? (
          <button
            type="button"
            aria-label={expanded ? `Comprimi ${entity.name}` : `Espandi ${entity.name}`}
            onClick={() => setExpanded((value) => !value)}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-gold"
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform duration-200",
                expanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="w-[18px]" aria-hidden />
        )}
        <Link
          href={href}
          onClick={onNavigate}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
            active
              ? "bg-gold/10 font-semibold text-gold-bright"
              : "text-foreground/65 hover:bg-accent hover:text-foreground"
          )}
        >
          <Icon className="size-3.5 shrink-0 text-gold/60" />
          <span className="truncate">{entity.name}</span>
        </Link>
      </div>

      {expanded && children && children.length > 0 && depth < 3 && (
        <ul className="ml-4 space-y-0.5 border-l border-gold/10 pl-1.5">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              entity={child}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
      {expanded && children && children.length === 0 && (
        <p className="ml-7 px-2 py-1 text-xs text-muted-foreground/60 italic">
          Vuoto
        </p>
      )}
    </li>
  );
}

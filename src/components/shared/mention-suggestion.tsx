"use client";

import type { MentionNodeAttrs } from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

import { ENTITY_REGISTRY } from "@/features/entities/registry";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

/* ============================================================
 * Citazioni inline (@menzione) — popup dei suggerimenti.
 * Digitando «@» nell'editor compare l'elenco delle entità del
 * regno; la scelta inserisce un nodo mention {id, label, type}.
 * ============================================================ */

/**
 * Attributi del nodo mention (alias del tipo Tiptap: `id` nullable per
 * contratto dell'estensione, anche se qui è sempre l'id di un'entità).
 */
export type MentionAttrs = MentionNodeAttrs;

interface MentionListProps {
  items: Entity[];
  command: (attrs: MentionAttrs) => void;
}

export interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  function MentionList({ items, command }, ref) {
    const [selected, setSelected] = useState(0);

    useEffect(() => setSelected(0), [items]);

    const select = (index: number) => {
      const entity = items[index];
      if (entity) command({ id: entity.id, label: entity.name });
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowDown") {
          setSelected((current) => (current + 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelected(
            (current) =>
              (current - 1 + Math.max(items.length, 1)) %
              Math.max(items.length, 1)
          );
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          select(selected);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="glass rounded-lg border border-hairline-strong px-3 py-2 text-xs text-muted-foreground shadow-xl">
          Nessuna entità trovata
        </div>
      );
    }

    return (
      <div className="glass max-h-64 w-72 overflow-y-auto rounded-lg border border-hairline-strong p-1 shadow-xl">
        {items.map((entity, index) => {
          const config = ENTITY_REGISTRY[entity.type];
          const Icon = config?.icon;
          return (
            <button
              key={entity.id}
              type="button"
              onMouseDown={(event) => {
                // mousedown: il click non deve far perdere il focus all'editor
                event.preventDefault();
                select(index);
              }}
              onMouseEnter={() => setSelected(index)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                index === selected
                  ? "bg-gold/15 text-gold-bright"
                  : "text-foreground/90"
              )}
            >
              {Icon && <Icon className="size-4 shrink-0 text-gold/70" />}
              <span className="flex-1 truncate">{entity.name}</span>
              <span className="text-xs text-muted-foreground">
                {config?.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }
);

function scoreEntity(entity: Entity, needle: string): number {
  const name = entity.name.toLowerCase();
  if (name.startsWith(needle)) return 3;
  if (name.includes(needle)) return 2;
  if (entity.tags.some((tag) => tag.toLowerCase().includes(needle))) return 1;
  return 0;
}

/**
 * Configurazione `suggestion` per l'estensione Mention. Le entità
 * arrivano da un getter (ref aggiornata dal componente React) perché
 * le estensioni Tiptap vivono fuori dal ciclo di render.
 */
export function buildMentionSuggestion(
  getEntities: () => Entity[]
): Omit<SuggestionOptions<Entity, MentionAttrs>, "editor"> {
  return {
    char: "@",
    items: ({ query }) => {
      const needle = query.trim().toLowerCase();
      const pool = getEntities();
      if (!needle) return pool.slice(0, 8);
      return pool
        .map((entity) => ({ entity, score: scoreEntity(entity, needle) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((item) => item.entity);
    },
    command: ({ editor, range, props }) => {
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          { type: "mention", attrs: props },
          { type: "text", text: " " },
        ])
        .run();
    },
    render: () => {
      let component: ReactRenderer<MentionListRef, MentionListProps> | null =
        null;
      let popup: HTMLDivElement | null = null;

      const position = (props: SuggestionProps<Entity, MentionAttrs>) => {
        if (!popup) return;
        const rect = props.clientRect?.();
        if (!rect) return;
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.bottom + 6}px`;
      };

      const destroy = () => {
        popup?.remove();
        popup = null;
        component?.destroy();
        component = null;
      };

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, {
            props: {
              items: props.items,
              command: props.command,
            },
            editor: props.editor,
          });
          popup = document.createElement("div");
          popup.style.position = "fixed";
          popup.style.zIndex = "100";
          popup.appendChild(component.element);
          document.body.appendChild(popup);
          position(props);
        },
        onUpdate: (props) => {
          component?.updateProps({
            items: props.items,
            command: props.command,
          });
          position(props);
        },
        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            destroy();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit: destroy,
      };
    },
  };
}

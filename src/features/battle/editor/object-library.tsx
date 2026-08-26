"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  OBJECT_CATEGORIES,
  OBJECT_CATEGORY_LABELS,
  OBJECT_LIBRARY,
  type ObjectCategory,
} from "@/features/battle/library";
import { cn } from "@/lib/utils";

import { objectIcon } from "./object-icons";
import { useEditor } from "./use-editor";

/**
 * Libreria degli oggetti.
 *
 * Scegliere una voce arma lo strumento: il clic successivo sulla mappa
 * la posa. Un passaggio in meno rispetto al trascinamento, e funziona
 * identico su tablet.
 */
export function ObjectLibrary() {
  const editor = useEditor();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ObjectCategory | "ALL">("ALL");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return OBJECT_LIBRARY.filter((entry) => {
      if (category !== "ALL" && entry.category !== category) return false;
      if (!needle) return true;
      return (
        entry.label.toLowerCase().includes(needle) ||
        entry.keywords.some((word) => word.includes(needle))
      );
    });
  }, [query, category]);

  const pick = (id: string, kind: string) => {
    editor.setTools((current) => ({
      ...current,
      objectTemplateId: id,
      // Porte e meccanismi hanno uno strumento proprio: sceglierli lo attiva.
      tool:
        kind === "DOOR" || kind === "SECRET_DOOR" || kind === "LEVER" || kind === "HATCH"
          ? "DOOR"
          : "OBJECT",
    }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-hairline p-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca un oggetto…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <CategoryChip
            active={category === "ALL"}
            onClick={() => setCategory("ALL")}
            label="Tutti"
          />
          {OBJECT_CATEGORIES.map((entry) => (
            <CategoryChip
              key={entry}
              active={category === entry}
              onClick={() => setCategory(entry)}
              label={OBJECT_CATEGORY_LABELS[entry]}
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1.5">
          {results.map((entry) => {
            const Icon = objectIcon(entry.icon);
            const active = editor.tools.objectTemplateId === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => pick(entry.id, entry.kind)}
                aria-pressed={active}
                title={`${entry.label} · ${entry.material}`}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-colors",
                  active
                    ? "border-gold/50 bg-gold/10"
                    : "border-hairline hover:bg-surface-2"
                )}
              >
                <Icon className="size-5" style={{ color: entry.color }} />
                <span className="w-full truncate text-[11px] leading-tight">
                  {entry.label}
                </span>
                {entry.span > 1 && (
                  <span className="text-[10px] text-muted-foreground">
                    {entry.span}×{entry.span}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {results.length === 0 && (
          <p className="p-3 text-center text-xs text-muted-foreground">
            Nessun oggetto con questo nome.
          </p>
        )}
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
        active
          ? "border-gold/50 bg-gold/10 text-gold-bright"
          : "border-hairline text-muted-foreground hover:bg-surface-2"
      )}
    >
      {label}
    </button>
  );
}

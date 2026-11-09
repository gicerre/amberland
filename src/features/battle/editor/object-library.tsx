"use client";

import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_LABELS,
  catalogCategories,
  catalogGroups,
  searchCatalog,
  templateSummary,
  type ElementCategory,
} from "@/features/battle/catalog";
import { cn } from "@/lib/utils";

import { objectIcon } from "./object-icons";
import { useEditor } from "./use-editor";

/* ============================================================
 * Catalogo degli elementi ambientali.
 *
 * Il Master guarda l'immagine, riconosce una porta rinforzata e la
 * sceglie qui: da quella singola scelta nascono dimensioni, materiale,
 * passabilità, copertura, stati, interazioni, prove e CD. Tutto resta
 * poi modificabile sull'istanza, senza toccare il catalogo.
 * ============================================================ */

export function ObjectLibrary() {
  const editor = useEditor();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ElementCategory | null>(null);
  const [group, setGroup] = useState<string | null>(null);

  const categories = useMemo(() => catalogCategories(), []);
  const groups = useMemo(
    () => (category ? catalogGroups(category) : []),
    [category]
  );

  const results = useMemo(
    () => searchCatalog(query, { category, group }),
    [query, category, group]
  );

  const selectedCells = editor.selection.cells;
  const activeId = editor.tools.objectTemplateId;

  const pick = (id: string) => {
    editor.setTools((current) => ({
      ...current,
      objectTemplateId: id,
      tool: "ELEMENT",
    }));
  };

  /** Applica il template alle caselle già selezionate: un solo gesto. */
  const applyToSelection = (id: string) => {
    editor.setTools((current) => ({ ...current, objectTemplateId: id }));
    if (selectedCells.length > 0) editor.applyTool(selectedCells, "ELEMENT");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-hairline p-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Porta, masso, ponte, corrente…"
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <Chip
            label="Tutto"
            active={category === null}
            onClick={() => {
              setCategory(null);
              setGroup(null);
            }}
          />
          {categories.map((entry) => (
            <Chip
              key={entry.category}
              label={entry.label}
              count={entry.count}
              active={category === entry.category}
              onClick={() => {
                setCategory(entry.category);
                setGroup(null);
              }}
            />
          ))}
        </div>

        {groups.length > 1 && (
          <div className="flex flex-wrap gap-1 border-t border-hairline pt-2">
            <Chip
              label="Tutte le famiglie"
              active={group === null}
              onClick={() => setGroup(null)}
            />
            {groups.map((entry) => (
              <Chip
                key={entry}
                label={entry}
                active={group === entry}
                onClick={() => setGroup(entry)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedCells.length > 0 && (
        <p className="border-b border-hairline px-3 py-2 text-[11px] text-muted-foreground">
          {selectedCells.length} caselle selezionate: scegli che cosa sono.
        </p>
      )}

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {results.map((template) => {
          const Icon = objectIcon(template.icon);
          const active = activeId === template.id;
          return (
            <div
              key={template.id}
              className={cn(
                "rounded-lg border p-2 transition-colors",
                active
                  ? "border-gold/50 bg-gold/10"
                  : "border-hairline hover:bg-surface-2"
              )}
            >
              <button
                type="button"
                onClick={() => pick(template.id)}
                className="flex w-full items-start gap-2 text-left"
                title={template.description}
              >
                <Icon
                  className="mt-0.5 size-4 shrink-0"
                  style={{ color: template.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-xs">{template.label}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {template.group}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                    {templateSummary(template)}
                  </span>
                </span>
              </button>

              {active && (
                <div className="mt-2 space-y-1.5 border-t border-hairline pt-2">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {template.description}
                  </p>
                  <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                    <Detail label="Materiale" value={template.material} />
                    <Detail
                      label="Ingombro"
                      value={
                        template.footprint.freeform
                          ? "dalla selezione"
                          : `${template.footprint.width}×${template.footprint.depth}`
                      }
                    />
                    <Detail label="Altezza" value={`${template.height} m`} />
                    <Detail
                      label="Stati"
                      value={String(Object.keys(template.states).length)}
                    />
                    <Detail
                      label="Azioni"
                      value={String(template.interactions.length)}
                    />
                    {template.destruction && (
                      <Detail
                        label="Resistenza"
                        value={`${template.destruction.hp} PF · CA ${template.destruction.armorClass}`}
                      />
                    )}
                  </dl>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={selectedCells.length === 0}
                    onClick={() => applyToSelection(template.id)}
                  >
                    {selectedCells.length > 0
                      ? `Applica a ${selectedCells.length} caselle`
                      : "Seleziona prima le caselle"}
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {results.length === 0 && (
          <p className="p-3 text-center text-xs text-muted-foreground">
            Nessun elemento con questo nome.
          </p>
        )}
      </div>
    </div>
  );
}

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
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
      {count !== undefined && (
        <span className="ml-1 tabular-nums opacity-60">{count}</span>
      )}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="truncate">{label}</dt>
      <dd className="truncate text-right text-foreground/80">{value}</dd>
    </>
  );
}

export { CATEGORY_LABELS };

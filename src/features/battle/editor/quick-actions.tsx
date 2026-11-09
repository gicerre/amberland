"use client";

import {
  ArrowDownToLine,
  ArrowUpToLine,
  Ban,
  Boxes,
  ClipboardPaste,
  Copy,
  Footprints,
  Hand,
  Shield,
  SlidersHorizontal,
  Trash2,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { parseCellKey } from "@/features/battle/engine/geometry";
import { cn } from "@/lib/utils";
import type { Position } from "@/types/battle";
import type { CoverLevel } from "@/types/battlemap";

import type { ElementKind } from "./use-editor";
import { useEditor } from "./use-editor";

/* ============================================================
 * Azioni rapide.
 *
 * Il tasto destro apre ciò che serve QUI: su una porta le sue azioni, su
 * una casella nuda i profili tattici. Con una selezione attiva compare
 * una barra volante con le operazioni che si ripetono cento volte in una
 * sessione. L'obiettivo è un click, non un giro nei pannelli.
 * ============================================================ */

export interface ContextTarget {
  position: Position;
  clientX: number;
  clientY: number;
  element: { kind: ElementKind; id: string; name: string; cells: string[] } | null;
}

export function EditorContextMenu({
  target,
  onClose,
}: {
  target: ContextTarget | null;
  onClose: () => void;
}) {
  const editor = useEditor();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!target) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [target, onClose]);

  if (!target) return null;

  const key = `${target.position.x},${target.position.y}`;
  const selection = editor.selection.cells;
  /** Se il click cade dentro la selezione, si lavora su tutta. */
  const cells = selection.includes(key) ? selection : [key];
  const scope = cells.length > 1 ? ` (${cells.length} caselle)` : "";

  const run = (action: () => void) => {
    action();
    onClose();
  };

  const apply = (
    change: Parameters<typeof editor.patchSelectedCells>[0],
    label: string
  ) =>
    run(() => {
      editor.selectCells(cells);
      editor.patchSelectedCells(change, label);
    });

  return (
    <div
      ref={ref}
      className="glass fixed z-50 w-56 overflow-hidden rounded-xl border border-hairline py-1 text-xs shadow-xl"
      style={{
        left: Math.min(target.clientX, window.innerWidth - 240),
        top: Math.min(target.clientY, window.innerHeight - 380),
      }}
      role="menu"
    >
      {target.element ? (
        <>
          <MenuLabel>{target.element.name}</MenuLabel>
          <MenuItem
            icon={SlidersHorizontal}
            label="Modifica proprietà"
            onClick={() =>
              run(() =>
                editor.selectElement(
                  target.element!.kind,
                  target.element!.id,
                  target.element!.cells
                )
              )
            }
          />
          <MenuItem
            icon={Hand}
            label="Modifica interazioni"
            onClick={() =>
              run(() =>
                editor.selectElement(
                  target.element!.kind,
                  target.element!.id,
                  target.element!.cells
                )
              )
            }
          />
          <MenuItem
            icon={Copy}
            label="Copia configurazione"
            onClick={() =>
              run(() => {
                editor.selectCells(target.element!.cells);
                editor.copy();
              })
            }
          />
          <MenuSeparator />
          <MenuItem
            icon={Trash2}
            label="Elimina elemento"
            danger
            onClick={() =>
              run(() =>
                editor.deleteElement(target.element!.kind, target.element!.id)
              )
            }
          />
        </>
      ) : (
        <>
          <MenuLabel>Casella {key}{scope}</MenuLabel>
          <MenuItem
            icon={Footprints}
            label="Terreno difficile"
            onClick={() => apply({ terrain: "DIFFICULT" }, "Terreno difficile")}
          />
          <MenuItem
            icon={Waves}
            label="Acqua bassa"
            onClick={() => apply({ terrain: "SHALLOW_WATER" }, "Acqua")}
          />
          <MenuItem
            icon={Ban}
            label="Invalicabile"
            onClick={() =>
              apply(
                { movementCost: null, blocked: true, cover: "TOTAL" },
                "Invalicabile"
              )
            }
          />
          <MenuSeparator />
          <CoverItems onPick={(cover) => apply({ cover }, "Copertura")} />
          <MenuSeparator />
          <MenuItem
            icon={ArrowUpToLine}
            label="Alza di un livello"
            onClick={() =>
              run(() => {
                editor.selectCells(cells);
                editor.raiseSelection(1);
              })
            }
          />
          <MenuItem
            icon={ArrowDownToLine}
            label="Abbassa di un livello"
            onClick={() =>
              run(() => {
                editor.selectCells(cells);
                editor.raiseSelection(-1);
              })
            }
          />
          <MenuSeparator />
          <MenuItem
            icon={Boxes}
            label={`Crea elemento${scope}`}
            onClick={() =>
              run(() => {
                editor.selectCells(cells);
                editor.applyTool(cells, "ELEMENT");
              })
            }
          />
          <MenuItem
            icon={Copy}
            label="Copia configurazione"
            onClick={() =>
              run(() => {
                editor.selectCells(cells);
                editor.copy();
              })
            }
          />
          {editor.clipboard && (
            <MenuItem
              icon={ClipboardPaste}
              label="Incolla qui"
              onClick={() => run(() => editor.paste(target.position))}
            />
          )}
          <MenuSeparator />
          <MenuItem
            icon={Trash2}
            label="Azzera configurazione"
            danger
            onClick={() =>
              run(() => {
                editor.selectCells(cells);
                editor.applyTool(cells, "ERASER");
              })
            }
          />
        </>
      )}
    </div>
  );
}

/**
 * Barra volante sulla selezione: le operazioni che il Master ripete di
 * continuo, a un click di distanza dal punto in cui sta guardando.
 */
export function QuickActionsBar() {
  const editor = useEditor();
  const cells = editor.selection.cells;
  if (cells.length === 0 || editor.mode !== "EDIT") return null;

  return (
    <div className="glass absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-hairline p-1">
      <span className="px-2 font-heading text-[11px] tabular-nums text-muted-foreground">
        {cells.length} caselle
      </span>
      <QuickButton
        icon={Footprints}
        label="Difficile"
        onClick={() =>
          editor.patchSelectedCells({ terrain: "DIFFICULT" }, "Terreno difficile")
        }
      />
      <QuickButton
        icon={Ban}
        label="Invalicabile"
        onClick={() =>
          editor.patchSelectedCells(
            { movementCost: null, blocked: true, cover: "TOTAL" },
            "Invalicabile"
          )
        }
      />
      <QuickButton
        icon={Shield}
        label="Mezza copertura"
        onClick={() => editor.patchSelectedCells({ cover: "HALF" }, "Copertura")}
      />
      <QuickButton
        icon={ArrowUpToLine}
        label="Alza"
        onClick={() => editor.raiseSelection(1)}
      />
      <QuickButton
        icon={ArrowDownToLine}
        label="Abbassa"
        onClick={() => editor.raiseSelection(-1)}
      />
      <QuickButton
        icon={Boxes}
        label="Crea elemento"
        onClick={() => editor.applyTool(cells, "ELEMENT")}
      />
      <QuickButton icon={Copy} label="Copia" onClick={() => editor.copy()} />
      <QuickButton
        icon={Trash2}
        label="Azzera"
        onClick={() => editor.applyTool(cells, "ERASER")}
      />
    </div>
  );
}

/* ------------------------------ Pezzi ------------------------------- */

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="truncate px-3 py-1.5 font-heading text-[0.62rem] tracking-[0.14em] text-gold/80 uppercase">
      {children}
    </p>
  );
}

function MenuSeparator() {
  return <div className="my-1 h-px bg-hairline" />;
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-surface-2",
        danger ? "text-crimson-light" : "text-foreground"
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function CoverItems({ onPick }: { onPick: (cover: CoverLevel) => void }) {
  const options: { level: CoverLevel; label: string }[] = [
    { level: "HALF", label: "Mezza copertura" },
    { level: "THREE_QUARTERS", label: "Tre quarti di copertura" },
    { level: "TOTAL", label: "Copertura totale" },
    { level: "NONE", label: "Nessuna copertura" },
  ];
  return (
    <>
      {options.map((option) => (
        <MenuItem
          key={option.level}
          icon={Shield}
          label={option.label}
          onClick={() => onPick(option.level)}
        />
      ))}
    </>
  );
}

function QuickButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 rounded-full px-2.5 text-xs"
      title={label}
      onClick={onClick}
    >
      <Icon className="size-3.5" />
      <span className="hidden xl:inline">{label}</span>
    </Button>
  );
}

/** Elemento sotto una casella, dal più recente al più antico. */
export function elementAtCell(
  map: ReturnType<typeof useEditor>["map"],
  key: string
): ContextTarget["element"] {
  const trap = map.traps.find((entry) => entry.cells.includes(key));
  if (trap)
    return { kind: "trap", id: trap.id, name: trap.name, cells: trap.cells };
  const object = map.objects.find((entry) => entry.cells.includes(key));
  if (object)
    return {
      kind: "object",
      id: object.id,
      name: object.name,
      cells: object.cells,
    };
  const hazard = map.hazards.find((entry) => entry.cells.includes(key));
  if (hazard)
    return {
      kind: "hazard",
      id: hazard.id,
      name: hazard.name,
      cells: hazard.cells,
    };
  const area = map.areas.find((entry) => entry.cells.includes(key));
  if (area)
    return { kind: "area", id: area.id, name: area.name, cells: area.cells };
  return null;
}

/** Cella valida da una chiave, per i chiamanti che hanno solo la stringa. */
export function positionOf(key: string): Position | null {
  return parseCellKey(key);
}

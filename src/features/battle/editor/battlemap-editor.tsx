"use client";

import {
  ArrowLeft,
  Boxes,
  Copy,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Save,
  Settings2,
  SlidersHorizontal,
  Swords,
  Undo2,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { parseCellKey } from "@/features/battle/engine/geometry";
import { mapWeight } from "@/features/battle/engine/tactical";
import { cn } from "@/lib/utils";
import type { Battle } from "@/types/battle";
import { EDITOR_MODES, type EditorMode } from "@/types/battlemap";

import { EditorCanvas } from "./editor-canvas";
import { LayersPanel } from "./layers-panel";
import { ObjectLibrary } from "./object-library";
import { PropertiesPanel } from "./properties-panel";
import { QuickMapWizard } from "./quick-map-wizard";
import { TOOL_ENTRIES, ToolRail } from "./tool-rail";
import { EditorProvider, useEditor, useMapEditorState } from "./use-editor";

/* ============================================================
 * Battlemap Editor.
 *
 * Layout da applicazione desktop: la mappa al centro e sempre padrona
 * dello schermo, gli strumenti a sinistra, le proprietà a destra, lo
 * stato in basso. Nessun passaggio obbligato: la creazione guidata serve
 * solo a non partire dal foglio bianco, poi si modifica tutto, sempre.
 * ============================================================ */

const MODE_LABELS: Record<EditorMode, string> = {
  EDIT: "Modifica",
  PREVIEW: "Anteprima",
  TACTICAL: "Tattica",
  TEST: "Prova",
};

export function BattlemapEditor({ battle }: { battle: Battle }) {
  const editor = useMapEditorState(battle);

  return (
    <TooltipProvider delayDuration={300}>
      <EditorProvider value={editor}>
        <EditorShell />
      </EditorProvider>
    </TooltipProvider>
  );
}

function EditorShell() {
  const editor = useEditor();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(
    () => Object.keys(editor.map.cells).length === 0
  );

  useShortcuts(setLeftOpen, setRightOpen);

  // Avviso del browser se si esce con modifiche non salvate.
  useEffect(() => {
    if (!editor.dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editor.dirty]);

  return (
    <div className="flex h-[100dvh] flex-col bg-surface-0">
      <EditorHeader
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        onToggleLeft={() => setLeftOpen((open) => !open)}
        onToggleRight={() => setRightOpen((open) => !open)}
        onOpenWizard={() => setWizardOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        {leftOpen && (
          <aside className="hidden w-56 shrink-0 border-r border-hairline bg-surface-1 md:block">
            <ToolRail />
          </aside>
        )}

        <main className="relative min-w-0 flex-1">
          <EditorCanvas />
        </main>

        {rightOpen && (
          <aside className="hidden w-80 shrink-0 border-l border-hairline bg-surface-1 lg:block">
            <SidePanels />
          </aside>
        )}
      </div>

      <EditorStatusBar />

      {/* Su mobile la mappa resta padrona: gli strumenti si aprono a fogli. */}
      <MobileDrawers />

      <QuickMapWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}

/* ------------------------------- Testata ---------------------------- */

function EditorHeader({
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
  onOpenWizard,
}: {
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onOpenWizard: () => void;
}) {
  const editor = useEditor();
  const { battle, dirty, history, mode } = editor;

  return (
    <header className="glass flex shrink-0 items-center gap-2 border-b border-hairline px-2 py-1.5">
      <Button variant="ghost" size="icon" asChild className="shrink-0">
        <Link
          href={`/battaglie/${battle.id}/preparazione`}
          aria-label="Torna alla preparazione"
        >
          <ArrowLeft className="size-4" />
        </Link>
      </Button>

      <div className="hidden min-w-0 md:block">
        <p className="truncate font-heading text-sm tracking-wide">
          {battle.name}
        </p>
        <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Battlemap Editor
        </p>
      </div>

      <Badge
        className={cn(
          "ml-1 shrink-0",
          dirty
            ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
            : "border-hairline bg-surface-2 text-muted-foreground"
        )}
      >
        {dirty ? "Non salvata" : "Salvata"}
      </Badge>

      <div className="mx-2 hidden items-center gap-1 sm:flex">
        <Button
          variant="ghost"
          size="icon"
          disabled={!history.canUndo}
          onClick={editor.undo}
          title={history.undoLabel ? `Annulla: ${history.undoLabel}` : "Annulla"}
          aria-label="Annulla"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!history.canRedo}
          onClick={editor.redo}
          title={history.redoLabel ? `Ripristina: ${history.redoLabel}` : "Ripristina"}
          aria-label="Ripristina"
        >
          <Redo2 className="size-4" />
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <div className="hidden items-center rounded-lg border border-hairline p-0.5 lg:flex">
          {EDITOR_MODES.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => editor.setMode(entry)}
              aria-pressed={mode === entry}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                mode === entry
                  ? "bg-gold/15 text-gold-bright"
                  : "text-muted-foreground hover:bg-surface-2"
              )}
            >
              {MODE_LABELS[entry]}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenWizard}
          className="hidden sm:inline-flex"
        >
          <Wand2 className="size-3.5" />
          Genera
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => editor.setMode(mode === "TEST" ? "EDIT" : "TEST")}
        >
          <Swords className="size-3.5" />
          <span className="hidden sm:inline">Prova</span>
        </Button>

        <Button size="sm" onClick={editor.saveMap} disabled={!editor.dirty || editor.saving}>
          <Save className="size-3.5" />
          Salva
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          onClick={onToggleLeft}
          aria-label="Mostra o nascondi gli strumenti"
        >
          {leftOpen ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={onToggleRight}
          aria-label="Mostra o nascondi le proprietà"
        >
          {rightOpen ? (
            <PanelRightClose className="size-4" />
          ) : (
            <PanelRightOpen className="size-4" />
          )}
        </Button>
      </div>
    </header>
  );
}

/* ---------------------------- Pannelli destri ----------------------- */

function SidePanels() {
  return (
    <Tabs defaultValue="properties" className="flex h-full min-h-0 flex-col">
      <TabsList className="m-2 grid grid-cols-3">
        <TabsTrigger value="properties" className="gap-1.5 text-xs">
          <SlidersHorizontal className="size-3.5" />
          Proprietà
        </TabsTrigger>
        <TabsTrigger value="layers" className="gap-1.5 text-xs">
          <Layers className="size-3.5" />
          Layer
        </TabsTrigger>
        <TabsTrigger value="library" className="gap-1.5 text-xs">
          <Boxes className="size-3.5" />
          Libreria
        </TabsTrigger>
      </TabsList>
      <TabsContent value="properties" className="min-h-0 flex-1 overflow-hidden">
        <PropertiesPanel />
      </TabsContent>
      <TabsContent value="layers" className="min-h-0 flex-1 overflow-y-auto">
        <LayersPanel />
      </TabsContent>
      <TabsContent value="library" className="min-h-0 flex-1 overflow-hidden">
        <ObjectLibrary />
      </TabsContent>
    </Tabs>
  );
}

/* ----------------------------- Barra di stato ----------------------- */

function EditorStatusBar() {
  const editor = useEditor();
  const { map, grid, selection } = editor;
  const weight = useMemo(() => mapWeight(map), [map]);
  const cell = editor.battle.grid;

  return (
    <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-hairline bg-surface-1 px-3 py-1.5 text-[11px] text-muted-foreground">
      <label className="flex items-center gap-1">
        Colonne
        <Input
          type="number"
          min={1}
          max={100}
          value={grid.cols}
          onChange={(event) =>
            editor.resizeGrid(Number(event.target.value) || 1, grid.rows)
          }
          className="h-6 w-14 px-1 text-center tabular-nums"
        />
      </label>
      <label className="flex items-center gap-1">
        Righe
        <Input
          type="number"
          min={1}
          max={100}
          value={grid.rows}
          onChange={(event) =>
            editor.resizeGrid(grid.cols, Number(event.target.value) || 1)
          }
          className="h-6 w-14 px-1 text-center tabular-nums"
        />
      </label>

      <span className="tabular-nums">
        1 cella = {cell.cellSize} {cell.unit}
      </span>
      <span className="tabular-nums">{weight.cells} celle dipinte</span>
      <span className="tabular-nums">{weight.elements} elementi</span>

      {selection.cells.length > 0 && (
        <span className="text-gold">
          {selection.cells.length} celle selezionate
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        <StatusToggle
          label="Griglia"
          active={map.layers.grid.visible}
          onClick={() => editor.toggleLayer("grid", "visible")}
        />
        <StatusToggle
          label="Coordinate"
          active={map.settings.showCoordinates}
          onClick={() =>
            editor.patchSettings(
              { showCoordinates: !map.settings.showCoordinates },
              "Coordinate"
            )
          }
        />
        <StatusToggle
          label="Quote"
          active={map.layers.elevation.visible}
          onClick={() => editor.toggleLayer("elevation", "visible")}
        />
        {editor.clipboard && (
          <span className="flex items-center gap-1 text-gold/80">
            <Copy className="size-3" />
            {editor.clipboard.width}×{editor.clipboard.height}
          </span>
        )}
      </div>
    </footer>
  );
}

function StatusToggle({
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
        "rounded-md border px-2 py-0.5 transition-colors",
        active
          ? "border-gold/40 bg-gold/10 text-gold-bright"
          : "border-hairline hover:bg-surface-2"
      )}
    >
      {label}
    </button>
  );
}

/* ------------------------------- Mobile ----------------------------- */

function MobileDrawers() {
  const [panel, setPanel] = useState<"tools" | "props" | null>(null);

  return (
    <>
      <div className="glass fixed bottom-16 left-1/2 z-30 flex -translate-x-1/2 gap-1 rounded-full border border-hairline p-1 lg:hidden">
        <Button
          size="sm"
          variant={panel === "tools" ? "default" : "ghost"}
          className="rounded-full"
          onClick={() => setPanel(panel === "tools" ? null : "tools")}
        >
          <Settings2 className="size-3.5" />
          Strumenti
        </Button>
        <Button
          size="sm"
          variant={panel === "props" ? "default" : "ghost"}
          className="rounded-full"
          onClick={() => setPanel(panel === "props" ? null : "props")}
        >
          <SlidersHorizontal className="size-3.5" />
          Proprietà
        </Button>
      </div>

      {panel && (
        <div className="fixed inset-x-0 bottom-0 z-40 h-[58dvh] border-t border-hairline bg-surface-1 lg:hidden">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
              <span className="font-heading text-sm">
                {panel === "tools" ? "Strumenti" : "Proprietà"}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setPanel(null)}>
                Chiudi
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {panel === "tools" ? <ToolRail /> : <SidePanels />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------------------- Scorciatoie --------------------------- */

/**
 * Tastiera: gli strumenti hanno una lettera, le operazioni i tasti che
 * ogni editor usa da vent'anni. Nessuna scorciatoia scatta mentre si
 * scrive in un campo.
 */
function useShortcuts(
  setLeftOpen: (update: (open: boolean) => boolean) => void,
  setRightOpen: (update: (open: boolean) => boolean) => void
) {
  const editor = useEditor();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const meta = event.ctrlKey || event.metaKey;

      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        editor.redo();
        return;
      }
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        editor.saveMap();
        return;
      }
      if (meta && event.key.toLowerCase() === "c") {
        editor.copy();
        return;
      }
      if (meta && event.key.toLowerCase() === "v") {
        const anchor = editor.selection.cells[0]
          ? parseCellKey(editor.selection.cells[0])
          : null;
        if (anchor) editor.paste(anchor);
        return;
      }
      if (meta) return;

      if (event.key === "Escape") {
        editor.clearSelection();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (editor.selection.kind && editor.selection.elementId) {
          editor.deleteElement(editor.selection.kind, editor.selection.elementId);
        } else if (editor.selection.cells.length > 0) {
          const tool = editor.tools.tool;
          editor.setTools((current) => ({ ...current, tool: "ERASER" }));
          editor.applyTool(editor.selection.cells);
          editor.setTools((current) => ({ ...current, tool }));
        }
        return;
      }
      if (event.key === "[") {
        editor.setBrushSize(Math.max(1, editor.brushSize - 1));
        return;
      }
      if (event.key === "]") {
        editor.setBrushSize(Math.min(9, editor.brushSize + 1));
        return;
      }
      if (event.key.toLowerCase() === "b") {
        setLeftOpen((open) => !open);
        return;
      }
      if (event.key.toLowerCase() === "p") {
        setRightOpen((open) => !open);
        return;
      }

      const entry = TOOL_ENTRIES.find(
        (tool) => tool.shortcut.toLowerCase() === event.key.toLowerCase()
      );
      if (entry) {
        editor.setTools((current) => ({ ...current, tool: entry.tool }));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor, setLeftOpen, setRightOpen]);
}

"use client";

import {
  ArrowLeft,
  AlertCircle,
  Boxes,
  Check,
  Keyboard,
  Loader2,
  ScanEye,
  Stethoscope,
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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { parseCellKey } from "@/features/battle/engine/geometry";
import { mapWeight } from "@/features/battle/engine/tactical";
import { cn } from "@/lib/utils";
import type { Battle } from "@/types/battle";
import { EDITOR_MODES, type EditorMode } from "@/types/battlemap";

import { AnalysisPanel } from "./analysis-panel";
import { BattlePanel } from "./battle-panel";
import { GeneratePanel } from "./generate-panel";
import { EditorCanvas } from "./editor-canvas";
import { LayersPanel } from "./layers-panel";
import { ObjectLibrary } from "./object-library";
import { PropertiesPanel } from "./properties-panel";
import { QuickMapWizard } from "./quick-map-wizard";
import { ReadImagePanel } from "./read-image-panel";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { TOOL_ENTRIES, ToolRail } from "./tool-rail";
import { EditorProvider, useEditor, useMapEditorState } from "./use-editor";

/* ============================================================
 * Editor tattico della battlemap.
 *
 * NON è un editor grafico: l'ambiente è già disegnato nell'immagine. Qui
 * il Master lo INTERPRETA — seleziona le caselle di un muro, di una porta
 * o di una roccia e dichiara che cosa sono e che cosa ci si può fare.
 *
 * Layout da applicazione desktop: la mappa al centro e sempre padrona
 * dello schermo, strumenti a sinistra, proprietà a destra, stato in
 * basso. Gli overlay colorati esistono SOLO qui: in partita il giocatore
 * vede immagine, griglia e pedine.
 * ============================================================ */

const MODE_LABELS: Record<EditorMode, string> = {
  EDIT: "Configura",
  PREVIEW: "Vista giocatore",
  TACTICAL: "Controllo tattico",
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
  // Senza immagine non c'è ambiente da interpretare: il primo passo è
  // portarla dentro e allineare la griglia.
  const [wizardOpen, setWizardOpen] = useState(
    () => !editor.battle.background
  );

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [readOpen, setReadOpen] = useState(false);

  useShortcuts(setLeftOpen, setRightOpen, setShortcutsOpen);

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
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenGenerate={() => setGenerateOpen(true)}
        onOpenAnalysis={() => setAnalysisOpen(true)}
        onOpenRead={() => setReadOpen(true)}
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
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <GeneratePanel open={generateOpen} onOpenChange={setGenerateOpen} />
      <AnalysisPanel open={analysisOpen} onOpenChange={setAnalysisOpen} />
      <ReadImagePanel open={readOpen} onOpenChange={setReadOpen} />
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
  onOpenShortcuts,
  onOpenGenerate,
  onOpenAnalysis,
  onOpenRead,
}: {
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onOpenWizard: () => void;
  onOpenShortcuts: () => void;
  onOpenGenerate: () => void;
  onOpenAnalysis: () => void;
  onOpenRead: () => void;
}) {
  const editor = useEditor();
  const { history, mode } = editor;

  return (
    <header className="glass flex shrink-0 items-center gap-2 border-b border-hairline px-2 py-1.5">
      <Button variant="ghost" size="icon" asChild className="shrink-0">
        <Link href="/battaglie" aria-label="Torna ai campi di battaglia">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>

      <div className="hidden min-w-0 md:block">
        {/* Il nome si cambia dove lo si legge, senza aprire pannelli. */}
        <Input
          value={editor.draft.name}
          onChange={(event) => editor.patchBattle({ name: event.target.value })}
          className="h-7 border-transparent bg-transparent px-1 font-heading text-sm tracking-wide hover:border-hairline focus-visible:border-hairline"
        />
        <p className="px-1 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Battlemap Editor
        </p>
      </div>

      <SaveBadge />

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
          className="hidden lg:inline-flex"
        >
          Immagine e griglia
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenRead}
          className="hidden sm:inline-flex"
          title="Leggi l'immagine: griglia e terreni"
        >
          <ScanEye className="size-3.5" />
          <span className="hidden lg:inline">Leggi</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenGenerate}
          className="hidden sm:inline-flex"
          title="Genera la struttura tattica"
        >
          <Wand2 className="size-3.5" />
          <span className="hidden lg:inline">Genera</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAnalysis}
          title="Analizza la battlemap"
        >
          <Stethoscope className="size-3.5" />
          <span className="hidden lg:inline">Analizza</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => editor.setMode(mode === "TEST" ? "EDIT" : "TEST")}
        >
          <Swords className="size-3.5" />
          <span className="hidden sm:inline">Prova</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenShortcuts}
          aria-label="Comandi da tastiera"
          title="Comandi (?)"
        >
          <Keyboard className="size-4" />
        </Button>

        <Button
          size="sm"
          onClick={editor.saveMap}
          disabled={!editor.dirty || editor.saving}
        >
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

/** Stato del salvataggio, senza ambiguità: si vede sempre a che punto è. */
function SaveBadge() {
  const { saveState, saveError, saveMap } = useEditor();

  const config = {
    SAVED: {
      label: "Salvata",
      className: "border-hairline bg-surface-2 text-muted-foreground",
      icon: <Check className="size-3" />,
    },
    DIRTY: {
      label: "Modifiche non salvate",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
      icon: null,
    },
    SAVING: {
      label: "Salvataggio…",
      className: "border-hairline bg-surface-2 text-muted-foreground",
      icon: <Loader2 className="size-3 animate-spin" />,
    },
    ERROR: {
      label: "Salvataggio non riuscito",
      className: "border-crimson/50 bg-crimson/15 text-crimson-light",
      icon: <AlertCircle className="size-3" />,
    },
  }[saveState];

  return (
    <button
      type="button"
      onClick={saveState === "ERROR" ? saveMap : undefined}
      title={saveError ?? undefined}
      className={cn(
        "ml-1 flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
        config.className
      )}
    >
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
    </button>
  );
}

/* ---------------------------- Pannelli destri ----------------------- */

function SidePanels() {
  return (
    <Tabs defaultValue="properties" className="flex h-full min-h-0 flex-col">
      <TabsList className="m-2 grid grid-cols-4">
        <TabsTrigger value="properties" className="gap-1.5 text-xs">
          <SlidersHorizontal className="size-3.5" />
          Proprietà
        </TabsTrigger>
        <TabsTrigger value="battle" className="gap-1.5 text-xs">
          <Swords className="size-3.5" />
          Battaglia
        </TabsTrigger>
        <TabsTrigger value="layers" className="gap-1.5 text-xs">
          <Layers className="size-3.5" />
          Layer
        </TabsTrigger>
        <TabsTrigger value="library" className="gap-1.5 text-xs">
          <Boxes className="size-3.5" />
          Profili
        </TabsTrigger>
      </TabsList>
      <TabsContent value="properties" className="min-h-0 flex-1 overflow-hidden">
        <PropertiesPanel />
      </TabsContent>
      <TabsContent value="battle" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <BattlePanel />
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
        1 cella = {grid.cellSize} {grid.unit}
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
 * scrive in un campo, e quelle che il browser userebbe per sé (salva,
 * seleziona tutto, zoom) vengono intercettate.
 */
function useShortcuts(
  setLeftOpen: (update: (open: boolean) => boolean) => void,
  setRightOpen: (update: (open: boolean) => boolean) => void,
  setShortcutsOpen: (open: boolean) => void
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
      const key = event.key.toLowerCase();
      const viewport = editor.viewport.current;

      if (meta) {
        switch (key) {
          case "z":
            event.preventDefault();
            if (event.shiftKey) editor.redo();
            else editor.undo();
            return;
          case "y":
            event.preventDefault();
            editor.redo();
            return;
          case "s":
            event.preventDefault();
            editor.saveMap();
            return;
          case "a":
            event.preventDefault();
            editor.selectAllConfigured();
            return;
          case "c":
            event.preventDefault();
            editor.copy();
            return;
          case "v": {
            event.preventDefault();
            const anchor = editor.selection.cells[0]
              ? parseCellKey(editor.selection.cells[0])
              : null;
            if (anchor) editor.paste(anchor);
            return;
          }
          default:
            return;
        }
      }

      switch (event.key) {
        case "Escape":
          editor.clearSelection();
          return;
        case "Delete":
        case "Backspace":
          if (editor.selection.kind && editor.selection.elementId) {
            editor.deleteElement(
              editor.selection.kind,
              editor.selection.elementId
            );
          } else if (editor.selection.cells.length > 0) {
            editor.applyTool(editor.selection.cells, "ERASER");
          }
          return;
        case "+":
        case "=":
          viewport?.zoomBy(1.2);
          return;
        case "-":
        case "_":
          viewport?.zoomBy(1 / 1.2);
          return;
        case "0":
          viewport?.reset();
          return;
        case "?":
          setShortcutsOpen(true);
          return;
        case "[":
          editor.setBrushSize(Math.max(1, editor.brushSize - 1));
          return;
        case "]":
          editor.setBrushSize(Math.min(9, editor.brushSize + 1));
          return;
        default:
          break;
      }

      // Centra la vista sulla selezione: comodo dopo un Ctrl+A o quando
      // si torna su un elemento configurato mezz'ora prima.
      if (key === "f") {
        const first = editor.selection.cells[0]
          ? parseCellKey(editor.selection.cells[0])
          : null;
        if (first) viewport?.focusOn(first);
        return;
      }
      if (key === "b") {
        setLeftOpen((open) => !open);
        return;
      }
      if (key === "p") {
        setRightOpen((open) => !open);
        return;
      }

      const entry = TOOL_ENTRIES.find(
        (tool) => tool.shortcut.toLowerCase() === key
      );
      if (entry) {
        editor.setTools((current) => ({ ...current, tool: entry.tool }));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor, setLeftOpen, setRightOpen, setShortcutsOpen]);
}

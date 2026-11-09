"use client";

import { useMemo, useRef, useState } from "react";

import {
  BattleCanvas,
  type CellPointerEvent,
} from "@/features/battle/components/battle-canvas";
import { coverBetween } from "@/features/battle/engine/cover";
import { cellKey, worldDistance } from "@/features/battle/engine/geometry";
import {
  buildOccupancy,
  checkMove,
  remainingBudget,
} from "@/features/battle/engine/movement";
import {
  brushCells,
  describeCell,
  elevationAt,
  insideGrid,
  rectCells,
  toolCells,
} from "@/features/battle/engine/tactical";
import type { GridConfig, Position } from "@/types/battle";
import { cn } from "@/lib/utils";

import { CellOutline, MapLayers, MarqueeRect } from "./map-layers";
import { isEntityTool, isPaintingTool } from "./operations";
import {
  EditorContextMenu,
  QuickActionsBar,
  elementAtCell,
  type ContextTarget,
} from "./quick-actions";
import { TestBattlePanel, type TestReport } from "./test-battle";
import { useEditor } from "./use-editor";

/* ============================================================
 * Il tavolo da disegno.
 *
 * Riusa il viewport del Campo di Battaglia (zoom, pan, pinch, schermo
 * intero) e vi innesta le interazioni dell'editor: con uno strumento
 * attivo il tasto sinistro DISEGNA, la panoramica resta sul tasto
 * centrale e sulla barra spaziatrice — come in ogni editor grafico.
 *
 * Un tratto intero diventa UNA voce di storico: si accumulano le celle
 * durante il trascinamento e si applica la modifica al rilascio.
 * ============================================================ */

export function EditorCanvas({ className }: { className?: string }) {
  const editor = useEditor();
  const { map, tools, brushShape, brushSize, selection, mode, obstacles } =
    editor;

  const grid: GridConfig = useMemo(
    // La griglia si accende e si spegne dal layer, non dal documento.
    () => ({ ...editor.grid, visible: map.layers.grid.visible }),
    [editor.grid, map.layers.grid.visible]
  );

  const [hover, setHover] = useState<Position | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{ from: Position; to: Position } | null>(
    null
  );
  const dragStart = useRef<Position | null>(null);
  const stroke = useRef<Set<string>>(new Set());
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(null);

  /* --------------------------- Prova sul campo ---------------------- */
  const [testToken, setTestToken] = useState<Position | null>(null);
  const [testTarget, setTestTarget] = useState<Position | null>(null);

  const testReport: TestReport | null = useMemo(() => {
    if (mode !== "TEST" || !testToken || !testTarget) return null;
    const movement = checkMove(
      {
        grid,
        terrain: {},
        tactical: { map, obstacles },
        occupied: buildOccupancy([]),
        mover: { id: "__test__", position: testToken, size: 1, side: "PC" },
        // Una pedina di prova con movimento generoso: qui interessa il
        // costo del percorso, non il fiato del personaggio.
        budget: remainingBudget({ speed: grid.cellSize * 12, movementUsed: 0 }),
        rules: { blockOccupied: true, enforceMovement: false },
      },
      testTarget
    );
    return {
      distance: worldDistance(testToken, testTarget, grid),
      cost: movement.path ? movement.cost : null,
      reachable: Boolean(movement.path),
      reason: movement.path ? null : movement.reason,
      target: describeCell(map, grid, cellKey(testTarget), obstacles),
      cover: coverBetween(map, obstacles, testToken, testTarget),
      elevationDelta:
        elevationAt(map, cellKey(testTarget)) -
        elevationAt(map, cellKey(testToken)),
    };
  }, [mode, testToken, testTarget, map, grid, obstacles]);

  /* ------------------------------ Gesti ------------------------------ */

  /**
   * Celle toccate dal gesto in corso. Gli strumenti che creano
   * un'ENTITÀ (elemento, trappola, pericolo, area) lavorano sempre su
   * un'area trascinata: un elemento è fatto di tutte le sue caselle.
   */
  const gestureCells = (from: Position, to: Position): string[] => {
    if (tools.tool === "SELECT" || isEntityTool(tools.tool)) {
      return insideGrid(rectCells(from, to), grid);
    }
    if (isPaintingTool(tools.tool)) {
      return toolCells(brushShape, from, to, brushSize, map, grid);
    }
    return [];
  };

  const handleCellPointer = (event: CellPointerEvent) => {
    const { position, phase } = event;

    if (mode === "TEST") {
      if (phase !== "down") return;
      if (!testToken) setTestToken(position);
      else setTestTarget(position);
      return;
    }
    if (mode !== "EDIT") return;

    if (phase === "down") {
      dragStart.current = position;
      stroke.current = new Set();

      if (tools.tool === "SELECT") {
        setMarquee({ from: position, to: position });
        return;
      }
      // Il secchiello agisce subito: non c'è nulla da trascinare.
      if (brushShape === "FILL" && isPaintingTool(tools.tool)) {
        editor.applyTool(toolCells("FILL", position, position, 1, map, grid));
        dragStart.current = null;
        return;
      }
      const cells = gestureCells(position, position);
      cells.forEach((key) => stroke.current.add(key));
      setPreview(cells);
      return;
    }

    if (phase === "move") {
      setHover(position);
      const start = dragStart.current;
      if (!start) return;

      if (tools.tool === "SELECT") {
        setMarquee({ from: start, to: position });
        return;
      }
      if (
        !isEntityTool(tools.tool) &&
        (brushShape === "PENCIL" || brushShape === "BRUSH")
      ) {
        // Tratto continuo: le celle si accumulano, la storia resta una.
        gestureCells(start, position).forEach((key) => stroke.current.add(key));
        setPreview([...stroke.current]);
        return;
      }
      setPreview(gestureCells(start, position));
      return;
    }

    // phase === "up"
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) return;

    if (tools.tool === "SELECT") {
      const cells = insideGrid(rectCells(start, position), grid);
      setMarquee(null);
      const single = cells.length === 1;
      const element = single ? elementAtCell(map, cells[0]!) : null;

      if (element) {
        editor.selectElement(element.kind, element.id, element.cells);
      } else {
        editor.selectCells(
          cells,
          event.ctrlKey ? "TOGGLE" : event.shiftKey ? "ADD" : "REPLACE"
        );
      }
      return;
    }

    const cells =
      !isEntityTool(tools.tool) &&
      (brushShape === "PENCIL" || brushShape === "BRUSH")
        ? [...stroke.current]
        : gestureCells(start, position);

    setPreview([]);
    stroke.current = new Set();
    if (cells.length > 0) editor.applyTool(cells);
  };

  /** Anteprima del pennello sotto il puntatore, prima ancora di premere. */
  const brushPreview = useMemo(() => {
    if (mode !== "EDIT" || !hover || dragStart.current) return [];
    if (isPaintingTool(tools.tool) && brushShape === "BRUSH") {
      return insideGrid(brushCells(hover, brushSize), grid);
    }
    return [];
  }, [mode, hover, tools.tool, brushShape, brushSize, grid]);

  const interactive = mode === "EDIT" ? tools.tool !== "PAN" : mode === "TEST";

  return (
    <BattleCanvas
      grid={grid}
      background={editor.draft.background}
      className={cn("h-full w-full rounded-none border-0", className)}
      onCellPointer={interactive ? handleCellPointer : undefined}
      onViewportReady={(api) => {
        editor.viewport.current = api;
      }}
      onCellContextMenu={
        mode === "EDIT"
          ? ({ position, clientX, clientY }) =>
              setContextTarget({
                position,
                clientX,
                clientY,
                element: elementAtCell(map, cellKey(position)),
              })
          : undefined
      }
      overlay={
        <>
          {/* Coordinate sotto il puntatore: sempre, senza rubare spazio. */}
          {hover && (
            <div className="glass pointer-events-none absolute bottom-3 left-3 rounded-lg border border-hairline px-2 py-1 font-mono text-[11px] text-muted-foreground">
              {hover.x}, {hover.y}
            </div>
          )}
          <QuickActionsBar />
          <EditorContextMenu
            target={contextTarget}
            onClose={() => setContextTarget(null)}
          />
          {mode === "TEST" && (
            <TestBattlePanel
              report={testReport}
              grid={grid}
              hasToken={Boolean(testToken)}
              onReset={() => {
                setTestToken(null);
                setTestTarget(null);
              }}
              onClose={() => editor.setMode("EDIT")}
            />
          )}
        </>
      }
    >
      {({ cellPx }) => (
        <>
          <MapLayers
            map={map}
            grid={grid}
            cellPx={cellPx}
            obstacles={obstacles}
            mode={mode}
            showCoordinates={map.settings.showCoordinates}
          />

          {mode === "EDIT" && selection.cells.length > 0 && (
            <CellOutline cells={selection.cells} cellPx={cellPx} />
          )}

          {preview.length > 0 && (
            <CellOutline
              cells={preview}
              cellPx={cellPx}
              color="rgba(255,255,255,0.85)"
              fill="rgba(255,255,255,0.14)"
            />
          )}

          {brushPreview.length > 0 && (
            <CellOutline
              cells={brushPreview}
              cellPx={cellPx}
              color="rgba(255,255,255,0.4)"
              fill="rgba(255,255,255,0.06)"
            />
          )}

          {marquee && (
            <MarqueeRect from={marquee.from} to={marquee.to} cellPx={cellPx} />
          )}

          {/* Pedina di prova: esiste solo nella simulazione. */}
          {testToken && mode === "TEST" && (
            <div
              className="pointer-events-none absolute rounded-full border-2 border-gold bg-gold/25"
              style={{
                left: testToken.x * cellPx + cellPx * 0.1,
                top: testToken.y * cellPx + cellPx * 0.1,
                width: cellPx * 0.8,
                height: cellPx * 0.8,
              }}
            />
          )}
          {testTarget && mode === "TEST" && (
            <div
              className="pointer-events-none absolute rounded-md border-2 border-dashed border-white/70"
              style={{
                left: testTarget.x * cellPx + 2,
                top: testTarget.y * cellPx + 2,
                width: cellPx - 4,
                height: cellPx - 4,
              }}
            />
          )}
        </>
      )}
    </BattleCanvas>
  );
}

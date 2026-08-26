"use client";

import { useMemo, useRef, useState } from "react";

import {
  BattleCanvas,
  type CellPointerEvent,
} from "@/features/battle/components/battle-canvas";
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
import { OBJECT_LIBRARY } from "@/features/battle/library";
import type { GridConfig, Position } from "@/types/battle";
import { cn } from "@/lib/utils";

import { CellOutline, MapLayers, MarqueeRect } from "./map-layers";
import { isPaintingTool } from "./operations";
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
    () => ({
      ...editor.battle.grid,
      ...editor.grid,
      // La griglia si accende e si spegne dal layer, non dal documento.
      visible: map.layers.grid.visible,
    }),
    [editor.battle.grid, editor.grid, map.layers.grid.visible]
  );

  const [hover, setHover] = useState<Position | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{ from: Position; to: Position } | null>(
    null
  );
  const dragStart = useRef<Position | null>(null);
  const stroke = useRef<Set<string>>(new Set());

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
      elevationDelta:
        elevationAt(map, cellKey(testTarget)) -
        elevationAt(map, cellKey(testToken)),
    };
  }, [mode, testToken, testTarget, map, grid, obstacles]);

  /* ------------------------------ Gesti ------------------------------ */

  const stampSpan = useMemo(() => {
    const template = OBJECT_LIBRARY.find(
      (entry) => entry.id === tools.objectTemplateId
    );
    return template?.span ?? 1;
  }, [tools.objectTemplateId]);

  /** Celle toccate dal gesto in corso, secondo strumento e forma. */
  const gestureCells = (from: Position, to: Position): string[] => {
    if (tools.tool === "SELECT") return insideGrid(rectCells(from, to), grid);
    if (tools.tool === "OBJECT" || tools.tool === "OBSTACLE" || tools.tool === "DOOR") {
      return insideGrid(brushCells(to, stampSpan), grid);
    }
    if (tools.tool === "TRAP" || tools.tool === "HAZARD" || tools.tool === "AREA") {
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
        brushShape === "PENCIL" ||
        brushShape === "BRUSH" ||
        tools.tool === "OBJECT" ||
        tools.tool === "OBSTACLE" ||
        tools.tool === "DOOR"
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
      const element = single ? elementAt(cells[0]!) : null;

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
      brushShape === "PENCIL" ||
      brushShape === "BRUSH" ||
      tools.tool === "OBJECT" ||
      tools.tool === "OBSTACLE" ||
      tools.tool === "DOOR"
        ? [...stroke.current]
        : gestureCells(start, position);

    setPreview([]);
    stroke.current = new Set();
    if (cells.length > 0) editor.applyTool(cells);
  };

  /** Elemento posato sulla cella, dal più recente al più antico. */
  const elementAt = (key: string) => {
    const trap = map.traps.find((entry) => entry.cells.includes(key));
    if (trap) return { kind: "trap" as const, id: trap.id, cells: trap.cells };
    const object = map.objects.find((entry) => entry.cells.includes(key));
    if (object)
      return { kind: "object" as const, id: object.id, cells: object.cells };
    const hazard = map.hazards.find((entry) => entry.cells.includes(key));
    if (hazard)
      return { kind: "hazard" as const, id: hazard.id, cells: hazard.cells };
    const area = map.areas.find((entry) => entry.cells.includes(key));
    if (area) return { kind: "area" as const, id: area.id, cells: area.cells };
    return null;
  };

  /** Anteprima del pennello sotto il puntatore, prima ancora di premere. */
  const brushPreview = useMemo(() => {
    if (mode !== "EDIT" || !hover || dragStart.current) return [];
    if (isPaintingTool(tools.tool) && brushShape === "BRUSH") {
      return insideGrid(brushCells(hover, brushSize), grid);
    }
    if (tools.tool === "OBJECT" || tools.tool === "OBSTACLE" || tools.tool === "DOOR") {
      return insideGrid(brushCells(hover, stampSpan), grid);
    }
    return [];
  }, [mode, hover, tools.tool, brushShape, brushSize, stampSpan, grid]);

  const interactive = mode === "EDIT" ? tools.tool !== "PAN" : mode === "TEST";

  return (
    <BattleCanvas
      grid={grid}
      background={editor.battle.background}
      className={cn("h-full w-full rounded-none border-0", className)}
      onCellPointer={interactive ? handleCellPointer : undefined}
      overlay={
        <>
          {/* Coordinate sotto il puntatore: sempre, senza rubare spazio. */}
          {hover && (
            <div className="glass pointer-events-none absolute bottom-3 left-3 rounded-lg border border-hairline px-2 py-1 font-mono text-[11px] text-muted-foreground">
              {hover.x}, {hover.y}
            </div>
          )}
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

"use client";

import {
  Expand,
  Maximize2,
  Minus,
  Plus,
  Shrink,
} from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "@/features/battle/constants";
import { fitCellSize, pixelToCell } from "@/features/battle/engine/geometry";
import { optimizeCloudinary } from "@/lib/upload/image-service";
import { cn } from "@/lib/utils";
import type {
  BackgroundImage,
  GridConfig,
  Position,
  TerrainKind,
} from "@/types/battle";

import { BattleGrid } from "./battle-grid";

/* ============================================================
 * Viewport del campo di battaglia.
 *
 * Modello a due spazi (COMBAT_SYSTEM §8.1): le posizioni sono SEMPRE in
 * celle, il rendering è una pura trasformazione. Zoom e pan vivono in
 * stato locale e non toccano mai il modello: ridimensionare la finestra
 * o zoomare non altera un solo dato persistito.
 * ============================================================ */

const OBJECT_FIT: Record<BackgroundImage["fit"], string> = {
  COVER: "object-cover",
  CONTAIN: "object-contain",
  STRETCH: "object-fill",
};

interface Viewport {
  width: number;
  height: number;
}

/** Comandi della vista, per scorciatoie e pulsanti esterni. */
export interface CanvasApi {
  zoomBy: (factor: number) => void;
  setZoom: (zoom: number) => void;
  /** Rimette la mappa intera dentro il riquadro. */
  reset: () => void;
  focusOn: (position: Position, zoom?: number) => void;
}

/** Gesto su una cella: fase del puntatore + modificatori premuti. */
export interface CellPointerEvent {
  position: Position;
  phase: "down" | "move" | "up";
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  button: number;
}

/** Oltre questi pixel il gesto è un trascinamento, non un click. */
const CLICK_TOLERANCE_PX = 4;

export function BattleCanvas({
  grid,
  background,
  terrain,
  children,
  onCellClick,
  onCellPointer,
  focus,
  focusZoom,
  onCellContextMenu,
  onViewportReady,
  overlay,
  className,
}: {
  grid: GridConfig;
  background?: BackgroundImage | null;
  terrain?: Record<string, TerrainKind>;
  /**
   * Contenuto in spazio-mappa (pedine, aree). Riceve il lato della cella
   * e la scala corrente: le pedine ne hanno bisogno per convertire i
   * pixel di un trascinamento in celle.
   */
  children?: (view: { cellPx: number; zoom: number }) => ReactNode;
  onCellClick?: (position: Position) => void;
  /**
   * Interazione continua con le celle (disegno, selezione a trascinamento).
   * Quando è presente, il tasto sinistro NON fa più pan: la panoramica
   * resta sul tasto centrale e sulla barra spaziatrice, come in ogni
   * editor grafico.
   */
  onCellPointer?: (event: CellPointerEvent) => void;
  /**
   * Cella su cui centrare la vista. Cambiandola, la camera si sposta con
   * una transizione: è così che il campo segue il turno di chi gioca.
   * L'inquadratura resta poi libera: un pan manuale non viene annullato
   * finché non cambia di nuovo il fuoco.
   */
  focus?: Position | null;
  /** Zoom applicato quando la camera si sposta sul fuoco. */
  focusZoom?: number;
  /** Menu contestuale: tasto destro su una casella. */
  onCellContextMenu?: (event: {
    position: Position;
    clientX: number;
    clientY: number;
  }) => void;
  /** Riceve i comandi della vista (zoom, fit, centratura). */
  onViewportReady?: (api: CanvasApi) => void;
  /** Contenuto flottante sopra il campo (pannelli, legende). */
  overlay?: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [panning, setPanning] = useState(false);

  // Puntatori attivi: uno = pan, due = pinch. Un'unica strada per mouse,
  // penna e dita, senza librerie di gesture.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number }>(
    { x: 0, y: 0, panX: 0, panY: 0 }
  );
  const moved = useRef(false);
  const painting = useRef(false);
  // Il listener nativo della rotella vive fuori dal ciclo di render:
  // legge zoom e funzione di zoom da ref sempre aggiornati.
  const zoomValue = useRef(1);
  const zoomRef = useRef<
    (next: number, anchor?: { x: number; y: number }) => void
  >(() => {});
  const [spaceHeld, setSpaceHeld] = useState(false);

  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const rect = entry.contentRect;
      setViewport({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Barra spaziatrice premuta = panoramica temporanea, anche mentre è
  // attivo uno strumento di disegno.
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === "Space" && !isTypingTarget(event.target)) {
        event.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /** Lato della cella perché la mappa ENTRI nel viewport a zoom 1. */
  const cellPx = useMemo(
    () => fitCellSize(viewport, grid),
    [viewport, grid]
  );

  const mapWidth = grid.cols * cellPx;
  const mapHeight = grid.rows * cellPx;

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Cambiare le dimensioni della griglia rimette la vista al centro:
  // altrimenti il Master si ritroverebbe fuori mappa senza capire perché.
  useEffect(() => {
    resetView();
  }, [grid.cols, grid.rows, resetView]);

  /**
   * La camera segue il combattente di turno. Si centra la cella e si
   * lascia attorno abbastanza campo da capire la situazione tattica.
   */
  const focusX = focus?.x ?? null;
  const focusY = focus?.y ?? null;

  useEffect(() => {
    if (focusX === null || focusY === null || cellPx <= 0) return;
    const nextZoom = Math.min(
      ZOOM_MAX,
      Math.max(ZOOM_MIN, focusZoom ?? 1.6)
    );
    const centerX = (focusX + 0.5) * cellPx - (grid.cols * cellPx) / 2;
    const centerY = (focusY + 0.5) * cellPx - (grid.rows * cellPx) / 2;
    setZoom(nextZoom);
    setPan({ x: -centerX * nextZoom, y: -centerY * nextZoom });
  }, [focusX, focusY, focusZoom, cellPx, grid.cols, grid.rows]);

  const clampZoom = (value: number) =>
    Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));

  /** Zoom ancorato a un punto del viewport (puntatore o centro). */
  const zoomAt = useCallback(
    (nextZoom: number, anchor?: { x: number; y: number }) => {
      const element = viewportRef.current;
      setZoom((current) => {
        const target = clampZoom(nextZoom);
        if (!element || target === current) return target;
        const rect = element.getBoundingClientRect();
        const point = anchor ?? {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
        // Il punto sotto il puntatore deve restare fermo: si compensa il
        // pan con la differenza di scala.
        const dx = point.x - rect.left - rect.width / 2;
        const dy = point.y - rect.top - rect.height / 2;
        const ratio = target / current;
        setPan((previous) => ({
          x: dx - (dx - previous.x) * ratio,
          y: dy - (dy - previous.y) * ratio,
        }));
        return target;
      });
    },
    []
  );

  /**
   * Rotella = zoom, ancorato al puntatore. Il listener è NATIVO e non
   * passivo: React registra `onWheel` come passivo e `preventDefault()`
   * verrebbe ignorato, con la pagina che scorre sotto la mappa.
   */
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      // Il trackpad manda incrementi minuti: si scala il passo sul delta
      // per uno zoom progressivo, senza salti.
      const intensity = Math.min(3, Math.abs(event.deltaY) / 100);
      const direction = event.deltaY > 0 ? -1 : 1;
      zoomRef.current(
        zoomValue.current * (1 + direction * ZOOM_STEP * Math.max(0.4, intensity)),
        { x: event.clientX, y: event.clientY }
      );
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  /** Cella sotto il puntatore, o null se fuori dai confini. */
  const cellFromEvent = (
    event: ReactPointerEvent<HTMLDivElement>
  ): Position | null => {
    const surface = surfaceRef.current;
    if (!surface || cellPx <= 0) return null;
    const rect = surface.getBoundingClientRect();
    const position = pixelToCell(
      {
        x: (event.clientX - rect.left) / zoom,
        y: (event.clientY - rect.top) / zoom,
      },
      cellPx
    );
    if (
      position.x < 0 ||
      position.y < 0 ||
      position.x >= grid.cols ||
      position.y >= grid.rows
    ) {
      return null;
    }
    return position;
  };

  const emitCellPointer = (
    event: ReactPointerEvent<HTMLDivElement>,
    phase: CellPointerEvent["phase"]
  ) => {
    if (!onCellPointer) return;
    const position = cellFromEvent(event);
    if (!position) return;
    onCellPointer({
      position,
      phase,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey || event.metaKey,
      altKey: event.altKey,
      button: event.button,
    });
  };

  zoomValue.current = zoom;
  zoomRef.current = zoomAt;

  useEffect(() => {
    onViewportReady?.({
      zoomBy: (factor) => zoomRef.current(zoomValue.current * factor),
      setZoom: (value) => zoomRef.current(value),
      reset: resetView,
      focusOn: (position, nextZoom) => {
        if (cellPx <= 0) return;
        const target = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZoom ?? 1.8));
        const centerX = (position.x + 0.5) * cellPx - (grid.cols * cellPx) / 2;
        const centerY = (position.y + 0.5) * cellPx - (grid.rows * cellPx) / 2;
        setZoom(target);
        setPan({ x: -centerX * target, y: -centerY * target });
      },
    });
  }, [onViewportReady, resetView, cellPx, grid.cols, grid.rows]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        zoom,
      };
      return;
    }
    // Il pan parte da qualunque punto del campo tranne le pedine: lì il
    // drag appartiene a chi muove la miniatura.
    if ((event.target as HTMLElement).closest("[data-battle-token]")) return;

    // Con uno strumento attivo il tasto sinistro disegna; per la
    // panoramica restano tasto centrale e barra spaziatrice.
    const wantsPan = event.button === 1 || spaceHeld;
    // Il tasto centrale, da solo, farebbe partire lo scorrimento
    // automatico del browser: qui serve per la panoramica.
    if (event.button === 1) event.preventDefault();
    if (onCellPointer && event.button === 0 && !wantsPan) {
      event.currentTarget.setPointerCapture(event.pointerId);
      painting.current = true;
      emitCellPointer(event, "down");
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    panStart.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    moved.current = false;
    setPanning(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStart.current.distance > 0) {
        zoomAt(
          (pinchStart.current.zoom * distance) / pinchStart.current.distance,
          { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        );
      }
      return;
    }

    if (painting.current) {
      emitCellPointer(event, "move");
      return;
    }

    if (!panning) return;
    const dx = event.clientX - panStart.current.x;
    const dy = event.clientY - panStart.current.y;
    // Oltre la soglia è un trascinamento, non un click su una cella.
    if (Math.hypot(dx, dy) > CLICK_TOLERANCE_PX) moved.current = true;
    setPan({
      x: panStart.current.panX + dx,
      y: panStart.current.panY + dy,
    });
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (painting.current) {
      emitCellPointer(event, "up");
      painting.current = false;
    }
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) setPanning(false);
  };

  const handleClick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!onCellClick || cellPx <= 0 || moved.current) return;
    const surface = event.currentTarget.getBoundingClientRect();
    const position = pixelToCell(
      {
        x: (event.clientX - surface.left) / zoom,
        y: (event.clientY - surface.top) / zoom,
      },
      cellPx
    );
    if (
      position.x < 0 ||
      position.y < 0 ||
      position.x >= grid.cols ||
      position.y >= grid.rows
    ) {
      return;
    }
    onCellClick(position);
  };

  const toggleFullscreen = () => {
    const element = containerRef.current;
    if (!element) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void element.requestFullscreen?.();
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "elev-1 relative overflow-hidden rounded-2xl border border-hairline bg-surface-0",
        fullscreen && "rounded-none",
        className
      )}
    >
      <div
        ref={viewportRef}
        className={cn(
          "relative h-full w-full touch-none select-none",
          panning
            ? "cursor-grabbing"
            : onCellPointer && !spaceHeld
              ? "cursor-crosshair"
              : "cursor-grab"
        )}
        onContextMenu={(event) => {
          if (!onCellContextMenu) return;
          event.preventDefault();
          const position = cellFromEvent(event as unknown as ReactPointerEvent<HTMLDivElement>);
          if (!position) return;
          onCellContextMenu({
            position,
            clientX: event.clientX,
            clientY: event.clientY,
          });
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        {/* Piano trasformato: qui vivono zoom e pan, e NIENTE altro. */}
        <div
          className="absolute top-1/2 left-1/2 origin-center motion-safe:transition-transform motion-safe:duration-150"
          style={{
            width: mapWidth,
            height: mapHeight,
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <div
            ref={surfaceRef}
            className="relative h-full w-full"
            onPointerUp={handleClick}
          >
            {background?.url ? (
              <>
                <Image
                  src={optimizeCloudinary(background.url, 2400)}
                  alt=""
                  fill
                  draggable={false}
                  className={cn(
                    "pointer-events-none select-none",
                    OBJECT_FIT[background.fit]
                  )}
                  style={{
                    transform: `rotate(${background.rotation}deg) scale(${grid.imageScale})`,
                  }}
                />
                {background.dim > 0 && (
                  <div
                    className="pointer-events-none absolute inset-0 bg-black"
                    style={{ opacity: background.dim }}
                  />
                )}
              </>
            ) : (
              <div className="pointer-events-none absolute inset-0 bg-surface-1" />
            )}

            <BattleGrid
              grid={grid}
              cellPx={cellPx}
              terrain={terrain}
              className="absolute inset-0"
            />

            {children?.({ cellPx, zoom })}
          </div>
        </div>
      </div>

      {/* ───────── Comandi della vista (vetro, mai sul modello) ───────── */}
      <div className="glass absolute right-3 bottom-3 flex items-center gap-1 rounded-full border border-hairline p-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full"
          onClick={() => zoomAt(zoom - ZOOM_STEP)}
          aria-label="Riduci"
        >
          <Minus className="size-4" />
        </Button>
        <span className="min-w-12 text-center font-heading text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full"
          onClick={() => zoomAt(zoom + ZOOM_STEP)}
          aria-label="Ingrandisci"
        >
          <Plus className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full"
          onClick={resetView}
          aria-label="Adatta al riquadro"
          title="Adatta"
        >
          <Expand className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? "Esci da schermo intero" : "Schermo intero"}
        >
          {fullscreen ? (
            <Shrink className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
        </Button>
      </div>

      {overlay}
    </div>
  );
}

/** True se il tasto premuto stava scrivendo in un campo di testo. */
function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    element.isContentEditable
  );
}

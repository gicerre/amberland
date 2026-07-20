"use client";

import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FantasyImage } from "@/components/shared/fantasy-image";
import { optimizeCloudinary } from "@/lib/upload/image-service";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface LightboxContextValue {
  /** Apre il visore a schermo intero su una o più immagini. */
  open: (images: string[], startIndex?: number, label?: string) => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

const MIN_SCALE = 1;
const MAX_SCALE = 5;

/**
 * Visore immagini a schermo intero, in stile "Archivio delle Avventure":
 * cornice fantasy, zoom (rotella/pulsanti/doppio click) e pan (trascinamento),
 * navigazione con frecce, chiusura con Esc/click esterno.
 */
export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [label, setLabel] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Stato zoom & pan
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const open = useCallback(
    (imgs: string[], startIndex = 0, openLabel = "") => {
      const cleaned = imgs.filter(Boolean);
      if (cleaned.length === 0) return;
      setImages(cleaned);
      setIndex(Math.min(Math.max(startIndex, 0), cleaned.length - 1));
      setLabel(openLabel);
      setIsOpen(true);
    },
    []
  );

  const go = useCallback(
    (direction: number) => {
      setIndex((current) =>
        images.length
          ? (current + direction + images.length) % images.length
          : 0
      );
    },
    [images.length]
  );

  // Reset dello zoom al cambio immagine o apertura
  useEffect(() => {
    resetView();
  }, [index, isOpen, resetView]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, go]);

  const zoomBy = useCallback((factor: number) => {
    setScale((current) => {
      const next = Math.min(Math.max(current * factor, MIN_SCALE), MAX_SCALE);
      if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const onWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.15 : 0.87);
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (scale <= 1) return;
    setDragging(true);
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (event.clientX - dragStart.current.x),
      y: dragStart.current.oy + (event.clientY - dragStart.current.y),
    });
  };

  const endDrag = () => setDragging(false);

  const value = useMemo(() => ({ open }), [open]);
  const multiple = images.length > 1;
  const zoomed = scale > 1;

  return (
    <LightboxContext.Provider value={value}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[97vw] border-gold/30 bg-transparent p-0 ring-0 sm:max-w-5xl"
        >
          <DialogTitle className="sr-only">
            {label || "Immagine a schermo intero"}
          </DialogTitle>

          <div className="relative overflow-hidden rounded-2xl border border-gold/35 bg-night shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)]">
            {/* Bagliore epico */}
            <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.08),transparent_70%)]" />

            <div
              className={cn(
                "relative z-10 flex h-[84svh] items-center justify-center overflow-hidden",
                zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
              )}
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              onDoubleClick={() => (zoomed ? resetView() : setScale(2.5))}
            >
              {images[index] && (
                <div
                  className="relative h-full w-full"
                  style={{
                    transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
                    transition: dragging ? "none" : "transform 0.18s ease-out",
                  }}
                >
                  <Image
                    src={optimizeCloudinary(images[index], 2000)}
                    alt={label ? `${label} (${index + 1})` : ""}
                    fill
                    sizes="97vw"
                    className="select-none object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,0.55)]"
                    priority
                    draggable={false}
                  />
                </div>
              )}

              {/* Titolo epico */}
              {label && (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-night/90 to-transparent px-6 py-4">
                  <p className="font-heading text-center text-sm tracking-[0.25em] text-gold-bright uppercase">
                    {label}
                  </p>
                </div>
              )}

              {multiple && (
                <>
                  <NavButton side="left" onClick={() => go(-1)}>
                    <ChevronLeft className="size-6" />
                  </NavButton>
                  <NavButton side="right" onClick={() => go(1)}>
                    <ChevronRight className="size-6" />
                  </NavButton>
                </>
              )}
            </div>

            {/* Barra strumenti */}
            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-hairline-strong bg-background/95 px-2 py-1">
              <ToolBtn label="Riduci" onClick={() => zoomBy(0.8)}>
                <ZoomOut className="size-4" />
              </ToolBtn>
              <ToolBtn label="Reimposta" onClick={resetView}>
                <RotateCcw className="size-4" />
              </ToolBtn>
              <ToolBtn label="Ingrandisci" onClick={() => zoomBy(1.25)}>
                <ZoomIn className="size-4" />
              </ToolBtn>
              {multiple && (
                <span className="ml-1 border-l border-hairline-strong pl-2 font-heading text-xs tracking-widest text-gold-bright">
                  {index + 1} / {images.length}
                </span>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </LightboxContext.Provider>
  );
}

function NavButton({
  side,
  onClick,
  children,
}: {
  side: "left" | "right";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Immagine precedente" : "Immagine successiva"}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-gold/30 bg-background/90 text-gold transition-colors hover:border-gold/60 hover:bg-background",
        side === "left" ? "left-2" : "right-2"
      )}
    >
      {children}
    </button>
  );
}

function ToolBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full text-gold transition-colors hover:bg-gold/15"
    >
      {children}
    </button>
  );
}

export function useLightbox(): LightboxContextValue {
  const context = useContext(LightboxContext);
  if (!context) {
    throw new Error("useLightbox deve essere usato dentro LightboxProvider");
  }
  return context;
}

/**
 * Immagine che si apre a schermo intero al click (quando presente).
 * Se manca la sorgente mostra il segnaposto di FantasyImage, non cliccabile.
 */
export function ZoomableImage({
  src,
  alt,
  className,
  sizes,
  priority,
  /** Set completo per la navigazione nel lightbox (default: la sola immagine). */
  group,
  /** Indice di questa immagine dentro `group`. */
  groupIndex = 0,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  group?: string[];
  groupIndex?: number;
}) {
  const { open } = useLightbox();

  if (!src) {
    return <FantasyImage src={src} alt={alt} className={className} sizes={sizes} />;
  }

  return (
    <button
      type="button"
      onClick={() => open(group ?? [src], group ? groupIndex : 0, alt)}
      className={cn(
        "group/zoom relative block w-full cursor-zoom-in overflow-hidden",
        className
      )}
      aria-label={`Apri ${alt} a schermo intero`}
    >
      <FantasyImage
        src={src}
        alt={alt}
        className="size-full"
        sizes={sizes}
        priority={priority}
      />
      <span className="pointer-events-none absolute right-2.5 bottom-2.5 z-10 flex size-8 items-center justify-center rounded-full border border-gold/40 bg-background/90 text-gold opacity-0 transition-opacity group-hover/zoom:opacity-100 [@media(hover:none)]:opacity-100">
        <ZoomIn className="size-4" />
      </span>
    </button>
  );
}

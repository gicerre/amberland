"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmberParticles } from "@/components/shared/particles";

import { getAsset } from "../assets/registry";
import type { AssetColor } from "./svg-asset";
import { FrameOverlay } from "./frame-overlay";
import { DividerAsset } from "./assets";

// Larghezza della colonna di contenuto per i form NON a console (flush=false).
// La cornice esterna è sempre la stessa (near-fullscreen, full height): cambia
// solo quanto è larga la colonna leggibile al suo interno.
const INNER_MAX: Record<string, string> = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
};

export interface ImmersiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Titolo (Targa incisa). */
  title: React.ReactNode;
  /** Sottotitolo / giustificazione diegetica. */
  description?: React.ReactNode;
  /** Icona a sinistra del titolo (sigillo del documento). */
  icon?: React.ReactNode;
  /** Barra azioni in basso (Reliquie). */
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: keyof typeof INNER_MAX;
  /** Colore del metallo della cornice. */
  color?: AssetColor;
  /** Variante asset finestra (es. "03" → window_03). */
  windowVariant?: string;
  /** Braci ambientali fluttuanti (massimale cinematografico). Default true. */
  embers?: boolean;
  /** Se true il corpo non scrolla: il contenuto gestisce il proprio layout
   *  (es. console multi-pannello). Default false. */
  flush?: boolean;
  contentClassName?: string;
  className?: string;
}

/**
 * Modale immersiva in stile menu AAA — una "finestra forgiata" che si apre
 * dal nulla (forge-in) sopra un velo con vignetta. Cornice metallica reale
 * (border-image SVG del design system), fondo ossidiana + braci, intestazione
 * a Targa con divisore ornamentale. Sostituisce la DialogContent generica
 * per i flussi di creazione/modifica/configurazione.
 */
export function ImmersiveModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  footer,
  children,
  size = "md",
  color = "primary",
  windowVariant = "03",
  embers = true,
  flush = false,
  contentClassName,
  className,
}: ImmersiveModalProps) {
  const asset = getAsset(`window_${windowVariant}`);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "modal-vignette fixed inset-0 z-50",
            "data-[state=open]:animate-[overlay-in_220ms_ease-out]",
            "data-[state=closed]:animate-[overlay-out_160ms_ease-in]"
          )}
        />
        {/* Wrapper a tutto schermo che CENTRA il pannello via flex. È
            pointer-events-none così i click fuori dal pannello attraversano
            e colpiscono l'overlay (chiusura). */}
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3">
        <DialogPrimitive.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            // Cornice unica per TUTTE le modali Obsidian (V3 §8): superficie
            // fredda solida (il vetro è riservato ai pannelli piccoli),
            // hairline, ombra E3, blur-fade d'ingresso.
            "group pointer-events-auto relative z-50 flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-hairline-strong bg-surface-1 outline-none",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_40px_110px_-30px_rgba(0,0,0,0.85)]",
            "data-[state=open]:animate-[forge-in_320ms_var(--ease-out)_both]",
            "data-[state=closed]:animate-[forge-out_180ms_ease-in_both]",
            className
          )}
        >
          {/* Atmosfera opzionale: braci quiete dietro al contenuto. */}
          {embers && (
            <EmberParticles
              className="absolute inset-0 z-0 opacity-40"
              density={16}
            />
          )}

          {/* Contenuto reale, sopra l'atmosfera. Padding extra per staccare
              header/corpo/footer dalla cornice overlay su tutti i lati. */}
          <div className="relative z-10 flex min-h-0 flex-1 flex-col p-2 pb-3 sm:p-3 sm:pb-4">
            <header className="shrink-0 px-6 pt-5 pb-3">
              <div className="flex items-start gap-3 pr-8">
                {icon && (
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-hairline-strong bg-surface-2 text-gold [&_svg]:size-5">
                    {icon}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="text-gold-gradient font-heading text-xl leading-tight font-semibold tracking-wide">
                    {title}
                  </DialogPrimitive.Title>
                  {description && (
                    <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                      {description}
                    </DialogPrimitive.Description>
                  )}
                </div>
              </div>
              <div className="relative mt-4 h-2 w-full">
                <DividerAsset color={color} className="opacity-80" />
              </div>
            </header>

            <div
              className={cn(
                "min-h-0 flex-1",
                flush
                  ? "flex flex-col overflow-hidden"
                  : "flex flex-col overflow-y-auto",
                contentClassName
              )}
            >
              {flush ? (
                children
              ) : (
                <div
                  className={cn(
                    "mx-auto my-auto w-full px-6 py-6",
                    INNER_MAX[size]
                  )}
                >
                  {children}
                </div>
              )}
            </div>

            {footer && (
              <footer className="shrink-0 border-t border-hairline bg-surface-0/80 px-6 py-3.5">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  {footer}
                </div>
              </footer>
            )}
          </div>

          {/* Cornice come overlay decorativo sopra il contenuto. */}
          <FrameOverlay asset={asset} color={color} borderWidth="1.55rem" className="z-30" />

          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3 z-40"
            >
              <XIcon />
              <span className="sr-only">Chiudi</span>
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

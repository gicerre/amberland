import { cn } from "@/lib/utils";

import type { AssetDefinition, AssetFamily } from "../assets/registry";
import type { AssetColor } from "./svg-asset";

export interface FrameOverlayProps {
  /** DEPRECATO (Obsidian): gli asset-cornice SVG sono dismessi e ignorati. */
  asset?: AssetDefinition;
  category?: "window" | "frame-square";
  variant?: string;
  family?: AssetFamily;
  color?: AssetColor;
  borderWidth?: string;
  className?: string;
}

/**
 * Cornice come layer sovrapposto al contenuto — versione Obsidian
 * (Constitution v2): le cornici SVG ornamentali sono dismesse; ogni
 * pannello incorniciato riceve una hairline + micro-highlight superiore.
 * Firma invariata: tutti i parametri decorativi legacy sono ignorati.
 */
export function FrameOverlay({ className }: FrameOverlayProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-20 rounded-2xl border border-hairline-strong shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        className
      )}
    />
  );
}

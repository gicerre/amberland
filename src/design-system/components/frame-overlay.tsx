import { cn } from "@/lib/utils";

import type { AssetDefinition, AssetFamily } from "../assets/registry";
import { getAsset, pickFromFamily } from "../assets/registry";
import { frameImageStyle } from "./svg-asset";
import type { AssetColor } from "./svg-asset";

export interface FrameOverlayProps {
  /** Asset esplicito (da getAsset). In alternativa usa category + variant. */
  asset?: AssetDefinition;
  /** Categoria della cornice quando non si passa `asset`. */
  category?: "window" | "frame-square";
  /** Variante (es. "04" → window_04 / frame_square_04). */
  variant?: string;
  family?: AssetFamily;
  color?: AssetColor;
  /** Spessore visivo della cornice. */
  borderWidth?: string;
  className?: string;
}

/**
 * Cornice decorativa come **layer indipendente sovrapposto** al contenuto.
 *
 * Design rule: il frame NON è un bordo che partecipa al layout (border-image
 * con border-width riduce l'area utile, ridimensionando immagini e sfondi).
 * Qui la cornice è un elemento `position:absolute; inset:0; pointer-events:none`
 * il cui SOLO bordo è disegnato (border-image), mentre il centro è trasparente:
 * il contenuto sottostante occupa il 100% del contenitore e si vede attraverso.
 *
 * Uso: il contenitore deve essere `relative`; il contenuto riempie l'area e
 * questo overlay va reso come ultimo figlio (o con z-index superiore).
 */
export function FrameOverlay({
  asset,
  category = "window",
  variant,
  family,
  color = "primary",
  borderWidth = "1.5rem",
  className,
}: FrameOverlayProps) {
  const resolved =
    asset ??
    (variant
      ? getAsset(`${category.replace(/-/g, "_")}_${variant}`)
      : pickFromFamily(category, family));

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 z-20", className)}
      style={frameImageStyle(resolved, color, borderWidth)}
    />
  );
}

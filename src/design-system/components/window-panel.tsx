import { cn } from "@/lib/utils";

import type { AssetFamily } from "../assets/registry";
import { getAsset, pickFromFamily } from "../assets/registry";
import type { AssetColor } from "./svg-asset";
import { FrameOverlay } from "./frame-overlay";

export interface WindowPanelProps extends Omit<React.ComponentProps<"div">, "style"> {
  /** Variante esplicita dell'asset (es. "03" → "window_03"). Default: prima della famiglia. */
  variant?: string;
  family?: AssetFamily;
  color?: AssetColor;
  /** Spessore reale del bordo (CSS border-width). */
  borderWidth?: string;
  contentClassName?: string;
}

/**
 * Pannello "Finestra" — il frame è un vero CSS border-image (vedi
 * frameImageStyle in svg-asset.tsx): angoli ornamentali a dimensione fissa,
 * mai stirati, contenuto nel flusso normale dentro la padding-box.
 */
export function WindowPanel({
  variant,
  family,
  color = "primary",
  borderWidth = "1.5rem",
  className,
  contentClassName,
  children,
  ...props
}: WindowPanelProps) {
  const asset = variant ? getAsset(`window_${variant}`) : pickFromFamily("window", family);

  return (
    <div className={cn("relative", className)} {...props}>
      {/* Contenuto: riempie l'area; padding di default (sovrascrivibile) per
          staccare testi/contenuti dalla cornice overlay. */}
      <div className={cn("relative z-0 flex h-full flex-col overflow-auto p-7", contentClassName)}>
        {children}
      </div>
      {/* Cornice come overlay decorativo sopra il contenuto. */}
      <FrameOverlay asset={asset} color={color} borderWidth={borderWidth} />
    </div>
  );
}

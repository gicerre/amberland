import { cn } from "@/lib/utils";

import type { AssetFamily } from "../assets/registry";
import { getAsset, pickFromFamily } from "../assets/registry";
import type { AssetColor } from "./svg-asset";
import { frameImageStyle } from "./svg-asset";

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
    <div className={className} style={frameImageStyle(asset, color, borderWidth)} {...props}>
      <div className={cn("relative flex h-full flex-col overflow-auto", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

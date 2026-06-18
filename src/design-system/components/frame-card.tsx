import { cn } from "@/lib/utils";

import type { AssetFamily } from "../assets/registry";
import { getAsset, pickFromFamily } from "../assets/registry";
import type { AssetColor } from "./svg-asset";
import { frameImageStyle } from "./svg-asset";

export interface FrameCardProps extends Omit<React.ComponentProps<"div">, "style"> {
  /** Variante esplicita dell'asset (es. "03" → "frame_square_03"). Default: "03". */
  variant?: string;
  family?: AssetFamily;
  color?: AssetColor;
  /** Drop-shadow dorato sulla cornice, per evidenziare contenuti in risalto. */
  glow?: boolean;
  /** Spessore reale del bordo (CSS border-width). */
  borderWidth?: string;
  contentClassName?: string;
}

/**
 * Card "Cornice" — il frame è un vero CSS border-image (vedi frameImageStyle
 * in svg-asset.tsx): angoli ornamentali a dimensione fissa, mai stirati anche
 * su aspect ratio molto larghi/alti; il contenuto resta in flusso normale
 * dentro la padding-box e determina l'altezza della card (adatto a stat
 * card/widget ad altezza intrinseca, dentro griglie).
 */
export function FrameCard({
  variant = "03",
  family,
  color = "primary",
  glow = false,
  borderWidth = "1.25rem",
  className,
  contentClassName,
  children,
  ...props
}: FrameCardProps) {
  const asset = variant ? getAsset(`frame_square_${variant}`) : pickFromFamily("frame-square", family);

  return (
    <div
      className={cn(glow && "[filter:drop-shadow(0_0_24px_rgba(212,175,55,0.18))]", className)}
      style={frameImageStyle(asset, color, borderWidth)}
      {...props}
    >
      <div className={cn("p-6", contentClassName)}>{children}</div>
    </div>
  );
}

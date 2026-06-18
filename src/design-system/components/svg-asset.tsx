import { cn } from "@/lib/utils";
import type { AssetDefinition } from "../assets/registry";

export type AssetColor =
  | "primary"
  | "accent"
  | "secondary"
  | "danger"
  | "neutral"
  | "muted";

/** Mappa sui token CSS già esistenti in globals.css — nessun sistema di colore parallelo. */
const COLOR_CLASS: Record<AssetColor, string> = {
  primary: "text-gold",
  accent: "text-gold-bright",
  secondary: "text-iron-mid",
  danger: "text-crimson",
  neutral: "text-foreground",
  muted: "text-stone-highlight",
};

export interface SvgAssetProps {
  asset: AssetDefinition;
  color?: AssetColor;
  className?: string;
  preserveAspectRatio?: string;
  /** Espande il viewBox di N unità per lato (alcuni asset hanno ornamenti che
   *  sporgono di pochi decimi di unità oltre il viewBox dichiarato). */
  viewBoxPad?: { x?: number; y?: number };
}

function expandViewBox(viewBox: string, pad?: { x?: number; y?: number }): string {
  if (!pad || (!pad.x && !pad.y)) return viewBox;
  const [x, y, w, h] = viewBox.split(/\s+/).map(Number);
  const px = pad.x ?? 0;
  const py = pad.y ?? 0;
  return `${x - px} ${y - py} ${w + px * 2} ${h + py * 2}`;
}

/**
 * Primitivo interno: renderizza un asset del registry come SVG inline,
 * fill="currentColor" diretto sui path (nessuna <style>/class — vedi nota in
 * scripts/build-asset-registry.ts sulla collisione globale di classi SVG).
 * Non esportato dall'index pubblico: i componenti per categoria sono l'API.
 */
export function SvgAssetBase({
  asset,
  color = "primary",
  className,
  preserveAspectRatio = "none",
  viewBoxPad,
}: SvgAssetProps) {
  return (
    <svg
      aria-hidden
      viewBox={expandViewBox(asset.viewBox, viewBoxPad)}
      preserveAspectRatio={preserveAspectRatio}
      fill="currentColor"
      className={cn("pointer-events-none absolute inset-0 size-full", COLOR_CLASS[color], className)}
    >
      {asset.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/** Stesse chiavi di COLOR_CLASS, in hex reale — necessario per il fill
 *  dell'SVG incapsulato in un border-image (non può ereditare currentColor
 *  attraverso il confine data-URI). Tenere sincronizzato con i token in
 *  globals.css (--gold, --gold-bright, --iron-mid, --crimson, --foreground,
 *  --stone-highlight). */
const COLOR_HEX: Record<AssetColor, string> = {
  primary: "#b89018",
  accent: "#d4a828",
  secondary: "#2c2e3e",
  danger: "#680e1c",
  neutral: "#dcd0b0",
  muted: "#191a26",
};

function svgDataUri(asset: AssetDefinition, hex: string): string {
  const [, , w, h] = asset.viewBox.split(/\s+/);
  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${asset.viewBox}" width="${w}" height="${h}">` +
    asset.paths.map((d) => `<path d="${d}" fill="${hex}"/>`).join("") +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(markup)}")`;
}

/**
 * Stile per un bordo "Cornice" via CSS `border-image` (Design Constitution
 * G4: "Frame card con border-image"). A differenza dell'overlay SVG intero
 * stirato (preserveAspectRatio="none" su tutto il viewBox — usato da Button/
 * BreadcrumbTab dove la forma resta vicina al quadrato), `border-image-slice`
 * mantiene gli angoli ornamentali a dimensione fissa e stira solo il
 * segmento dritto centrale di ogni lato: mai gli angoli, anche su aspect
 * ratio molto larghi (banner) o molto alti. Il contenuto resta nel flusso
 * normale dentro la padding-box: non può mai sovrapporsi al bordo, per
 * garanzia del box model (border-box), non per stima percentuale.
 */
export function frameImageStyle(
  asset: AssetDefinition,
  color: AssetColor = "primary",
  borderWidth: string = "1.5rem"
): React.CSSProperties {
  const safeArea = asset.safeArea ?? { top: 15, right: 15, bottom: 15, left: 15 };
  return {
    borderStyle: "solid",
    borderWidth,
    borderImageSource: svgDataUri(asset, COLOR_HEX[color]),
    borderImageSlice: `${safeArea.top}% ${safeArea.right}% ${safeArea.bottom}% ${safeArea.left}%`,
    borderImageWidth: "1",
    borderImageRepeat: "stretch",
  };
}

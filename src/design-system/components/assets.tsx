import type { AssetCategory, AssetFamily } from "../assets/registry";
import { getAsset, pickFromFamily } from "../assets/registry";
import type { AssetColor, SvgAssetProps } from "./svg-asset";
import { SvgAssetBase } from "./svg-asset";

export interface CategoryAssetProps {
  /** Variante esplicita (es. "01" → "window_01"). Se omesso, sceglie il primo
   *  asset disponibile per `family`. */
  style?: string;
  /** Famiglia stilistica. Oggi esiste solo "amberland". */
  family?: AssetFamily;
  color?: AssetColor;
  className?: string;
  viewBoxPad?: SvgAssetProps["viewBoxPad"];
  /** Default "none" (stira sull'intero contenitore). Usare "xMidYMid meet" per
   *  un asset non rettangolare (es. banner a medaglione) che deve restare
   *  proporzionato invece di stirarsi sul contenitore che lo ospita. */
  preserveAspectRatio?: SvgAssetProps["preserveAspectRatio"];
}

function resolveAsset(category: AssetCategory, style?: string, family?: AssetFamily) {
  if (style) {
    return getAsset(`${category.replace(/-/g, "_")}_${style}`);
  }
  return pickFromFamily(category, family);
}

function makeCategoryAsset(category: AssetCategory, displayName: string) {
  function CategoryAsset({ style, family, color, className, viewBoxPad, preserveAspectRatio }: CategoryAssetProps) {
    const asset = resolveAsset(category, style, family);
    return (
      <SvgAssetBase
        asset={asset}
        color={color}
        className={className}
        viewBoxPad={viewBoxPad}
        preserveAspectRatio={preserveAspectRatio}
      />
    );
  }
  CategoryAsset.displayName = displayName;
  return CategoryAsset;
}

/** Cornice grande decorata — contenitore principale (pannelli, finestre modali). */
export const WindowAsset = makeCategoryAsset("window", "WindowAsset");
/** Angolo decorativo isolato, da sovrapporre a un contenitore esistente. */
export const CornerAsset = makeCategoryAsset("corner", "CornerAsset");
/** Separatore orizzontale ornamentale. */
export const DividerAsset = makeCategoryAsset("divider", "DividerAsset");
/** Pergamena/stendardo verticale. */
export const BannerAsset = makeCategoryAsset("banner", "BannerAsset");
/** Shell di un pulsante. */
export const ButtonShellAsset = makeCategoryAsset("button", "ButtonShellAsset");
/** Shell di una tab/breadcrumb. */
export const TabAsset = makeCategoryAsset("tab", "TabAsset");
/** Cornice di una barra di progresso. */
export const ProgressBarAsset = makeCategoryAsset("progress-bar", "ProgressBarAsset");
/** Nota/fumetto ornamentale. */
export const CalloutAsset = makeCategoryAsset("callout", "CalloutAsset");
/** Indicatore direzionale ornato. */
export const ArrowAsset = makeCategoryAsset("arrow", "ArrowAsset");
/** Sigillo/ornamento singolo non numerato in serie. */
export const SymbolAsset = makeCategoryAsset("symbol", "SymbolAsset");
/** Icona semantica singola (corona, scudo, teschio, ...). */
export const IconAsset = makeCategoryAsset("icon", "IconAsset");

/**
 * Cornice quadrata o circolare con foro centrale — unico componente per le
 * due categorie reali `frame-square`/`frame-circle`, selezionate via `shape`
 * (non sono due famiglie stilistiche diverse, sono due forme della stessa
 * categoria "Frame" della Design Constitution).
 */
export function FrameAsset({
  shape = "square",
  style,
  family,
  color,
  className,
  viewBoxPad,
}: CategoryAssetProps & { shape?: "square" | "circle" }) {
  const category: AssetCategory = shape === "circle" ? "frame-circle" : "frame-square";
  const asset = resolveAsset(category, style, family);
  return <SvgAssetBase asset={asset} color={color} className={className} viewBoxPad={viewBoxPad} />;
}

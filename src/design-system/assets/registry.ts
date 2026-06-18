import { GENERATED_ASSETS } from "./generated";
import type { GeneratedAsset } from "./generated/types";

export type AssetCategory =
  | "window"
  | "frame-square"
  | "frame-circle"
  | "corner"
  | "divider"
  | "banner"
  | "button"
  | "tab"
  | "progress-bar"
  | "callout"
  | "arrow"
  | "symbol"
  | "icon";

/** Unica famiglia stilistica realmente presente nel pacchetto asset oggi. */
export type AssetFamily = "amberland";

export interface AssetSafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface AssetDefinition extends GeneratedAsset {
  category: AssetCategory;
  family: AssetFamily;
}

const FAMILY: AssetFamily = "amberland";

export const ASSET_REGISTRY: Record<string, AssetDefinition> = Object.fromEntries(
  Object.entries(GENERATED_ASSETS).map(([id, asset]) => [
    id,
    { ...asset, category: asset.category as AssetCategory, family: FAMILY },
  ])
);

function byCategory(category: AssetCategory): AssetDefinition[] {
  return Object.values(ASSET_REGISTRY)
    .filter((asset) => asset.category === category)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export const WINDOW_ASSETS = byCategory("window");
export const FRAME_SQUARE_ASSETS = byCategory("frame-square");
export const FRAME_CIRCLE_ASSETS = byCategory("frame-circle");
export const CORNER_ASSETS = byCategory("corner");
export const DIVIDER_ASSETS = byCategory("divider");
export const BANNER_ASSETS = byCategory("banner");
export const BUTTON_ASSETS = byCategory("button");
export const TAB_ASSETS = byCategory("tab");
export const PROGRESS_BAR_ASSETS = byCategory("progress-bar");
export const CALLOUT_ASSETS = byCategory("callout");
export const ARROW_ASSETS = byCategory("arrow");
export const SYMBOL_ASSETS = byCategory("symbol");
export const ICON_ASSETS = byCategory("icon");

/** Recupera un asset per id esatto (es. "window_03"). Lancia se non trovato:
 *  un id sbagliato è un errore di programmazione, non un caso da gestire. */
export function getAsset(id: string): AssetDefinition {
  const asset = ASSET_REGISTRY[id];
  if (!asset) {
    throw new Error(`Asset non trovato nel registry: "${id}"`);
  }
  return asset;
}

/** Seleziona il primo asset disponibile di una categoria per una famiglia.
 *  Oggi esiste solo "amberland": il parametro è qui per restare compatibile
 *  quando in futuro verranno aggiunte famiglie stilistiche reali. */
export function pickFromFamily(
  category: AssetCategory,
  family: AssetFamily = FAMILY
): AssetDefinition {
  const pool = byCategory(category).filter((asset) => asset.family === family);
  if (pool.length === 0) {
    throw new Error(`Nessun asset trovato per categoria "${category}" e famiglia "${family}"`);
  }
  return pool[0];
}

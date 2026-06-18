// Generato da scripts/build-asset-registry.ts — non modificare a mano.
export interface GeneratedAssetSafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface GeneratedAsset {
  id: string;
  category: string;
  variant: string;
  viewBox: string;
  paths: readonly string[];
  /** Stima in % per lato. null = non applicabile (asset decorativo non-contenitore). */
  safeArea: GeneratedAssetSafeArea | null;
  /** "category-default": stima a livello di categoria, da verificare visivamente.
   *  "ink-bbox": calcolata dalla bounding box reale dell'inchiostro (icon/symbol/arrow).
   *  "none": nessuna safe-area applicabile. */
  safeAreaSource: "category-default" | "ink-bbox" | "none";
}

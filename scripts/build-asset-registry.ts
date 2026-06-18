/**
 * Genera src/design-system/assets/generated/*.ts a partire dai sorgenti
 * design-sys/assets/*.svg.
 *
 * Ogni SVG incapsula <defs><style>.cls-1{fill:#fff}</style></defs> con un
 * nome di classe (cls-1) identico in ogni file. Gli elementi <style> dentro
 * <svg> NON sono scoped al documento: se due asset inline finissero sulla
 * stessa pagina le regole collidirebbero. Per questo lo script scarta
 * <defs>/<style>/class e riemette solo viewBox + path data, da renderizzare
 * con fill="currentColor" diretto sul path.
 *
 * Uso: npx tsx scripts/build-asset-registry.ts
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const SOURCE_DIR = join(process.cwd(), "design-sys", "assets");
const OUT_DIR = join(process.cwd(), "src", "design-system", "assets", "generated");

type AssetCategory =
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

const CATEGORY_BY_PREFIX: Record<string, AssetCategory> = {
  Window: "window",
  FrameSquare: "frame-square",
  FrameCircle: "frame-circle",
  Corner: "corner",
  Divider: "divider",
  Banner: "banner",
  Button: "button",
  Tab: "tab",
  ProgressBar: "progress-bar",
  Callout: "callout",
  Arrow: "arrow",
  Symbol: "symbol",
  Icon: "icon",
};

// Asset "frame cavo" (contenitori con foro centrale): la safe-area utile è
// l'interno vuoto, non il bbox dell'inchiostro (che tocca quasi sempre i
// margini del viewBox perché la cornice corre lungo il bordo). Per queste
// categorie usiamo una stima per-categoria, calibrata sui valori già
// verificati a occhio nel codice esistente (button.tsx, fantasy-breadcrumb.tsx).
// Per le categorie non-cavo (icon/symbol/arrow) calcoliamo invece la vera
// bounding box dell'inchiostro: sono glifi singoli, non cornici.
const HOLLOW_FRAME_CATEGORIES = new Set<AssetCategory>([
  "window",
  "frame-square",
  "frame-circle",
  "banner",
  "button",
  "tab",
  "progress-bar",
  "callout",
  "divider",
]);

interface Inset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const CATEGORY_SAFE_AREA_DEFAULTS: Record<AssetCategory, Inset | null> = {
  window: { top: 14, right: 10, bottom: 14, left: 10 },
  "frame-square": { top: 12, right: 12, bottom: 12, left: 12 },
  "frame-circle": { top: 18, right: 18, bottom: 18, left: 18 },
  corner: null, // overlay decorativo, non un contenitore
  divider: { top: 35, right: 4, bottom: 35, left: 4 },
  banner: { top: 8, right: 20, bottom: 8, left: 20 },
  button: { top: 22, right: 14, bottom: 22, left: 14 },
  tab: { top: 25, right: 12, bottom: 25, left: 18 },
  "progress-bar": { top: 25, right: 8, bottom: 25, left: 8 },
  callout: { top: 15, right: 10, bottom: 15, left: 12 },
  arrow: null, // calcolata dal bbox
  symbol: null, // calcolata dal bbox
  icon: null, // calcolata dal bbox
};

interface ParsedAsset {
  id: string;
  category: AssetCategory;
  variant: string;
  viewBox: string;
  paths: string[];
  safeArea: Inset | null;
  safeAreaSource: "category-default" | "ink-bbox" | "none";
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractAttr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function extractPaths(svg: string): string[] {
  const paths: string[] = [];
  const pathRe = /<path\b[^>]*\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = pathRe.exec(svg))) {
    const d = extractAttr(match[0], "d");
    if (d) paths.push(d);
  }
  return paths;
}

// ─── Bounding box approssimata della "tinta" (per icon/symbol/arrow) ────────
// Tokenizer minimale dei comandi path SVG: traccia il punto corrente e
// aggiorna la bbox con endpoint + punti di controllo delle curve (un leggero
// sovra-dimensionamento è preferibile a un sotto-dimensionamento per una
// safe-area, meglio essere prudenti che invadere la cornice).
const ARG_COUNTS: Record<string, number> = {
  M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0,
};

function computeInkBBox(paths: string[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let touched = false;

  for (const d of paths) {
    let cx = 0, cy = 0;
    let startX = 0, startY = 0;
    const tokenRe = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
    let tok: RegExpExecArray | null;
    while ((tok = tokenRe.exec(d))) {
      const cmd = tok[1];
      const upper = cmd.toUpperCase();
      const isRelative = cmd !== upper;
      const argCount = ARG_COUNTS[upper];
      const nums = (tok[2].match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? []).map(Number);

      if (upper === "Z") {
        cx = startX;
        cy = startY;
        continue;
      }
      if (argCount === 0) continue;

      for (let i = 0; i + argCount <= nums.length; i += argCount) {
        const group = nums.slice(i, i + argCount);
        if (upper === "H") {
          cx = isRelative ? cx + group[0] : group[0];
        } else if (upper === "V") {
          cy = isRelative ? cy + group[0] : group[0];
        } else {
          // ultimi due valori del gruppo sono sempre il punto risultante
          const ex = group[group.length - 2];
          const ey = group[group.length - 1];
          // punti di controllo intermedi (curve) inclusi nella bbox per prudenza
          for (let p = 0; p + 1 < group.length; p += 2) {
            const px = isRelative ? cx + group[p] : group[p];
            const py = isRelative ? cy + group[p + 1] : group[p + 1];
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);
          }
          cx = isRelative ? cx + ex : ex;
          cy = isRelative ? cy + ey : ey;
          if (upper === "M" && i === 0) {
            startX = cx;
            startY = cy;
          }
        }
        touched = true;
        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        maxX = Math.max(maxX, cx);
        maxY = Math.max(maxY, cy);
      }
    }
  }

  return touched ? { minX, minY, maxX, maxY } : null;
}

function safeAreaFromBBox(
  viewBox: string,
  bbox: { minX: number; minY: number; maxX: number; maxY: number }
): Inset {
  const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);
  const clampPct = (n: number) => Math.round(Math.max(0, Math.min(45, n)) * 10) / 10;
  return {
    top: clampPct(((bbox.minY - vy) / vh) * 100),
    left: clampPct(((bbox.minX - vx) / vw) * 100),
    right: clampPct(((vx + vw - bbox.maxX) / vw) * 100),
    bottom: clampPct(((vy + vh - bbox.maxY) / vh) * 100),
  };
}

function parseFile(filename: string): ParsedAsset | null {
  const prefix = filename.split("_")[0];
  const category = CATEGORY_BY_PREFIX[prefix];
  if (!category) {
    console.warn(`Skipping unrecognized asset prefix: ${filename}`);
    return null;
  }

  const variantRaw = filename.slice(prefix.length + 1).replace(/\.svg$/, "");
  const variant = toSlug(variantRaw);
  const id = `${category.replace(/-/g, "_")}_${variant}`;

  const svg = readFileSync(join(SOURCE_DIR, filename), "utf8");
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  if (!viewBoxMatch) {
    console.warn(`Skipping asset without viewBox: ${filename}`);
    return null;
  }
  const viewBox = viewBoxMatch[1];
  const paths = extractPaths(svg);
  if (paths.length === 0) {
    console.warn(`Skipping asset without paths: ${filename}`);
    return null;
  }

  let safeArea: Inset | null = null;
  let safeAreaSource: ParsedAsset["safeAreaSource"] = "none";

  if (HOLLOW_FRAME_CATEGORIES.has(category)) {
    safeArea = CATEGORY_SAFE_AREA_DEFAULTS[category];
    safeAreaSource = safeArea ? "category-default" : "none";
  } else {
    const bbox = computeInkBBox(paths);
    if (bbox) {
      safeArea = safeAreaFromBBox(viewBox, bbox);
      safeAreaSource = "ink-bbox";
    }
  }

  return { id, category, variant, viewBox, paths, safeArea, safeAreaSource };
}

function categoryConstName(category: AssetCategory): string {
  return category.replace(/-/g, "_").toUpperCase();
}

function emitCategoryFile(category: AssetCategory, assets: ParsedAsset[]) {
  const constName = categoryConstName(category);
  const lines: string[] = [];
  lines.push(`// Generato da scripts/build-asset-registry.ts — non modificare a mano.`);
  lines.push(`import type { GeneratedAsset } from "./types";`);
  lines.push("");
  lines.push(`export const ${constName}_ASSETS: Record<string, GeneratedAsset> = {`);
  for (const asset of assets) {
    lines.push(`  ${JSON.stringify(asset.id)}: {`);
    lines.push(`    id: ${JSON.stringify(asset.id)},`);
    lines.push(`    category: ${JSON.stringify(asset.category)},`);
    lines.push(`    variant: ${JSON.stringify(asset.variant)},`);
    lines.push(`    viewBox: ${JSON.stringify(asset.viewBox)},`);
    lines.push(`    safeArea: ${asset.safeArea ? JSON.stringify(asset.safeArea) : "null"},`);
    lines.push(`    safeAreaSource: ${JSON.stringify(asset.safeAreaSource)},`);
    lines.push(`    paths: [`);
    for (const d of asset.paths) {
      lines.push(`      ${JSON.stringify(d)},`);
    }
    lines.push(`    ],`);
    lines.push(`  },`);
  }
  lines.push(`};`);
  lines.push("");
  writeFileSync(join(OUT_DIR, `${category}.ts`), lines.join("\n"), "utf8");
}

function emitTypesFile() {
  const content = `// Generato da scripts/build-asset-registry.ts — non modificare a mano.
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
`;
  writeFileSync(join(OUT_DIR, "types.ts"), content, "utf8");
}

function emitIndexFile(categories: AssetCategory[]) {
  const lines: string[] = [];
  lines.push(`// Generato da scripts/build-asset-registry.ts — non modificare a mano.`);
  lines.push(`import type { GeneratedAsset } from "./types";`);
  for (const category of categories) {
    lines.push(`import { ${categoryConstName(category)}_ASSETS } from "./${category}";`);
  }
  lines.push("");
  lines.push(`export const GENERATED_ASSETS: Record<string, GeneratedAsset> = {`);
  for (const category of categories) {
    lines.push(`  ...${categoryConstName(category)}_ASSETS,`);
  }
  lines.push(`};`);
  lines.push("");
  for (const category of categories) {
    lines.push(`export { ${categoryConstName(category)}_ASSETS } from "./${category}";`);
  }
  lines.push("");
  writeFileSync(join(OUT_DIR, "index.ts"), lines.join("\n"), "utf8");
}

function main() {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const files = readdirSync(SOURCE_DIR).filter((f) => f.endsWith(".svg"));
  const byCategory = new Map<AssetCategory, ParsedAsset[]>();

  for (const file of files) {
    const parsed = parseFile(file);
    if (!parsed) continue;
    const bucket = byCategory.get(parsed.category) ?? [];
    bucket.push(parsed);
    byCategory.set(parsed.category, bucket);
  }

  emitTypesFile();
  const categories = Array.from(byCategory.keys()).sort();
  for (const category of categories) {
    const assets = byCategory.get(category)!.sort((a, b) => a.id.localeCompare(b.id));
    emitCategoryFile(category, assets);
  }
  emitIndexFile(categories);

  const total = Array.from(byCategory.values()).reduce((sum, a) => sum + a.length, 0);
  console.log(`Generated ${total} assets across ${categories.length} categories into ${OUT_DIR}`);
  for (const category of categories) {
    console.log(`  ${category}: ${byCategory.get(category)!.length}`);
  }
}

main();

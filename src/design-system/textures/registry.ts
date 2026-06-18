/**
 * Registry delle texture materiali (raster, non SVG) servite da /public/textures.
 * Mappano 1:1 ai "materiali dominanti" della Design Constitution
 * (docs/DESIGN_CONSTITUTION.md): Metallo / Pergamena / Pietra / Legno, più
 * Vetro che esiste come famiglia reale negli asset ma non nella constitution.
 *
 * Sorgenti originali (jpg) in design-sys/textures/; le versioni servite sono
 * già state convertite in webp in public/textures/ in un commit precedente.
 */
export type MaterialFamily = "wood" | "metal" | "parchment" | "stone" | "glass";

export interface TextureDefinition {
  id: string;
  material: MaterialFamily;
  /** Percorso pubblico, da usare in background-image: url(...) */
  src: string;
}

export const TEXTURE_REGISTRY: Record<string, TextureDefinition> = {
  "parchment-1": { id: "parchment-1", material: "parchment", src: "/textures/parchment-1.webp" },
  "parchment-2": { id: "parchment-2", material: "parchment", src: "/textures/parchment-2.webp" },
  "parchment-3": { id: "parchment-3", material: "parchment", src: "/textures/parchment-3.webp" },
  "wood-old": { id: "wood-old", material: "wood", src: "/textures/wood-old.webp" },
  "wood-tavern": { id: "wood-tavern", material: "wood", src: "/textures/wood-tavern.webp" },
  obsidian: { id: "obsidian", material: "stone", src: "/textures/obsidian.webp" },
  "copper-blue-orange": { id: "copper-blue-orange", material: "metal", src: "/textures/copper-blue-orange.webp" },
  "copper-green-blue": { id: "copper-green-blue", material: "metal", src: "/textures/copper-green-blue.webp" },
  "copper-light": { id: "copper-light", material: "metal", src: "/textures/copper-light.webp" },
  "copper-violet": { id: "copper-violet", material: "metal", src: "/textures/copper-violet.webp" },
  gold: { id: "gold", material: "metal", src: "/textures/gold.webp" },
  "metal-blue": { id: "metal-blue", material: "metal", src: "/textures/metal-blue.webp" },
  "metal-dark": { id: "metal-dark", material: "metal", src: "/textures/metal-dark.webp" },
  "metal-destroyed": { id: "metal-destroyed", material: "metal", src: "/textures/metal-destroyed.webp" },
  "metal-heavy": { id: "metal-heavy", material: "metal", src: "/textures/metal-heavy.webp" },
  "metal-rusted": { id: "metal-rusted", material: "metal", src: "/textures/metal-rusted.webp" },
  "silver-destroyed": { id: "silver-destroyed", material: "metal", src: "/textures/silver-destroyed.webp" },
  silver: { id: "silver", material: "metal", src: "/textures/silver.webp" },
  "glass-blue": { id: "glass-blue", material: "glass", src: "/textures/glass-blue.webp" },
  "glass-light": { id: "glass-light", material: "glass", src: "/textures/glass-light.webp" },
};

function byMaterial(material: MaterialFamily): TextureDefinition[] {
  return Object.values(TEXTURE_REGISTRY)
    .filter((t) => t.material === material)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export const WOOD_TEXTURES = byMaterial("wood");
export const METAL_TEXTURES = byMaterial("metal");
export const PARCHMENT_TEXTURES = byMaterial("parchment");
export const STONE_TEXTURES = byMaterial("stone");
export const GLASS_TEXTURES = byMaterial("glass");

export function getTexture(id: string): TextureDefinition {
  const texture = TEXTURE_REGISTRY[id];
  if (!texture) {
    throw new Error(`Texture non trovata nel registry: "${id}"`);
  }
  return texture;
}

export function pickFromMaterial(material: MaterialFamily): TextureDefinition {
  const pool = byMaterial(material);
  if (pool.length === 0) {
    throw new Error(`Nessuna texture trovata per materiale "${material}"`);
  }
  return pool[0];
}

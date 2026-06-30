/**
 * Ottimizza le immagini sorgente della campagna (cartella /img)
 * generando versioni WebP leggere in /public/images.
 *
 * Uso: npm run optimize:images
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const jobs = [
  { src: "img/opener_bg.png", out: "public/images/landing-bg.webp", width: 1920, quality: 74 },
  { src: "img/Mondo Conosciuto.png", out: "public/images/world/mondo-fuori.webp", width: 1600, quality: 72 },
  { src: "img/Vyones Citta.png", out: "public/images/world/vyones.webp", width: 1600, quality: 72 },
  { src: "img/Citta del Nord.png", out: "public/images/world/citta-del-nord.webp", width: 1600, quality: 72 },
  { src: "img/Citta del Porto.png", out: "public/images/world/citta-del-porto.webp", width: 1600, quality: 72 },

  // ── Sfondi delle hero-box di lista ──────────────────────────────────────
  { src: "img/atlante_dei_mondi.jpg", out: "public/images/atlante-dei-mondi.webp", width: 1600, quality: 76 },
  { src: "img/albo_delle_imprese.jpg", out: "public/images/albo-delle-imprese.webp", width: 1600, quality: 76 },
  { src: "img/personaggi.jpg", out: "public/images/personaggi.webp", width: 1600, quality: 76 },
  { src: "img/fazioni.jpg", out: "public/images/fazioni.webp", width: 1600, quality: 76 },
  { src: "img/oggetti.jpg", out: "public/images/oggetti.webp", width: 1600, quality: 76 },
  { src: "img/bestiario.jpg", out: "public/images/bestiario.webp", width: 1600, quality: 76 },
  { src: "img/home.jpg", out: "public/images/home.webp", width: 1600, quality: 76 },

  // ── Texture design-sys → public/textures ────────────────────────────────
  // Pietra / Ossidiana (body background, pannelli principali)
  { src: "design-sys/textures/obsidian-texture.jpg",            out: "public/textures/obsidian.webp",              width: 1024, quality: 80 },
  // Metallo forgiato (sidebar, card border, pannelli strutturali)
  { src: "design-sys/textures/heavy-metal-destroyed-texture.jpg", out: "public/textures/metal-destroyed.webp",     width: 1024, quality: 80 },
  { src: "design-sys/textures/heavy-metal-rusted-texture.jpg",  out: "public/textures/metal-rusted.webp",          width: 1024, quality: 80 },
  { src: "design-sys/textures/metal-dark-texture.jpg",          out: "public/textures/metal-dark.webp",            width: 1024, quality: 80 },
  { src: "design-sys/textures/metal-heavy-texture.jpg",         out: "public/textures/metal-heavy.webp",           width: 1024, quality: 80 },
  // Oro / Bronzo / Argento (accenti, badge, CTA)
  { src: "design-sys/textures/gold-texture.jpg",                out: "public/textures/gold.webp",                  width: 512,  quality: 82 },
  { src: "design-sys/textures/copper-blue-orange-texture.jpg",  out: "public/textures/copper-blue-orange.webp",    width: 512,  quality: 78 },
  { src: "design-sys/textures/copper-green-blue-texture.jpg",   out: "public/textures/copper-green-blue.webp",     width: 512,  quality: 78 },
  { src: "design-sys/textures/copper-light-texture.jpg",        out: "public/textures/copper-light.webp",          width: 512,  quality: 78 },
  { src: "design-sys/textures/copper-violet-texture.jpg",       out: "public/textures/copper-violet.webp",         width: 512,  quality: 78 },
  { src: "design-sys/textures/silver-texture.jpg",              out: "public/textures/silver.webp",                width: 512,  quality: 78 },
  { src: "design-sys/textures/silver-destroy-texture.jpg",      out: "public/textures/silver-destroyed.webp",      width: 512,  quality: 78 },
  { src: "design-sys/textures/metal-blue-texture.jpg",          out: "public/textures/metal-blue.webp",            width: 512,  quality: 78 },
  // Legno nobile (sidebar, navigazione)
  { src: "design-sys/textures/wood-old-texture.jpg",            out: "public/textures/wood-old.webp",              width: 1024, quality: 80 },
  { src: "design-sys/textures/wood-tavern-texture.jpg",         out: "public/textures/wood-tavern.webp",           width: 1024, quality: 80 },
  // Pergamena (form, descrizioni, .parchment class)
  { src: "design-sys/textures/book-page-1.jpg",                 out: "public/textures/parchment-1.webp",           width: 1024, quality: 82 },
  { src: "design-sys/textures/book-page-2.jpg",                 out: "public/textures/parchment-2.webp",           width: 1024, quality: 82 },
  { src: "design-sys/textures/book-page-3.jpg",                 out: "public/textures/parchment-3.webp",           width: 1024, quality: 82 },
  // Vetro (bassa priorità — valutare se usare)
  { src: "design-sys/textures/glass-blue-texture.jpg",          out: "public/textures/glass-blue.webp",            width: 512,  quality: 75 },
  { src: "design-sys/textures/glass-light-texture.jpg",         out: "public/textures/glass-light.webp",           width: 512,  quality: 75 },
];

for (const job of jobs) {
  if (!existsSync(job.src)) {
    console.warn(`[skip] sorgente mancante: ${job.src}`);
    continue;
  }
  await mkdir(path.dirname(job.out), { recursive: true });
  const info = await sharp(job.src)
    .resize({ width: job.width, withoutEnlargement: true })
    .webp({ quality: job.quality })
    .toFile(job.out);
  console.log(`[ok] ${job.out} (${Math.round(info.size / 1024)} KB)`);
}

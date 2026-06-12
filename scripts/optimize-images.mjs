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

// Converte le illustrazioni del wizard di creazione PC in WebP ottimizzate.
// Sorgenti in img/ (varie estensioni) → output in public/img/step_N.webp
// (servite da Next a /img/step_N.webp).
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "img");
const OUT_DIR = path.join(ROOT, "public", "img");

// Mappa esplicita: alcuni file hanno estensioni/nomi non uniformi.
const SOURCES = {
  step_0: "step_0.jpg.jpg",
  step_1: "step_1.jpg",
  step_2: "step_2.jpg",
  step_3: "step_3.png",
  step_4: "step_4.jpg",
};

await mkdir(OUT_DIR, { recursive: true });

for (const [name, file] of Object.entries(SOURCES)) {
  const src = path.join(SRC_DIR, file);
  if (!existsSync(src)) {
    console.warn(`! sorgente mancante: ${file} — salto ${name}`);
    continue;
  }
  const out = path.join(OUT_DIR, `${name}.webp`);
  const info = await sharp(src)
    .resize({ width: 1400, height: 1800, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(out);
  console.log(`✓ ${name}.webp  (${(info.size / 1024).toFixed(0)} KB)`);
}

console.log("Conversione completata.");

"use client";

import type { CellSample } from "@/features/battle/engine/image-analysis";
import { optimizeCloudinary } from "@/lib/upload/image-service";

/* ============================================================
 * Prelievo dei campioni dall'immagine.
 *
 * L'unico pezzo che tocca il browser: carica l'immagine in un canvas,
 * la riduce a una taglia gestibile e ne estrae, per ogni casella della
 * griglia, colore medio, luminanza, saturazione e quanto è "mossa".
 * L'interpretazione avviene altrove, in un modulo puro.
 *
 * Limite dichiarato: leggere i pixel di un'immagine ospitata altrove
 * richiede che quel server conceda il CORS. Cloudinary lo fa; un URL
 * incollato a caso può rifiutare, e in quel caso lo si dice invece di
 * fallire in silenzio.
 * ============================================================ */

export interface SampledImage {
  samples: CellSample[][];
  /** Energia dei bordi verticali per colonna: serve a trovare la griglia. */
  columnProfile: number[];
  /** Energia dei bordi orizzontali per riga. */
  rowProfile: number[];
  width: number;
  height: number;
}

/** Lato massimo dell'analisi: oltre non si guadagna precisione utile. */
const MAX_SIDE = 1400;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    // Senza questo il canvas resta "sporco" e i pixel non si leggono.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Immagine non caricabile: controlla l'URL."));
    image.src = optimizeCloudinary(url, MAX_SIDE);
  });
}

/** Da RGB a tinta e saturazione (HSL, senza la luminosità). */
function hueSaturation(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) return { hue: 0, saturation: 0 };

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue: number;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  hue = hue * 60;
  if (hue < 0) hue += 360;
  return { hue, saturation };
}

/**
 * Campiona l'immagine sulla griglia indicata.
 *
 * Una sola passata sui pixel: si accumulano somme per casella (colore,
 * luminanza, luminanza al quadrato per la deviazione) e in parallelo i
 * profili dei bordi usati dal rilevamento della griglia.
 */
export async function sampleImage(
  url: string,
  cols: number,
  rows: number
): Promise<SampledImage> {
  const image = await loadImage(url);

  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas non disponibile in questo browser.");
  context.drawImage(image, 0, 0, width, height);

  let data: Uint8ClampedArray;
  try {
    data = context.getImageData(0, 0, width, height).data;
  } catch {
    throw new Error(
      "Il server dell'immagine non consente la lettura dei pixel (CORS). Carica il file invece di incollare l'URL."
    );
  }

  const cellCount = cols * rows;
  const sumR = new Float64Array(cellCount);
  const sumG = new Float64Array(cellCount);
  const sumB = new Float64Array(cellCount);
  const sumL = new Float64Array(cellCount);
  const sumL2 = new Float64Array(cellCount);
  const count = new Float64Array(cellCount);

  const columnProfile = new Array<number>(width).fill(0);
  const rowProfile = new Array<number>(height).fill(0);

  // Luminanza della riga precedente, per i bordi orizzontali.
  let previousRow = new Float64Array(width);

  for (let y = 0; y < height; y++) {
    const cellY = Math.min(rows - 1, Math.floor((y / height) * rows));
    let previousLuminance = 0;

    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = data[index]!;
      const g = data[index + 1]!;
      const b = data[index + 2]!;
      // Luminanza percepita: il verde pesa più del blu.
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

      const cellX = Math.min(cols - 1, Math.floor((x / width) * cols));
      const cell = cellY * cols + cellX;
      sumR[cell] += r;
      sumG[cell] += g;
      sumB[cell] += b;
      sumL[cell] += luminance;
      sumL2[cell] += luminance * luminance;
      count[cell] += 1;

      if (x > 0) {
        const edge = Math.abs(luminance - previousLuminance);
        columnProfile[x] += edge;
      }
      if (y > 0) {
        rowProfile[y] += Math.abs(luminance - previousRow[x]!);
      }
      previousLuminance = luminance;
      previousRow[x] = luminance;
    }
  }
  previousRow = new Float64Array(0);

  const samples: CellSample[][] = [];
  for (let y = 0; y < rows; y++) {
    samples[y] = [];
    for (let x = 0; x < cols; x++) {
      const cell = y * cols + x;
      const pixels = count[cell] || 1;
      const r = sumR[cell]! / pixels;
      const g = sumG[cell]! / pixels;
      const b = sumB[cell]! / pixels;
      const luminance = sumL[cell]! / pixels;
      const variance = Math.max(0, sumL2[cell]! / pixels - luminance * luminance);
      const { hue, saturation } = hueSaturation(r, g, b);

      samples[y]![x] = {
        r,
        g,
        b,
        luminance,
        saturation,
        hue,
        // La deviazione standard della luminanza sta sotto ~0,35 anche
        // nelle texture più mosse: si normalizza su quella.
        detail: Math.min(1, Math.sqrt(variance) / 0.35),
      };
    }
  }

  return { samples, columnProfile, rowProfile, width, height };
}

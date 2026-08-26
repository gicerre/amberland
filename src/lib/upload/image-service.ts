/**
 * Servizio di upload immagini — alternativa GRATUITA a Firebase Storage.
 *
 * Strategia:
 *  - Se Cloudinary è configurato (NEXT_PUBLIC_CLOUDINARY_*), carica il file
 *    direttamente dal browser con un "unsigned upload preset" (nessun segreto
 *    esposto) e restituisce l'URL pubblico da salvare in Firestore.
 *  - In assenza di configurazione, l'upload diretto è disabilitato: l'utente
 *    può comunque incollare un URL immagine già online (fallback a costo zero).
 *
 * Cloudinary ha un piano gratuito senza carta di credito ed è pensato proprio
 * per questo caso d'uso. Vedi README per la configurazione.
 */

import type { EntityType } from "@/types/entities";

/**
 * Cartelle logiche di destinazione (prefisso del folder Cloudinary): una per
 * tipo di entità, più le cartelle del Campo di Battaglia (sfondi e pedine).
 */
export type ImageFolder = EntityType | "misc" | "battlemap" | "token";

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/** True se l'upload diretto (Cloudinary) è configurato. */
export const isUploadConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

/**
 * Comprime un'immagine lato browser PRIMA dell'upload: ridimensiona al lato
 * massimo indicato e riconverte in WebP. Riduce sia lo storage su Cloudinary
 * sia la banda di caricamento (utile soprattutto da mobile). In caso di
 * problemi (formato non decodificabile, niente guadagno…) ritorna l'originale.
 * Salta i formati che non vanno rasterizzati (SVG, GIF animate).
 */
export async function compressImage(
  file: File,
  maxSize = 2000,
  quality = 0.82
): Promise<File> {
  if (
    typeof document === "undefined" ||
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );
    // Nessun guadagno reale: meglio tenere l'originale.
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}

/**
 * Inietta le trasformazioni di consegna negli URL Cloudinary: `f_auto`
 * (WebP/AVIF in base al browser), `q_auto` (compressione) e `c_limit,w_`
 * (cap di larghezza). Idempotente; gli URL non‑Cloudinary tornano invariati.
 */
export function optimizeCloudinary(
  url: string | null | undefined,
  width = 1600
): string {
  if (!url) return "";
  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || idx === -1) return url;
  const rest = url.slice(idx + marker.length);
  // Già trasformato (es. applicato due volte): non duplicare.
  const firstSegment = rest.split("/")[0] ?? "";
  if (firstSegment.includes("f_auto") || firstSegment.includes("q_auto")) {
    return url;
  }
  return `${url.slice(0, idx + marker.length)}f_auto,q_auto,c_limit,w_${width}/${rest}`;
}

/**
 * Carica un'immagine su Cloudinary e restituisce l'URL sicuro (https).
 * Lancia un errore leggibile se l'upload non è configurato o fallisce.
 */
export async function uploadImage(
  folder: ImageFolder,
  file: File
): Promise<string> {
  if (!isUploadConfigured) {
    throw new Error(
      "Caricamento diretto non configurato. Imposta Cloudinary in .env.local, oppure incolla l'URL di un'immagine già online."
    );
  }

  // Leva 2: ottimizzazione in upload (ridimensiona + WebP) prima dell'invio.
  const optimized = await compressImage(file);

  const form = new FormData();
  form.append("file", optimized);
  form.append("upload_preset", UPLOAD_PRESET as string);
  form.append("folder", `amberland/${folder}`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: "POST", body: form }
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      data?.error?.message ?? "Caricamento su Cloudinary non riuscito"
    );
  }

  const data = (await response.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new Error("Risposta di Cloudinary non valida");
  }
  return data.secure_url;
}

/** Validazione minimale di un URL immagine incollato dall'utente. */
export function isLikelyImageUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

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

/** Cartelle logiche di destinazione (prefisso del folder Cloudinary): una per tipo di entità. */
export type ImageFolder = EntityType | "misc";

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/** True se l'upload diretto (Cloudinary) è configurato. */
export const isUploadConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

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

  const form = new FormData();
  form.append("file", file);
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

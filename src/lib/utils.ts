import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { AUTH_EMAIL_DOMAIN } from "@/lib/constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Converte un nome in slug URL-safe ("Città del Nord" → "citta-del-nord"). */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Garantisce uno slug univoco rispetto a quelli già esistenti aggiungendo un suffisso numerico. */
export function ensureUniqueSlug(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base
  let counter = 2
  while (existing.includes(`${base}-${counter}`)) counter += 1
  return `${base}-${counter}`
}

/** Mappa lo username sull'email fittizia usata da Firebase Auth. */
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`
}

/** Formatta una data in italiano ("12 mar 2026", opzionalmente con orario). */
export function formatDate(
  date: Date | null | undefined,
  withTime = false
): string {
  if (!date) return "—"
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(date)
}

/** Converte un Timestamp Firestore (o null) in Date. */
export function timestampToDate(
  timestamp: { toDate(): Date } | null | undefined
): Date | null {
  return timestamp ? timestamp.toDate() : null
}

/** Genera una password casuale leggibile (senza caratteri ambigui). */
export function generatePassword(length = 12): string {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%"
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  let password = ""
  for (let i = 0; i < length; i++) {
    password += charset[values[i] % charset.length]
  }
  return password
}

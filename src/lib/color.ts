/**
 * Helper colore del design system (docs/DESIGN_SYSTEM_V2.md §3.1).
 *
 * Gli accent di registry e stati sono stringhe `var(--token)`: qui vivono
 * le uniche due operazioni ammesse su di essi. Vietato riconvertire in
 * hex a mano nelle pagine.
 */

/**
 * Applica trasparenza a un colore CSS qualsiasi — hex, rgb() o
 * `var(--token)` — tramite color-mix. Sostituisce i vecchi helper
 * hex→rgba duplicati nei componenti.
 */
export function withAlpha(color: string, alpha: number): string {
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}

/**
 * Risolve una stringa `var(--token)` nel valore calcolato, per i contesti
 * che non capiscono le variabili CSS (canvas 2D del grafo). Per ogni
 * altro colore restituisce l'input invariato.
 */
export function resolveCssColor(color: string, element?: Element): string {
  const match = color.trim().match(/^var\((--[\w-]+)\)$/);
  if (!match) return color;
  if (typeof window === "undefined") return color;
  const scope = element ?? document.documentElement;
  return getComputedStyle(scope).getPropertyValue(match[1]).trim() || color;
}

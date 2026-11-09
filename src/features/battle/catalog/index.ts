import {
  CATEGORY_LABELS,
  type ElementCategory,
  type ElementTemplate,
} from "@/types/element-catalog";

import { FIELD_TEMPLATES } from "./field";
import { NATURE_TEMPLATES } from "./nature";
import { PROP_TEMPLATES } from "./props";
import { STRUCTURE_TEMPLATES } from "./structures";
import { WATER_TEMPLATES } from "./water";

/* ============================================================
 * Il catalogo.
 *
 * Un registro unico, costruito da archetipi: aggiungere un elemento
 * significa aggiungere una riga in uno dei file di categoria, non
 * toccare il motore. Gli id sono stabili e parlanti
 * ("structure.door.reinforced") perché finiscono dentro le mappe salvate
 * e devono restare leggibili fra un anno.
 * ============================================================ */

export const ELEMENT_CATALOG: ElementTemplate[] = [
  ...STRUCTURE_TEMPLATES,
  ...NATURE_TEMPLATES,
  ...WATER_TEMPLATES,
  ...PROP_TEMPLATES,
  ...FIELD_TEMPLATES,
];

const BY_ID = new Map(ELEMENT_CATALOG.map((template) => [template.id, template]));

export function templateById(id: string): ElementTemplate | null {
  return BY_ID.get(id) ?? null;
}

/** Categorie presenti, nell'ordine in cui hanno senso a schermo. */
export function catalogCategories(): {
  category: ElementCategory;
  label: string;
  count: number;
}[] {
  const counts = new Map<ElementCategory, number>();
  for (const template of ELEMENT_CATALOG) {
    counts.set(template.category, (counts.get(template.category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([category, count]) => ({
    category,
    label: CATEGORY_LABELS[category],
    count,
  }));
}

/** Famiglie dentro una categoria ("Porte", "Muri", "Passaggi"). */
export function catalogGroups(category: ElementCategory): string[] {
  return [
    ...new Set(
      ELEMENT_CATALOG.filter((template) => template.category === category).map(
        (template) => template.group
      )
    ),
  ];
}

/**
 * Ricerca per nome, descrizione, materiale e parole chiave: il Master
 * scrive "porta" o "riparo" e trova ciò che gli serve senza navigare.
 */
export function searchCatalog(
  query: string,
  filters: { category?: ElementCategory | null; group?: string | null } = {}
): ElementTemplate[] {
  const needle = query.trim().toLowerCase();
  return ELEMENT_CATALOG.filter((template) => {
    if (filters.category && template.category !== filters.category) return false;
    if (filters.group && template.group !== filters.group) return false;
    if (!needle) return true;
    return (
      template.label.toLowerCase().includes(needle) ||
      template.description.toLowerCase().includes(needle) ||
      template.material.toLowerCase().includes(needle) ||
      template.group.toLowerCase().includes(needle) ||
      template.keywords.some((word) => word.includes(needle))
    );
  });
}

/** Riepilogo di una voce, per gli elenchi: cosa fa, in tre parole. */
export function templateSummary(template: ElementTemplate): string {
  const behaviour = template.states[template.initialState];
  const parts: string[] = [];

  if (behaviour?.movementCost === null) parts.push("Invalicabile");
  else if ((behaviour?.movementCost ?? 1) > 1) parts.push("Terreno difficile");
  else parts.push("Attraversabile");

  if (behaviour?.cover && behaviour.cover !== "NONE") {
    parts.push(
      behaviour.cover === "TOTAL"
        ? "copertura totale"
        : behaviour.cover === "THREE_QUARTERS"
          ? "tre quarti"
          : "mezza copertura"
    );
  }
  if (behaviour?.blocksSight) parts.push("ferma la vista");
  if (template.climb) parts.push("scalabile");
  if (template.movable) parts.push("spostabile");

  return parts.join(" · ");
}

export { CATEGORY_LABELS };
export type { ElementCategory, ElementTemplate };

import { cellDistance, parseCellKey } from "@/features/battle/engine/geometry";
import type { Position } from "@/types/battle";
import type { ElementInteraction, MapObject } from "@/types/battlemap";

/* ============================================================
 * Interazioni con l'ambiente — MODULO PURO.
 *
 * L'effetto di un'azione è dichiarato dal Master in fase di
 * configurazione ("apri: la porta diventa attraversabile"); qui lo si
 * applica. Stessa funzione nel browser, per l'anteprima, e nella
 * transazione del server, che è la verità.
 * ============================================================ */

export {
  availableInteractions,
  availableMethods,
  behaviourOf,
  damageElement,
  distanceToElement as elementDistance,
  outcomeOf,
  summarize,
} from "@/features/battle/engine/elements";

/** Distanza in caselle fra una pedina e la casella più vicina dell'elemento. */
export function distanceToElement(
  from: Position,
  element: Pick<MapObject, "cells">
): number {
  let best = Number.POSITIVE_INFINITY;
  for (const key of element.cells) {
    const cell = parseCellKey(key);
    if (!cell) continue;
    best = Math.min(best, cellDistance(from, cell, "CHEBYSHEV"));
  }
  return best;
}

/** True se da quella casella si può agire sull'elemento. */
export function isWithinReach(
  from: Position,
  element: Pick<MapObject, "cells" | "interactionRange">
): boolean {
  return (
    distanceToElement(from, element) <= Math.max(1, element.interactionRange)
  );
}

/**
 * Applica l'interazione all'elemento: stato, passabilità, linea di vista
 * e copertura cambiano solo dove l'azione lo dichiara. Non muta l'input.
 */
export function applyInteraction(
  element: MapObject,
  interaction: ElementInteraction
): MapObject {
  return {
    ...element,
    state: interaction.setsState ?? element.state,
    blocksMovement: interaction.setsBlocksMovement ?? element.blocksMovement,
    blocksSight: interaction.setsBlocksSight ?? element.blocksSight,
    cover: interaction.setsCover ?? element.cover,
    interactions: element.interactions.map((entry) =>
      entry.id === interaction.id && entry.once
        ? { ...entry, used: true }
        : entry
    ),
  };
}

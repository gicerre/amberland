import { cellKey, cellDistance, parseCellKey } from "@/features/battle/engine/geometry";
import type { Position } from "@/types/battle";
import type {
  CoverLevel,
  ElementInteraction,
  MapObject,
  ObjectState,
} from "@/types/battlemap";
import type {
  ElementTemplate,
  InteractionOutcome,
  OutcomeKind,
  ResolutionMethod,
  StateBehaviour,
} from "@/types/element-catalog";

/* ============================================================
 * Elementi ambientali — MODULO PURO.
 *
 * Il ponte fra il catalogo (i modelli) e la mappa (le istanze).
 *
 * Regola di fondo: **l'istanza è autosufficiente**. Quando il Master
 * dichiara "questa è una porta rinforzata", il template viene COPIATO
 * dentro l'istanza. Da lì in poi il motore non consulta più il catalogo:
 * la mappa salvata resta comprensibile e giocabile anche se domani il
 * catalogo cambia, e ritoccare un'istanza non tocca nessun'altra.
 *
 * Secondo cardine: i campi "piatti" dell'istanza (blocksMovement,
 * blocksSight, cover, height) sono sempre il RIFLESSO dello stato
 * corrente. Chi legge la mappa — movimento, copertura, linea di vista —
 * continua a leggerli senza sapere nulla di stati e transizioni.
 * ============================================================ */

/* ------------------------------------------------------------------ */
/* Creazione                                                          */
/* ------------------------------------------------------------------ */

/** Copia profonda di dati semplici: nessun riferimento condiviso. */
function clone<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

/** Comportamento di uno stato, con valori sensati se manca. */
export function behaviourOf(
  element: Pick<MapObject, "state" | "stateBehaviours" | "blocksMovement" | "blocksSight" | "cover" | "height">
): StateBehaviour {
  const stored = element.stateBehaviours?.[element.state];
  if (stored) return stored;
  return {
    label: element.state,
    description: "",
    blocksMovement: element.blocksMovement,
    blocksSight: element.blocksSight,
    cover: element.cover,
    movementCost: element.blocksMovement ? null : 1,
    height: element.height,
  };
}

/** Allinea i campi piatti al comportamento dello stato indicato. */
export function withState(element: MapObject, state: ObjectState): MapObject {
  const behaviour = element.stateBehaviours?.[state];
  if (!behaviour) return { ...element, state };
  return {
    ...element,
    state,
    blocksMovement: behaviour.blocksMovement,
    blocksSight: behaviour.blocksSight,
    cover: behaviour.cover,
    height: behaviour.height,
  };
}

/**
 * Crea l'istanza da un template del catalogo: una sola scelta del Master
 * ("questa è una porta rinforzata") e nascono dimensioni, materiale,
 * passabilità, copertura, stati, interazioni, prove, CD e soglie di
 * rottura.
 */
export function instanceFromTemplate(
  template: ElementTemplate,
  id: string,
  cells: string[]
): MapObject {
  // Copia PROFONDA: senza, l'istanza condividerebbe array e oggetti con
  // il template e ritoccare una porta ne cambierebbe tutte le altre.
  const source = clone(template);
  const initial = source.states[source.initialState];

  const interactions: ElementInteraction[] = source.interactions.map(
    (definition) => ({
      id: definition.id,
      kind: definition.kind,
      label: definition.label,
      description: definition.description,
      methods: definition.methods,
      availableStates: definition.availableStates,
      requires: definition.requires,
      // Forma breve, per le UI che mostrano una prova sola: la prima del
      // primo metodo che ne ha una.
      check:
        definition.methods.find((method) => method.check)?.check ?? null,
      setsState: null,
      setsBlocksMovement: null,
      setsBlocksSight: null,
      setsCover: null,
      visibleToPlayers: definition.visibleToPlayers,
      once: definition.once,
      used: false,
    })
  );

  return {
    id,
    templateId: source.id,
    kind: kindForTemplate(source),
    name: source.label,
    cells,
    icon: source.icon,
    color: source.color,
    blocksMovement: initial?.blocksMovement ?? false,
    blocksSight: initial?.blocksSight ?? false,
    cover: initial?.cover ?? "NONE",
    height: initial?.height ?? source.height,
    destructible: source.destruction !== null,
    hp: source.destruction?.hp ?? 0,
    armorClass: source.destruction?.armorClass ?? 0,
    material: source.material,
    state: source.initialState as ObjectState,
    stateBehaviours: source.states,
    destruction: source.destruction,
    movable: source.movable,
    climb: source.climb,
    damageTaken: 0,
    checks: {},
    interactions,
    interactionRange: 1,
    linkedIds: [],
    connectsElevation: source.climb
      ? { from: 0, to: source.climb.reachesElevation }
      : null,
    visibleToPlayers: source.visibleToPlayers,
    note: source.description,
  };
}

/** Il vecchio `MapObjectKind`, dedotto dal template per compatibilità. */
function kindForTemplate(template: ElementTemplate): MapObject["kind"] {
  const id = template.id;
  if (id.includes(".door.secret")) return "SECRET_DOOR";
  if (id.includes(".door")) return "DOOR";
  if (id.includes("mechanism") || id.includes("lever")) return "LEVER";
  if (id.includes("hatch")) return "HATCH";
  if (id.includes("bridge") || id.includes("plank")) return "BRIDGE";
  if (id.includes("stairs") || id.includes("ladder") || id.includes("ramp")) {
    return "STAIRS";
  }
  if (id.includes("wall") || id.includes("palisade")) return "WALL";
  if (template.group === "Contenitori") return "CONTAINER";
  if (template.category === "MAGIC" || template.group === "Scenografia") {
    return "DECOR";
  }
  return "OBSTACLE";
}

/* ------------------------------------------------------------------ */
/* Interazioni disponibili                                            */
/* ------------------------------------------------------------------ */

export interface ReachContext {
  isMaster: boolean;
  /** Posizione di chi vuole agire; assente = si ignora la distanza. */
  from?: Position | null;
  /** Quota di chi agisce, per i requisiti di dislivello. */
  fromElevation?: number;
  /** Quota dell'elemento. */
  elementElevation?: number;
  /** Linea di vista già calcolata da chi chiama. */
  hasLineOfSight?: boolean;
}

/** Distanza in caselle fra una posizione e l'elemento. */
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

/**
 * Azioni proponibili ORA: quelle previste per lo stato corrente, non
 * ancora consumate, permesse a chi guarda e alla sua portata. È questa
 * funzione a far sparire "scassina" da una porta già sfondata.
 */
export function availableInteractions(
  element: MapObject,
  context: ReachContext
): ElementInteraction[] {
  return element.interactions.filter((interaction) => {
    if (!context.isMaster && !interaction.visibleToPlayers) return false;
    if (interaction.once && interaction.used) return false;

    const states = interaction.availableStates ?? [];
    if (states.length > 0 && !states.includes(element.state)) return false;

    const requires = interaction.requires;
    if (context.from) {
      const distance = distanceToElement(context.from, element);
      const max = requires?.maxDistance ?? Math.max(1, element.interactionRange);
      if (distance > max) return false;
    }
    if (requires?.requiresLineOfSight && context.hasLineOfSight === false) {
      return false;
    }
    if (
      requires &&
      context.fromElevation !== undefined &&
      context.elementElevation !== undefined
    ) {
      const delta = Math.abs(context.elementElevation - context.fromElevation);
      if (delta > requires.maxElevationDelta) return false;
    }
    return true;
  });
}

/** Metodi utilizzabili per un'interazione, filtrati per ruolo. */
export function availableMethods(
  interaction: ElementInteraction,
  { isMaster }: { isMaster: boolean }
): ResolutionMethod[] {
  const methods = interaction.methods ?? [];
  if (methods.length > 0) {
    return methods.filter((method) => isMaster || method.visibleToPlayers);
  }
  // Interazione in forma breve: un metodo implicito con la sua prova.
  return [
    {
      id: "default",
      label: interaction.label,
      description: interaction.description,
      check: interaction.check,
      requiresTool: "",
      actionCost: "ACTION",
      outcomes: [],
      visibleToPlayers: interaction.visibleToPlayers,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Esecuzione                                                         */
/* ------------------------------------------------------------------ */

export interface InteractionResult {
  element: MapObject;
  outcome: InteractionOutcome | null;
  /** Testo pronto per la cronaca. */
  message: string;
}

/**
 * Applica un esito: cambia stato (e con esso passabilità, copertura,
 * vista), consuma l'azione se è "una volta sola", e restituisce ciò che
 * serve alla cronaca. Non muta l'input.
 */
export function applyOutcome(
  element: MapObject,
  interactionId: string,
  outcome: InteractionOutcome | null
): InteractionResult {
  const interaction = element.interactions.find(
    (entry) => entry.id === interactionId
  );

  let next: MapObject = element;
  if (outcome?.toState) {
    next = withState(next, outcome.toState as ObjectState);
  }
  // Forma breve (interazioni create prima del catalogo).
  if (!outcome && interaction) {
    if (interaction.setsState) {
      next = withState(next, interaction.setsState);
    }
    next = {
      ...next,
      blocksMovement: interaction.setsBlocksMovement ?? next.blocksMovement,
      blocksSight: interaction.setsBlocksSight ?? next.blocksSight,
      cover: interaction.setsCover ?? next.cover,
    };
  }

  if (interaction?.once) {
    next = {
      ...next,
      interactions: next.interactions.map((entry) =>
        entry.id === interactionId ? { ...entry, used: true } : entry
      ),
    };
  }

  return {
    element: next,
    outcome: outcome ?? null,
    message: outcome?.message ?? interaction?.label ?? "",
  };
}

/** Esito di un metodo, scelto dal Master o dal tiro del giocatore. */
export function outcomeOf(
  method: ResolutionMethod,
  kind: OutcomeKind
): InteractionOutcome | null {
  return (
    method.outcomes.find((outcome) => outcome.kind === kind) ??
    // Un critico senza esito dedicato ricade sul risultato normale.
    method.outcomes.find(
      (outcome) =>
        (kind === "CRITICAL_SUCCESS" && outcome.kind === "SUCCESS") ||
        (kind === "CRITICAL_FAILURE" && outcome.kind === "FAILURE")
    ) ??
    null
  );
}

/* ------------------------------------------------------------------ */
/* Distruzione                                                        */
/* ------------------------------------------------------------------ */

export interface DamageResult {
  element: MapObject;
  /** Danno effettivamente subito, dopo soglia e resistenze. */
  applied: number;
  /** Stato raggiunto, se il colpo ne ha cambiato uno. */
  changedTo: ObjectState | null;
  destroyed: boolean;
}

/**
 * Danno a un elemento: soglia di durezza, resistenze e vulnerabilità,
 * poi le soglie di stato. Un muro non passa da integro a macerie con un
 * pugnale, e il fuoco su un albero conta doppio.
 */
export function damageElement(
  element: MapObject,
  amount: number,
  damageType = ""
): DamageResult {
  const profile = element.destruction;
  if (!profile || !element.destructible) {
    return { element, applied: 0, changedTo: null, destroyed: false };
  }

  if (profile.immunities.includes(damageType)) {
    return { element, applied: 0, changedTo: null, destroyed: false };
  }

  let value = Math.max(0, Math.round(amount));
  if (profile.resistances.includes(damageType)) value = Math.floor(value / 2);
  if (profile.vulnerabilities.includes(damageType)) value *= 2;
  // Soglia di durezza: i colpi leggeri non scalfiscono la pietra.
  if (value < profile.damageThreshold) value = 0;
  if (value === 0) {
    return { element, applied: 0, changedTo: null, destroyed: false };
  }

  const taken = (element.damageTaken ?? 0) + value;
  const ratio = Math.max(0, 1 - taken / Math.max(1, profile.hp));

  // Fra le soglie raggiunte vince la PIÙ GRAVE: a zero punti ferita si
  // arriva a "crollato", non ci si ferma a "danneggiato".
  const stage = [...profile.stages]
    .sort((a, b) => a.atHpRatio - b.atHpRatio)
    .find((entry) => ratio <= entry.atHpRatio);

  let next: MapObject = { ...element, damageTaken: taken };
  let changedTo: ObjectState | null = null;
  if (stage && stage.state !== element.state) {
    next = withState(next, stage.state as ObjectState);
    changedTo = stage.state as ObjectState;
  }

  return {
    element: next,
    applied: value,
    changedTo,
    destroyed: ratio <= 0,
  };
}

/* ------------------------------------------------------------------ */
/* Letture per la UI                                                  */
/* ------------------------------------------------------------------ */

/** Risposta secca alle domande del motore su una casella. */
export interface ElementSummary {
  passable: boolean;
  movementCost: number | null;
  cover: CoverLevel;
  blocksSight: boolean;
  height: number;
  climbable: boolean;
  movable: boolean;
  destructible: boolean;
  state: string;
  stateLabel: string;
}

export function summarize(element: MapObject): ElementSummary {
  const behaviour = behaviourOf(element);
  return {
    passable: !behaviour.blocksMovement,
    movementCost: behaviour.movementCost,
    cover: behaviour.cover,
    blocksSight: behaviour.blocksSight,
    height: behaviour.height,
    climbable: Boolean(element.climb),
    movable: Boolean(element.movable),
    destructible: Boolean(element.destructible && element.destruction),
    state: element.state,
    stateLabel: behaviour.label,
  };
}

/** Celle da cui si può agire su un elemento: il suo "bordo utile". */
export function reachCells(
  element: MapObject,
  range = element.interactionRange
): string[] {
  const cells = new Set<string>();
  const occupied = new Set(element.cells);
  const span = Math.max(1, range);

  for (const key of element.cells) {
    const cell = parseCellKey(key);
    if (!cell) continue;
    for (let dy = -span; dy <= span; dy++) {
      for (let dx = -span; dx <= span; dx++) {
        const candidate = cellKey({ x: cell.x + dx, y: cell.y + dy });
        if (!occupied.has(candidate)) cells.add(candidate);
      }
    }
  }
  return [...cells];
}

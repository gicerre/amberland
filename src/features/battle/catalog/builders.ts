import { DEFAULT_DIFFICULTY_DC, type CoverLevel, type DifficultyTier, type InteractionKind, type TacticalCheck } from "@/types/battlemap";
import {
  DEFAULT_REQUIREMENT,
  STURDINESS_DURABILITY,
  STURDINESS_TIER,
  type DestructionProfile,
  type ElementCategory,
  type ElementStateId,
  type ElementTemplate,
  type InteractionDefinition,
  type InteractionOutcome,
  type ResolutionMethod,
  type SpatialRequirement,
  type StateBehaviour,
  type Sturdiness,
} from "@/types/element-catalog";

/* ============================================================
 * Costruttori del catalogo.
 *
 * Il catalogo non è una lista scritta a mano voce per voce: è fatto di
 * ARCHETIPI. "Barriera apribile" sa già come si comporta una porta —
 * stati, interazioni, prove, soglie di rottura — e la variante fornisce
 * solo ciò che la distingue (materiale, robustezza, ingombro).
 *
 * Da qui vengono due proprietà che contano più della quantità di voci:
 * coerenza (tutte le porte si comportano da porte) ed estendibilità
 * (una porta nuova è una riga, non trecento).
 * ============================================================ */

/* ------------------------------ Prove ------------------------------- */

export function check(
  skill: string,
  difficulty: DifficultyTier,
  dc?: number
): TacticalCheck {
  return {
    skill,
    difficulty,
    dc: dc ?? (difficulty === "CUSTOM" ? 12 : DEFAULT_DIFFICULTY_DC[difficulty]),
  };
}

/** Prova calibrata sulla robustezza dell'oggetto. */
export function checkFor(skill: string, sturdiness: Sturdiness): TacticalCheck {
  return check(skill, STURDINESS_TIER[sturdiness]);
}

/* ------------------------------ Esiti ------------------------------- */

const EMPTY_OUTCOME: Omit<InteractionOutcome, "kind" | "message"> = {
  toState: null,
  damage: "",
  damageType: "",
  condition: "",
  movementCells: 0,
  alertsMaster: false,
  unlocksInteraction: null,
};

export function outcome(
  kind: InteractionOutcome["kind"],
  message: string,
  patch: Partial<InteractionOutcome> = {}
): InteractionOutcome {
  return { ...EMPTY_OUTCOME, kind, message, ...patch };
}

/** Coppia riuscita/fallita, il caso normale. */
export function outcomes(
  success: InteractionOutcome,
  failure: InteractionOutcome,
  extra: InteractionOutcome[] = []
): InteractionOutcome[] {
  return [success, failure, ...extra];
}

/* ----------------------------- Metodi ------------------------------- */

export function method(
  id: string,
  label: string,
  patch: Partial<ResolutionMethod> = {}
): ResolutionMethod {
  return {
    id,
    label,
    description: "",
    check: null,
    requiresTool: "",
    actionCost: "ACTION",
    outcomes: [],
    visibleToPlayers: true,
    ...patch,
  };
}

/* --------------------------- Interazioni ---------------------------- */

export function requirement(
  patch: Partial<SpatialRequirement> = {}
): SpatialRequirement {
  return { ...DEFAULT_REQUIREMENT, ...patch };
}

export function interaction(
  id: string,
  kind: InteractionKind,
  label: string,
  patch: Partial<InteractionDefinition> = {}
): InteractionDefinition {
  return {
    id,
    kind,
    label,
    description: "",
    availableStates: [],
    methods: [],
    requires: requirement(),
    visibleToPlayers: true,
    once: false,
    ...patch,
  };
}

/* ------------------------------ Stati -------------------------------- */

export function state(
  label: string,
  patch: Partial<StateBehaviour> = {}
): StateBehaviour {
  return {
    label,
    description: "",
    blocksMovement: false,
    blocksSight: false,
    cover: "NONE",
    movementCost: 1,
    height: 0,
    ...patch,
  };
}

/* --------------------------- Distruzione ----------------------------- */

export function destruction(
  sturdiness: Sturdiness,
  stages: DestructionProfile["stages"],
  patch: Partial<DestructionProfile> = {}
): DestructionProfile {
  const base = STURDINESS_DURABILITY[sturdiness];
  return {
    hp: base.hp,
    armorClass: base.armorClass,
    damageThreshold: base.damageThreshold,
    resistances: [],
    vulnerabilities: [],
    immunities: ["Veleno", "Psichico"],
    stages,
    ...patch,
  };
}

/* ---------------------------- Archetipi ------------------------------ */

interface BaseOptions {
  id: string;
  label: string;
  description?: string;
  category: ElementCategory;
  group: string;
  icon: string;
  color: string;
  material: string;
  keywords?: string[];
  width?: number;
  depth?: number;
  freeform?: boolean;
  height?: number;
  visibleToPlayers?: boolean;
}

function base(options: BaseOptions): Omit<
  ElementTemplate,
  "initialState" | "states" | "interactions" | "destruction" | "movable" | "climb"
> {
  return {
    id: options.id,
    category: options.category,
    group: options.group,
    label: options.label,
    description: options.description ?? "",
    icon: options.icon,
    color: options.color,
    material: options.material,
    keywords: options.keywords ?? [],
    footprint: {
      width: options.width ?? 1,
      depth: options.depth ?? 1,
      freeform: options.freeform ?? false,
    },
    height: options.height ?? 1,
    visibleToPlayers: options.visibleToPlayers ?? true,
  };
}

/* ----------------------- Barriera apribile --------------------------- */

export interface BarrierOptions extends BaseOptions {
  sturdiness: Sturdiness;
  /** Parte chiusa a chiave. */
  locked?: boolean;
  /** Nascosta finché non la si scopre (porte segrete). */
  secret?: boolean;
  /** Lascia passare la vista anche da chiusa (cancellate, grate). */
  seeThrough?: boolean;
}

/**
 * Porte, cancelli, botole, saracinesche: tutto ciò che sbarra e si può
 * aprire. È l'archetipo più ricco perché è quello su cui al tavolo si
 * spende più tempo.
 */
export function openableBarrier(options: BarrierOptions): ElementTemplate {
  const { sturdiness, locked, secret, seeThrough } = options;
  const height = options.height ?? 2.5;
  const closedCover: CoverLevel = seeThrough ? "THREE_QUARTERS" : "TOTAL";

  const states: Record<ElementStateId, StateBehaviour> = {
    CLOSED: state("Chiusa", {
      blocksMovement: true,
      blocksSight: !seeThrough,
      cover: closedCover,
      movementCost: null,
      height,
      description: "Sbarra il passo; si può aprire.",
    }),
    OPEN: state("Aperta", {
      movementCost: 1,
      height: 0,
      description: "Il varco è libero.",
    }),
    LOCKED: state("Bloccata", {
      blocksMovement: true,
      blocksSight: !seeThrough,
      cover: closedCover,
      movementCost: null,
      height,
      description: "Serrata: serve la chiave, i grimaldelli o la forza.",
    }),
    DAMAGED: state("Danneggiata", {
      blocksMovement: true,
      blocksSight: !seeThrough,
      cover: "THREE_QUARTERS",
      movementCost: null,
      height,
      description: "Ha ceduto in parte: cederà del tutto al prossimo colpo.",
    }),
    BROKEN: state("Sfondata", {
      movementCost: 2,
      height: 0,
      cover: "HALF",
      terminal: true,
      description: "Resta un varco ingombro di schegge.",
    }),
  };
  if (secret) {
    states.HIDDEN = state("Nascosta", {
      blocksMovement: true,
      blocksSight: true,
      cover: "TOTAL",
      movementCost: null,
      height,
      description: "Indistinguibile dalla parete finché non la si scopre.",
    });
  }

  const blockedStates = secret
    ? ["CLOSED", "LOCKED", "DAMAGED", "HIDDEN"]
    : ["CLOSED", "LOCKED", "DAMAGED"];

  const interactions: InteractionDefinition[] = [];

  if (secret) {
    interactions.push(
      interaction("search", "INSPECT", "Cerca un passaggio", {
        availableStates: ["HIDDEN"],
        description: "La parete non convince: qualcosa non torna.",
        methods: [
          method("perception", "Osservare la parete", {
            check: checkFor("Percezione", sturdiness),
            outcomes: outcomes(
              outcome("SUCCESS", "Uno spiffero tradisce il passaggio.", {
                toState: locked ? "LOCKED" : "CLOSED",
              }),
              outcome("FAILURE", "La parete sembra solo una parete.")
            ),
          }),
          method("investigation", "Tastare in cerca del meccanismo", {
            check: checkFor("Indagare", sturdiness),
            outcomes: outcomes(
              outcome("SUCCESS", "Le dita trovano l'incavo del meccanismo.", {
                toState: locked ? "LOCKED" : "CLOSED",
              }),
              outcome("FAILURE", "Nulla, sotto le dita.")
            ),
          }),
        ],
      })
    );
  }

  interactions.push(
    interaction("open", "OPEN", "Apri", {
      availableStates: ["CLOSED"],
      methods: [
        method("handle", "Spingi il battente", {
          actionCost: "ACTION",
          outcomes: [outcome("SUCCESS", "Il varco si apre.", { toState: "OPEN" })],
        }),
      ],
    }),
    interaction("close", "CLOSE", "Chiudi", {
      availableStates: ["OPEN"],
      methods: [
        method("handle", "Richiudi il battente", {
          outcomes: [outcome("SUCCESS", "Il varco si richiude.", { toState: "CLOSED" })],
        }),
      ],
    }),
    interaction("unlock", "UNLOCK", "Scassina", {
      availableStates: ["LOCKED"],
      methods: [
        method("key", "Usa la chiave", {
          requiresTool: "Chiave",
          outcomes: [
            outcome("SUCCESS", "La serratura scatta.", { toState: "CLOSED" }),
          ],
        }),
        method("thieves", "Grimaldelli", {
          requiresTool: "Arnesi da scasso",
          check: checkFor("Rapidità di Mano", sturdiness),
          outcomes: outcomes(
            outcome("SUCCESS", "La serratura cede senza un suono.", {
              toState: "CLOSED",
            }),
            outcome("FAILURE", "L'arnese scivola: la serratura tiene."),
            [
              outcome("CRITICAL_FAILURE", "L'arnese si spezza nella toppa.", {
                alertsMaster: true,
              }),
            ]
          ),
        }),
        method("magic", "Apertura arcana", {
          check: check("Arcano", STURDINESS_TIER[sturdiness]),
          visibleToPlayers: false,
          outcomes: outcomes(
            outcome("SUCCESS", "Il meccanismo obbedisce alla formula.", {
              toState: "CLOSED",
            }),
            outcome("FAILURE", "La magia scivola via dal metallo.")
          ),
        }),
      ],
    }),
    interaction("lock", "LOCK", "Blocca", {
      availableStates: ["CLOSED"],
      visibleToPlayers: true,
      methods: [
        method("bolt", "Tira il chiavistello", {
          outcomes: [
            outcome("SUCCESS", "Il chiavistello scorre in sede.", {
              toState: "LOCKED",
            }),
          ],
        }),
      ],
    }),
    interaction("force", "DESTROY", "Sfonda", {
      availableStates: blockedStates,
      methods: [
        method("shoulder", "Spallata", {
          check: checkFor("Atletica", sturdiness),
          outcomes: outcomes(
            outcome("SUCCESS", "Il legno cede di schianto.", {
              toState: "BROKEN",
              alertsMaster: true,
            }),
            outcome("FAILURE", "Il battente regge, la spalla no.", {
              toState: "DAMAGED",
              alertsMaster: true,
            }),
            [
              outcome("CRITICAL_FAILURE", "Rimbalzi indietro e finisci a terra.", {
                condition: "Prono",
                alertsMaster: true,
              }),
            ]
          ),
        }),
        method("weapon", "Abbatti a colpi d'arma", {
          actionCost: "ACTION",
          outcomes: outcomes(
            outcome("SUCCESS", "Colpo dopo colpo, il varco si apre.", {
              toState: "BROKEN",
              alertsMaster: true,
            }),
            outcome("FAILURE", "Schegge, ma la barriera tiene.", {
              toState: "DAMAGED",
            })
          ),
        }),
      ],
    }),
    interaction("pass", "PASS", "Attraversa", {
      availableStates: ["OPEN", "BROKEN"],
      requires: requirement({ maxDistance: 0, requiresLineOfSight: false }),
      methods: [method("walk", "Passa oltre", { actionCost: "MOVEMENT", outcomes: [] })],
    }),
    interaction("listen", "INSPECT", "Ascolta oltre la porta", {
      availableStates: blockedStates,
      methods: [
        method("listen", "Orecchio al battente", {
          check: check("Percezione", "MEDIUM"),
          outcomes: outcomes(
            outcome("SUCCESS", "Da oltre arrivano suoni."),
            outcome("FAILURE", "Solo silenzio.")
          ),
        }),
      ],
    })
  );

  return {
    ...base({ ...options, height }),
    initialState: secret ? "HIDDEN" : locked ? "LOCKED" : "CLOSED",
    states,
    interactions,
    destruction: destruction(sturdiness, [
      { atHpRatio: 0.5, state: "DAMAGED" },
      { atHpRatio: 0, state: "BROKEN" },
    ]),
    movable: null,
    climb: null,
    visibleToPlayers: !secret,
  };
}

/* ------------------------- Barriera solida --------------------------- */

export interface SolidOptions extends BaseOptions {
  sturdiness: Sturdiness;
  /** Scalabile, e con quale difficoltà. */
  climbable?: Sturdiness | false;
  /** Distruttibile (una scogliera non lo è). */
  breakable?: boolean;
}

/**
 * Muri, pareti rocciose, colonne, palizzate: ciò che sbarra e basta.
 * Si scala, si abbatte, ci si ripara dietro.
 */
export function solidBarrier(options: SolidOptions): ElementTemplate {
  const { sturdiness, climbable = "STURDY", breakable = true } = options;
  const height = options.height ?? 4;

  const states: Record<ElementStateId, StateBehaviour> = {
    INTACT: state("Integro", {
      blocksMovement: true,
      blocksSight: true,
      cover: "TOTAL",
      movementCost: null,
      height,
    }),
    DAMAGED: state("Danneggiato", {
      blocksMovement: true,
      blocksSight: true,
      cover: "TOTAL",
      movementCost: null,
      height: height * 0.8,
      description: "Crepe profonde: un altro colpo e viene giù.",
    }),
    BREACHED: state("Aperta una breccia", {
      blocksMovement: false,
      blocksSight: false,
      cover: "HALF",
      movementCost: 2,
      height: 1,
      description: "Si passa fra le macerie, con fatica.",
    }),
    COLLAPSED: state("Crollato", {
      blocksMovement: false,
      blocksSight: false,
      cover: "HALF",
      movementCost: 2,
      height: 0.5,
      terminal: true,
    }),
  };

  const interactions: InteractionDefinition[] = [
    interaction("cover", "TAKE_COVER", "Ripàrati dietro", {
      availableStates: ["INTACT", "DAMAGED", "BREACHED", "COLLAPSED"],
      methods: [
        method("crouch", "Acquattati contro la parete", {
          actionCost: "FREE",
          outcomes: [outcome("SUCCESS", "Il corpo sparisce dietro la pietra.")],
        }),
      ],
    }),
  ];

  if (climbable) {
    interactions.push(
      interaction("climb", "CLIMB", "Scala", {
        availableStates: ["INTACT", "DAMAGED"],
        methods: [
          method("freeclimb", "Arrampicata libera", {
            check: checkFor("Atletica", climbable),
            actionCost: "MOVEMENT",
            outcomes: outcomes(
              outcome("SUCCESS", "Sei in cima."),
              outcome("FAILURE", "Le dita scivolano: resti dove sei."),
              [
                outcome("CRITICAL_FAILURE", "Perdi la presa e precipiti.", {
                  damage: height >= 6 ? "2d6" : "1d6",
                  damageType: "Contundente",
                  condition: "Prono",
                }),
              ]
            ),
          }),
          method("rope", "Con corda e rampino", {
            requiresTool: "Corda con rampino",
            check: check("Atletica", "EASY"),
            outcomes: outcomes(
              outcome("SUCCESS", "Il rampino morde: sali senza affanno."),
              outcome("FAILURE", "Il rampino non fa presa.")
            ),
          }),
        ],
      })
    );
  }

  if (breakable) {
    interactions.push(
      interaction("breach", "DESTROY", "Abbatti", {
        availableStates: ["INTACT", "DAMAGED"],
        methods: [
          method("tools", "Picconi e sudore", {
            check: checkFor("Atletica", sturdiness),
            outcomes: outcomes(
              outcome("SUCCESS", "La parete cede: si apre una breccia.", {
                toState: "BREACHED",
                alertsMaster: true,
              }),
              outcome("FAILURE", "Solo polvere e crepe.", { toState: "DAMAGED" })
            ),
          }),
        ],
      })
    );
  }

  return {
    ...base({ ...options, height }),
    initialState: "INTACT",
    states,
    interactions,
    destruction: breakable
      ? destruction(sturdiness, [
          { atHpRatio: 0.5, state: "DAMAGED" },
          { atHpRatio: 0, state: "COLLAPSED" },
        ])
      : null,
    movable: null,
    climb: climbable
      ? {
          check: checkFor("Atletica", climbable),
          reachesElevation: Math.max(1, Math.round(height / 1.5)),
          movementCells: 2,
          fallDamage: height >= 6 ? "2d6" : "1d6",
        }
      : null,
  };
}

/* --------------------------- Riparo basso ---------------------------- */

export interface LowCoverOptions extends BaseOptions {
  sturdiness: Sturdiness;
  cover?: CoverLevel;
  /** Si può scavalcare, e con quale prova. */
  vaultable?: boolean;
  /** Si può spingere: peso e caselle di spostamento. */
  push?: { weight: number; distance: number; difficulty: Sturdiness };
  blocksMovement?: boolean;
}

/**
 * Barricate, muretti, casse accatastate, cespugli, macerie: non chiudono
 * il campo, lo complicano. Riparo, ostacolo, a volte spinta.
 */
export function lowCover(options: LowCoverOptions): ElementTemplate {
  const {
    sturdiness,
    cover = "HALF",
    vaultable = true,
    push,
    blocksMovement = true,
  } = options;
  const height = options.height ?? 1.2;

  const states: Record<ElementStateId, StateBehaviour> = {
    INTACT: state("Integro", {
      blocksMovement,
      cover,
      movementCost: blocksMovement ? null : 2,
      height,
    }),
    DAMAGED: state("Danneggiato", {
      blocksMovement: false,
      cover: cover === "TOTAL" ? "THREE_QUARTERS" : "HALF",
      movementCost: 2,
      height: height * 0.7,
    }),
    DESTROYED: state("Distrutto", {
      blocksMovement: false,
      cover: "NONE",
      movementCost: 1,
      height: 0,
      terminal: true,
    }),
  };

  const interactions: InteractionDefinition[] = [
    interaction("cover", "TAKE_COVER", "Usa come copertura", {
      availableStates: ["INTACT", "DAMAGED"],
      methods: [
        method("crouch", "Acquattati", {
          actionCost: "FREE",
          outcomes: [outcome("SUCCESS", "Ti fai piccolo dietro il riparo.")],
        }),
      ],
    }),
  ];

  if (vaultable) {
    interactions.push(
      interaction("vault", "CLIMB", "Scavalca", {
        availableStates: ["INTACT", "DAMAGED"],
        methods: [
          method("vault", "Un salto e sei dall'altra parte", {
            check: check("Acrobazia", "EASY"),
            actionCost: "MOVEMENT",
            outcomes: outcomes(
              outcome("SUCCESS", "Superi il riparo di slancio.", {
                movementCells: 1,
              }),
              outcome("FAILURE", "Il piede impiglia: resti di qua.", {
                movementCells: 1,
              })
            ),
          }),
        ],
      })
    );
  }

  if (push) {
    interactions.push(
      interaction("push", "CUSTOM", "Spingi", {
        availableStates: ["INTACT", "DAMAGED"],
        methods: [
          method("shove", `Spingi con tutto il peso (${push.weight} kg)`, {
            check: checkFor("Atletica", push.difficulty),
            actionCost: "ACTION",
            outcomes: outcomes(
              outcome("SUCCESS", `Lo sposti di ${push.distance} caselle.`),
              outcome("FAILURE", "Non si muove di un dito.")
            ),
          }),
        ],
      })
    );
  }

  interactions.push(
    interaction("smash", "DESTROY", "Abbatti", {
      availableStates: ["INTACT", "DAMAGED"],
      methods: [
        method("weapon", "A colpi d'arma", {
          outcomes: outcomes(
            outcome("SUCCESS", "Il riparo va in pezzi.", { toState: "DESTROYED" }),
            outcome("FAILURE", "Regge ancora.", { toState: "DAMAGED" })
          ),
        }),
      ],
    })
  );

  return {
    ...base({ ...options, height }),
    initialState: "INTACT",
    states,
    interactions,
    destruction: destruction(sturdiness, [
      { atHpRatio: 0.5, state: "DAMAGED" },
      { atHpRatio: 0, state: "DESTROYED" },
    ]),
    movable: push
      ? {
          weight: push.weight,
          check: checkFor("Atletica", push.difficulty),
          distanceCells: push.distance,
          costsMovement: true,
        }
      : null,
    climb: vaultable
      ? {
          check: check("Acrobazia", "EASY"),
          reachesElevation: 0,
          movementCells: 1,
          fallDamage: "",
        }
      : null,
  };
}

/* --------------------------- Contenitore ----------------------------- */

export interface ContainerOptions extends BaseOptions {
  sturdiness: Sturdiness;
  locked?: boolean;
  trapped?: boolean;
  push?: { weight: number; distance: number; difficulty: Sturdiness };
}

/** Casse, forzieri, barili, sarcofagi, armadi: si aprono e si frugano. */
export function container(options: ContainerOptions): ElementTemplate {
  const { sturdiness, locked, trapped, push } = options;
  const height = options.height ?? 1;

  const states: Record<ElementStateId, StateBehaviour> = {
    CLOSED: state("Chiuso", { cover: "HALF", movementCost: null, blocksMovement: true, height }),
    LOCKED: state("Serrato", { cover: "HALF", movementCost: null, blocksMovement: true, height }),
    OPEN: state("Aperto", { cover: "HALF", movementCost: null, blocksMovement: true, height }),
    BROKEN: state("Sfondato", {
      cover: "HALF",
      movementCost: 2,
      blocksMovement: false,
      height: height * 0.6,
      terminal: true,
    }),
  };

  const interactions: InteractionDefinition[] = [
    interaction("inspect", "INSPECT", "Ispeziona", {
      availableStates: ["CLOSED", "LOCKED", "OPEN", "BROKEN"],
      methods: [
        method("look", "Osserva da vicino", {
          check: check("Indagare", "EASY"),
          outcomes: outcomes(
            outcome(
              "SUCCESS",
              trapped
                ? "Un filo teso corre lungo il coperchio."
                : "Nulla di sospetto, solo polvere."
            ),
            outcome("FAILURE", "Niente di notevole.")
          ),
        }),
      ],
    }),
    interaction("open", "OPEN", "Apri", {
      availableStates: ["CLOSED"],
      methods: [
        method("lid", "Solleva il coperchio", {
          outcomes: [outcome("SUCCESS", "Il coperchio si solleva.", { toState: "OPEN" })],
        }),
      ],
    }),
    interaction("close", "CLOSE", "Chiudi", {
      availableStates: ["OPEN"],
      methods: [
        method("lid", "Richiudi", {
          outcomes: [outcome("SUCCESS", "Il coperchio ricade.", { toState: "CLOSED" })],
        }),
      ],
    }),
    interaction("unlock", "UNLOCK", "Scassina la serratura", {
      availableStates: ["LOCKED"],
      methods: [
        method("key", "Usa la chiave", {
          requiresTool: "Chiave",
          outcomes: [outcome("SUCCESS", "Scatta.", { toState: "CLOSED" })],
        }),
        method("thieves", "Grimaldelli", {
          requiresTool: "Arnesi da scasso",
          check: checkFor("Rapidità di Mano", sturdiness),
          outcomes: outcomes(
            outcome("SUCCESS", "La serratura cede.", { toState: "CLOSED" }),
            outcome("FAILURE", "Resiste."),
            trapped
              ? [
                  outcome("CRITICAL_FAILURE", "Un click sbagliato: qualcosa scatta.", {
                    alertsMaster: true,
                  }),
                ]
              : []
          ),
        }),
      ],
    }),
    interaction("force", "DESTROY", "Sfonda", {
      availableStates: ["CLOSED", "LOCKED"],
      methods: [
        method("smash", "Spacca il coperchio", {
          check: checkFor("Atletica", sturdiness),
          outcomes: outcomes(
            outcome("SUCCESS", "Il legno si apre come una noce.", {
              toState: "BROKEN",
              alertsMaster: true,
            }),
            outcome("FAILURE", "Ammaccato, ma chiuso.")
          ),
        }),
      ],
    }),
  ];

  if (push) {
    interactions.push(
      interaction("push", "CUSTOM", "Sposta", {
        availableStates: ["CLOSED", "LOCKED", "OPEN"],
        methods: [
          method("shove", `Spingi (${push.weight} kg)`, {
            check: checkFor("Atletica", push.difficulty),
            outcomes: outcomes(
              outcome("SUCCESS", `Scivola di ${push.distance} caselle.`),
              outcome("FAILURE", "Troppo pesante.")
            ),
          }),
        ],
      })
    );
  }

  return {
    ...base({ ...options, height }),
    initialState: locked ? "LOCKED" : "CLOSED",
    states,
    interactions,
    destruction: destruction(sturdiness, [{ atHpRatio: 0, state: "BROKEN" }]),
    movable: push
      ? {
          weight: push.weight,
          check: checkFor("Atletica", push.difficulty),
          distanceCells: push.distance,
          costsMovement: true,
        }
      : null,
    climb: null,
  };
}

/* ------------------------------ Pianta -------------------------------- */

export interface PlantOptions extends BaseOptions {
  sturdiness: Sturdiness;
  cover?: CoverLevel;
  blocksSight?: boolean;
  blocksMovement?: boolean;
  climbable?: boolean;
  /** Quota raggiunta salendo sui rami. */
  canopyElevation?: number;
}

/** Alberi, cespugli, canneti: verde che ripara, rallenta, brucia. */
export function plant(options: PlantOptions): ElementTemplate {
  const {
    sturdiness,
    cover = "THREE_QUARTERS",
    blocksSight = true,
    blocksMovement = true,
    climbable = true,
    canopyElevation = 2,
  } = options;
  const height = options.height ?? 6;

  const states: Record<ElementStateId, StateBehaviour> = {
    INTACT: state("Integro", {
      blocksMovement,
      blocksSight,
      cover,
      movementCost: blocksMovement ? null : 2,
      height,
    }),
    DAMAGED: state("Intaccato", {
      blocksMovement,
      blocksSight,
      cover,
      movementCost: blocksMovement ? null : 2,
      height,
      description: "Il tronco è inciso: un altro colpo e viene giù.",
    }),
    BURNING: state("In fiamme", {
      blocksMovement,
      blocksSight: false,
      cover: "HALF",
      movementCost: blocksMovement ? null : 2,
      height,
      description: "Brucia: chi vi sosta accanto rischia.",
    }),
    FELLED: state("Abbattuto", {
      blocksMovement: false,
      blocksSight: false,
      cover: "HALF",
      movementCost: 2,
      height: 1,
      terminal: true,
      description: "Il tronco a terra è un ostacolo, non più un riparo.",
    }),
  };

  const interactions: InteractionDefinition[] = [
    interaction("cover", "TAKE_COVER", "Ripàrati dietro il tronco", {
      availableStates: ["INTACT", "DAMAGED"],
      methods: [
        method("crouch", "Mettiti al riparo", {
          actionCost: "FREE",
          outcomes: [outcome("SUCCESS", "Il tronco ti copre.")],
        }),
      ],
    }),
    interaction("fell", "DESTROY", "Abbatti", {
      availableStates: ["INTACT", "DAMAGED", "BURNING"],
      methods: [
        method("axe", "Ascia alla base", {
          requiresTool: "Ascia",
          check: checkFor("Atletica", sturdiness),
          outcomes: outcomes(
            outcome("SUCCESS", "Il tronco scricchiola e cade.", {
              toState: "FELLED",
              alertsMaster: true,
            }),
            outcome("FAILURE", "Solo un'intaccatura.", { toState: "DAMAGED" })
          ),
        }),
      ],
    }),
    interaction("ignite", "CUSTOM", "Dai fuoco", {
      availableStates: ["INTACT", "DAMAGED"],
      methods: [
        method("torch", "Avvicina una fiamma", {
          requiresTool: "Fonte di fuoco",
          check: check("Sopravvivenza", "MEDIUM"),
          outcomes: outcomes(
            outcome("SUCCESS", "Le fronde prendono fuoco.", {
              toState: "BURNING",
              alertsMaster: true,
            }),
            outcome("FAILURE", "Il legno verde non prende.")
          ),
        }),
      ],
    }),
  ];

  if (climbable) {
    interactions.push(
      interaction("climb", "CLIMB", "Arrampicati", {
        availableStates: ["INTACT", "DAMAGED"],
        methods: [
          method("branches", "Su per i rami", {
            check: check("Atletica", "MEDIUM"),
            actionCost: "MOVEMENT",
            outcomes: outcomes(
              outcome("SUCCESS", "Sei fra i rami, sopra la mischia."),
              outcome("FAILURE", "La corteccia scivola."),
              [
                outcome("CRITICAL_FAILURE", "Un ramo si spezza sotto il peso.", {
                  damage: "1d6",
                  damageType: "Contundente",
                  condition: "Prono",
                }),
              ]
            ),
          }),
        ],
      })
    );
  }

  return {
    ...base({ ...options, height }),
    initialState: "INTACT",
    states,
    interactions,
    destruction: destruction(sturdiness, [
      { atHpRatio: 0.5, state: "DAMAGED" },
      { atHpRatio: 0, state: "FELLED" },
    ], { vulnerabilities: ["Fuoco"], immunities: ["Veleno", "Psichico"] }),
    movable: null,
    climb: climbable
      ? {
          check: check("Atletica", "MEDIUM"),
          reachesElevation: canopyElevation,
          movementCells: 2,
          fallDamage: "1d6",
        }
      : null,
  };
}

/* --------------------------- Attraversamento -------------------------- */

export interface CrossingOptions extends BaseOptions {
  sturdiness: Sturdiness;
  /** Dislivello collegato (scale, rampe). */
  connects?: { from: number; to: number };
  /** Passaggio precario: chiede una prova. */
  precarious?: boolean;
  breakable?: boolean;
}

/** Ponti, passerelle, scale, rampe, corde: si passa, e a volte si cade. */
export function crossing(options: CrossingOptions): ElementTemplate {
  const { sturdiness, connects, precarious, breakable = true } = options;
  const height = options.height ?? 0;

  const states: Record<ElementStateId, StateBehaviour> = {
    INTACT: state("Integro", { movementCost: precarious ? 2 : 1, height }),
    DAMAGED: state("Pericolante", {
      movementCost: 2,
      height,
      description: "Le assi gemono: attraversare è un rischio.",
    }),
    COLLAPSED: state("Crollato", {
      blocksMovement: true,
      movementCost: null,
      height: 0,
      terminal: true,
      description: "Non si passa più.",
    }),
  };

  const interactions: InteractionDefinition[] = [
    interaction("cross", "PASS", "Attraversa", {
      availableStates: ["INTACT", "DAMAGED"],
      requires: requirement({ maxDistance: 0, requiresLineOfSight: false }),
      methods: precarious
        ? [
            method("careful", "Passa con cautela", {
              check: check("Acrobazia", "MEDIUM"),
              actionCost: "MOVEMENT",
              outcomes: outcomes(
                outcome("SUCCESS", "Arrivi dall'altra parte."),
                outcome("FAILURE", "Ti blocchi a metà, in equilibrio precario.", {
                  condition: "Prono",
                }),
                [
                  outcome("CRITICAL_FAILURE", "L'asse cede e precipiti.", {
                    damage: "2d6",
                    damageType: "Contundente",
                    toState: "DAMAGED",
                  }),
                ]
              ),
            }),
          ]
        : [method("walk", "Passa", { actionCost: "MOVEMENT", outcomes: [] })],
    }),
  ];

  if (breakable) {
    interactions.push(
      interaction("sabotage", "DESTROY", "Fai crollare", {
        availableStates: ["INTACT", "DAMAGED"],
        visibleToPlayers: true,
        methods: [
          method("cut", "Taglia i sostegni", {
            requiresTool: "Arma da taglio",
            check: checkFor("Atletica", sturdiness),
            outcomes: outcomes(
              outcome("SUCCESS", "La struttura precipita nel vuoto.", {
                toState: "COLLAPSED",
                alertsMaster: true,
              }),
              outcome("FAILURE", "I sostegni tengono.", { toState: "DAMAGED" })
            ),
          }),
        ],
      })
    );
  }

  return {
    ...base({ ...options, height }),
    initialState: "INTACT",
    states,
    interactions,
    destruction: breakable
      ? destruction(sturdiness, [
          { atHpRatio: 0.5, state: "DAMAGED" },
          { atHpRatio: 0, state: "COLLAPSED" },
        ])
      : null,
    movable: null,
    climb: connects
      ? {
          check: check("Atletica", "EASY"),
          reachesElevation: connects.to,
          movementCells: 1,
          fallDamage: "1d6",
        }
      : null,
  };
}

/* ---------------------------- Meccanismo ------------------------------ */

export interface MechanismOptions extends BaseOptions {
  /** Prova per capire cosa comanda. */
  inspectTier?: DifficultyTier;
  /** Prova per azionarlo, se non è banale. */
  operateCheck?: TacticalCheck | null;
}

/** Leve, argani, valvole, piastre: comandano qualcos'altro sulla mappa. */
export function mechanism(options: MechanismOptions): ElementTemplate {
  const { inspectTier = "MEDIUM", operateCheck = null } = options;
  const height = options.height ?? 1;

  return {
    ...base({ ...options, height }),
    initialState: "OFF",
    states: {
      OFF: state("A riposo", { movementCost: 1, height }),
      ON: state("Azionato", { movementCost: 1, height }),
      BROKEN: state("Inceppato", { movementCost: 1, height, terminal: true }),
    },
    interactions: [
      interaction("inspect", "INSPECT", "Esamina il meccanismo", {
        availableStates: ["OFF", "ON"],
        methods: [
          method("study", "Segui i tiranti", {
            check: check("Indagare", inspectTier),
            outcomes: outcomes(
              outcome("SUCCESS", "Capisci che cosa comanda."),
              outcome("FAILURE", "Un groviglio incomprensibile.")
            ),
          }),
        ],
      }),
      interaction("activate", "ACTIVATE", "Aziona", {
        availableStates: ["OFF"],
        methods: [
          method("pull", "Tira la leva", {
            check: operateCheck,
            outcomes: outcomes(
              outcome("SUCCESS", "Il meccanismo scatta.", {
                toState: "ON",
                alertsMaster: true,
              }),
              outcome("FAILURE", "Non si muove.")
            ),
          }),
        ],
      }),
      interaction("deactivate", "DEACTIVATE", "Disattiva", {
        availableStates: ["ON"],
        methods: [
          method("push", "Riporta la leva", {
            check: operateCheck,
            outcomes: outcomes(
              outcome("SUCCESS", "Torna a riposo.", { toState: "OFF" }),
              outcome("FAILURE", "Resta bloccata.")
            ),
          }),
        ],
      }),
      interaction("jam", "DESTROY", "Inceppa", {
        availableStates: ["OFF", "ON"],
        visibleToPlayers: false,
        methods: [
          method("sabotage", "Sabota il meccanismo", {
            check: check("Rapidità di Mano", "HARD"),
            outcomes: outcomes(
              outcome("SUCCESS", "Il meccanismo non risponderà più.", {
                toState: "BROKEN",
              }),
              outcome("FAILURE", "Resta funzionante.")
            ),
          }),
        ],
      }),
    ],
    destruction: destruction("ORDINARY", [{ atHpRatio: 0, state: "BROKEN" }]),
    movable: null,
    climb: null,
  };
}

/* -------------------------- Tratto d'acqua ---------------------------- */

export interface WaterOptions extends BaseOptions {
  /** Costo di movimento: 2 = difficile, 3 = a nuoto. */
  movementCost: number;
  /** Prova per attraversare, se la corrente lo richiede. */
  crossing?: TacticalCheck | null;
  /** Caselle di trascinamento se la prova fallisce. */
  dragCells?: number;
  cover?: CoverLevel;
  /** Quota del fondale rispetto alla riva. */
  depth?: number;
}

/** Guadi, fiumi, correnti, acque profonde: si attraversano, non si aprono. */
export function waterway(options: WaterOptions): ElementTemplate {
  const { movementCost, crossing: crossCheck = null, dragCells = 0, cover = "NONE", depth = -1 } = options;

  return {
    ...base({ ...options, height: 0 }),
    initialState: "FLOWING",
    states: {
      FLOWING: state("Acqua corrente", {
        movementCost,
        cover,
        height: depth,
        description: crossCheck
          ? "La corrente si fa sentire."
          : "Si guada senza troppa fatica.",
      }),
      FROZEN: state("Ghiacciata", {
        movementCost: 2,
        height: 0,
        description: "Superficie gelata: scivolosa ma percorribile.",
      }),
    },
    interactions: [
      interaction("ford", "PASS", "Attraversa", {
        availableStates: ["FLOWING"],
        requires: requirement({ maxDistance: 0, requiresLineOfSight: false }),
        methods: [
          method("wade", crossCheck ? "Contrasta la corrente" : "Guada", {
            check: crossCheck,
            actionCost: "MOVEMENT",
            outcomes: crossCheck
              ? outcomes(
                  outcome("SUCCESS", "Raggiungi l'altra sponda."),
                  outcome("FAILURE", `La corrente ti trascina di ${dragCells} caselle.`, {
                    movementCells: dragCells,
                    condition: "Prono",
                  })
                )
              : [outcome("SUCCESS", "Passi con l'acqua alle ginocchia.")],
          }),
          method("swim", "A nuoto", {
            check: check("Atletica", "MEDIUM"),
            actionCost: "MOVEMENT",
            outcomes: outcomes(
              outcome("SUCCESS", "Nuoti fino a riva."),
              outcome("FAILURE", "Bevi acqua e resti in mezzo alla corrente.")
            ),
          }),
        ],
      }),
      interaction("submerge", "CUSTOM", "Immergiti", {
        availableStates: ["FLOWING"],
        requires: requirement({ maxDistance: 0, requiresLineOfSight: false }),
        methods: [
          method("dive", "Scendi sott'acqua", {
            check: check("Atletica", "EASY"),
            outcomes: outcomes(
              outcome("SUCCESS", "Sparisci sotto la superficie."),
              outcome("FAILURE", "Riemergi subito, senza fiato.")
            ),
          }),
        ],
      }),
    ],
    destruction: null,
    movable: null,
    climb: null,
  };
}

/* ------------------------- Dislivello naturale ------------------------ */

export interface ReliefOptions extends BaseOptions {
  /** Quota della sommità rispetto al piano. */
  elevation: number;
  climbTier: DifficultyTier;
  /** Costo di movimento per salire lungo il pendio. */
  movementCost?: number | null;
  fallDamage?: string;
}

/** Colline, scarpate, scogliere, argini: la terza dimensione del campo. */
export function relief(options: ReliefOptions): ElementTemplate {
  const { elevation, climbTier, movementCost = 2, fallDamage = "2d6" } = options;
  const height = options.height ?? Math.abs(elevation) * 1.5;

  return {
    ...base({ ...options, height }),
    initialState: "INTACT",
    states: {
      INTACT: state("Naturale", {
        movementCost,
        blocksMovement: movementCost === null,
        cover: "NONE",
        height,
        description:
          movementCost === null
            ? "Troppo ripido per salirci camminando."
            : "Si sale a fatica.",
      }),
    },
    interactions: [
      interaction("climb", "CLIMB", "Scala", {
        availableStates: ["INTACT"],
        methods: [
          method("freeclimb", "Arrampicata", {
            check: check("Atletica", climbTier),
            actionCost: "MOVEMENT",
            outcomes: outcomes(
              outcome("SUCCESS", `Raggiungi la sommità (quota ${elevation}).`),
              outcome("FAILURE", "Scivoli indietro al punto di partenza."),
              [
                outcome("CRITICAL_FAILURE", "Perdi l'appiglio e cadi.", {
                  damage: fallDamage,
                  damageType: "Contundente",
                  condition: "Prono",
                }),
              ]
            ),
          }),
          method("rope", "Con una corda fissata", {
            requiresTool: "Corda",
            check: check("Atletica", "EASY"),
            outcomes: outcomes(
              outcome("SUCCESS", "Sali senza patemi."),
              outcome("FAILURE", "La corda non regge la salita.")
            ),
          }),
        ],
      }),
      interaction("cover", "TAKE_COVER", "Ripàrati dietro il dosso", {
        availableStates: ["INTACT"],
        methods: [
          method("crouch", "Sfrutta il dislivello", {
            actionCost: "FREE",
            outcomes: [outcome("SUCCESS", "Il dosso ti nasconde.")],
          }),
        ],
      }),
    ],
    destruction: null,
    movable: null,
    climb: {
      check: check("Atletica", climbTier),
      reachesElevation: elevation,
      movementCells: 2,
      fallDamage,
    },
  };
}

/* ------------------------------ Arcano -------------------------------- */

export interface ArcaneOptions extends BaseOptions {
  /** Prova per capire di che magia si tratta. */
  identifyTier?: DifficultyTier;
  /** Prova per dissolverla o disattivarla. */
  dispelTier?: DifficultyTier;
  effect: string;
  blocksMovement?: boolean;
  blocksSight?: boolean;
}

/** Rune, portali, cristalli, barriere: l'ambiente che non obbedisce alla fisica. */
export function arcaneFeature(options: ArcaneOptions): ElementTemplate {
  const {
    identifyTier = "HARD",
    dispelTier = "VERY_HARD",
    effect,
    blocksMovement = false,
    blocksSight = false,
  } = options;
  const height = options.height ?? 2;

  return {
    ...base({ ...options, height }),
    initialState: "ACTIVE",
    states: {
      ACTIVE: state("Attivo", {
        blocksMovement,
        blocksSight,
        movementCost: blocksMovement ? null : 1,
        height,
        description: effect,
      }),
      DORMANT: state("Sopito", { movementCost: 1, height: 0 }),
      DISPELLED: state("Dissolto", { movementCost: 1, height: 0, terminal: true }),
    },
    interactions: [
      interaction("identify", "INSPECT", "Studia la trama arcana", {
        availableStates: ["ACTIVE", "DORMANT"],
        requires: requirement({ maxDistance: 3 }),
        methods: [
          method("arcana", "Prova di Arcano", {
            check: check("Arcano", identifyTier),
            outcomes: outcomes(
              outcome("SUCCESS", `Riconosci l'effetto: ${effect}`),
              outcome("FAILURE", "Le trame ti sfuggono.")
            ),
          }),
        ],
      }),
      interaction("dispel", "DEACTIVATE", "Dissolvi", {
        availableStates: ["ACTIVE"],
        methods: [
          method("counter", "Contro-incantesimo", {
            check: check("Arcano", dispelTier),
            outcomes: outcomes(
              outcome("SUCCESS", "La trama si sfilaccia e svanisce.", {
                toState: "DISPELLED",
              }),
              outcome("FAILURE", "La magia resiste."),
              [
                outcome("CRITICAL_FAILURE", "Il contraccolpo ti investe.", {
                  damage: "2d6",
                  damageType: "Forza",
                }),
              ]
            ),
          }),
        ],
      }),
      interaction("touch", "CUSTOM", "Tocca", {
        availableStates: ["ACTIVE", "DORMANT"],
        methods: [
          method("touch", "Sfiora con la mano", {
            outcomes: [
              outcome("SUCCESS", "Qualcosa accade.", { alertsMaster: true }),
            ],
          }),
        ],
      }),
    ],
    destruction: null,
    movable: null,
    climb: null,
  };
}

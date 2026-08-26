import { z } from "zod";

import {
  BATTLE_LIMITS,
  BATTLE_STATUSES,
  COMBATANT_SIDES,
  COMBATANT_TURN_STATES,
  DISTANCE_METRICS,
  DISTANCE_UNITS,
  ENEMY_CATEGORIES,
  ENEMY_HP_DISPLAYS,
  GRID_KINDS,
  IMAGE_FITS,
  TERRAIN_KINDS,
} from "@/types/battle";
import { CONDITION_KINDS } from "@/types/entities";

/* ============================================================
 * Schemi di validazione del Campo di Battaglia.
 *
 * Importati SIA dai form React Hook Form SIA dalle API Route: un solo
 * punto di verità sui vincoli (cols 1–100, cellSize > 0, initiative
 * −20…50…), come già fa features/auth/schemas.ts.
 *
 * I limiti numerici non sono duplicati qui: vengono da BATTLE_LIMITS.
 * ============================================================ */

const L = BATTLE_LIMITS;

/* ------------------------------- Base ------------------------------ */

const nameSchema = z
  .string()
  .trim()
  .min(1, "Il nome è obbligatorio")
  .max(L.maxNameLength, `Massimo ${L.maxNameLength} caratteri`);

const descriptionSchema = z
  .string()
  .trim()
  .max(L.maxDescriptionLength, `Massimo ${L.maxDescriptionLength} caratteri`);

const noteSchema = z
  .string()
  .trim()
  .max(L.maxNoteLength, `Massimo ${L.maxNoteLength} caratteri`);

const idSchema = z.string().trim().min(1).max(200);

/** Coordinata di cella: intera, non negativa, entro i limiti di griglia. */
const coordinateSchema = z
  .number()
  .int()
  .min(0)
  .max(Math.max(L.maxCols, L.maxRows));

export const positionSchema = z.object({
  x: coordinateSchema,
  y: coordinateSchema,
});

export const cellRectSchema = z.object({
  x: coordinateSchema,
  y: coordinateSchema,
  w: z.number().int().min(1).max(L.maxCols),
  h: z.number().int().min(1).max(L.maxRows),
});

/* ------------------------------ Griglia ---------------------------- */

export const gridConfigSchema = z.object({
  kind: z.enum(GRID_KINDS),
  cols: z.number().int().min(L.minCols).max(L.maxCols),
  rows: z.number().int().min(L.minRows).max(L.maxRows),
  cellSize: z.number().min(L.minCellSize).max(L.maxCellSize),
  unit: z.enum(DISTANCE_UNITS),
  metric: z.enum(DISTANCE_METRICS),
  visible: z.boolean(),
  // Calibrazione: una cella di scarto in ogni direzione basta ad
  // allineare la griglia a quella già disegnata sullo sfondo.
  offsetX: z.number().min(-1).max(1),
  offsetY: z.number().min(-1).max(1),
  imageScale: z.number().min(0.1).max(10),
});

export type GridConfigValues = z.infer<typeof gridConfigSchema>;

export const backgroundImageSchema = z.object({
  url: z.url("URL immagine non valido").max(2000),
  naturalWidth: z.number().int().min(1).max(20000),
  naturalHeight: z.number().int().min(1).max(20000),
  fit: z.enum(IMAGE_FITS),
  rotation: z.union([
    z.literal(0),
    z.literal(90),
    z.literal(180),
    z.literal(270),
  ]),
  dim: z.number().min(0).max(1),
});

export type BackgroundImageValues = z.infer<typeof backgroundImageSchema>;

/* ------------------------------- Regole ---------------------------- */

export const battleRulesSchema = z.object({
  enforceMovement: z.boolean(),
  blockOccupied: z.boolean(),
  revealAllyHp: z.boolean(),
  enemyHpDisplay: z.enum(ENEMY_HP_DISPLAYS),
  turnTimerSeconds: z.number().int().min(0).max(3600),
  freeDeployment: z.boolean(),
  deploymentZones: z.array(cellRectSchema).max(20),
});

export type BattleRulesValues = z.infer<typeof battleRulesSchema>;

export const battleLinksSchema = z.object({
  locationId: idSchema.nullable(),
  questId: idSchema.nullable(),
  sessionId: idSchema.nullable(),
});

/* ------------------------------ Terreno ---------------------------- */

/**
 * Patch sparsa del terreno: chiave "x,y" → tipo, `null` per cancellare
 * (le celle NORMAL non si scrivono). Si inviano solo le celle toccate
 * dal pennello, mai l'intera mappa.
 */
export const terrainPatchSchema = z.record(
  z.string().regex(/^\d{1,3},\d{1,3}$/, "Chiave di cella non valida"),
  z.enum(TERRAIN_KINDS).nullable()
);

export type TerrainPatchValues = z.infer<typeof terrainPatchSchema>;

/* ----------------------------- Battaglia --------------------------- */

export const createBattleSchema = z.object({
  name: nameSchema,
  description: descriptionSchema.optional(),
  grid: gridConfigSchema.partial().optional(),
  rules: battleRulesSchema.partial().optional(),
  links: battleLinksSchema.partial().optional(),
  /** Master aggiuntivi (co-DM); il creatore è sempre incluso dall'API. */
  masterIds: z.array(idSchema).max(10).optional(),
});

export type CreateBattleValues = z.infer<typeof createBattleSchema>;

export const updateBattleSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema,
    grid: gridConfigSchema,
    background: backgroundImageSchema.nullable(),
    rules: battleRulesSchema,
    links: battleLinksSchema,
    masterIds: z.array(idSchema).max(10),
    terrain: terrainPatchSchema,
  })
  .partial()
  .refine((values) => Object.keys(values).length > 0, {
    message: "Nessuna modifica richiesta",
  });

export type UpdateBattleValues = z.infer<typeof updateBattleSchema>;

/**
 * Stati raggiungibili con un cambio manuale. `LOBBY` passa da /publish
 * e il primo `ACTIVE` da /start, perché comportano validazioni e la
 * costruzione dell'ordine di iniziativa.
 */
export const MANUAL_BATTLE_STATES = [
  "DRAFT",
  "READY",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
] as const;

export const battleStateSchema = z.object({
  status: z.enum(BATTLE_STATUSES).refine(
    (status) =>
      (MANUAL_BATTLE_STATES as readonly string[]).includes(status),
    { message: "Transizione non consentita da questa rotta" }
  ),
});

export type BattleStateValues = z.infer<typeof battleStateSchema>;

/* ---------------------------- Combattenti -------------------------- */

const initiativeSchema = z
  .number()
  .int()
  .min(L.minInitiative)
  .max(L.maxInitiative);

const dexModSchema = z.number().int().min(-10).max(20);
const speedSchema = z.number().min(0).max(1000);
const hpValueSchema = z.number().int().min(0).max(100000);

export const hitPointsSchema = z.object({
  current: hpValueSchema,
  max: hpValueSchema,
  temp: hpValueSchema,
});

/** Dati riservati: finiscono in `combatants/{cid}/secret/master`. */
export const combatantSecretSchema = z.object({
  realName: nameSchema.optional(),
  hp: hitPointsSchema.partial().optional(),
  armorClass: z.number().int().min(0).max(50).optional(),
  masterNotes: noteSchema.optional(),
  tactics: noteSchema.optional(),
  lootPreview: noteSchema.optional(),
});

export const createCombatantSchema = z.object({
  side: z.enum(COMBATANT_SIDES),
  publicName: nameSchema,
  tokenUrl: z.union([z.url(), z.literal("")]).optional(),
  size: z.number().int().min(1).max(L.maxSize).optional(),
  accent: z.string().max(40).optional(),
  category: z.enum(ENEMY_CATEGORIES).nullable().optional(),
  sourceEntityId: idSchema.nullable().optional(),
  ownerId: idSchema.nullable().optional(),
  position: positionSchema.nullable().optional(),
  speed: speedSchema.optional(),
  initiative: initiativeSchema.nullable().optional(),
  dexMod: dexModSchema.optional(),
  publicNote: noteSchema.optional(),
  visible: z.boolean().optional(),
  secret: combatantSecretSchema.optional(),
  /** Duplicazione in blocco: "Goblin A", "Goblin B"… */
  count: z.number().int().min(1).max(L.maxDuplicateCount).optional(),
});

export type CreateCombatantValues = z.infer<typeof createCombatantSchema>;

export const updateCombatantSchema = createCombatantSchema
  .omit({ count: true })
  .extend({
    turnState: z.enum(COMBATANT_TURN_STATES),
    movementUsed: z.number().min(0).max(10000),
    controllerIds: z.array(idSchema).max(10),
  })
  .partial()
  .refine((values) => Object.keys(values).length > 0, {
    message: "Nessuna modifica richiesta",
  });

export type UpdateCombatantValues = z.infer<typeof updateCombatantSchema>;

/* ----------------------------- Movimento --------------------------- */

/**
 * `actionId` è generato dal client e diventa l'id del documento evento:
 * un retry di rete non può quindi contare due volte lo stesso movimento.
 */
const actionIdSchema = z.string().trim().min(8).max(64);

export const moveCombatantSchema = z.object({
  to: positionSchema,
  /**
   * Percorso cella per cella scelto dal giocatore (facoltativo): se
   * assente il server calcola la via più breve. Il costo lo decide
   * comunque il server, mai il client.
   */
  path: z.array(positionSchema).max(400).optional(),
  actionId: actionIdSchema,
  /** Solo Master: teletrasporta la pedina ignorando il budget. */
  force: z.boolean().optional(),
});

export type MoveCombatantValues = z.infer<typeof moveCombatantSchema>;

/* -------------------------------- HP ------------------------------- */

export const HEALTH_OPERATIONS = ["DAMAGE", "HEAL", "TEMP", "SET"] as const;

export const healthOperationSchema = z.object({
  kind: z.enum(HEALTH_OPERATIONS),
  /** Valore sempre positivo: è `kind` a dire in che direzione va. */
  value: hpValueSchema,
  note: noteSchema.optional(),
  actionId: actionIdSchema,
});

export type HealthOperationValues = z.infer<typeof healthOperationSchema>;

export const deathSchema = z.object({
  dead: z.boolean(),
  actionId: actionIdSchema,
});

/* ---------------------------- Condizioni --------------------------- */

export const conditionSchema = z.object({
  id: idSchema,
  name: nameSchema,
  kind: z.enum(CONDITION_KINDS),
  detail: z.string().trim().max(L.maxNoteLength),
  source: z.string().trim().max(L.maxNameLength),
  duration: z.string().trim().max(L.maxNameLength),
});

export const conditionMutationSchema = z.object({
  action: z.enum(["ADD", "REMOVE"]),
  condition: conditionSchema,
  actionId: actionIdSchema,
});

export type ConditionMutationValues = z.infer<typeof conditionMutationSchema>;

/* --------------------------- Iniziativa ---------------------------- */

export const setInitiativeSchema = z.object({
  initiative: initiativeSchema,
  dexMod: dexModSchema.optional(),
});

/** Sequenza decisa a mano dal Master per sciogliere i pareggi. */
export const manualOrderSchema = z.object({
  orderedIds: z.array(idSchema).min(1).max(L.maxCombatants),
});

/* ------------------------------- Turni ----------------------------- */

/**
 * `expectedVersion` è il compare-and-swap dell'avanzamento: un doppio
 * click su "Fine turno" trova la versione già cambiata e viene respinto
 * invece di saltare un combattente.
 */
export const turnActionSchema = z.object({
  action: z.enum(["END", "SKIP", "FORCE_NEXT", "PREV"]),
  expectedVersion: z.number().int().min(0),
  actionId: actionIdSchema,
});

export type TurnActionValues = z.infer<typeof turnActionSchema>;

/* ------------------------------ Lobby ------------------------------ */

export const joinBattleSchema = z.object({
  /** PC con cui entrare: un giocatore può possederne più di uno. */
  characterId: idSchema,
  position: positionSchema.nullable().optional(),
  initiative: initiativeSchema.nullable().optional(),
});

export type JoinBattleValues = z.infer<typeof joinBattleSchema>;

export const leaveBattleSchema = z.object({
  /** Il Master decide se la pedina resta sul campo o sparisce. */
  removeCombatant: z.boolean().optional(),
});

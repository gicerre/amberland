import { z } from "zod";

import {
  AREA_SHAPES,
  COVER_LEVELS,
  DIFFICULTY_TIERS,
  HAZARD_KINDS,
  MAP_LAYERS,
  MAP_LIMITS,
  MAP_OBJECT_KINDS,
  OBJECT_STATES,
  TERRAIN_CATEGORIES,
  TRAP_RESETS,
  TRAP_TRIGGERS,
} from "@/types/battlemap";

/* ============================================================
 * Validazione della mappa tattica — condivisa client/server.
 *
 * L'editor lavora in memoria e invia la mappa intera al salvataggio:
 * questo schema è ciò che impedisce a un documento malformato (o a una
 * mappa troppo grande per Firestore) di finire in produzione.
 * ============================================================ */

const L = MAP_LIMITS;

const cellKeySchema = z
  .string()
  .regex(/^\d{1,3},\d{1,3}$/, "Chiave di cella non valida");

const idSchema = z.string().trim().min(1).max(64);
const nameSchema = z.string().trim().max(L.maxNameLength);
const textSchema = z.string().trim().max(L.maxTextLength);
const colorSchema = z.string().trim().max(40);

export const tacticalCheckSchema = z.object({
  skill: z.string().trim().max(40),
  difficulty: z.enum(DIFFICULTY_TIERS),
  dc: z.number().int().min(0).max(40),
});

const coverSchema = z.enum(COVER_LEVELS);

const saveSchema = z.object({
  ability: z.string().trim().max(40),
  dc: z.number().int().min(0).max(40),
});

export const mapCellSchema = z.object({
  terrain: z.string().trim().min(1).max(40),
  elevation: z.number().int().min(L.minElevation).max(L.maxElevation),
  movementCost: z.number().min(0).max(20).nullable().optional(),
  blocked: z.boolean().optional(),
  cover: coverSchema.optional(),
  coverEdges: z
    .object({
      N: coverSchema.optional(),
      E: coverSchema.optional(),
      S: coverSchema.optional(),
      W: coverSchema.optional(),
    })
    .optional(),
  check: tacticalCheckSchema.nullable().optional(),
  note: textSchema.optional(),
});

export const terrainDefinitionSchema = z.object({
  id: idSchema,
  label: nameSchema,
  category: z.enum(TERRAIN_CATEGORIES),
  movementCost: z.number().min(0).max(20).nullable(),
  difficult: z.boolean(),
  color: colorSchema,
  pattern: z.enum(["none", "dots", "lines", "waves", "cracks"]),
  check: tacticalCheckSchema.nullable(),
  blocksSight: z.boolean(),
  description: textSchema,
});

const cellsListSchema = z.array(cellKeySchema).max(L.maxCellsPerElement);

export const mapObjectSchema = z.object({
  id: idSchema,
  kind: z.enum(MAP_OBJECT_KINDS),
  name: nameSchema,
  cells: cellsListSchema,
  icon: z.string().trim().max(40),
  color: colorSchema,
  blocksMovement: z.boolean(),
  blocksSight: z.boolean(),
  cover: coverSchema,
  height: z.number().min(0).max(100),
  destructible: z.boolean(),
  hp: z.number().int().min(0).max(10000),
  armorClass: z.number().int().min(0).max(50),
  material: z.string().trim().max(40),
  state: z.enum(OBJECT_STATES),
  checks: z.object({
    perception: tacticalCheckSchema.nullable().optional(),
    investigation: tacticalCheckSchema.nullable().optional(),
    lockpick: tacticalCheckSchema.nullable().optional(),
    force: tacticalCheckSchema.nullable().optional(),
    disarm: tacticalCheckSchema.nullable().optional(),
  }),
  linkedIds: z.array(idSchema).max(20),
  connectsElevation: z
    .object({
      from: z.number().int().min(L.minElevation).max(L.maxElevation),
      to: z.number().int().min(L.minElevation).max(L.maxElevation),
    })
    .nullable(),
  visibleToPlayers: z.boolean(),
  note: textSchema,
});

export const mapTrapSchema = z.object({
  id: idSchema,
  name: nameSchema,
  type: z.string().trim().max(40),
  description: textSchema,
  cells: cellsListSchema,
  hidden: z.boolean(),
  armed: z.boolean(),
  perception: tacticalCheckSchema.nullable(),
  investigation: tacticalCheckSchema.nullable(),
  disarm: tacticalCheckSchema.nullable(),
  save: saveSchema.nullable(),
  damage: z.string().trim().max(40),
  damageType: z.string().trim().max(40),
  effect: z.string().trim().max(120),
  trigger: z.enum(TRAP_TRIGGERS),
  reset: z.enum(TRAP_RESETS),
  note: textSchema,
});

export const mapHazardSchema = z.object({
  id: idSchema,
  kind: z.enum(HAZARD_KINDS),
  name: nameSchema,
  description: textSchema,
  cells: cellsListSchema,
  recurring: z.boolean(),
  save: saveSchema.nullable(),
  damage: z.string().trim().max(40),
  damageType: z.string().trim().max(40),
  effect: z.string().trim().max(120),
  color: colorSchema,
  visibleToPlayers: z.boolean(),
});

export const mapAreaSchema = z.object({
  id: idSchema,
  name: nameSchema,
  shape: z.enum(AREA_SHAPES),
  cells: cellsListSchema,
  origin: z
    .object({ x: z.number().int().min(0).max(200), y: z.number().int().min(0).max(200) })
    .nullable(),
  radius: z.number().min(0).max(1000),
  direction: z.number().min(-360).max(360),
  effect: z.string().trim().max(200),
  duration: z.string().trim().max(80),
  color: colorSchema,
  opacity: z.number().min(0).max(1),
  visibleToPlayers: z.boolean(),
  trigger: z.string().trim().max(120),
  note: textSchema,
});

const layerStateSchema = z.object({
  visible: z.boolean(),
  locked: z.boolean(),
});

export const mapSettingsSchema = z.object({
  defaultTerrain: z.string().trim().min(1).max(40),
  difficultyDc: z.object({
    EASY: z.number().int().min(1).max(40),
    MEDIUM: z.number().int().min(1).max(40),
    HARD: z.number().int().min(1).max(40),
    VERY_HARD: z.number().int().min(1).max(40),
    EXTREME: z.number().int().min(1).max(40),
  }),
  elevationStepCost: z.number().min(0).max(10),
  maxClimbableStep: z.number().int().min(0).max(12),
  customTerrains: z.array(terrainDefinitionSchema).max(L.maxCustomTerrains),
  showCoordinates: z.boolean(),
  preset: z.string().trim().max(40).nullable(),
});

/**
 * La mappa intera. Il limite sulle celle non è estetico: il documento
 * Firestore non può superare 1 MB, e una mappa fittissima ci arriva.
 */
export const tacticalMapSchema = z.object({
  version: z.number().int().min(1).max(99),
  cells: z
    .record(cellKeySchema, mapCellSchema)
    .refine((cells) => Object.keys(cells).length <= L.maxCells, {
      message: `La mappa supera le ${L.maxCells} celle modificate`,
    }),
  objects: z.array(mapObjectSchema).max(L.maxObjects),
  traps: z.array(mapTrapSchema).max(L.maxTraps),
  hazards: z.array(mapHazardSchema).max(L.maxHazards),
  areas: z.array(mapAreaSchema).max(L.maxAreas),
  layers: z.record(z.enum(MAP_LAYERS), layerStateSchema),
  settings: mapSettingsSchema,
});

export type TacticalMapValues = z.infer<typeof tacticalMapSchema>;

export const saveMapSchema = z.object({
  map: tacticalMapSchema,
  /** Griglia aggiornata insieme alla mappa (ridimensionamento). */
  grid: z
    .object({
      cols: z.number().int().min(1).max(100),
      rows: z.number().int().min(1).max(100),
    })
    .optional(),
});

export type SaveMapValues = z.infer<typeof saveMapSchema>;

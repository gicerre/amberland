/**
 * Verifica dei moduli puri del Campo di Battaglia.
 *
 * Uso: npm run check:combat
 *
 * Niente framework di test: il progetto non ne ha e non serve introdurlo.
 * Gli `engine/` sono puri (nessun Firebase, React o DOM), quindi bastano
 * `node:assert` e `tsx`. Girano qui gli stessi moduli che gireranno nelle
 * API Route e nei componenti: è il modo di accorgersi subito se la regola
 * di gioco cambia comportamento.
 */
import assert from "node:assert/strict";

import {
  HEALTH_BAND_THRESHOLDS,
  duplicateSuffix,
} from "@/features/battle/constants";
import {
  applyDamage,
  applyDeathSave,
  applyHealing,
  applyTempHp,
  healthBandFor,
  healthRatio,
  normalizeHitPoints,
  setHitPoints,
} from "@/features/battle/engine/health";
import {
  aspectMismatch,
  cellDistance,
  cellsInRadius,
  entityDistance,
  footprint,
  isAdjacent,
  lineOfSight,
  suggestGrid,
  worldDistance,
} from "@/features/battle/engine/geometry";
import {
  applyCellPatch,
  brushCells,
  buildObstacleIndex,
  cellAt,
  circleCells,
  copySelection,
  coverAt,
  describeCell,
  floodFillCells,
  lineCells,
  movementCostAt,
  pasteClipboard,
  rectCells,
} from "@/features/battle/engine/tactical";
import {
  commit,
  EMPTY_HISTORY,
  redo,
  undo,
} from "@/features/battle/engine/history";
import {
  coverBetween,
  describeCover,
  hasLineOfSight,
} from "@/features/battle/engine/cover";
import { analyzeMap } from "@/features/battle/engine/analysis";
import {
  classifyCell,
  detectGrid,
  detectPitch,
  readImage,
  type CellSample,
} from "@/features/battle/engine/image-analysis";
import {
  DEFAULT_GENERATION,
  generateTacticalStructure,
  regenerateLayer,
  requiredOpenCells,
  suggestSize,
  type GenerationOptions,
} from "@/features/battle/engine/generator";
import {
  ELEMENT_CATALOG,
  searchCatalog,
  templateById,
} from "@/features/battle/catalog";
import {
  applyOutcome,
  availableInteractions as availableElementInteractions,
  availableMethods,
  damageElement,
  instanceFromTemplate,
  outcomeOf,
  summarize,
  withState,
} from "@/features/battle/engine/elements";
import {
  distanceToElement,
  isWithinReach,
} from "@/features/battle/engine/interactions";
import { trapFromTemplate, TRAP_LIBRARY } from "@/features/battle/library";
import {
  EMPTY_TACTICAL_MAP,
  type TacticalMap,
} from "@/types/battlemap";
import {
  buildOccupancy,
  checkMove,
  pathCost,
  pathTo,
  reachableCells,
  remainingBudget,
  type MovementContext,
} from "@/features/battle/engine/movement";
import {
  canControlCombatant,
  canViewSecrets,
  projectCombatant,
  projectField,
} from "@/features/battle/engine/visibility";
import {
  applyManualOrder,
  buildOrder,
  findTies,
  upsertEntry,
} from "@/features/battle/engine/initiative";
import {
  createBattleSchema,
  gridConfigSchema,
  moveCombatantSchema,
  terrainPatchSchema,
} from "@/features/battle/schemas";
import {
  DEFAULT_BATTLE_RULES,
  DEFAULT_CAMPAIGN_ID,
  DEFAULT_GRID,
  EMPTY_BATTLE_LINKS,
  EMPTY_TURN_STATE,
  type Battle,
  type BattleRules,
  type Combatant,
  type CombatantSide,
  type GridConfig,
  type InitiativeEntry,
  type TerrainKind,
} from "@/types/battle";

let failures = 0;
let passed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failures += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✖ ${name}\n  ${message.split("\n").join("\n  ")}`);
  }
}

const grid = (patch: Partial<GridConfig> = {}): GridConfig => ({
  ...DEFAULT_GRID,
  ...patch,
});

/* ------------------------------ Geometria -------------------------- */

check("cellDistance: le quattro metriche su una diagonale di 3", () => {
  const a = { x: 0, y: 0 };
  const b = { x: 3, y: 3 };
  assert.equal(cellDistance(a, b, "CHEBYSHEV"), 3);
  assert.equal(cellDistance(a, b, "MANHATTAN"), 6);
  // 3 diagonali: 3 + floor(3/2) = 4 (variante DMG 5-10-5)
  assert.equal(cellDistance(a, b, "ALTERNATING"), 4);
  assert.ok(Math.abs(cellDistance(a, b, "EUCLIDEAN") - 4.2426) < 0.001);
});

check("worldDistance: 3 celle da 3 metri fanno 9 metri", () => {
  assert.equal(
    worldDistance({ x: 0, y: 0 }, { x: 3, y: 0 }, grid({ cellSize: 3 })),
    9
  );
});

check("footprint: una creatura Grande occupa 2×2 celle", () => {
  const cells = footprint({ x: 1, y: 1 }, 2);
  assert.equal(cells.length, 4);
  assert.deepEqual(cells.map((cell) => `${cell.x},${cell.y}`).sort(), [
    "1,1",
    "1,2",
    "2,1",
    "2,2",
  ]);
});

check("entityDistance: due Grandi adiacenti distano UNA cella", () => {
  const map = grid({ cellSize: 1.5 });
  const a = { position: { x: 0, y: 0 }, size: 2 };
  const b = { position: { x: 2, y: 0 }, size: 2 };
  assert.equal(entityDistance(a, b, map), map.cellSize);
  assert.equal(isAdjacent(a, b, map), true);
});

check("cellsInRadius: un raggio di 1 cella copre il quadrato 3×3", () => {
  const cells = cellsInRadius(
    { x: 5, y: 5 },
    grid({ cellSize: 1.5 }).cellSize,
    grid({ cellSize: 1.5 })
  );
  assert.equal(cells.length, 9);
});

check("lineOfSight: un muro interrompe la linea, il vuoto no", () => {
  const from = { x: 0, y: 0 };
  const to = { x: 4, y: 0 };
  assert.equal(lineOfSight(from, to, {}), true);
  assert.equal(lineOfSight(from, to, { "2,0": "WALL" }), false);
  // Gli estremi non bloccano mai: si vede sempre la cella del bersaglio.
  assert.equal(lineOfSight(from, to, { "4,0": "WALL" }), true);
});

check("suggestGrid: un 16:9 con lato lungo 20 diventa 20 × 11", () => {
  assert.deepEqual(suggestGrid(1920, 1080, 20), { cols: 20, rows: 11 });
  // Verticale: il lato lungo resta 20 sulle righe.
  assert.deepEqual(suggestGrid(1080, 1920, 20), { cols: 11, rows: 20 });
});

check("aspectMismatch: griglia coerente → scarto quasi nullo", () => {
  const { delta } = aspectMismatch(
    { naturalWidth: 1920, naturalHeight: 1080 },
    grid({ cols: 20, rows: 11 })
  );
  assert.ok(delta < 0.03, `scarto inatteso: ${delta}`);
});

/* ------------------------------ Iniziativa ------------------------- */

const entry = (
  id: string,
  initiative: number,
  dexMod = 0,
  side: InitiativeEntry["side"] = "PC"
): InitiativeEntry => ({
  combatantId: id,
  initiative,
  dexMod,
  manualRank: null,
  name: id,
  side,
});

check("buildOrder: il pareggio a 18 lo scioglie la Destrezza", () => {
  const order = buildOrder([
    entry("lento", 18, 1),
    entry("svelto", 18, 4),
    entry("primo", 21, 0),
  ]);
  assert.deepEqual(
    order.map((item) => item.combatantId),
    ["primo", "svelto", "lento"]
  );
});

check("buildOrder: il pareggio pieno resta deterministico", () => {
  const entries = [
    entry("goblin-c", 12, 2, "ENEMY"),
    entry("goblin-a", 12, 2, "ENEMY"),
    entry("goblin-b", 12, 2, "ENEMY"),
  ];
  const first = buildOrder(entries).map((item) => item.combatantId);
  const second = buildOrder([...entries].reverse()).map(
    (item) => item.combatantId
  );
  assert.deepEqual(first, second);
  assert.deepEqual(first, ["goblin-a", "goblin-b", "goblin-c"]);
});

check("buildOrder: a parità assoluta i PC agiscono prima dei nemici", () => {
  const order = buildOrder([
    entry("orco", 15, 1, "ENEMY"),
    entry("eroe", 15, 1, "PC"),
  ]);
  assert.equal(order[0].combatantId, "eroe");
});

check("applyManualOrder: la scelta del Master sopravvive a buildOrder", () => {
  const entries = [entry("alfa", 14, 2), entry("beta", 14, 2)];
  const manual = applyManualOrder(buildOrder(entries), ["beta", "alfa"]);
  const rebuilt = buildOrder(manual).map((item) => item.combatantId);
  assert.deepEqual(rebuilt, ["beta", "alfa"]);
});

check("findTies: raggruppa solo le iniziative davvero pari", () => {
  const ties = findTies(
    buildOrder([entry("a", 10), entry("b", 10), entry("c", 9)])
  );
  assert.equal(ties.length, 1);
  assert.equal(ties[0].length, 2);
});

check("upsertEntry: aggiorna senza duplicare", () => {
  const base = buildOrder([entry("a", 10), entry("b", 8)]);
  const next = upsertEntry(base, { ...entry("b", 20), name: "b" });
  assert.equal(next.length, 2);
  assert.equal(buildOrder(next)[0].combatantId, "b");
});

/* -------------------------------- Salute --------------------------- */

check("healthBandFor: ogni soglia restituisce la propria fascia", () => {
  assert.equal(healthBandFor({ current: 40, max: 40, temp: 0 }), "UNHARMED");
  assert.equal(healthBandFor({ current: 32, max: 40, temp: 0 }), "BRUISED");
  assert.equal(healthBandFor({ current: 24, max: 40, temp: 0 }), "WOUNDED");
  assert.equal(healthBandFor({ current: 12, max: 40, temp: 0 }), "BLOODIED");
  assert.equal(healthBandFor({ current: 2, max: 40, temp: 0 }), "CRITICAL");
  assert.equal(healthBandFor({ current: 0, max: 40, temp: 0 }), "DOWN");
  // Le soglie devono restare ordinate, o la ricerca lineare sbaglia fascia.
  const mins = HEALTH_BAND_THRESHOLDS.map((threshold) => threshold.min);
  assert.deepEqual(mins, [...mins].sort((a, b) => b - a));
});

check("applyDamage: i temporanei assorbono per primi", () => {
  const result = applyDamage({ current: 20, max: 20, temp: 5 }, 8);
  assert.equal(result.absorbed, 5);
  assert.equal(result.applied, 3);
  assert.deepEqual(result.hp, { current: 17, max: 20, temp: 0 });
  assert.equal(result.wentDown, false);
});

check("applyDamage: gli HP non scendono sotto zero, l'eccesso è overflow", () => {
  const result = applyDamage({ current: 6, max: 30, temp: 0 }, 10);
  assert.deepEqual(result.hp, { current: 0, max: 30, temp: 0 });
  assert.equal(result.overflow, 4);
  assert.equal(result.wentDown, true);
  assert.equal(result.band, "DOWN");
  assert.equal(result.massiveDamage, false);
});

check("applyDamage: l'eccesso pari al massimo è morte istantanea", () => {
  const result = applyDamage({ current: 10, max: 10, temp: 0 }, 25);
  assert.equal(result.overflow, 15);
  assert.equal(result.massiveDamage, true);
});

check("applyHealing: non supera il massimo e non tocca i temporanei", () => {
  const result = applyHealing({ current: 18, max: 20, temp: 4 }, 10);
  assert.deepEqual(result.hp, { current: 20, max: 20, temp: 4 });
  assert.equal(result.applied, 2);
});

check("applyHealing: curare da 0 rimette in piedi", () => {
  const result = applyHealing({ current: 0, max: 20, temp: 0 }, 1);
  assert.equal(result.hp.current, 1);
  assert.equal(result.band, "CRITICAL");
});

check("applyTempHp: i temporanei non si sommano, prevale il maggiore", () => {
  assert.equal(applyTempHp({ current: 5, max: 10, temp: 8 }, 5).hp.temp, 8);
  assert.equal(applyTempHp({ current: 5, max: 10, temp: 3 }, 7).hp.temp, 7);
});

check("normalizeHitPoints / setHitPoints: valori sempre coerenti", () => {
  assert.deepEqual(normalizeHitPoints({ current: 99, max: 10, temp: -3 }), {
    current: 10,
    max: 10,
    temp: 0,
  });
  const result = setHitPoints({ current: 4, max: 10, temp: 0 }, { max: 3 });
  assert.deepEqual(result.hp, { current: 3, max: 3, temp: 0 });
  assert.equal(healthRatio(result.hp), 1);
});

check("applyDeathSave: tre fallimenti uccidono, tre successi stabilizzano", () => {
  const dead = applyDeathSave({ successes: 0, failures: 2 }, "FAILURE");
  assert.equal(dead.dead, true);
  const stable = applyDeathSave({ successes: 2, failures: 1 }, "SUCCESS");
  assert.equal(stable.stabilized, true);
  // L'1 naturale vale due fallimenti.
  const critical = applyDeathSave({ successes: 0, failures: 1 }, "FAILURE", 2);
  assert.equal(critical.dead, true);
});

/* ------------------------------ Duplicati -------------------------- */

check("duplicateSuffix: A…Z poi AA", () => {
  assert.equal(duplicateSuffix(0), "A");
  assert.equal(duplicateSuffix(25), "Z");
  assert.equal(duplicateSuffix(26), "AA");
  assert.equal(duplicateSuffix(27), "AB");
});

/* ------------------------------ Movimento -------------------------- */

const movementContext = (
  patch: Partial<MovementContext> = {}
): MovementContext => ({
  grid: grid({ cols: 20, rows: 20, cellSize: 3 }),
  terrain: {},
  occupied: new Map(),
  mover: { id: "eroe", position: { x: 5, y: 5 }, size: 1, side: "PC" },
  budget: 9,
  rules: { blockOccupied: true, enforceMovement: true },
  ...patch,
});

check("reachableCells: 9 metri con celle da 3 fanno 3 celle di raggio", () => {
  const cells = reachableCells(movementContext());
  // Quadrato 7×7 centrato sulla pedina (Chebyshev 3), partenza compresa.
  assert.equal(cells.size, 49);
  assert.equal(cells.get("8,5"), 9);
  assert.equal(cells.has("9,5"), false);
});

check("reachableCells: il terreno difficile dimezza la portata", () => {
  const terrain: Record<string, TerrainKind> = {};
  for (let y = 0; y < 20; y++) terrain[`6,${y}`] = "DIFFICULT";
  const cells = reachableCells(movementContext({ terrain }));
  // Entrare nella colonna difficile costa 6 invece di 3.
  assert.equal(cells.get("6,5"), 6);
  assert.equal(cells.get("7,5"), 9);
  assert.equal(cells.has("8,5"), false);
});

check("pathTo: il muro si aggira, la voragine non si attraversa", () => {
  const terrain: Record<string, TerrainKind> = {
    "6,4": "WALL",
    "6,5": "WALL",
    "6,6": "WALL",
  };
  const context = movementContext({ terrain, budget: 30 });
  const path = pathTo(context, { x: 7, y: 5 });
  assert.ok(path, "il percorso deve esistere aggirando il muro");
  assert.equal(
    path!.some((cell) => cell.x === 6 && cell.y === 5),
    false
  );
  assert.equal(pathTo(movementContext({ terrain }), { x: 6, y: 5 }), null);
});

check("occupazione: si attraversa un alleato, non ci si ferma sopra", () => {
  const occupied = buildOccupancy([
    {
      id: "compagno",
      position: { x: 6, y: 5 },
      size: 1,
      side: "PC",
      turnState: "WAITING",
      isDead: false,
    },
  ]);
  const cells = reachableCells(movementContext({ occupied }));
  assert.equal(cells.has("6,5"), false, "la cella dell'alleato non è una meta");
  assert.equal(cells.has("7,5"), true, "ma ci si passa attraverso");
});

check("occupazione: il nemico sbarra la strada se la regola è attiva", () => {
  const enemies = [
    {
      id: "orco",
      position: { x: 6, y: 5 },
      size: 1,
      side: "ENEMY" as CombatantSide,
      turnState: "WAITING" as const,
      isDead: false,
    },
  ];
  const blocked = pathTo(
    movementContext({ occupied: buildOccupancy(enemies), budget: 30 }),
    { x: 7, y: 5 }
  );
  assert.ok(blocked, "si può comunque aggirare");
  assert.equal(
    blocked!.some((cell) => cell.x === 6 && cell.y === 5),
    false
  );

  const through = pathTo(
    movementContext({
      occupied: buildOccupancy(enemies),
      budget: 30,
      rules: { blockOccupied: false, enforceMovement: true },
    }),
    { x: 7, y: 5 }
  );
  assert.equal(through!.length, 3, "senza blocco si passa in linea retta");
});

check("i caduti non ingombrano più il campo", () => {
  const occupied = buildOccupancy([
    {
      id: "caduto",
      position: { x: 6, y: 5 },
      size: 1,
      side: "ENEMY",
      turnState: "DEAD",
      isDead: true,
    },
  ]);
  assert.equal(occupied.size, 0);
});

check("metrica ALTERNATING: la seconda diagonale costa doppio", () => {
  const context = movementContext({
    grid: grid({ cols: 20, rows: 20, cellSize: 3, metric: "ALTERNATING" }),
    budget: 30,
  });
  // 3 + 6 = 9 metri per due diagonali.
  assert.equal(
    pathCost(context, [
      { x: 5, y: 5 },
      { x: 6, y: 6 },
      { x: 7, y: 7 },
    ]),
    9
  );
});

check("una creatura Grande non passa da un varco di una cella", () => {
  // Muraglia continua con una sola breccia: passa il Medio, non il Grande.
  const terrain: Record<string, TerrainKind> = {};
  for (let y = 0; y < 20; y++) {
    if (y !== 5) terrain[`6,${y}`] = "WALL";
  }
  const large = movementContext({
    terrain,
    budget: 60,
    mover: { id: "ogre", position: { x: 4, y: 4 }, size: 2, side: "ENEMY" },
  });
  assert.equal(pathTo(large, { x: 8, y: 4 }), null);

  const medium = movementContext({ terrain, budget: 60 });
  assert.ok(pathTo(medium, { x: 8, y: 5 }), "il Medio passa dalla breccia");
});

check("pathCost: rifiuta un percorso con un salto", () => {
  assert.equal(
    pathCost(movementContext({ budget: 30 }), [
      { x: 5, y: 5 },
      { x: 8, y: 5 },
    ]),
    null
  );
});

check("checkMove: oltre il budget passa solo se la regola lo consente", () => {
  const strict = checkMove(movementContext(), { x: 9, y: 5 });
  assert.equal(strict.ok, false);

  const permissive = checkMove(
    movementContext({ rules: { blockOccupied: true, enforceMovement: false } }),
    { x: 9, y: 5 }
  );
  assert.equal(permissive.ok, true);
  assert.equal(permissive.overBudget, true);
  assert.equal(permissive.cost, 12);
});

check("remainingBudget: il movimento speso non torna indietro", () => {
  assert.equal(remainingBudget({ speed: 9, movementUsed: 6 }), 3);
  assert.equal(remainingBudget({ speed: 9, movementUsed: 12 }), 0);
});

/* ----------------------------- Riservatezza ------------------------ */

const battleFixture = (rules: Partial<BattleRules> = {}): Battle => ({
  id: "battaglia",
  name: "Agguato",
  description: "",
  status: "ACTIVE",
  campaignId: DEFAULT_CAMPAIGN_ID,
  masterIds: ["master-1"],
  createdBy: "master-1",
  grid: grid(),
  background: null,
  order: [],
  turn: { ...EMPTY_TURN_STATE, round: 1, activeCombatantId: "pg" },
  rules: { ...DEFAULT_BATTLE_RULES, ...rules },
  terrain: {},
  links: EMPTY_BATTLE_LINKS,
  startedAt: null,
  endedAt: null,
  createdAt: null,
  updatedAt: null,
});

const combatantFixture = (patch: Partial<Combatant> = {}): Combatant => ({
  id: "nemico",
  battleId: "battaglia",
  side: "ENEMY",
  publicName: "Figura incappucciata",
  tokenUrl: "",
  size: 1,
  accent: "#c0453c",
  sourceEntityId: null,
  ownerId: null,
  controllerIds: [],
  category: "BOSS",
  position: { x: 1, y: 1 },
  speed: 9,
  movementUsed: 0,
  initiative: 12,
  dexMod: 2,
  turnState: "WAITING",
  conditions: [],
  hp: null,
  healthBand: "BLOODIED",
  isDead: false,
  deathSaves: null,
  publicNote: "",
  visible: true,
  createdAt: null,
  updatedAt: null,
  ...patch,
});

const master = { uid: "master-1", role: "MASTER" as const };
const player = { uid: "player-1", role: "PLAYER" as const };

check("proiezione: il Master vede nome vero e HP riservati", () => {
  const view = projectCombatant(
    combatantFixture(),
    {
      realName: "Grimtooth",
      hp: { current: 22, max: 60, temp: 0 },
      armorClass: 15,
      statBlock: null,
      sourceSnapshot: null,
      masterNotes: "Fugge sotto i 10 HP",
      tactics: "",
      lootPreview: "",
    },
    master,
    battleFixture()
  );
  assert.equal(view.name, "Grimtooth");
  assert.equal(view.hp?.current, 22);
  assert.equal(view.healthBand, "BLOODIED");
  assert.equal(view.isPrivileged, true);
  assert.match(view.note, /Fugge sotto i 10 HP/);
});

check("proiezione: il giocatore non vede né nome vero né numeri", () => {
  const view = projectCombatant(
    combatantFixture(),
    null,
    player,
    battleFixture()
  );
  assert.equal(view.name, "Figura incappucciata");
  assert.equal(view.hp, null);
  assert.equal(view.hpRatio, null);
  assert.equal(view.healthBand, "BLOODIED");
  assert.equal(view.canControl, false);
});

check("enemyHpDisplay: HIDDEN non rivela nemmeno la fascia", () => {
  const hidden = projectCombatant(
    combatantFixture(),
    null,
    player,
    battleFixture({ enemyHpDisplay: "HIDDEN" })
  );
  assert.equal(hidden.healthBand, null);
  assert.equal(hidden.hpRatio, null);

  const bar = projectCombatant(
    combatantFixture({ hp: { current: 15, max: 60, temp: 0 } }),
    null,
    player,
    battleFixture({ enemyHpDisplay: "BAR" })
  );
  assert.equal(bar.hp, null);
  assert.equal(bar.hpRatio, 0.25);

  const exact = projectCombatant(
    combatantFixture({ hp: { current: 15, max: 60, temp: 0 } }),
    null,
    player,
    battleFixture({ enemyHpDisplay: "EXACT" })
  );
  assert.equal(exact.hp?.current, 15);
});

check("gli HP dei compagni seguono la regola del tavolo", () => {
  const ally = combatantFixture({
    id: "pg",
    side: "PC",
    ownerId: "player-2",
    publicName: "Thorin",
    hp: { current: 8, max: 30, temp: 0 },
  });
  assert.equal(
    projectCombatant(ally, null, player, battleFixture({ revealAllyHp: true }))
      .hp?.current,
    8
  );
  assert.equal(
    projectCombatant(ally, null, player, battleFixture({ revealAllyHp: false }))
      .hp,
    null
  );
  // Il proprio personaggio si vede sempre, regola o no.
  assert.equal(
    projectCombatant(
      { ...ally, ownerId: "player-1" },
      null,
      player,
      battleFixture({ revealAllyHp: false })
    ).hp?.current,
    8
  );
});

check("controllo: proprietario e delegati muovono la pedina", () => {
  const battle = battleFixture();
  assert.equal(
    canControlCombatant(
      combatantFixture({ id: "pg", side: "PC", ownerId: "player-1" }),
      player,
      battle
    ),
    true
  );
  assert.equal(canControlCombatant(combatantFixture(), player, battle), false);
  assert.equal(
    canControlCombatant(
      combatantFixture({ controllerIds: ["player-1"] }),
      player,
      battle
    ),
    true
  );
  assert.equal(canViewSecrets(master, battle), true);
  assert.equal(
    canViewSecrets({ uid: "master-2", role: "MASTER" }, battle),
    false,
    "un Master estraneo alla battaglia non è il suo Master"
  );
});

check("le pedine nascoste spariscono dal campo dei giocatori", () => {
  const battle = battleFixture();
  const field = [
    combatantFixture({ id: "visibile" }),
    combatantFixture({ id: "agguato", visible: false }),
  ];
  assert.equal(projectField(field, null, player, battle).length, 1);
  assert.equal(projectField(field, null, master, battle).length, 2);
});

/* ---------------------------- Mappa tattica ------------------------ */

const tacticalMap = (patch: Partial<TacticalMap> = {}): TacticalMap => ({
  ...EMPTY_TACTICAL_MAP,
  ...patch,
});

check("cellAt: senza cella scritta vale il terreno di base", () => {
  const map = tacticalMap();
  assert.equal(cellAt(map, "3,3").terrain, "NORMAL");
  assert.equal(cellAt(map, "3,3").elevation, 0);
});

check("movementCostAt: fango raddoppia, muro sbarra, override comanda", () => {
  const map = tacticalMap({
    cells: {
      "1,1": { terrain: "MUD", elevation: 0 },
      "2,1": { terrain: "WALL", elevation: 0 },
      "3,1": { terrain: "GRASS", elevation: 0, movementCost: 3 },
      "4,1": { terrain: "GRASS", elevation: 0, blocked: true },
    },
  });
  assert.equal(movementCostAt(map, "1,1"), 2);
  assert.equal(movementCostAt(map, "2,1"), null);
  assert.equal(movementCostAt(map, "3,1"), 3);
  assert.equal(movementCostAt(map, "4,1"), null);
});

check("gli oggetti che sbarrano il passo rendono la cella invalicabile", () => {
  const door = instanceFromTemplate(
    templateById("structure.door.simple")!,
    "door-1",
    ["5,5"]
  );
  const closed = tacticalMap({ objects: [door] });
  assert.equal(
    movementCostAt(closed, "5,5", buildObstacleIndex(closed)),
    null
  );

  // Una porta aperta non ostacola più nessuno.
  const open = tacticalMap({ objects: [withState(door, "OPEN")] });
  assert.equal(movementCostAt(open, "5,5", buildObstacleIndex(open)), 1);
});

check("coverAt: prevale la copertura più forte fra cella e oggetto", () => {
  const boulder = instanceFromTemplate(
    templateById("nature.rock.large")!,
    "rock-1",
    ["2,2"]
  );
  const map = tacticalMap({
    cells: { "2,2": { terrain: "GRASS", elevation: 0, cover: "HALF" } },
    objects: [boulder],
  });
  assert.equal(coverAt(map, "2,2", buildObstacleIndex(map)), "TOTAL");
});

check("describeCell: il costo arriva in metri, non in moltiplicatori", () => {
  const map = tacticalMap({
    cells: { "0,0": { terrain: "MUD", elevation: 2 } },
  });
  const report = describeCell(map, grid({ cellSize: 3 }), "0,0");
  assert.equal(report.cost, 6);
  assert.equal(report.elevation, 2);
  assert.equal(report.terrain.difficult, true);
  assert.equal(report.check?.skill, "Atletica");
});

check("pennelli e forme coprono le celle attese", () => {
  assert.equal(brushCells({ x: 5, y: 5 }, 3).length, 9);
  assert.equal(rectCells({ x: 0, y: 0 }, { x: 2, y: 1 }).length, 6);
  assert.ok(circleCells({ x: 5, y: 5 }, 2).length >= 13);
  assert.equal(lineCells({ x: 0, y: 0 }, { x: 3, y: 0 }).length, 4);
});

check("floodFill: si ferma dove cambia il terreno", () => {
  const cells: Record<string, { terrain: string; elevation: number }> = {};
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      cells[`${x},${y}`] = { terrain: x < 2 ? "GRASS" : "ROCK", elevation: 0 };
    }
  }
  const map = tacticalMap({ cells: cells as TacticalMap["cells"] });
  const filled = floodFillCells(map, grid({ cols: 5, rows: 5 }), { x: 0, y: 0 });
  assert.equal(filled.length, 10, "solo la fascia d'erba");
});

check("applyCellPatch: le celle tornate al default vengono cancellate", () => {
  const start = { "1,1": { terrain: "MUD", elevation: 1 } };
  const painted = applyCellPatch(start, ["1,1"], {
    terrain: "NORMAL",
    elevation: 0,
  });
  assert.equal(painted.cells["1,1"], undefined);
  assert.equal(painted.after["1,1"], null);
});

check("copia e incolla: il blocco si sposta sull'ancora", () => {
  const map = tacticalMap({
    cells: {
      "1,1": { terrain: "MUD", elevation: 1 },
      "2,1": { terrain: "WALL", elevation: 0 },
    },
  });
  const clip = copySelection(map, ["1,1", "2,1"]);
  assert.ok(clip);
  assert.equal(clip!.width, 2);

  const pasted = pasteClipboard(
    clip!,
    { x: 5, y: 5 },
    grid({ cols: 20, rows: 20 }),
    () => "new-id"
  );
  assert.equal(pasted.cells["5,5"]?.terrain, "MUD");
  assert.equal(pasted.cells["6,5"]?.terrain, "WALL");
});

/* ------------------------------ Storico ---------------------------- */

check("commit + undo + redo riportano la mappa allo stesso stato", () => {
  const start = tacticalMap();
  const patch = {
    cells: { "1,1": { terrain: "MUD", elevation: 0 } },
  };

  const committed = commit(start, EMPTY_HISTORY, "Terreno", patch);
  assert.equal(committed.changed, true);
  assert.equal(committed.map.cells["1,1"]?.terrain, "MUD");

  const undone = undo(committed.map, committed.history);
  assert.equal(undone.map.cells["1,1"], undefined, "l'inversa cancella la cella");

  const redone = redo(undone.map, undone.history);
  assert.equal(redone.map.cells["1,1"]?.terrain, "MUD");
});

check("lo storico registra anche oggetti e trappole", () => {
  const trap = trapFromTemplate(TRAP_LIBRARY[0]!, "trap-1", ["4,4"]);
  const withTrap = commit(tacticalMap(), EMPTY_HISTORY, "Trappola", {
    traps: { "trap-1": trap },
  });
  assert.equal(withTrap.map.traps.length, 1);

  const removed = commit(withTrap.map, withTrap.history, "Elimina", {
    traps: { "trap-1": null },
  });
  assert.equal(removed.map.traps.length, 0);

  const restored = undo(removed.map, removed.history);
  assert.equal(restored.map.traps.length, 1);
  assert.equal(restored.map.traps[0]!.name, trap.name);
});

check("una patch vuota non sporca lo storico", () => {
  const result = commit(tacticalMap(), EMPTY_HISTORY, "Nulla", {});
  assert.equal(result.changed, false);
  assert.equal(result.history.past.length, 0);
});

/* ------------------- Movimento sulla mappa tattica ------------------ */

check("il movimento legge i costi dalla mappa tattica", () => {
  const cells: TacticalMap["cells"] = {};
  for (let y = 0; y < 20; y++) cells[`6,${y}`] = { terrain: "MUD", elevation: 0 };
  const map = tacticalMap({ cells });

  const context = movementContext({
    tactical: { map, obstacles: buildObstacleIndex(map) },
  });
  const cellsReached = reachableCells(context);
  assert.equal(cellsReached.get("6,5"), 6, "il fango costa doppio");
  assert.equal(cellsReached.has("8,5"), false);
});

check("un muro della mappa tattica è invalicabile", () => {
  const cells: TacticalMap["cells"] = {};
  for (let y = 0; y < 20; y++) {
    if (y !== 9) cells[`6,${y}`] = { terrain: "WALL", elevation: 0 };
  }
  const map = tacticalMap({ cells });
  const context = movementContext({
    budget: 12,
    tactical: { map, obstacles: buildObstacleIndex(map) },
  });
  assert.equal(pathTo(context, { x: 7, y: 5 }), null);
});

check("salire costa, scendere no, e oltre il limite non si sale", () => {
  const map = tacticalMap({
    cells: {
      "6,5": { terrain: "ROCK", elevation: 2 },
      "4,5": { terrain: "ROCK", elevation: -2 },
      "5,4": { terrain: "ROCK", elevation: 5 },
    },
  });
  const context = movementContext({
    budget: 30,
    tactical: { map, obstacles: buildObstacleIndex(map) },
  });

  // Un passo in piano costa 3; salendo di 2 livelli costa 3 + 2×3 = 9.
  assert.equal(pathCost(context, [{ x: 5, y: 5 }, { x: 6, y: 5 }]), 9);
  // Scendere non costa nulla in più.
  assert.equal(pathCost(context, [{ x: 5, y: 5 }, { x: 4, y: 5 }]), 3);
  // Cinque livelli in un colpo solo: non si scala senza attrezzatura.
  assert.equal(pathCost(context, [{ x: 5, y: 5 }, { x: 5, y: 4 }]), null);
});

/* ------------------------------ Copertura -------------------------- */

/** Istanza dal catalogo, con eventuali ritocchi per la verifica. */
const withElement = (
  templateId: string,
  cells: string[],
  patch: Partial<ReturnType<typeof instanceFromTemplate>> = {}
) => ({
  ...instanceFromTemplate(templateById(templateId)!, `el-${templateId}`, cells),
  ...patch,
});

check("copertura: campo libero, nessun riparo", () => {
  const map = tacticalMap();
  const result = coverBetween(
    map,
    buildObstacleIndex(map),
    { x: 0, y: 0 },
    { x: 6, y: 0 }
  );
  assert.equal(result.level, "NONE");
  assert.equal(result.blocked, false);
});

check("copertura: un masso in mezzo la fornisce, aggirandolo no", () => {
  const map = tacticalMap({ objects: [withElement("nature.rock.large", ["3,0"])] });
  const obstacles = buildObstacleIndex(map);

  const through = coverBetween(map, obstacles, { x: 0, y: 0 }, { x: 6, y: 0 });
  assert.equal(through.blocked, true, "il masso ferma anche la vista");
  assert.equal(through.level, "TOTAL");

  // Stessa scena, ma il tiro passa una riga più in basso: niente riparo.
  const around = coverBetween(map, obstacles, { x: 0, y: 2 }, { x: 6, y: 2 });
  assert.equal(around.level, "NONE");
  assert.equal(around.blocked, false);
});

check("copertura: una barricata copre senza togliere la vista", () => {
  const map = tacticalMap({
    objects: [
      withElement("field.barricade", ["3,0"], {
        blocksSight: false,
        blocksMovement: true,
        cover: "HALF",
      }),
    ],
  });
  const result = coverBetween(
    map,
    buildObstacleIndex(map),
    { x: 0, y: 0 },
    { x: 6, y: 0 }
  );
  assert.equal(result.blocked, false);
  assert.equal(result.level, "HALF");
  assert.match(describeCover(result), /Mezza copertura/);
});

check("copertura: chi tira dall'alto scavalca i ripari bassi", () => {
  const map = tacticalMap({
    cells: { "0,0": { terrain: "ROCK", elevation: 3 } },
    objects: [
      withElement("field.barricade", ["3,0"], {
        blocksSight: false,
        cover: "THREE_QUARTERS",
      }),
    ],
  });
  const result = coverBetween(
    map,
    buildObstacleIndex(map),
    { x: 0, y: 0 },
    { x: 6, y: 0 }
  );
  assert.equal(result.level, "HALF", "tre quarti scendono a mezza copertura");
  assert.equal(result.highGround, 3);
});

check("copertura: il parapetto protegge solo dal lato giusto", () => {
  const map = tacticalMap({
    cells: {
      "6,3": {
        terrain: "ROCK",
        elevation: 0,
        coverEdges: { W: "THREE_QUARTERS" },
      },
    },
  });
  const obstacles = buildObstacleIndex(map);

  const fromWest = coverBetween(map, obstacles, { x: 0, y: 3 }, { x: 6, y: 3 });
  assert.equal(fromWest.level, "THREE_QUARTERS");

  const fromNorth = coverBetween(map, obstacles, { x: 6, y: 0 }, { x: 6, y: 3 });
  assert.equal(fromNorth.level, "NONE");
});

check("linea di vista: un muro dell'immagine la interrompe", () => {
  const map = tacticalMap({
    cells: { "3,0": { terrain: "WALL", elevation: 0 } },
  });
  const obstacles = buildObstacleIndex(map);
  assert.equal(
    hasLineOfSight(map, obstacles, { x: 0, y: 0 }, { x: 6, y: 0 }),
    false
  );
  assert.equal(
    hasLineOfSight(map, obstacles, { x: 0, y: 2 }, { x: 6, y: 2 }),
    true
  );
});

/* ----------------------------- Interazioni -------------------------- */

check("un'azione «una volta sola» sparisce dopo l'uso", () => {
  const wall = withElement("structure.wall.stone", ["5,5"]);
  const breach = wall.interactions.find((entry) => entry.id === "breach")!;
  const single = {
    ...wall,
    interactions: wall.interactions.map((entry) =>
      entry.id === breach.id ? { ...entry, once: true } : entry
    ),
  };

  const method = breach.methods![0]!;
  const result = applyOutcome(single, breach.id, outcomeOf(method, "SUCCESS"));

  assert.equal(result.element.state, "BREACHED");
  assert.equal(result.element.blocksMovement, false, "la breccia si attraversa");
  assert.equal(
    availableElementInteractions(result.element, { isMaster: true }).some(
      (entry) => entry.id === breach.id
    ),
    false
  );
});

check("le azioni riservate non arrivano ai giocatori", () => {
  const lever = withElement("structure.mechanism.lever", ["3,3"]);
  const master = availableElementInteractions(lever, { isMaster: true });
  const player = availableElementInteractions(lever, { isMaster: false });

  assert.ok(master.length > player.length, "il Master ne vede di più");
  assert.equal(player.some((entry) => entry.id === "jam"), false);
});

check("si interagisce solo da vicino", () => {
  const chest = withElement("prop.chest.wood", ["8,8"]);
  assert.equal(isWithinReach({ x: 7, y: 8 }, chest), true);
  assert.equal(isWithinReach({ x: 5, y: 8 }, chest), false);
  assert.equal(distanceToElement({ x: 5, y: 8 }, chest), 3);
});

/* ------------------------------ Catalogo ---------------------------- */

check("catalogo: id unici, stati coerenti, azioni sensate", () => {
  const ids = new Set<string>();
  for (const template of ELEMENT_CATALOG) {
    assert.equal(ids.has(template.id), false, `id duplicato: ${template.id}`);
    ids.add(template.id);

    assert.ok(
      template.states[template.initialState],
      `${template.id}: stato iniziale non definito`
    );
    assert.ok(template.label.length > 0, `${template.id}: manca l'etichetta`);
    assert.ok(
      template.id.includes("."),
      `${template.id}: l'id deve essere gerarchico`
    );

    for (const interaction of template.interactions) {
      for (const stateId of interaction.availableStates) {
        assert.ok(
          template.states[stateId],
          `${template.id}/${interaction.id}: stato inesistente ${stateId}`
        );
      }
      for (const method of interaction.methods) {
        for (const result of method.outcomes) {
          if (result.toState) {
            assert.ok(
              template.states[result.toState],
              `${template.id}/${interaction.id}: esito verso stato inesistente`
            );
          }
        }
      }
    }

    for (const stage of template.destruction?.stages ?? []) {
      assert.ok(
        template.states[stage.state],
        `${template.id}: soglia di rottura verso stato inesistente`
      );
    }
  }
  assert.ok(ELEMENT_CATALOG.length >= 80, "il catalogo deve essere ampio");
});

check("catalogo: la robustezza scala davvero fra le varianti", () => {
  const simple = templateById("structure.door.simple")!;
  const fortified = templateById("structure.door.fortified")!;

  assert.ok(
    fortified.destruction!.hp > simple.destruction!.hp * 3,
    "una porta fortificata deve reggere molto di più"
  );

  const forceDc = (id: string) =>
    templateById(id)!
      .interactions.find((entry) => entry.id === "force")!
      .methods.find((entry) => entry.id === "shoulder")!.check!.dc;

  assert.ok(forceDc("structure.door.fortified") > forceDc("structure.door.simple"));
});

check("catalogo: la ricerca trova per nome, materiale e parola chiave", () => {
  assert.ok(searchCatalog("porta").length >= 5);
  assert.ok(searchCatalog("assedio").length >= 3);
  assert.ok(searchCatalog("", { category: "WATER" }).length >= 8);
  assert.equal(searchCatalog("astronave").length, 0);
});

/* -------------------- Dal template all'istanza ---------------------- */

check("istanza: una scelta sola porta con sé tutta la configurazione", () => {
  const template = templateById("structure.door.reinforced")!;
  const door = instanceFromTemplate(template, "door-1", ["4,4"]);

  assert.equal(door.templateId, "structure.door.reinforced");
  assert.equal(door.state, "LOCKED");
  assert.equal(door.blocksMovement, true);
  assert.equal(door.blocksSight, true);
  assert.equal(door.cover, "TOTAL");
  assert.ok(door.destruction!.hp > 0);
  assert.ok(door.interactions.length >= 5);
  assert.ok(
    door.interactions.some((entry) => (entry.methods?.length ?? 0) > 1),
    "scassinare deve avere più metodi"
  );
});

check("istanza: modificarla non tocca il template", () => {
  const template = templateById("structure.door.reinforced")!;
  const before = template.destruction!.hp;

  const door = instanceFromTemplate(template, "door-2", ["4,4"]);
  door.destruction!.hp = 1;
  door.interactions[0]!.label = "Etichetta cambiata";

  assert.equal(templateById("structure.door.reinforced")!.destruction!.hp, before);
  assert.equal(
    templateById("structure.door.reinforced")!.interactions[0]!.label !==
      "Etichetta cambiata",
    true
  );
});

/* --------------------- Stati e comportamento ------------------------ */

check("aprire una porta ne cambia davvero il comportamento", () => {
  const door = instanceFromTemplate(
    templateById("structure.door.simple")!,
    "door-3",
    ["4,4"]
  );
  const map = tacticalMap({ objects: [door] });
  assert.equal(movementCostAt(map, "4,4", buildObstacleIndex(map)), null);

  const open = door.interactions.find((entry) => entry.id === "open")!;
  const first = open.methods![0]!;
  const result = applyOutcome(door, open.id, outcomeOf(first, "SUCCESS"));

  assert.equal(result.element.state, "OPEN");
  assert.equal(result.element.blocksMovement, false);
  assert.equal(result.element.blocksSight, false);

  const after = tacticalMap({ objects: [result.element] });
  assert.equal(movementCostAt(after, "4,4", buildObstacleIndex(after)), 1);
});

check("le azioni dipendono dallo stato: una porta aperta non si scassina", () => {
  const door = instanceFromTemplate(
    templateById("structure.door.reinforced")!,
    "door-4",
    ["4,4"]
  );
  const locked = availableElementInteractions(door, { isMaster: true }).map((e) => e.id);
  assert.ok(locked.includes("unlock"));
  assert.equal(locked.includes("close"), false);

  const opened = withState(door, "OPEN");
  const open = availableElementInteractions(opened, { isMaster: true }).map((e) => e.id);
  assert.equal(open.includes("unlock"), false);
  assert.ok(open.includes("close"));
  assert.ok(open.includes("pass"));
});

check("i metodi riservati non arrivano ai giocatori", () => {
  const door = instanceFromTemplate(
    templateById("structure.door.reinforced")!,
    "door-5",
    ["4,4"]
  );
  const unlock = door.interactions.find((entry) => entry.id === "unlock")!;
  const master = availableMethods(unlock, { isMaster: true });
  const player = availableMethods(unlock, { isMaster: false });
  assert.ok(master.length > player.length);
  assert.equal(player.some((entry) => entry.id === "magic"), false);
});

check("la portata dell'interazione si misura in caselle", () => {
  const chest = instanceFromTemplate(
    templateById("prop.chest.wood")!,
    "chest-1",
    ["8,8"]
  );
  assert.equal(
    availableElementInteractions(chest, { isMaster: false, from: { x: 7, y: 8 } })
      .length > 0,
    true
  );
  assert.equal(
    availableElementInteractions(chest, { isMaster: false, from: { x: 4, y: 8 } })
      .length,
    0
  );
});

/* ---------------------------- Distruzione ---------------------------- */

check("il danno segue soglie e resistenze, non un interruttore", () => {
  const wall = instanceFromTemplate(
    templateById("structure.wall.fortified")!,
    "wall-1",
    ["3,3"]
  );

  // Sotto la soglia di durezza non si scalfisce nemmeno.
  const scratch = damageElement(wall, 4, "Tagliente");
  assert.equal(scratch.applied, 0);
  assert.equal(scratch.element.state, "INTACT");

  const heavy = damageElement(wall, wall.destruction!.hp * 0.6, "Contundente");
  assert.equal(heavy.changedTo, "DAMAGED");

  const finish = damageElement(heavy.element, wall.destruction!.hp, "Contundente");
  assert.equal(finish.destroyed, true);
  assert.equal(finish.element.state, "COLLAPSED");
  assert.equal(finish.element.blocksMovement, false);
});

check("il fuoco conta doppio su un albero, il veleno non conta", () => {
  const tree = instanceFromTemplate(
    templateById("nature.tree.adult")!,
    "tree-1",
    ["5,5"]
  );
  const fire = damageElement(tree, 10, "Fuoco");
  const poison = damageElement(tree, 10, "Veleno");
  assert.equal(fire.applied, 20);
  assert.equal(poison.applied, 0);
});

/* ------------------- Il motore legge gli elementi -------------------- */

check("summarize risponde alle domande del motore", () => {
  const rock = instanceFromTemplate(
    templateById("nature.rock.large")!,
    "rock-1",
    ["2,2", "3,2", "2,3", "3,3"]
  );
  const summary = summarize(rock);
  assert.equal(summary.passable, false);
  assert.equal(summary.cover, "TOTAL");
  assert.equal(summary.blocksSight, true);
  assert.equal(summary.climbable, true);
  assert.equal(summary.destructible, false, "un macigno non si abbatte a mani nude");
  assert.equal(rock.cells.length, 4, "l'elemento occupa tutte le sue caselle");
});

check("un elemento grande copre e blocca su tutte le sue caselle", () => {
  const tree = instanceFromTemplate(
    templateById("nature.tree.great")!,
    "tree-2",
    ["6,6", "7,6", "6,7", "7,7"]
  );
  const map = tacticalMap({ objects: [tree] });
  const obstacles = buildObstacleIndex(map);
  for (const key of tree.cells) {
    assert.equal(movementCostAt(map, key, obstacles), null, `${key} deve bloccare`);
  }
  const shot = coverBetween(map, obstacles, { x: 3, y: 6 }, { x: 10, y: 6 });
  assert.equal(shot.blocked, true);
});

check("acque: il costo di movimento cresce con la corrente", () => {
  const ford = templateById("water.ford")!;
  const torrent = templateById("water.torrent")!;
  assert.ok(
    torrent.states.FLOWING!.movementCost! > ford.states.FLOWING!.movementCost!
  );
  const crossing = torrent.interactions.find((entry) => entry.id === "ford")!;
  const wade = crossing.methods[0]!;
  assert.ok(wade.check!.dc >= 18, "un torrente impetuoso non si guada per caso");
  assert.ok(
    wade.outcomes.some((entry) => entry.kind === "FAILURE" && entry.movementCells > 0),
    "fallire deve trascinare a valle"
  );
});

/* --------------------------- Generazione ---------------------------- */

const generationOptions = (
  patch: Partial<GenerationOptions> = {}
): GenerationOptions => ({
  ...DEFAULT_GENERATION,
  environment: "FOREST",
  cols: 24,
  rows: 18,
  seed: 1234,
  ...patch,
});

check("generazione: stesso seme, stessa struttura", () => {
  const first = generateTacticalStructure(generationOptions());
  const second = generateTacticalStructure(generationOptions());
  assert.deepEqual(first.map.cells, second.map.cells);
  assert.equal(first.map.objects.length, second.map.objects.length);
});

check("generazione: semi diversi, strutture diverse", () => {
  const a = generateTacticalStructure(generationOptions({ seed: 1 }));
  const b = generateTacticalStructure(generationOptions({ seed: 2 }));
  assert.notDeepEqual(a.map.cells, b.map.cells);
});

check("generazione: le caselle restano dentro la griglia", () => {
  const result = generateTacticalStructure(
    generationOptions({ environment: "MOUNTAIN", cols: 20, rows: 15 })
  );
  for (const key of Object.keys(result.map.cells)) {
    const [x, y] = key.split(",").map(Number);
    assert.ok(x! >= 0 && x! < 20, `colonna fuori griglia: ${key}`);
    assert.ok(y! >= 0 && y! < 15, `riga fuori griglia: ${key}`);
  }
  for (const object of result.map.objects) {
    for (const key of object.cells) {
      const [x, y] = key.split(",").map(Number);
      assert.ok(x! >= 0 && x! < 20 && y! >= 0 && y! < 15, `elemento fuori: ${key}`);
    }
  }
});

check("generazione: gli elementi nascono dal catalogo, già configurati", () => {
  const result = generateTacticalStructure(
    generationOptions({ environment: "DUNGEON", structures: 0.8 })
  );
  assert.ok(result.map.objects.length > 0, "un sotterraneo ha elementi");
  for (const object of result.map.objects) {
    assert.ok(object.templateId, "ogni elemento deve venire da un template");
    assert.ok(object.interactions.length > 0, "e portarsi dietro le sue azioni");
    assert.ok(object.stateBehaviours, "e i suoi stati");
  }
  assert.ok(
    result.map.objects.some((object) => object.kind === "DOOR"),
    "un sotterraneo ha porte"
  );
});

check("generazione: zone semantiche e schieramenti", () => {
  const result = generateTacticalStructure(
    generationOptions({ environment: "CASTLE", structures: 0.9 })
  );
  assert.ok(result.map.zones.length > 0, "il castello ha zone");
  assert.ok(
    result.map.zones.some((zone) => zone.kind === "TOWER"),
    "e almeno una torre"
  );

  const spawns = result.map.poi.filter((entry) => entry.kind === "SPAWN");
  assert.equal(spawns.length, 2, "due schieramenti");
  assert.ok(spawns.some((entry) => entry.side === "PC"));
  assert.ok(spawns.some((entry) => entry.side === "ENEMY"));
  assert.ok(
    result.map.poi.some((entry) => entry.kind === "OBJECTIVE"),
    "e un obiettivo"
  );
});

check("generazione: la dimensione suggerita cresce con lo scontro", () => {
  const small = suggestSize(3, 3);
  const big = suggestSize(6, 12);
  assert.ok(big.cols > small.cols, "più combattenti, più campo");
  assert.ok(requiredOpenCells(4, 4) < requiredOpenCells(6, 10));
});

check("rigenerazione parziale: cambia un livello e tiene il resto", () => {
  const options = generationOptions({ environment: "FOREST" });
  const base = generateTacticalStructure(options).map;

  const next = regenerateLayer(base, "poi", { ...options, seed: 999 }).map;
  assert.deepEqual(next.cells, base.cells, "il terreno non si tocca");
  assert.notDeepEqual(next.poi, base.poi, "i punti di interesse cambiano");

  const elevated = regenerateLayer(base, "elevation", { ...options, seed: 42 }).map;
  const sameTerrain = Object.keys(base.cells).every(
    (key) => elevated.cells[key]?.terrain === base.cells[key]?.terrain
  );
  assert.equal(sameTerrain, true, "le quote cambiano, i terreni no");
});

/* ----------------------------- Analisi ------------------------------ */

const analysisGrid = (cols: number, rows: number) => grid({ cols, rows });

check("analisi: una mappa vuota è collegata e senza errori gravi", () => {
  const map = tacticalMap();
  const report = analyzeMap(map, analysisGrid(12, 10));
  assert.equal(report.stats.open, 120);
  assert.equal(report.stats.regions, 1);
  assert.equal(
    report.issues.some((issue) => issue.severity === "ERROR"),
    false
  );
});

check("analisi: riconosce una stanza murata dentro", () => {
  const cells: TacticalMap["cells"] = {};
  // Muro che isola l'angolo in basso a destra.
  for (let y = 0; y < 10; y++) cells[`8,${y}`] = { terrain: "WALL", elevation: 0, blocked: true };
  for (let x = 8; x < 12; x++) cells[`${x},4`] = { terrain: "WALL", elevation: 0, blocked: true };

  const map = tacticalMap({ cells });
  const report = analyzeMap(map, analysisGrid(12, 10));

  assert.ok(report.stats.regions > 1, "due regioni separate");
  const issue = report.issues.find((entry) => entry.id === "regions");
  assert.ok(issue, "il problema va segnalato");
  assert.ok(issue!.cells.length > 0, "con le caselle da mostrare");
});

check("analisi: schieramenti troppo vicini o scollegati", () => {
  const vicini = tacticalMap({
    poi: [
      { id: "a", kind: "SPAWN", name: "Party", cell: "2,2", side: "PC", cells: [], note: "", visibleToPlayers: true },
      { id: "b", kind: "SPAWN", name: "Nemici", cell: "4,2", side: "ENEMY", cells: [], note: "", visibleToPlayers: false },
    ],
  });
  const report = analyzeMap(vicini, analysisGrid(20, 15));
  assert.ok(report.issues.some((issue) => issue.id === "spawn-close"));

  // Stessa scena, ma con un muro in mezzo che li separa del tutto.
  const cells: TacticalMap["cells"] = {};
  for (let y = 0; y < 15; y++) cells[`3,${y}`] = { terrain: "WALL", elevation: 0, blocked: true };
  const separati = tacticalMap({ cells, poi: vicini.poi });
  const second = analyzeMap(separati, analysisGrid(20, 15));
  assert.ok(second.issues.some((issue) => issue.id === "spawn-unreachable"));
});

check("analisi: campo senza ripari e campo impantanato", () => {
  const nudo = analyzeMap(tacticalMap(), analysisGrid(20, 15));
  assert.ok(nudo.issues.some((issue) => issue.id === "no-cover"));

  const cells: TacticalMap["cells"] = {};
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 20; x++) cells[`${x},${y}`] = { terrain: "MUD", elevation: 0 };
  }
  const fango = analyzeMap(tacticalMap({ cells }), analysisGrid(20, 15));
  assert.ok(fango.issues.some((issue) => issue.id === "too-difficult"));
});

check("analisi: punti di interesse murati dentro", () => {
  const cells: TacticalMap["cells"] = {};
  for (const key of ["4,4", "5,4", "6,4", "4,5", "6,5", "4,6", "5,6", "6,6"]) {
    cells[key] = { terrain: "WALL", elevation: 0, blocked: true };
  }
  const map = tacticalMap({
    cells,
    poi: [
      {
        id: "t",
        kind: "TREASURE",
        name: "Tesoro",
        cell: "5,5",
        side: null,
        cells: [],
        note: "",
        visibleToPlayers: false,
      },
    ],
  });
  const report = analyzeMap(map, analysisGrid(12, 10));
  const issue = report.issues.find((entry) => entry.id === "poi-unreachable");
  assert.ok(issue, "un tesoro murato dentro è un errore");
  assert.equal(issue!.severity, "ERROR");
});

check("analisi: il dislivello insormontabile separa davvero", () => {
  const cells: TacticalMap["cells"] = {};
  for (let y = 0; y < 10; y++) {
    for (let x = 6; x < 12; x++) cells[`${x},${y}`] = { terrain: "ROCK", elevation: 6 };
  }
  const map = tacticalMap({ cells });
  const report = analyzeMap(map, analysisGrid(12, 10));
  assert.ok(
    report.stats.regions > 1,
    "sei livelli di salto non si superano camminando"
  );
});

check("analisi: il punteggio premia una mappa completa", () => {
  const generated = generateTacticalStructure(
    generationOptions({ environment: "FOREST", cols: 30, rows: 22, cover: 0.5 })
  ).map;
  const good = analyzeMap(generated, analysisGrid(30, 22));
  const bare = analyzeMap(tacticalMap(), analysisGrid(30, 22));

  assert.ok(good.score > bare.score, "una mappa lavorata vale più di un prato");
  assert.ok(good.score >= 40 && good.score <= 100);
  assert.equal(good.breakdown.length, 7);
});

/* --------------------- Lettura dell'immagine ------------------------ */

/** Campione costruito da un colore, come farebbe il campionatore. */
const sampleOf = (
  r: number,
  g: number,
  b: number,
  detail = 0.1
): CellSample => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    r,
    g,
    b,
    luminance: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255,
    saturation:
      delta === 0
        ? 0
        : lightness > 0.5
          ? delta / (2 - max - min)
          : delta / (max + min),
    hue,
    detail,
  };
};

check("classificazione: i colori tipici di una battlemap", () => {
  assert.equal(classifyCell(sampleOf(40, 90, 170)).terrain, "DEEP_WATER");
  assert.equal(classifyCell(sampleOf(110, 175, 220)).terrain, "SHALLOW_WATER");
  assert.equal(classifyCell(sampleOf(90, 150, 80)).terrain, "GRASS");
  assert.equal(classifyCell(sampleOf(40, 80, 45, 0.8)).terrain, "FOREST");
  assert.equal(classifyCell(sampleOf(205, 180, 120)).terrain, "SAND");
  assert.equal(classifyCell(sampleOf(70, 50, 30)).terrain, "MUD");
  assert.equal(classifyCell(sampleOf(140, 145, 150)).terrain, "ROCK");
  assert.equal(classifyCell(sampleOf(240, 244, 248)).terrain, "SNOW");
  assert.equal(classifyCell(sampleOf(210, 70, 30)).terrain, "LAVA");
});

check("classificazione: il quasi nero e la lava non si attraversano", () => {
  const dark = classifyCell(sampleOf(8, 8, 10));
  assert.equal(dark.terrain, "PIT");
  assert.equal(dark.blocked, true);
  assert.equal(classifyCell(sampleOf(210, 70, 30)).blocked, true);
  assert.equal(classifyCell(sampleOf(90, 150, 80)).blocked, false);
});

check("classificazione: la trama distingue il prato dal bosco", () => {
  const flat = classifyCell(sampleOf(60, 110, 65, 0.05));
  const dense = classifyCell(sampleOf(60, 110, 65, 0.9));
  assert.notEqual(flat.terrain, dense.terrain);
  assert.equal(dense.terrain, "FOREST");
});

check("classificazione: un colore ambiguo lo dichiara con bassa confidenza", () => {
  const guess = classifyCell(sampleOf(150, 120, 190));
  assert.equal(guess.terrain, "NORMAL");
  assert.ok(guess.confidence < 0.3, "e non finge di saperlo");
});

check("lettura: caselle, zone e istogramma", () => {
  const cols = 8;
  const rows = 6;
  const samples: CellSample[][] = [];
  for (let y = 0; y < rows; y++) {
    samples[y] = [];
    for (let x = 0; x < cols; x++) {
      // Metà acqua a sinistra, metà prato a destra.
      samples[y]![x] = x < 4 ? sampleOf(40, 90, 170) : sampleOf(90, 150, 80);
    }
  }

  let counter = 0;
  const result = readImage(samples, cols, rows, () => `z-${counter++}`);

  assert.equal(Object.keys(result.cells).length, cols * rows);
  assert.equal(result.cells["0,0"]!.terrain, "DEEP_WATER");
  assert.equal(result.cells["7,5"]!.terrain, "GRASS");
  assert.equal(result.zones.length, 2, "due zone contigue");
  assert.equal(result.histogram[0]!.count, 24);
  assert.ok(result.confidence > 0.5);
});

check("rilevamento della griglia: trova passo e scostamento", () => {
  // Profilo sintetico: picchi ogni 32 px a partire da 5.
  const profile = new Array(640).fill(0.05);
  for (let x = 5; x < profile.length; x += 32) profile[x] = 1;

  const guess = detectPitch(profile);
  assert.equal(guess.pitch, 32);
  assert.equal(guess.offset % 32, 5);
  assert.ok(guess.score > 0.5, "un segnale così regolare deve convincere");
});

check("rilevamento della griglia: sul rumore non inventa nulla", () => {
  let state = 7;
  const noiseProfile = new Array(640).fill(0).map(() => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return (state / 2147483648) * 0.2;
  });

  const guess = detectPitch(noiseProfile);
  assert.ok(guess.score < 0.35, `punteggio troppo alto sul rumore: ${guess.score}`);

  const grid = detectGrid(noiseProfile, noiseProfile, 640, 640);
  assert.equal(grid, null, "senza griglia, nessuna proposta");
});

check("rilevamento della griglia: dalla coppia di profili alle colonne", () => {
  const columns = new Array(600).fill(0.02);
  for (let x = 0; x < columns.length; x += 40) columns[x] = 1;
  const rows = new Array(400).fill(0.02);
  for (let y = 0; y < rows.length; y += 40) rows[y] = 1;

  const grid = detectGrid(columns, rows, 600, 400);
  assert.ok(grid, "una griglia regolare va riconosciuta");
  assert.equal(grid!.cols, 15);
  assert.equal(grid!.rows, 10);
  assert.ok(grid!.confidence > 0.3);
});

/* -------------------------------- Schemi --------------------------- */

check("gridConfigSchema: accetta il default e rifiuta 0 colonne", () => {
  assert.equal(gridConfigSchema.parse(DEFAULT_GRID).cols, DEFAULT_GRID.cols);
  assert.equal(gridConfigSchema.safeParse({ ...DEFAULT_GRID, cols: 0 }).success, false);
  assert.equal(
    gridConfigSchema.safeParse({ ...DEFAULT_GRID, cols: 500 }).success,
    false
  );
});

check("createBattleSchema: il nome è obbligatorio e viene ripulito", () => {
  assert.equal(createBattleSchema.parse({ name: "  Agguato  " }).name, "Agguato");
  assert.equal(createBattleSchema.safeParse({ name: "   " }).success, false);
});

check("moveCombatantSchema: serve un actionId per l'idempotenza", () => {
  const valid = moveCombatantSchema.safeParse({
    to: { x: 3, y: 4 },
    actionId: "mv-12345678",
  });
  assert.equal(valid.success, true);
  assert.equal(
    moveCombatantSchema.safeParse({ to: { x: 3, y: 4 } }).success,
    false
  );
  assert.equal(
    moveCombatantSchema.safeParse({
      to: { x: -1, y: 4 },
      actionId: "mv-12345678",
    }).success,
    false
  );
});

check("terrainPatchSchema: chiavi 'x,y' e null per cancellare", () => {
  assert.deepEqual(terrainPatchSchema.parse({ "3,4": "WALL", "5,5": null }), {
    "3,4": "WALL",
    "5,5": null,
  });
  assert.equal(terrainPatchSchema.safeParse({ "3-4": "WALL" }).success, false);
});

/* -------------------------------- Esito ---------------------------- */

if (failures > 0) {
  console.error(`\n✖ ${failures} verifiche fallite (${passed} superate)\n`);
  process.exit(1);
}
console.log(`\n✔ ${passed} verifiche superate — motore di combattimento coerente\n`);

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
import { generateTacticalMap } from "@/features/battle/engine/generator";
import {
  objectFromTemplate,
  OBJECT_LIBRARY,
  trapFromTemplate,
  TRAP_LIBRARY,
} from "@/features/battle/library";
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
  const door = objectFromTemplate(
    OBJECT_LIBRARY.find((entry) => entry.id === "door")!,
    "door-1",
    ["5,5"]
  );
  const closed = tacticalMap({ objects: [door] });
  assert.equal(
    movementCostAt(closed, "5,5", buildObstacleIndex(closed)),
    null
  );

  // Una porta aperta non ostacola più nessuno.
  const open = tacticalMap({ objects: [{ ...door, state: "OPEN" }] });
  assert.equal(movementCostAt(open, "5,5", buildObstacleIndex(open)), 1);
});

check("coverAt: prevale la copertura più forte fra cella e oggetto", () => {
  const boulder = objectFromTemplate(
    OBJECT_LIBRARY.find((entry) => entry.id === "boulder")!,
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

/* ----------------------------- Generatore --------------------------- */

check("il generatore è deterministico a parità di seme", () => {
  const options = { preset: "FOREST" as const, cols: 12, rows: 10, seed: 42 };
  const first = generateTacticalMap(options);
  const second = generateTacticalMap(options);
  assert.deepEqual(first.cells, second.cells);
});

check("il sotterraneo nasce con muri e porte", () => {
  const dungeon = generateTacticalMap({
    preset: "DUNGEON",
    cols: 24,
    rows: 18,
    seed: 7,
  });
  const walls = Object.values(dungeon.cells).filter(
    (cell) => cell.terrain === "WALL"
  );
  assert.ok(walls.length > 20, "un sotterraneo senza muri non è un sotterraneo");
  assert.ok(dungeon.objects.some((object) => object.kind === "DOOR"));
});

check("le celle generate restano dentro la griglia", () => {
  const map = generateTacticalMap({
    preset: "RIVER",
    cols: 15,
    rows: 12,
    seed: 3,
  });
  for (const key of Object.keys(map.cells)) {
    const position = key.split(",").map(Number);
    assert.ok(position[0]! >= 0 && position[0]! < 15, `colonna fuori: ${key}`);
    assert.ok(position[1]! >= 0 && position[1]! < 12, `riga fuori: ${key}`);
  }
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

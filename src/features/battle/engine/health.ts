import { HEALTH_BAND_THRESHOLDS } from "@/features/battle/constants";
import type { DeathSaves, HealthBand, HitPoints } from "@/types/battle";

/* ============================================================
 * Salute e danno — MODULO PURO.
 *
 * Nessun import da Firebase, React o DOM: le stesse funzioni girano
 * nel browser (anteprima ottimistica) e dentro le API Route (verità).
 * È ciò che impedisce alla regola di divergere fra client e server.
 *
 * Nota sulla riservatezza: qui si calcolano SOLO numeri. Decidere
 * *chi* può vederli è compito di engine/visibility.ts; gli HP veri dei
 * nemici vivono in `combatants/{cid}/secret/master`.
 * ============================================================ */

/** HP a zero: valore neutro per una pedina appena creata. */
export const EMPTY_HIT_POINTS: HitPoints = { current: 0, max: 0, temp: 0 };

export const EMPTY_DEATH_SAVES: DeathSaves = { successes: 0, failures: 0 };

/** Tiri salvezza contro morte necessari a stabilizzarsi / morire (5e). */
export const DEATH_SAVE_TARGET = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Arrotonda all'intero: gli HP non sono mai frazionari. */
function toWhole(value: number): number {
  return Math.round(Number.isFinite(value) ? value : 0);
}

/** Normalizza HP arbitrari (input utente, dati vecchi) in valori coerenti. */
export function normalizeHitPoints(hp: Partial<HitPoints> | null): HitPoints {
  const max = Math.max(0, toWhole(hp?.max ?? 0));
  return {
    max,
    current: clamp(toWhole(hp?.current ?? 0), 0, max),
    temp: Math.max(0, toWhole(hp?.temp ?? 0)),
  };
}

/**
 * Rapporto 0–1 degli HP correnti sul massimo. Gli HP temporanei NON
 * contano: sono uno scudo, non salute, e farebbero superare il 100%.
 */
export function healthRatio(hp: HitPoints | null): number {
  if (!hp || hp.max <= 0) return 0;
  return clamp(hp.current / hp.max, 0, 1);
}

/**
 * Fascia qualitativa di salute — ciò che i giocatori vedono dei nemici
 * quando i numeri restano riservati ("gravemente ferito").
 * Le soglie stanno in constants.ts: cambiarle non tocca questo codice.
 */
export function healthBandFor(hp: HitPoints | null): HealthBand {
  if (!hp || hp.max <= 0) return "UNHARMED";
  if (hp.current <= 0) return "DOWN";
  const ratio = healthRatio(hp);
  for (const { min, band } of HEALTH_BAND_THRESHOLDS) {
    if (ratio >= min) return band;
  }
  return "DOWN";
}

/** Come `healthBandFor`, ma a partire da valori sciolti. */
export function healthBandFromValues(
  current: number,
  max: number
): HealthBand {
  return healthBandFor({ current, max, temp: 0 });
}

/** Esito di una modifica agli HP: il nuovo stato e cosa è successo. */
export interface HealthChange {
  hp: HitPoints;
  band: HealthBand;
  /** Danno effettivamente inflitto agli HP correnti (temporanei esclusi). */
  applied: number;
  /** Quanto è stato assorbito dagli HP temporanei. */
  absorbed: number;
  /** Danno in eccesso oltre lo zero: serve alla morte istantanea 5e. */
  overflow: number;
  /** La pedina è passata da in piedi a zero HP con questo colpo. */
  wentDown: boolean;
  /** Il danno in eccesso raggiunge il massimo degli HP: morte immediata. */
  massiveDamage: boolean;
}

function change(
  before: HitPoints,
  hp: HitPoints,
  applied: number,
  absorbed: number,
  overflow: number
): HealthChange {
  return {
    hp,
    band: healthBandFor(hp),
    applied,
    absorbed,
    overflow,
    wentDown: before.current > 0 && hp.current === 0,
    massiveDamage: hp.max > 0 && overflow >= hp.max,
  };
}

/**
 * Applica danno. Gli HP temporanei si consumano per primi (regola 5e) e
 * non tornano: quel che resta scala gli HP correnti, che non scendono
 * sotto zero — l'eccesso viaggia in `overflow`, dove la regola della
 * morte istantanea può leggerlo.
 */
export function applyDamage(hp: HitPoints, amount: number): HealthChange {
  const before = normalizeHitPoints(hp);
  const damage = Math.max(0, toWhole(amount));

  const absorbed = Math.min(before.temp, damage);
  const rest = damage - absorbed;
  const applied = Math.min(before.current, rest);
  const overflow = rest - applied;

  return change(
    before,
    {
      current: before.current - applied,
      max: before.max,
      temp: before.temp - absorbed,
    },
    applied,
    absorbed,
    overflow
  );
}

/**
 * Applica cure. Non superano mai il massimo e non toccano i temporanei.
 * Curare una pedina a 0 HP la rialza: è la regola 5e, e il Master resta
 * comunque l'unico a poter dichiarare morta una pedina (`isDead`).
 */
export function applyHealing(hp: HitPoints, amount: number): HealthChange {
  const before = normalizeHitPoints(hp);
  const healing = Math.max(0, toWhole(amount));
  const applied = Math.min(healing, before.max - before.current);

  return change(
    before,
    { ...before, current: before.current + applied },
    applied,
    0,
    0
  );
}

/**
 * Assegna HP temporanei: NON si sommano, prevale il valore più alto
 * (regola 5e — due fonti di temporanei non si cumulano).
 */
export function applyTempHp(hp: HitPoints, amount: number): HealthChange {
  const before = normalizeHitPoints(hp);
  const temp = Math.max(before.temp, Math.max(0, toWhole(amount)));
  return change(before, { ...before, temp }, 0, 0, 0);
}

/** Imposta gli HP a un valore assoluto (correzione del Master). */
export function setHitPoints(
  hp: HitPoints,
  next: Partial<HitPoints>
): HealthChange {
  const before = normalizeHitPoints(hp);
  const after = normalizeHitPoints({ ...before, ...next });
  return change(before, after, 0, 0, 0);
}

/** Ciò che le API accettano su `…/combatants/[cid]/hp`. */
export type HealthOperation = "DAMAGE" | "HEAL" | "TEMP" | "SET";

/** Dispatcher unico: una sola strada per modificare gli HP. */
export function applyHealthOperation(
  hp: HitPoints,
  operation: HealthOperation,
  value: number
): HealthChange {
  switch (operation) {
    case "DAMAGE":
      return applyDamage(hp, value);
    case "HEAL":
      return applyHealing(hp, value);
    case "TEMP":
      return applyTempHp(hp, value);
    case "SET":
      return setHitPoints(hp, { current: Math.max(0, toWhole(value)) });
  }
}

/** True se la pedina è a terra (0 HP) ma non ancora dichiarata morta. */
export function isDown(hp: HitPoints | null): boolean {
  return Boolean(hp) && (hp as HitPoints).current <= 0;
}

/** Registra un tiro salvezza contro morte e dice se l'esito è definitivo. */
export function applyDeathSave(
  saves: DeathSaves,
  outcome: "SUCCESS" | "FAILURE",
  /** Un 1 naturale vale due fallimenti, un 20 rimette in piedi. */
  weight = 1
): { saves: DeathSaves; stabilized: boolean; dead: boolean } {
  const next: DeathSaves = {
    successes: clamp(
      saves.successes + (outcome === "SUCCESS" ? weight : 0),
      0,
      DEATH_SAVE_TARGET
    ),
    failures: clamp(
      saves.failures + (outcome === "FAILURE" ? weight : 0),
      0,
      DEATH_SAVE_TARGET
    ),
  };
  return {
    saves: next,
    stabilized: next.successes >= DEATH_SAVE_TARGET,
    dead: next.failures >= DEATH_SAVE_TARGET,
  };
}

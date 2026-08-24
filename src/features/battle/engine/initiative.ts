import type { CombatantSide, InitiativeEntry } from "@/types/battle";

/* ============================================================
 * Ordine di Iniziativa — MODULO PURO.
 *
 * L'ordine è denormalizzato dentro `battles/{id}.order`: un solo
 * documento basta a conoscere chi agisce e quando, senza query.
 * L'ordinamento deve essere DETERMINISTICO su ogni client e sul
 * server, altrimenti due schermi mostrerebbero code diverse.
 * ============================================================ */

/**
 * Priorità di fazione a parità assoluta di iniziativa e Destrezza:
 * per convenzione al tavolo, i personaggi agiscono prima dei nemici.
 */
const SIDE_RANK: Record<CombatantSide, number> = {
  PC: 0,
  ALLY: 1,
  NEUTRAL: 2,
  ENEMY: 3,
};

export function sideRank(side: CombatantSide): number {
  return SIDE_RANK[side] ?? 99;
}

/**
 * Confronto fra due voci dell'iniziativa. I criteri, in ordine:
 *  1. iniziativa più alta                       (regola base)
 *  2. modificatore di Destrezza più alto        (spareggio 5e)
 *  3. priorità manuale del Master               (la più bassa prima)
 *  4. fazione                                   (i PC prima)
 *  5. id del combattente                        (stabile e deterministico)
 *
 * Il criterio 5 non è cosmetico: garantisce che client e server
 * producano lo stesso ordine a parità di dati.
 */
export function compareInitiative(
  a: InitiativeEntry,
  b: InitiativeEntry
): number {
  if (a.initiative !== b.initiative) return b.initiative - a.initiative;
  if (a.dexMod !== b.dexMod) return b.dexMod - a.dexMod;

  const rankA = a.manualRank ?? Number.MAX_SAFE_INTEGER;
  const rankB = b.manualRank ?? Number.MAX_SAFE_INTEGER;
  if (rankA !== rankB) return rankA - rankB;

  const sideDelta = sideRank(a.side) - sideRank(b.side);
  if (sideDelta !== 0) return sideDelta;

  return a.combatantId.localeCompare(b.combatantId);
}

/** Ordine di iniziativa completo, ordinato. Non muta l'input. */
export function buildOrder(entries: InitiativeEntry[]): InitiativeEntry[] {
  return [...entries].sort(compareInitiative);
}

/** Posizione di un combattente nell'ordine; -1 se assente. */
export function indexOfCombatant(
  order: InitiativeEntry[],
  combatantId: string
): number {
  return order.findIndex((entry) => entry.combatantId === combatantId);
}

/**
 * Inserisce o aggiorna una voce e riordina: usato quando arrivano
 * rinforzi a scontro iniziato o quando il Master corregge un valore.
 */
export function upsertEntry(
  order: InitiativeEntry[],
  entry: InitiativeEntry
): InitiativeEntry[] {
  const others = order.filter((item) => item.combatantId !== entry.combatantId);
  return buildOrder([...others, entry]);
}

export function removeEntry(
  order: InitiativeEntry[],
  combatantId: string
): InitiativeEntry[] {
  return order.filter((entry) => entry.combatantId !== combatantId);
}

/**
 * Applica un riordino manuale del Master (drag della traccia).
 * Riscrive `manualRank` seguendo la sequenza indicata e allinea le
 * iniziative pari, in modo che l'ordine scelto sopravviva a un
 * successivo `buildOrder`.
 *
 * Le voci non citate in `orderedIds` restano in coda, ordinate
 * normalmente.
 */
export function applyManualOrder(
  order: InitiativeEntry[],
  orderedIds: string[]
): InitiativeEntry[] {
  const byId = new Map(order.map((entry) => [entry.combatantId, entry]));
  const sequenced: InitiativeEntry[] = [];

  orderedIds.forEach((id, index) => {
    const entry = byId.get(id);
    if (!entry) return;
    byId.delete(id);
    sequenced.push({ ...entry, manualRank: index });
  });

  // Chi non compare nella sequenza conserva il proprio posto naturale.
  const remaining = buildOrder([...byId.values()]);
  return [...sequenced, ...remaining];
}

/**
 * Ordine "grezzo" dei valori dichiarati, senza gli spareggi: utile per
 * mostrare al Master chi ha pareggiato prima che decida come sciogliere
 * il nodo.
 */
export function findTies(order: InitiativeEntry[]): InitiativeEntry[][] {
  const groups = new Map<number, InitiativeEntry[]>();
  for (const entry of order) {
    const bucket = groups.get(entry.initiative);
    if (bucket) bucket.push(entry);
    else groups.set(entry.initiative, [entry]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

/** True se ogni combattente indicato ha dichiarato la propria iniziativa. */
export function allInitiativesSet(
  combatants: { id: string; initiative: number | null }[]
): boolean {
  return combatants.every((combatant) => combatant.initiative !== null);
}

/** Combattenti che devono ancora dichiarare l'iniziativa. */
export function missingInitiative<T extends { initiative: number | null }>(
  combatants: T[]
): T[] {
  return combatants.filter((combatant) => combatant.initiative === null);
}

import { healthBandFor, healthRatio } from "@/features/battle/engine/health";
import type {
  Battle,
  Combatant,
  CombatantSecret,
  CombatantView,
  HealthBand,
  HitPoints,
} from "@/types/battle";
import type { Role } from "@/types/models";

/* ============================================================
 * Proiezione per ruolo — MODULO PURO.
 *
 * Decide cosa un dato utente vede di una data pedina. È l'UNICO punto
 * di verità sulla riservatezza: la usano sia la UI (per rendere) sia le
 * API (per decidere quali campi scrivere sul documento pubblico). Venti
 * condizioni sparse nei componenti sarebbero venti occasioni di rivelare
 * per sbaglio gli HP del Boss.
 * ============================================================ */

export interface Viewer {
  uid: string;
  role: Role;
}

/** Master della battaglia (o Admin): vede i dati riservati. */
export function canViewSecrets(viewer: Viewer, battle: Battle): boolean {
  return (
    viewer.role === "ADMIN" ||
    (viewer.role === "MASTER" && battle.masterIds.includes(viewer.uid))
  );
}

/** Chi può muovere questa pedina (a prescindere dal turno). */
export function canControlCombatant(
  combatant: Combatant,
  viewer: Viewer,
  battle: Battle
): boolean {
  if (canViewSecrets(viewer, battle)) return true;
  return (
    combatant.ownerId === viewer.uid ||
    combatant.controllerIds.includes(viewer.uid)
  );
}

/** True se è il turno di questa pedina ed è quindi lecito agire. */
export function isActingNow(combatant: Combatant, battle: Battle): boolean {
  return (
    battle.status === "ACTIVE" && battle.turn.activeCombatantId === combatant.id
  );
}

/** Salute proiettata: quanto di HP, barra e fascia arriva a chi guarda. */
function projectHealth(
  combatant: Combatant,
  secret: CombatantSecret | null,
  privileged: boolean,
  owned: boolean,
  battle: Battle
): Pick<CombatantView, "hp" | "hpRatio" | "healthBand"> {
  // Gli HP veri stanno nel documento riservato quando ce n'è uno.
  const truth: HitPoints | null = privileged
    ? (secret?.hp ?? combatant.hp)
    : combatant.hp;

  if (privileged) {
    return {
      hp: truth,
      hpRatio: truth ? healthRatio(truth) : null,
      healthBand: truth ? healthBandFor(truth) : combatant.healthBand,
    };
  }

  const isFriendly = combatant.side === "PC" || combatant.side === "ALLY";
  if (isFriendly) {
    // I compagni si guardano negli occhi: la propria pedina sempre, le
    // altre secondo la regola del tavolo.
    const visible = owned || battle.rules.revealAllyHp;
    return {
      hp: visible ? combatant.hp : null,
      hpRatio: combatant.hp ? healthRatio(combatant.hp) : null,
      healthBand: combatant.healthBand,
    };
  }

  switch (battle.rules.enemyHpDisplay) {
    case "EXACT":
      return {
        hp: combatant.hp,
        hpRatio: combatant.hp ? healthRatio(combatant.hp) : null,
        healthBand: combatant.healthBand,
      };
    case "BAR":
      return {
        hp: null,
        hpRatio: combatant.hp ? healthRatio(combatant.hp) : null,
        healthBand: combatant.healthBand,
      };
    case "BAND":
      return { hp: null, hpRatio: null, healthBand: combatant.healthBand };
    case "HIDDEN":
      // Nessuna informazione è più onesta di una fascia inventata.
      return { hp: null, hpRatio: null, healthBand: null };
  }
}

/**
 * Ciò che `viewer` vede di `combatant`. `secret` va passato solo quando
 * chi chiama ha potuto leggerlo davvero (Master): passarlo a un
 * giocatore non lo rivelerebbe comunque, ma tanto vale non caricarlo.
 */
export function projectCombatant(
  combatant: Combatant,
  secret: CombatantSecret | null,
  viewer: Viewer,
  battle: Battle
): CombatantView {
  const privileged = canViewSecrets(viewer, battle);
  const owned =
    combatant.ownerId === viewer.uid ||
    combatant.controllerIds.includes(viewer.uid);

  const health = projectHealth(combatant, secret, privileged, owned, battle);

  return {
    id: combatant.id,
    side: combatant.side,
    // Il nome vero è del Master: al tavolo la figura incappucciata resta
    // incappucciata finché non decide lui.
    name:
      privileged && secret?.realName
        ? secret.realName
        : combatant.publicName,
    tokenUrl: combatant.tokenUrl,
    size: combatant.size,
    accent: combatant.accent,
    category: combatant.category,
    position: combatant.position,
    turnState: combatant.turnState,
    isDead: combatant.isDead,
    ...health,
    conditions: combatant.conditions,
    speed: combatant.speed,
    movementUsed: combatant.movementUsed,
    initiative: combatant.initiative,
    note: privileged
      ? [combatant.publicNote, secret?.masterNotes].filter(Boolean).join("\n")
      : combatant.publicNote,
    canControl: privileged || owned,
    isPrivileged: privileged,
  };
}

/**
 * Proiezione dell'intero campo. Le pedine nascoste dal Master
 * (`visible: false`) spariscono per tutti tranne che per lui: è la base
 * dell'agguato e del fog of war.
 */
export function projectField(
  combatants: Combatant[],
  secrets: Record<string, CombatantSecret> | null,
  viewer: Viewer,
  battle: Battle
): CombatantView[] {
  const privileged = canViewSecrets(viewer, battle);
  return combatants
    .filter((combatant) => privileged || combatant.visible)
    .map((combatant) =>
      projectCombatant(
        combatant,
        secrets?.[combatant.id] ?? null,
        viewer,
        battle
      )
    );
}

/**
 * Cosa scrivere sul documento PUBBLICO di una pedina a partire dagli HP
 * veri. Le Rules filtrano documenti, non campi: se un numero finisce qui
 * è pubblico per sempre, quindi la decisione sta in un punto solo.
 */
export function publicHealthFor(
  side: Combatant["side"],
  hp: HitPoints,
  rules: Pick<Battle["rules"], "enemyHpDisplay">
): { hp: HitPoints | null; healthBand: HealthBand } {
  const band = healthBandFor(hp);
  const friendly = side === "PC" || side === "ALLY";
  // Gli alleati hanno numeri pubblici (li filtra `revealAllyHp` in lettura);
  // i nemici solo se il Master ha scelto di rivelarli.
  const exposed = friendly || rules.enemyHpDisplay === "EXACT";
  return { hp: exposed ? hp : null, healthBand: band };
}

import { FieldValue } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import type { BattleEventType } from "@/types/battle";

/* ============================================================
 * Cronaca dello scontro (append-only).
 *
 * L'id del documento è l'`actionId` generato dal client: se la rete
 * ritenta la stessa richiesta, la transazione trova l'evento già scritto
 * e non applica l'effetto una seconda volta. È l'idempotenza più
 * economica possibile — nessuna tabella di deduplica da mantenere.
 * ============================================================ */

export interface BattleEventInput {
  type: BattleEventType;
  round: number;
  turnIndex: number;
  actorUid: string;
  actorName: string;
  combatantId: string | null;
  /** Testo già pronto in italiano: la cronaca si legge, non si compone. */
  message: string;
  /** Patch inversa per l'annullamento del Master (fase 6). */
  inverse?: Record<string, unknown> | null;
  /** Evento riservato: non leggibile dai giocatori. */
  masterOnly?: boolean;
}

/** Documento evento pronto da scrivere. */
export function battleEventPayload(input: BattleEventInput) {
  return {
    type: input.type,
    round: input.round,
    turnIndex: input.turnIndex,
    actorUid: input.actorUid,
    actorName: input.actorName,
    combatantId: input.combatantId,
    message: input.message,
    inverse: input.inverse ?? null,
    masterOnly: input.masterOnly ?? false,
    at: FieldValue.serverTimestamp(),
  };
}

/** Riferimento al documento evento di una data azione. */
export function battleEventRef(battleId: string, actionId: string) {
  return getAdminDb()
    .collection(COLLECTIONS.battles)
    .doc(battleId)
    .collection("events")
    .doc(actionId);
}

/**
 * Nome con cui l'autore dell'azione compare nella cronaca.
 * Una lettura in più per riga di cronaca è un prezzo onesto: il nome
 * denormalizzato resta leggibile anche se l'account cambia in seguito.
 */
export async function actorNameFor(uid: string): Promise<string> {
  const snapshot = await getAdminDb()
    .collection(COLLECTIONS.users)
    .doc(uid)
    .get();
  return (snapshot.data()?.username as string) ?? "Ignoto";
}

import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import { formatDistance } from "@/features/battle/engine/geometry";
import {
  buildOccupancy,
  checkMove,
  remainingBudget,
} from "@/features/battle/engine/movement";
import {
  buildObstacleIndex,
  normalizeTacticalMap,
} from "@/features/battle/engine/tactical";
import {
  canControlCombatant,
  canViewSecrets,
} from "@/features/battle/engine/visibility";
import { moveCombatantSchema } from "@/features/battle/schemas";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  ApiError,
  handleApiError,
  requireUser,
} from "@/lib/server/api-helpers";
import {
  actorNameFor,
  battleEventPayload,
} from "@/lib/server/battle-events";
import type { Battle, Combatant, TerrainKind } from "@/types/battle";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; cid: string }> };

/**
 * POST /api/battles/[id]/combatants/[cid]/move — movimento validato.
 *
 * Il percorso lo ricalcola SEMPRE il server con lo stesso `engine/movement`
 * che il client usa per l'anteprima: il client propone, il server dispone.
 * Tutto avviene in una transazione, perché fra il controllo "la cella è
 * libera" e la scrittura può passare il movimento di un altro giocatore.
 *
 * Il Master non è soggetto al turno né al budget: la sua è autorità
 * narrativa (spinte, teletrasporti). Resta però tracciata nella cronaca.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id, cid } = await context.params;
    const caller = await requireUser(request);

    const parsed = moveCombatantSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(
        400,
        parsed.error.issues[0]?.message ?? "Movimento non valido"
      );
    }
    const { to, path: proposedPath, actionId, force } = parsed.data;

    const database = getAdminDb();
    const battleRef = database.collection(COLLECTIONS.battles).doc(id);
    const combatantsRef = battleRef.collection("combatants");
    const combatantRef = combatantsRef.doc(cid);
    const eventRef = battleRef.collection("events").doc(actionId);

    const actorName = await actorNameFor(caller.uid);

    const result = await database.runTransaction(async (transaction) => {
      // Un retry di rete non deve muovere due volte la stessa pedina.
      const alreadyDone = await transaction.get(eventRef);
      if (alreadyDone.exists) return { duplicate: true as const };

      const [battleSnapshot, combatantSnapshot, fieldSnapshot] =
        await Promise.all([
          transaction.get(battleRef),
          transaction.get(combatantRef),
          transaction.get(combatantsRef),
        ]);

      const battle = battleSnapshot.data() as Battle | undefined;
      const combatant = combatantSnapshot.data() as Combatant | undefined;
      if (!battle) throw new ApiError(404, "Battaglia non trovata");
      if (!combatant) throw new ApiError(404, "Pedina non trovata");

      const battleWithId: Battle = { ...battle, id };
      const combatantWithId: Combatant = { ...combatant, id: cid };
      const privileged = canViewSecrets(caller, battleWithId);

      if (!canControlCombatant(combatantWithId, caller, battleWithId)) {
        throw new ApiError(403, "Questa pedina non risponde ai tuoi ordini");
      }
      if (combatant.turnState === "REMOVED" || combatant.isDead) {
        throw new ApiError(409, "La pedina non è più sul campo");
      }
      if (!combatant.position) {
        throw new ApiError(409, "La pedina non è ancora schierata");
      }

      if (!privileged) {
        if (battle.status !== "ACTIVE") {
          throw new ApiError(409, "Lo scontro non è in corso");
        }
        if (battle.turn.activeCombatantId !== cid) {
          throw new ApiError(409, "Non è il tuo turno");
        }
      } else if (battle.status === "COMPLETED" || battle.status === "ARCHIVED") {
        throw new ApiError(409, "La battaglia è conclusa");
      }

      const others = fieldSnapshot.docs
        .filter((document) => document.id !== cid)
        .map((document) => {
          const data = document.data() as Combatant;
          return {
            id: document.id,
            position: data.position ?? null,
            size: data.size ?? 1,
            side: data.side,
            turnState: data.turnState,
            isDead: Boolean(data.isDead),
          };
        });

      const budget = remainingBudget(combatant);
      // Il Master può forzare: budget infinito e nessun vincolo di regola.
      const forced = privileged && force === true;
      // La mappa dell'editor, quando esiste, è la verità del campo.
      const tacticalMap = battle.tactical
        ? normalizeTacticalMap(battle.tactical)
        : null;

      const movement = checkMove(
        {
          grid: battle.grid,
          terrain: (battle.terrain ?? {}) as Record<string, TerrainKind>,
          tactical: tacticalMap
            ? { map: tacticalMap, obstacles: buildObstacleIndex(tacticalMap) }
            : undefined,
          occupied: buildOccupancy(others),
          mover: {
            id: cid,
            position: combatant.position,
            size: combatant.size ?? 1,
            side: combatant.side,
          },
          budget: forced ? Number.POSITIVE_INFINITY : budget,
          rules: {
            blockOccupied: battle.rules.blockOccupied,
            enforceMovement: forced ? false : battle.rules.enforceMovement,
          },
        },
        to,
        proposedPath
      );

      if (!movement.ok) {
        throw new ApiError(409, movement.reason ?? "Movimento rifiutato");
      }

      const cost = forced ? 0 : movement.cost;
      const distance = formatDistance(movement.cost, battle.grid.unit);

      transaction.update(combatantRef, {
        position: to,
        movementUsed: combatant.movementUsed + cost,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(
        eventRef,
        battleEventPayload({
          type: "COMBATANT_MOVED",
          round: battle.turn.round,
          turnIndex: battle.turn.turnIndex,
          actorUid: caller.uid,
          actorName,
          combatantId: cid,
          message: forced
            ? `${actorName} sposta ${combatant.publicName} di ${distance}`
            : `${combatant.publicName} avanza di ${distance}`,
          inverse: {
            position: combatant.position,
            movementUsed: combatant.movementUsed,
          },
        })
      );
      transaction.update(battleRef, {
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        duplicate: false as const,
        cost,
        overBudget: movement.overBudget,
        position: to,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

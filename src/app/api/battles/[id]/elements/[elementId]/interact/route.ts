import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import {
  applyOutcome,
  availableMethods,
  outcomeOf,
} from "@/features/battle/engine/elements";
import { isWithinReach } from "@/features/battle/engine/interactions";
import { normalizeTacticalMap } from "@/features/battle/engine/tactical";
import {
  canControlCombatant,
  canViewSecrets,
} from "@/features/battle/engine/visibility";
import { interactSchema } from "@/features/battle/map-schemas";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  ApiError,
  handleApiError,
  requireUser,
} from "@/lib/server/api-helpers";
import { actorNameFor, battleEventPayload } from "@/lib/server/battle-events";
import { deriveLegacyTerrain } from "@/lib/server/battle-map";
import type { Battle, Combatant } from "@/types/battle";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; elementId: string }> };

/**
 * POST /api/battles/[id]/elements/[elementId]/interact
 *
 * Apre una porta, tira una leva, sfonda una cassa: l'azione la dichiara
 * il Master in fase di configurazione, qui si esegue. Il giocatore può
 * agire solo con una pedina che controlla, nel proprio turno e a portata
 * di braccio dall'elemento — il resto lo decide il tavolo, non il codice.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id, elementId } = await context.params;
    const caller = await requireUser(request);

    const parsed = interactSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(
        400,
        parsed.error.issues[0]?.message ?? "Interazione non valida"
      );
    }
    const { interactionId, methodId, outcome, combatantId, actionId } =
      parsed.data;

    const database = getAdminDb();
    const battleRef = database.collection(COLLECTIONS.battles).doc(id);
    const eventRef = battleRef.collection("events").doc(actionId);
    const actorName = await actorNameFor(caller.uid);

    const result = await database.runTransaction(async (transaction) => {
      const alreadyDone = await transaction.get(eventRef);
      if (alreadyDone.exists) return { duplicate: true as const };

      const snapshot = await transaction.get(battleRef);
      const battle = snapshot.data() as Battle | undefined;
      if (!battle) throw new ApiError(404, "Battaglia non trovata");

      const battleWithId: Battle = { ...battle, id };
      const map = normalizeTacticalMap(battle.tactical);
      const element = map.objects.find((entry) => entry.id === elementId);
      if (!element) throw new ApiError(404, "Elemento non trovato");

      const interaction = element.interactions.find(
        (entry) => entry.id === interactionId
      );
      if (!interaction) throw new ApiError(404, "Azione non disponibile");
      if (interaction.once && interaction.used) {
        throw new ApiError(409, "Questa azione è già stata usata");
      }
      // L'azione ha senso solo negli stati previsti: una porta sfondata
      // non si scassina più.
      const states = interaction.availableStates ?? [];
      if (states.length > 0 && !states.includes(element.state)) {
        throw new ApiError(409, "Non si può fare, nello stato in cui è");
      }

      const privileged = canViewSecrets(caller, battleWithId);

      if (!privileged) {
        if (!interaction.visibleToPlayers) {
          throw new ApiError(403, "Azione riservata al Master");
        }
        if (battle.status !== "ACTIVE") {
          throw new ApiError(409, "Lo scontro non è in corso");
        }
        if (!combatantId) {
          throw new ApiError(400, "Indica con quale pedina stai agendo");
        }

        const combatantSnapshot = await transaction.get(
          battleRef.collection("combatants").doc(combatantId)
        );
        const combatant = combatantSnapshot.data() as Combatant | undefined;
        if (!combatant) throw new ApiError(404, "Pedina non trovata");

        const withId: Combatant = { ...combatant, id: combatantId };
        if (!canControlCombatant(withId, caller, battleWithId)) {
          throw new ApiError(403, "Questa pedina non risponde ai tuoi ordini");
        }
        if (battle.turn.activeCombatantId !== combatantId) {
          throw new ApiError(409, "Non è il tuo turno");
        }
        if (!combatant.position) {
          throw new ApiError(409, "La pedina non è schierata");
        }
        if (!isWithinReach(combatant.position, element)) {
          throw new ApiError(409, "Sei troppo lontano per farlo");
        }
      }

      // Metodo scelto (spallata, grimaldelli, chiave) ed esito: il tiro
      // lo fa il tavolo, il sistema applica le conseguenze dichiarate.
      const methods = availableMethods(interaction, { isMaster: privileged });
      const method =
        methods.find((entry) => entry.id === methodId) ?? methods[0] ?? null;
      const resolved = method
        ? outcomeOf(method, outcome ?? "SUCCESS")
        : null;

      const applied = applyOutcome(element, interactionId, resolved);
      const updated = applied.element;
      const nextMap = {
        ...map,
        objects: map.objects.map((entry) =>
          entry.id === elementId ? updated : entry
        ),
      };

      transaction.update(battleRef, {
        tactical: nextMap,
        // Passabilità cambiata: la proiezione legacy va rifatta, o una
        // porta aperta resterebbe un muro per il motore vecchio.
        terrain: deriveLegacyTerrain(nextMap),
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.set(
        eventRef,
        battleEventPayload({
          type: "ELEMENT_INTERACTED",
          round: battle.turn?.round ?? 0,
          turnIndex: battle.turn?.turnIndex ?? 0,
          actorUid: caller.uid,
          actorName,
          combatantId: combatantId ?? null,
          message: applied.message
            ? `${element.name}: ${applied.message}`
            : `${actorName}: ${interaction.label} — ${element.name}`,
          masterOnly: resolved?.alertsMaster ?? false,
        })
      );

      return {
        duplicate: false as const,
        state: updated.state,
        message: applied.message,
        outcome: resolved,
        method: method?.label ?? null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

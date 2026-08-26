import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import { battleStateSchema } from "@/features/battle/schemas";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  ApiError,
  handleApiError,
  requireBattleMaster,
} from "@/lib/server/api-helpers";
import type { BattleStatus, TurnState } from "@/types/battle";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Stati che presuppongono uno scontro già avviato (ordine costruito). */
const REQUIRES_STARTED: BattleStatus[] = ["ACTIVE", "PAUSED", "COMPLETED"];

/**
 * POST /api/battles/[id]/state — cambio di stato manuale del Master.
 *
 * Qui passano le transizioni che non richiedono elaborazione: la coppia
 * DRAFT ⇄ READY della preparazione e l'archiviazione. L'apertura al party
 * (LOBBY) e il primo avvio (ACTIVE) hanno rotte proprie — /publish e
 * /start — perché validano la mappa e costruiscono l'ordine di iniziativa.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { battle } = await requireBattleMaster(request, id);

    const parsed = battleStateSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(
        400,
        parsed.error.issues[0]?.message ?? "Stato non valido"
      );
    }
    const { status } = parsed.data;
    const current = battle.status as BattleStatus;
    const turn = (battle.turn ?? { round: 0 }) as TurnState;

    if (status === current) return NextResponse.json({ id, status });

    // Non si torna in bozza una battaglia che il party ha già visto:
    // sparirebbe dagli elenchi sotto gli occhi dei giocatori.
    if (status === "DRAFT" && current !== "READY") {
      throw new ApiError(409, "Solo una battaglia pronta può tornare in bozza");
    }
    if (status === "READY" && current !== "DRAFT") {
      throw new ApiError(
        409,
        "Lo stato 'pronta' si raggiunge dalla preparazione"
      );
    }
    if (REQUIRES_STARTED.includes(status) && turn.round < 1) {
      throw new ApiError(
        409,
        "Lo scontro non è ancora iniziato: aprilo al party e avvialo"
      );
    }

    const updates: Record<string, unknown> = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (status === "COMPLETED") updates.endedAt = FieldValue.serverTimestamp();

    await getAdminDb().collection(COLLECTIONS.battles).doc(id).update(updates);

    return NextResponse.json({ id, status });
  } catch (error) {
    return handleApiError(error);
  }
}

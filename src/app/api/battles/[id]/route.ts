import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import { updateBattleSchema } from "@/features/battle/schemas";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  ApiError,
  handleApiError,
  requireBattleMaster,
} from "@/lib/server/api-helpers";
import {
  BATTLE_EDITABLE_STATUSES,
  type BattleStatus,
  type TerrainKind,
} from "@/types/battle";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Stati in cui la battaglia è archiviata: sola lettura, nessuna modifica. */
const FROZEN_STATUSES: BattleStatus[] = ["COMPLETED", "ARCHIVED"];

/** Campi che ridisegnano il campo: consentiti solo prima dello schieramento. */
const LAYOUT_FIELDS = ["grid", "background"] as const;

/**
 * PATCH /api/battles/[id] — configurazione della mappa (Master della
 * battaglia). Griglia e sfondo si toccano solo in DRAFT/READY: cambiarli
 * a pedine schierate sposterebbe tutti sotto i piedi dei giocatori.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { battle } = await requireBattleMaster(request, id);

    const parsed = updateBattleSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(
        400,
        parsed.error.issues[0]?.message ?? "Dati non validi"
      );
    }
    const values = parsed.data;
    const status = battle.status as BattleStatus;

    if (FROZEN_STATUSES.includes(status)) {
      throw new ApiError(
        409,
        "La battaglia è conclusa: riaprila per poterla modificare"
      );
    }
    if (
      !BATTLE_EDITABLE_STATUSES.includes(status) &&
      LAYOUT_FIELDS.some((field) => values[field] !== undefined)
    ) {
      throw new ApiError(
        409,
        "Griglia e sfondo si modificano solo in preparazione"
      );
    }

    const { terrain, ...rest } = values;
    const updates: Record<string, unknown> = {
      ...rest,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Il terreno arriva come patch sparsa ("3,4": "WALL", "5,5": null):
    // si fondono solo le celle toccate dal pennello, mai l'intera mappa.
    if (terrain) {
      const current = (battle.terrain ?? {}) as Record<string, TerrainKind>;
      const merged = { ...current };
      for (const [key, kind] of Object.entries(terrain)) {
        if (kind === null) delete merged[key];
        else merged[key] = kind;
      }
      updates.terrain = merged;
    }

    await getAdminDb()
      .collection(COLLECTIONS.battles)
      .doc(id)
      .update(updates);

    return NextResponse.json({ id });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/battles/[id] — elimina la battaglia e TUTTE le sue
 * sottocollezioni (combattenti, segreti, eventi, presenze). Senza la
 * cancellazione ricorsiva resterebbero documenti orfani irraggiungibili.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { battle } = await requireBattleMaster(request, id);

    if ((battle.status as BattleStatus) === "ACTIVE") {
      throw new ApiError(
        409,
        "Non si elimina una battaglia in corso: mettila in pausa o concludila"
      );
    }

    const database = getAdminDb();
    await database.recursiveDelete(
      database.collection(COLLECTIONS.battles).doc(id)
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

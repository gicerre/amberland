import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import { saveMapSchema } from "@/features/battle/map-schemas";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  ApiError,
  handleApiError,
  requireBattleMaster,
} from "@/lib/server/api-helpers";
import { deriveLegacyTerrain } from "@/lib/server/battle-map";
import type { Battle } from "@/types/battle";
import type { TacticalMap } from "@/types/battlemap";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Limite di sicurezza sul documento Firestore (il massimo vero è 1 MB). */
const MAX_MAP_BYTES = 700_000;

/**
 * PUT /api/battles/[id]/map — salva l'intera mappa tattica.
 *
 * L'editor tiene la mappa in memoria e la invia per intero: è la sola
 * strategia che rende annulla/ripristina sensato lato client. La
 * conseguenza è dichiarata: se due Master modificano la stessa mappa
 * insieme, vince l'ultimo che salva.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { battle } = await requireBattleMaster(request, id);

    const parsed = saveMapSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(
        400,
        parsed.error.issues[0]?.message ?? "Mappa non valida"
      );
    }
    const { map, grid } = parsed.data;

    const size = JSON.stringify(map).length;
    if (size > MAX_MAP_BYTES) {
      throw new ApiError(
        413,
        "La mappa è troppo pesante: riduci le celle modificate o gli elementi"
      );
    }

    const status = (battle as Battle).status;
    if (status === "COMPLETED" || status === "ARCHIVED") {
      throw new ApiError(409, "La battaglia è conclusa: la mappa è in sola lettura");
    }

    const updates: Record<string, unknown> = {
      tactical: map,
      terrain: deriveLegacyTerrain(map as TacticalMap),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (grid) {
      updates["grid.cols"] = grid.cols;
      updates["grid.rows"] = grid.rows;
    }

    await getAdminDb().collection(COLLECTIONS.battles).doc(id).update(updates);

    return NextResponse.json({ id, bytes: size });
  } catch (error) {
    return handleApiError(error);
  }
}

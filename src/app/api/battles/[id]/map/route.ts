import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import { saveMapSchema } from "@/features/battle/map-schemas";
import { LEGACY_TERRAIN_MAP } from "@/features/battle/terrain";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  ApiError,
  handleApiError,
  requireBattleMaster,
} from "@/lib/server/api-helpers";
import type { Battle, TerrainKind } from "@/types/battle";
import type { TacticalMap } from "@/types/battlemap";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Limite di sicurezza sul documento Firestore (il massimo vero è 1 MB). */
const MAX_MAP_BYTES = 700_000;

/**
 * Proiezione verso il modello legacy: `Battle.terrain` conosce sei tipi
 * e continua a servire il motore di movimento delle battaglie create
 * prima dell'editor. La verità resta `tactical.cells`; questo è solo un
 * riflesso, ricalcolato a ogni salvataggio.
 */
function deriveLegacyTerrain(map: TacticalMap): Record<string, TerrainKind> {
  const terrain: Record<string, TerrainKind> = {};
  for (const [key, cell] of Object.entries(map.cells)) {
    const legacy = LEGACY_TERRAIN_MAP[cell.terrain] ?? "NORMAL";
    if (legacy === "NORMAL") continue;
    terrain[key] = legacy as TerrainKind;
  }
  // Anche gli oggetti che sbarrano il passo diventano muri per il
  // vecchio modello: senza, una porta chiusa sarebbe attraversabile.
  for (const object of map.objects) {
    if (!object.blocksMovement) continue;
    if (object.state === "OPEN" || object.state === "BROKEN") continue;
    for (const key of object.cells) terrain[key] = "WALL";
  }
  return terrain;
}

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

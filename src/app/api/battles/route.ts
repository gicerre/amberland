import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import { createBattleSchema } from "@/features/battle/schemas";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  ApiError,
  handleApiError,
  requireMaster,
} from "@/lib/server/api-helpers";
import {
  DEFAULT_BATTLE_RULES,
  DEFAULT_CAMPAIGN_ID,
  DEFAULT_GRID,
  EMPTY_BATTLE_LINKS,
  EMPTY_TURN_STATE,
} from "@/types/battle";

export const runtime = "nodejs";

/**
 * POST /api/battles — crea una battaglia in stato DRAFT (solo Master).
 *
 * Nessun client scrive su `battles/**` (le Rules lo vietano): ogni
 * mutazione passa da qui con l'Admin SDK. Il documento nasce completo di
 * tutti i campi, così il resto del codice non deve mai difendersi da
 * proprietà mancanti.
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await requireMaster(request);

    const parsed = createBattleSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(
        400,
        parsed.error.issues[0]?.message ?? "Dati non validi"
      );
    }
    const { name, description, grid, rules, links, masterIds } = parsed.data;

    // Il creatore è sempre fra i Master della battaglia; i co-DM si
    // aggiungono senza poterlo escludere.
    const masters = [...new Set([caller.uid, ...(masterIds ?? [])])];

    const reference = await getAdminDb()
      .collection(COLLECTIONS.battles)
      .add({
        name,
        description: description ?? "",
        status: "DRAFT",
        campaignId: DEFAULT_CAMPAIGN_ID,
        masterIds: masters,
        createdBy: caller.uid,
        grid: { ...DEFAULT_GRID, ...grid },
        background: null,
        order: [],
        turn: EMPTY_TURN_STATE,
        rules: { ...DEFAULT_BATTLE_RULES, ...rules },
        terrain: {},
        links: { ...EMPTY_BATTLE_LINKS, ...links },
        startedAt: null,
        endedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ id: reference.id }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

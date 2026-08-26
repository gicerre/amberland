import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import {
  COMBATANT_SIDE_ACCENT,
  DUPLICATE_ACCENTS,
  ENEMY_CATEGORY_ACCENT,
  duplicateSuffix,
} from "@/features/battle/constants";
import { normalizeHitPoints } from "@/features/battle/engine/health";
import { autoPlace, buildOccupancy } from "@/features/battle/engine/movement";
import { publicHealthFor } from "@/features/battle/engine/visibility";
import { createCombatantSchema } from "@/features/battle/schemas";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  ApiError,
  handleApiError,
  requireBattleMaster,
} from "@/lib/server/api-helpers";
import {
  BATTLE_LIMITS,
  type Battle,
  type Combatant,
  type CombatantSide,
  type EnemyCategory,
  type Position,
  type TerrainKind,
} from "@/types/battle";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Anello del token: la categoria se c'è, altrimenti la fazione. */
function defaultAccent(
  side: CombatantSide,
  category: EnemyCategory | null | undefined
): string {
  return category
    ? ENEMY_CATEGORY_ACCENT[category]
    : COMBATANT_SIDE_ACCENT[side];
}

/**
 * POST /api/battles/[id]/combatants — crea 1..N pedine (solo Master).
 *
 * Con `count: 8` nascono otto documenti "Goblin A"…"Goblin H", con anelli
 * di colore diverso e posizioni libere attorno alla cella scelta: al
 * tavolo si piazza un branco, non otto creature una per volta.
 *
 * Gli HP veri finiscono SEMPRE nel documento riservato
 * `combatants/{cid}/secret/master`; sul documento pubblico arriva solo
 * ciò che `publicHealthFor` autorizza.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { battle } = await requireBattleMaster(request, id);

    const parsed = createCombatantSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(
        400,
        parsed.error.issues[0]?.message ?? "Dati non validi"
      );
    }
    const values = parsed.data;
    const count = values.count ?? 1;
    const size = values.size ?? 1;

    const database = getAdminDb();
    const battleRef = database.collection(COLLECTIONS.battles).doc(id);
    const combatantsRef = battleRef.collection("combatants");

    const existing = await combatantsRef.get();
    if (existing.size + count > BATTLE_LIMITS.maxCombatants) {
      throw new ApiError(
        409,
        `Il campo non regge più di ${BATTLE_LIMITS.maxCombatants} pedine`
      );
    }

    // Posizioni: dalla cella indicata in fuori, saltando ciò che è occupato.
    let positions: (Position | null)[] = Array.from({ length: count }, () => null);
    if (values.position) {
      const occupied = buildOccupancy(
        existing.docs.map((document) => {
          const data = document.data() as Combatant;
          return {
            id: document.id,
            position: data.position ?? null,
            size: data.size ?? 1,
            side: data.side,
            turnState: data.turnState,
            isDead: Boolean(data.isDead),
          };
        })
      );
      const placed = autoPlace(values.position, count, {
        grid: (battle as Battle).grid,
        terrain: ((battle as Battle).terrain ?? {}) as Record<string, TerrainKind>,
        occupied,
        size,
      });
      if (placed.length === 0) {
        throw new ApiError(409, "Nessuna cella libera attorno a quel punto");
      }
      positions = Array.from({ length: count }, (_unused, index) => placed[index] ?? null);
    }

    const rules = (battle as Battle).rules;
    const batch = database.batch();
    const created: string[] = [];

    for (let index = 0; index < count; index++) {
      const reference = combatantsRef.doc();
      const publicName =
        count > 1
          ? `${values.publicName} ${duplicateSuffix(index)}`
          : values.publicName;

      const hp = normalizeHitPoints({
        max: values.secret?.hp?.max ?? 0,
        current: values.secret?.hp?.current ?? values.secret?.hp?.max ?? 0,
        temp: values.secret?.hp?.temp ?? 0,
      });
      const shown = publicHealthFor(values.side, hp, rules);

      batch.set(reference, {
        battleId: id,
        side: values.side,
        publicName,
        tokenUrl: values.tokenUrl ?? "",
        size,
        accent:
          values.accent ??
          (count > 1
            ? DUPLICATE_ACCENTS[index % DUPLICATE_ACCENTS.length]
            : defaultAccent(values.side, values.category)),
        sourceEntityId: values.sourceEntityId ?? null,
        ownerId: values.ownerId ?? null,
        controllerIds: [],
        category: values.category ?? null,
        position: positions[index] ?? null,
        speed: values.speed ?? 9,
        movementUsed: 0,
        initiative: values.initiative ?? null,
        dexMod: values.dexMod ?? 0,
        turnState: "WAITING",
        conditions: [],
        hp: shown.hp,
        healthBand: shown.healthBand,
        isDead: false,
        deathSaves: null,
        publicNote: values.publicNote ?? "",
        visible: values.visible ?? true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      batch.set(reference.collection("secret").doc("master"), {
        realName: values.secret?.realName ?? "",
        hp,
        armorClass: values.secret?.armorClass ?? 10,
        statBlock: null,
        sourceSnapshot: null,
        masterNotes: values.secret?.masterNotes ?? "",
        tactics: values.secret?.tactics ?? "",
        lootPreview: values.secret?.lootPreview ?? "",
      });

      created.push(reference.id);
    }

    batch.update(battleRef, { updatedAt: FieldValue.serverTimestamp() });
    await batch.commit();

    return NextResponse.json({ ids: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import { normalizeHitPoints } from "@/features/battle/engine/health";
import { buildOccupancy } from "@/features/battle/engine/movement";
import { publicHealthFor } from "@/features/battle/engine/visibility";
import { updateCombatantSchema } from "@/features/battle/schemas";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  ApiError,
  handleApiError,
  requireBattleMaster,
} from "@/lib/server/api-helpers";
import {
  type Battle,
  type Combatant,
  type CombatantSecret,
  type HitPoints,
} from "@/types/battle";
import { footprint, cellKey, isInsideGrid } from "@/features/battle/engine/geometry";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; cid: string }> };

/**
 * PATCH /api/battles/[id]/combatants/[cid] — modifica una pedina
 * (solo Master: i giocatori toccano la propria solo tramite /move,
 * /hp e la lobby, dove le regole del turno sono verificate).
 *
 * Gli HP viaggiano dentro `secret`: il documento pubblico riceve solo
 * ciò che `publicHealthFor` autorizza, così un colpo di mouse del Master
 * non rivela per sbaglio i punti ferita del Boss.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id, cid } = await context.params;
    const { battle } = await requireBattleMaster(request, id);

    const parsed = updateCombatantSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(
        400,
        parsed.error.issues[0]?.message ?? "Dati non validi"
      );
    }
    const { secret, position, ...values } = parsed.data;

    const database = getAdminDb();
    const combatantRef = database
      .collection(COLLECTIONS.battles)
      .doc(id)
      .collection("combatants")
      .doc(cid);
    const secretRef = combatantRef.collection("secret").doc("master");

    const [snapshot, secretSnapshot] = await Promise.all([
      combatantRef.get(),
      secretRef.get(),
    ]);
    const current = snapshot.data() as Combatant | undefined;
    if (!current) throw new ApiError(404, "Pedina non trovata");

    const updates: Record<string, unknown> = {
      ...values,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // La posizione la valida il campo: fuori griglia o sopra un'altra
    // pedina non si sta, nemmeno per volere del Master.
    if (position !== undefined) {
      if (position === null) {
        updates.position = null;
      } else {
        const size = values.size ?? current.size ?? 1;
        const grid = (battle as Battle).grid;
        const others = await combatantRef.parent.get();
        const occupied = buildOccupancy(
          others.docs
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
            })
        );
        for (const cell of footprint(position, size)) {
          if (!isInsideGrid(cell, grid)) {
            throw new ApiError(400, "La pedina finirebbe fuori dal campo");
          }
          if (occupied.has(cellKey(cell))) {
            throw new ApiError(409, "Quella cella è già occupata");
          }
        }
        updates.position = position;
      }
    }

    // Gli HP: verità nel documento riservato, riflesso pubblico filtrato.
    if (secret) {
      const stored = secretSnapshot.data() as CombatantSecret | undefined;
      const secretUpdates: Record<string, unknown> = { ...secret };

      if (secret.hp) {
        const merged: HitPoints = normalizeHitPoints({
          ...(stored?.hp ?? { current: 0, max: 0, temp: 0 }),
          ...secret.hp,
        });
        secretUpdates.hp = merged;
        const shown = publicHealthFor(
          (values.side ?? current.side),
          merged,
          (battle as Battle).rules
        );
        updates.hp = shown.hp;
        updates.healthBand = shown.healthBand;
      }

      await secretRef.set(secretUpdates, { merge: true });
    }

    await combatantRef.update(updates);
    return NextResponse.json({ id: cid });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/battles/[id]/combatants/[cid] — toglie la pedina dal campo
 * insieme ai suoi dati riservati, e la depenna dall'ordine di iniziativa.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id, cid } = await context.params;
    const { battle } = await requireBattleMaster(request, id);

    const database = getAdminDb();
    const battleRef = database.collection(COLLECTIONS.battles).doc(id);
    const combatantRef = battleRef.collection("combatants").doc(cid);

    // `recursiveDelete` porta via anche `secret/master`: senza, resterebbe
    // un documento riservato orfano e irraggiungibile.
    await database.recursiveDelete(combatantRef);

    const order = ((battle as Battle).order ?? []).filter(
      (entry) => entry.combatantId !== cid
    );
    const turn = (battle as Battle).turn;
    await battleRef.update({
      order,
      // Se ad andarsene è chi aveva il turno, l'arbitro resta senza attore:
      // lo si azzera e il Master farà avanzare il turno.
      ...(turn?.activeCombatantId === cid
        ? { "turn.activeCombatantId": null }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

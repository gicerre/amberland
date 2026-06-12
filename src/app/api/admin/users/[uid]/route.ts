import { NextResponse, type NextRequest } from "next/server";

import { updateUserSchema } from "@/features/users/schemas";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  ApiError,
  handleApiError,
  requireAdmin,
  toAdminUserDto,
} from "@/lib/server/api-helpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ uid: string }> };

/**
 * PATCH /api/admin/users/[uid] — aggiorna ruolo, password,
 * blocco o flag di cambio password (solo ADMIN).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const caller = await requireAdmin(request);
    const { uid } = await context.params;

    const parsed = updateUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(
        400,
        parsed.error.issues[0]?.message ?? "Dati non validi"
      );
    }
    const { role, password, disabled, mustChangePassword } = parsed.data;

    if (caller.uid === uid && (role !== undefined || disabled !== undefined)) {
      throw new ApiError(
        400,
        "Non puoi modificare il tuo ruolo né bloccare il tuo stesso account"
      );
    }

    const adminAuth = getAdminAuth();
    const userRef = getAdminDb().collection(COLLECTIONS.users).doc(uid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) throw new ApiError(404, "Utente non trovato");

    const authUpdates: { password?: string; disabled?: boolean } = {};
    if (password) authUpdates.password = password;
    if (disabled !== undefined) authUpdates.disabled = disabled;
    if (Object.keys(authUpdates).length > 0) {
      await adminAuth.updateUser(uid, authUpdates);
    }
    if (password) {
      // Invalida le sessioni attive dopo un reset password
      await adminAuth.revokeRefreshTokens(uid);
    }
    if (role) {
      await adminAuth.setCustomUserClaims(uid, { role });
    }

    const docUpdates: Record<string, unknown> = {};
    if (role) docUpdates.role = role;
    if (disabled !== undefined) docUpdates.disabled = disabled;
    if (password) {
      // Dopo un reset deciso dall'admin, il cambio al prossimo accesso è obbligatorio
      docUpdates.mustChangePassword = mustChangePassword ?? true;
    } else if (mustChangePassword !== undefined) {
      docUpdates.mustChangePassword = mustChangePassword;
    }
    if (Object.keys(docUpdates).length > 0) {
      await userRef.update(docUpdates);
    }

    const fresh = await userRef.get();
    return NextResponse.json(toAdminUserDto(fresh.id, fresh.data()));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/users/[uid] — elimina account, profilo
 * e area personale (solo ADMIN, non su sé stessi).
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const caller = await requireAdmin(request);
    const { uid } = await context.params;

    if (caller.uid === uid) {
      throw new ApiError(400, "Non puoi eliminare il tuo stesso account");
    }

    await getAdminAuth()
      .deleteUser(uid)
      .catch((error: { code?: string }) => {
        if (error?.code !== "auth/user-not-found") throw error;
      });

    const db = getAdminDb();
    await db.collection(COLLECTIONS.users).doc(uid).delete();
    await db.collection(COLLECTIONS.personalAreas).doc(uid).delete();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

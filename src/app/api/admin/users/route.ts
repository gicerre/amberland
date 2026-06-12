import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";

import { createUserSchema } from "@/features/users/schemas";
import { AUTH_EMAIL_DOMAIN, COLLECTIONS } from "@/lib/constants";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  ApiError,
  handleApiError,
  requireAdmin,
  toAdminUserDto,
} from "@/lib/server/api-helpers";

export const runtime = "nodejs";

/** GET /api/admin/users — elenco completo degli account (solo ADMIN). */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const snapshot = await getAdminDb()
      .collection(COLLECTIONS.users)
      .orderBy("username")
      .get();
    return NextResponse.json(
      snapshot.docs.map((document) => toAdminUserDto(document.id, document.data()))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/users — crea un account (solo ADMIN).
 * Lo username è univoco (mappato sull'email Firebase) e il nuovo
 * utente dovrà cambiare la password al primo accesso.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const parsed = createUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(
        400,
        parsed.error.issues[0]?.message ?? "Dati non validi"
      );
    }

    const username = parsed.data.username.toLowerCase();
    const email = `${username}@${AUTH_EMAIL_DOMAIN}`;
    const adminAuth = getAdminAuth();

    const existing = await adminAuth.getUserByEmail(email).catch(() => null);
    if (existing) throw new ApiError(409, "Nome utente già in uso nel regno");

    const userRecord = await adminAuth.createUser({
      email,
      password: parsed.data.password,
      displayName: username,
    });
    // Il ruolo nei custom claims è ciò che le Security Rules verificano
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: parsed.data.role,
    });

    const userRef = getAdminDb()
      .collection(COLLECTIONS.users)
      .doc(userRecord.uid);
    await userRef.set({
      username,
      role: parsed.data.role,
      disabled: false,
      mustChangePassword: true,
      createdAt: FieldValue.serverTimestamp(),
      lastLogin: null,
    });

    const fresh = await userRef.get();
    return NextResponse.json(toAdminUserDto(fresh.id, fresh.data()), {
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

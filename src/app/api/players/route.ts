import { NextResponse, type NextRequest } from "next/server";

import { COLLECTIONS } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import { handleApiError, requireMaster } from "@/lib/server/api-helpers";

export const runtime = "nodejs";

/**
 * GET /api/players — roster minimale dei giocatori (id + username) per
 * MASTER e ADMIN, usato per assegnare un PC al suo proprietario e per
 * mostrarne il nome. Non espone dati sensibili degli account.
 */
export async function GET(request: NextRequest) {
  try {
    await requireMaster(request);
    const snapshot = await getAdminDb()
      .collection(COLLECTIONS.users)
      .where("role", "==", "PLAYER")
      .orderBy("username")
      .get();
    return NextResponse.json(
      snapshot.docs.map((document) => ({
        id: document.id,
        username: (document.data().username as string) ?? "",
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

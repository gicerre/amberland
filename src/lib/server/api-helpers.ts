import { NextResponse, type NextRequest } from "next/server";

import { getAdminAuth } from "@/lib/firebase/admin";
import type { AdminUserDto, Role } from "@/types/models";

/** Errore applicativo con status HTTP, da lanciare nei route handler. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Chiamante autenticato: uid e ruolo letti dai custom claims. */
export interface Caller {
  uid: string;
  role: Role;
}

/**
 * Verifica il Bearer token Firebase del chiamante e ne restituisce
 * identità e ruolo, senza pretendere alcun privilegio: è la base su cui
 * si appoggiano tutti i controlli più stretti.
 */
export async function requireUser(request: NextRequest): Promise<Caller> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "Autenticazione richiesta");

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    throw new ApiError(401, "Sessione non valida o scaduta");
  }

  return { uid: decoded.uid, role: (decoded.role as Role) ?? "VISITOR" };
}

/**
 * Richiede uno fra i ruoli indicati (ADMIN è sempre ammesso: il Custode
 * del Regno può fare tutto ciò che può un Master).
 */
export async function requireRole(
  request: NextRequest,
  roles: Role[],
  message = "Permessi insufficienti"
): Promise<Caller> {
  const caller = await requireUser(request);
  if (caller.role !== "ADMIN" && !roles.includes(caller.role)) {
    throw new ApiError(403, message);
  }
  return caller;
}

/**
 * Verifica il Bearer token Firebase del chiamante e richiede
 * il ruolo ADMIN (letto dai custom claims).
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ uid: string }> {
  const caller = await requireUser(request);
  if (caller.role !== "ADMIN") {
    throw new ApiError(403, "Operazione riservata agli amministratori");
  }
  return { uid: caller.uid };
}

/**
 * Come requireAdmin, ma accetta anche il ruolo MASTER (ADMIN incluso).
 * Usato dalle operazioni di gestione contenuti, es. assegnare un PC.
 */
export async function requireMaster(
  request: NextRequest
): Promise<{ uid: string; role: Role }> {
  return requireRole(
    request,
    ["MASTER"],
    "Operazione riservata al Dungeon Master"
  );
}

/** Converte errori in risposte JSON coerenti ({ error: string }). */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[api]", error);
  const message =
    error instanceof Error ? error.message : "Errore interno del server";
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Mappa un documento `users` (Admin SDK) nel DTO JSON-safe esposto dalle API. */
export function toAdminUserDto(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined
): AdminUserDto {
  return {
    id,
    username: (data?.username as string) ?? "",
    role: ((data?.role as Role) ?? "PLAYER") as Role,
    disabled: Boolean(data?.disabled),
    mustChangePassword: Boolean(data?.mustChangePassword),
    createdAt: data?.createdAt?.toMillis?.() ?? null,
    lastLogin: data?.lastLogin?.toMillis?.() ?? null,
  };
}

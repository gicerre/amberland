import {
  cert,
  getApps as getAdminApps,
  initializeApp as initializeAdminApp,
  type App,
} from "firebase-admin/app";
import { getAuth as getAdminAuthSdk } from "firebase-admin/auth";
import { getFirestore as getAdminFirestoreSdk } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK — SOLO lato server (API routes / script).
 * Inizializzazione pigra: le credenziali servono solo quando
 * un'API admin viene effettivamente invocata.
 */

let cachedApp: App | null = null;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getAdminApps();
  if (existing.length > 0) {
    cachedApp = existing[0]!;
    return cachedApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Credenziali Firebase Admin mancanti: configura FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY in .env.local"
    );
  }

  cachedApp = initializeAdminApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return cachedApp;
}

export function getAdminAuth() {
  return getAdminAuthSdk(getAdminApp());
}

export function getAdminDb() {
  return getAdminFirestoreSdk(getAdminApp());
}

import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

/**
 * Inizializzazione del Firebase Web SDK (lato client).
 * I valori vengono da .env.local — vedi .env.local.example.
 */
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!apiKey && typeof window !== "undefined") {
  // Configurazione incompleta: l'app si carica ma l'autenticazione fallirà.
  console.error(
    "[Amberland] NEXT_PUBLIC_FIREBASE_API_KEY mancante: configura .env.local con i valori della tua Web App Firebase."
  );
}

const firebaseConfig = {
  // Fallback non vuoto: evita che getAuth lanci 'auth/invalid-api-key' a
  // import-time durante il build/prerender quando l'env non è configurata.
  // Con la chiave reale presente, questo ramo non viene mai usato.
  apiKey: apiKey || "amberland-missing-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/** True se l'app è realmente configurata (chiave Web presente). */
export const isFirebaseConfigured = Boolean(apiKey);

// Collegamento agli emulatori locali (solo se esplicitamente abilitato)
if (
  process.env.NEXT_PUBLIC_USE_EMULATORS === "true" &&
  typeof window !== "undefined"
) {
  const globalFlags = globalThis as { __amberlandEmulators?: boolean };
  if (!globalFlags.__amberlandEmulators) {
    globalFlags.__amberlandEmulators = true;
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  }
}

export default app;

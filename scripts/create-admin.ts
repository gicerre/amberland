/**
 * Seed del primo amministratore di Amberland.
 *
 * Uso:
 *   npm run seed:admin                          → legge SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD da .env.local
 *   npm run seed:admin -- nomeutente password   → argomenti da riga di comando
 *
 * Idempotente: se l'utente esiste già ne aggiorna password, claims e profilo.
 */
import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });
config();

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const username = (
  process.argv[2] ??
  process.env.SEED_ADMIN_USERNAME ??
  ""
).toLowerCase();
const password = process.argv[3] ?? process.env.SEED_ADMIN_PASSWORD ?? "";

if (!USERNAME_REGEX.test(username)) {
  fail(
    "Username non valido (3-20 caratteri: lettere, numeri o underscore). Imposta SEED_ADMIN_USERNAME o passa l'argomento."
  );
}
if (password.length < 8) {
  fail(
    "Password troppo corta (minimo 8 caratteri). Imposta SEED_ADMIN_PASSWORD o passa l'argomento."
  );
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n"
);

if (!projectId || !clientEmail || !privateKey) {
  fail(
    "Credenziali Firebase Admin mancanti: configura FIREBASE_ADMIN_* in .env.local (vedi .env.local.example)."
  );
}

const app =
  getApps()[0] ??
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const auth = getAuth(app);
const db = getFirestore(app);

const emailDomain = process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN ?? "amberland.app";
const email = `${username}@${emailDomain}`;

async function main() {
  const existing = await auth.getUserByEmail(email).catch(() => null);

  const uid = existing
    ? (await auth.updateUser(existing.uid, { password, disabled: false })).uid
    : (
        await auth.createUser({ email, password, displayName: username })
      ).uid;

  await auth.setCustomUserClaims(uid, { role: "ADMIN" });

  await db.collection("users").doc(uid).set(
    {
      username,
      role: "ADMIN",
      disabled: false,
      // L'admin ha scelto personalmente questa password: nessun cambio forzato
      mustChangePassword: false,
      ...(existing ? {} : { createdAt: FieldValue.serverTimestamp(), lastLogin: null }),
    },
    { merge: true }
  );

  console.log("\n════════════════════════════════════════════");
  console.log("  ⚔  AMBERLAND — Custode del Regno pronto");
  console.log("════════════════════════════════════════════");
  console.log(`  Username : ${username}`);
  console.log(`  Ruolo    : ADMIN`);
  console.log(`  Stato    : ${existing ? "aggiornato" : "creato"}`);
  console.log("════════════════════════════════════════════\n");
  console.log("Accedi su /login e custodisci bene la password.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

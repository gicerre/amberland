/**
 * Seed degli account iniziali di Amberland (Admin SDK).
 *
 *   admin           → ruolo ADMIN  (superuser dell'applicativo)
 *   dungeon-master  → ruolo MASTER (gestione contenuti) — modificabile
 *
 * Ogni account riceve una password temporanea sicura e dovrà cambiarla al
 * primo accesso (mustChangePassword = true). Le credenziali vengono stampate
 * a fine esecuzione: annotale e comunicale a chi di dovere.
 *
 * Uso:
 *   npm run seed:users                  → dungeon-master con ruolo MASTER
 *   npm run seed:users -- ADMIN         → dungeon-master con ruolo ADMIN
 *   SEED_DM_USERNAME=... npm run seed:users
 *
 * Idempotente: rilanciandolo aggiorna gli account esistenti (e rigenera le
 * password temporanee).
 */
import { randomInt } from "node:crypto";

import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });
config();

const ROLES = ["ADMIN", "MASTER", "PLAYER"] as const;
type Role = (typeof ROLES)[number];

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** Password temporanea leggibile (senza caratteri ambigui). */
function tempPassword(length = 14): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += charset[randomInt(charset.length)];
  return out;
}

const dmRoleArg = (process.argv[2] ?? process.env.SEED_DM_ROLE ?? "MASTER")
  .toUpperCase()
  .trim();
if (!ROLES.includes(dmRoleArg as Role)) {
  fail(`Ruolo dungeon-master non valido: "${dmRoleArg}". Usa ADMIN, MASTER o PLAYER.`);
}

const accounts: { username: string; role: Role }[] = [
  { username: (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase(), role: "ADMIN" },
  {
    username: (process.env.SEED_DM_USERNAME ?? "dungeon-master").toLowerCase(),
    role: dmRoleArg as Role,
  },
];

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

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

async function upsert(username: string, role: Role) {
  const email = `${username}@${emailDomain}`;
  const password = tempPassword();

  const existing = await auth.getUserByEmail(email).catch(() => null);
  const uid = existing
    ? (await auth.updateUser(existing.uid, { password, disabled: false })).uid
    : (await auth.createUser({ email, password, displayName: username })).uid;

  await auth.setCustomUserClaims(uid, { role });

  await db.collection("users").doc(uid).set(
    {
      username,
      role,
      disabled: false,
      mustChangePassword: true,
      ...(existing
        ? {}
        : { createdAt: FieldValue.serverTimestamp(), lastLogin: null }),
    },
    { merge: true }
  );

  return { username, password, role, created: !existing };
}

async function main() {
  const results = [];
  for (const account of accounts) {
    results.push(await upsert(account.username, account.role));
  }

  console.log("\n══════════════════════════════════════════════════════");
  console.log("  ⚔  AMBERLAND — account creati / aggiornati");
  console.log("══════════════════════════════════════════════════════");
  for (const r of results) {
    console.log(`  • ${r.username}`);
    console.log(`      ruolo            : ${r.role}`);
    console.log(`      password temp.   : ${r.password}`);
    console.log(`      stato            : ${r.created ? "creato" : "aggiornato"}`);
    console.log("");
  }
  console.log("══════════════════════════════════════════════════════");
  console.log("  Al primo accesso verrà richiesto il cambio password.");
  console.log("  Ricorda: abilita Email/Password in Firebase Authentication.");
  console.log("══════════════════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

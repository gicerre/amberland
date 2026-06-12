/**
 * Pubblica le regole di sicurezza di Cloud Firestore usando le credenziali del
 * service account (FIREBASE_ADMIN_*), senza richiedere il login interattivo
 * della Firebase CLI.
 *
 * Uso: npm run deploy:rules
 *
 * Richiede che il service account abbia i permessi sulle Firebase Rules
 * (ruolo "Firebase Rules Admin" o "Editor"). In caso di 403, pubblica le
 * regole manualmente dalla console (Firestore → Regole → incolla → Pubblica).
 */
import { readFileSync } from "node:fs";

import { config } from "dotenv";
import { GoogleAuth } from "google-auth-library";

config({ path: ".env.local" });
config();

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  fail("Credenziali Firebase Admin mancanti in .env.local (FIREBASE_ADMIN_*).");
}

const rulesSource = readFileSync("firestore.rules", "utf8");

const auth = new GoogleAuth({
  credentials: { client_email: clientEmail, private_key: privateKey },
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

const BASE = "https://firebaserules.googleapis.com/v1";

async function call(
  path: string,
  method: string,
  accessToken: string,
  body?: unknown
): Promise<{ status: number; json: Record<string, unknown> }> {
  const response = await fetch(`${BASE}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  return { status: response.status, json };
}

async function main() {
  const client = await auth.getClient();
  const accessToken = (await client.getAccessToken()).token;
  if (!accessToken) fail("Impossibile ottenere un access token dal service account.");

  // 1) Crea un nuovo ruleset con il contenuto di firestore.rules
  const created = await call(`projects/${projectId}/rulesets`, "POST", accessToken, {
    source: { files: [{ name: "firestore.rules", content: rulesSource }] },
  });
  if (created.status >= 400) {
    const err = created.json.error as { message?: string } | undefined;
    fail(`Creazione ruleset fallita (${created.status}): ${err?.message ?? "errore"}`);
  }
  const rulesetName = created.json.name as string;
  console.log(`Ruleset creato: ${rulesetName}`);

  // 2) Punta la release "cloud.firestore" al nuovo ruleset (crea o aggiorna)
  const releaseName = `projects/${projectId}/releases/cloud.firestore`;
  const create = await call(`projects/${projectId}/releases`, "POST", accessToken, {
    name: releaseName,
    rulesetName,
  });

  if (create.status === 409) {
    const update = await call(releaseName, "PATCH", accessToken, {
      release: { name: releaseName, rulesetName },
    });
    if (update.status >= 400) {
      const err = update.json.error as { message?: string } | undefined;
      fail(`Aggiornamento release fallito (${update.status}): ${err?.message ?? "errore"}`);
    }
    console.log("Release aggiornata.");
  } else if (create.status >= 400) {
    const err = create.json.error as { message?: string } | undefined;
    fail(`Creazione release fallita (${create.status}): ${err?.message ?? "errore"}`);
  } else {
    console.log("Release creata.");
  }

  console.log(`\n✓ Regole Firestore pubblicate sul progetto ${projectId}\n`);
}

main().catch((error) => {
  console.error("\n✖", error instanceof Error ? error.message : error);
  process.exit(1);
});

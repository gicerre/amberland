/**
 * Migrazione all'inventario unico del party (docs/PROPOSTA_INVENTARIO.md §5).
 *
 *   npm run migrate:inventory            → ANTEPRIMA: legge e stampa, non scrive nulla
 *   npm run migrate:inventory -- --apply → scrive party_items, purses, item_log
 *
 * Sorgenti (lette, MAI modificate né cancellate):
 *   - bag_items                      → party_items nella Borsa (location BAG)
 *   - inventory_items (per utente)   → zaino del PG di quell'utente
 *   - entities PC: sheet.equipment   → zaino del PG (oggetti liberi)
 *   - entities PC: sheet.money       → purses/{id del PG}
 *
 * Sicurezze:
 *   - se party_items contiene già documenti si ferma (niente doppioni);
 *   - un utente con più PG: il suo inventario personale non viene migrato
 *     e lo script lo segnala (va spostato a mano dall'app).
 */
import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });
config();

const APPLY = process.argv.includes("--apply");

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("\n✖ Credenziali FIREBASE_ADMIN_* mancanti in .env.local\n");
  process.exit(1);
}

const app =
  getApps()[0] ??
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);

/* ── Stesse regole di src/features/items/data.ts (tenerle allineate) ── */

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stackDocId(placeKey: string, catalogId: string | null, name: string) {
  const key = catalogId ?? `free-${slugify(name) || "oggetto"}`;
  return `${placeKey}__${key}`;
}

const TYPES = ["weapon", "armor", "shield", "magic", "consumable", "misc"];
const RARITIES = ["COMMON", "RARE", "MAGIC", "LEGENDARY", "ARTIFACT", "STORY"];

interface PlannedItem {
  id: string | null; // null = id automatico (oggetto unico)
  data: Record<string, unknown>;
  source: string;
}

const planned: PlannedItem[] = [];
const stacks = new Map<string, PlannedItem>();
const warnings: string[] = [];

function plan(
  placeKey: string,
  item: {
    catalogId: string | null;
    name: string;
    type: string;
    rarity: string | null;
    imageUrl: string;
    quantity: number;
    equipped: boolean;
    notes: string;
  },
  source: string
) {
  const name = item.name.trim() || "Oggetto";
  const quantity = Math.max(1, Math.floor(item.quantity || 1));
  const type = TYPES.includes(item.type) ? item.type : "misc";
  const stackable = quantity > 1 || type === "consumable";
  const location =
    placeKey === "BAG"
      ? { location: "BAG", characterId: null }
      : { location: "PC", characterId: placeKey };

  const data = {
    catalogId: item.catalogId,
    name,
    type,
    rarity: item.rarity && RARITIES.includes(item.rarity) ? item.rarity : null,
    imageUrl: item.imageUrl ?? "",
    quantity,
    stackable,
    ...location,
    equipped: placeKey !== "BAG" && item.equipped,
    attuned: false,
    notes: item.notes ?? "",
    charges: null,
    updatedBy: "migrazione",
    updatedByName: "Migrazione",
  };

  if (!stackable) {
    planned.push({ id: null, data, source });
    return;
  }
  const id = stackDocId(placeKey, item.catalogId, name);
  const existing = stacks.get(id);
  if (existing) {
    existing.data.quantity = Number(existing.data.quantity) + quantity;
    existing.source += ` + ${source}`;
    if (item.notes && !String(existing.data.notes).includes(item.notes)) {
      existing.data.notes = [existing.data.notes, item.notes].filter(Boolean).join(" · ");
    }
    return;
  }
  const entry = { id, data, source };
  stacks.set(id, entry);
  planned.push(entry);
}

function typeFromRarity(rarity: string): string {
  return ["MAGIC", "LEGENDARY", "ARTIFACT"].includes(rarity) ? "magic" : "misc";
}

async function main() {
  console.log(`\n▶ Migrazione inventario — ${APPLY ? "SCRITTURA" : "ANTEPRIMA (nessuna scrittura)"}\n`);

  const already = await db.collection("party_items").limit(1).get();
  if (!already.empty) {
    console.error("✖ party_items contiene già dati: migrazione già eseguita. Mi fermo.\n");
    process.exit(1);
  }

  // PG: per proprietario e per id.
  const pcSnap = await db.collection("entities").where("type", "==", "character").get();
  const pcs = pcSnap.docs.filter((doc) => doc.data().fields?.kind === "PC");
  const pcsByOwner = new Map<string, string[]>();
  const pcName = new Map<string, string>();
  for (const pc of pcs) {
    const owner = pc.data().ownerId as string | undefined;
    pcName.set(pc.id, String(pc.data().name ?? pc.id));
    if (owner) pcsByOwner.set(owner, [...(pcsByOwner.get(owner) ?? []), pc.id]);
  }

  // 1. Borsa Conservante.
  const bag = await db.collection("bag_items").get();
  for (const doc of bag.docs) {
    const d = doc.data();
    plan(
      "BAG",
      {
        catalogId: d.itemId ?? null,
        name: String(d.itemName ?? ""),
        type: typeFromRarity(String(d.itemCategory ?? "")),
        rarity: d.itemCategory ?? null,
        imageUrl: d.itemImage ?? "",
        quantity: Number(d.quantity ?? 1),
        equipped: false,
        notes: String(d.notes ?? ""),
      },
      `bag_items/${doc.id}`
    );
  }

  // 2. Inventario personale (per utente → PG).
  const inventory = await db.collection("inventory_items").get();
  for (const doc of inventory.docs) {
    const d = doc.data();
    const owned = pcsByOwner.get(String(d.ownerId)) ?? [];
    if (owned.length !== 1) {
      warnings.push(
        `inventory_items/${doc.id} (${d.itemName}) di ${d.ownerName || d.ownerId}: ` +
          (owned.length === 0 ? "nessun PG" : `${owned.length} PG`) +
          " → NON migrato, da assegnare a mano"
      );
      continue;
    }
    plan(
      owned[0],
      {
        catalogId: d.itemId ?? null,
        name: String(d.itemName ?? ""),
        type: typeFromRarity(String(d.itemCategory ?? "")),
        rarity: d.itemCategory ?? null,
        imageUrl: d.itemImage ?? "",
        quantity: Number(d.quantity ?? 1),
        equipped: Boolean(d.equipped),
        notes: String(d.notes ?? ""),
      },
      `inventory_items/${doc.id}`
    );
  }

  // 3. Equipaggiamento e monete della scheda dei PG.
  const purses: { id: string; money: Record<string, number> }[] = [];
  for (const pc of pcs) {
    const sheet = pc.data().sheet ?? {};
    for (const item of (sheet.equipment ?? []) as Record<string, unknown>[]) {
      plan(
        pc.id,
        {
          catalogId: null,
          name: String(item.name ?? ""),
          type: String(item.category ?? "misc"),
          rarity: null,
          imageUrl: "",
          quantity: Number(item.quantity ?? 1),
          equipped: Boolean(item.equipped),
          notes: String(item.notes ?? ""),
        },
        `${pcName.get(pc.id)}: sheet.equipment`
      );
    }
    const money = sheet.money ?? {};
    const coins = {
      pp: Math.max(0, Math.floor(Number(money.pp ?? 0))),
      gp: Math.max(0, Math.floor(Number(money.gp ?? 0))),
      ep: Math.max(0, Math.floor(Number(money.ep ?? 0))),
      sp: Math.max(0, Math.floor(Number(money.sp ?? 0))),
      cp: Math.max(0, Math.floor(Number(money.cp ?? 0))),
    };
    if (Object.values(coins).some((value) => value > 0)) {
      purses.push({ id: pc.id, money: coins });
    }
  }

  /* ── Report ── */
  const where = (data: Record<string, unknown>) =>
    data.location === "BAG" ? "Borsa" : pcName.get(String(data.characterId)) ?? "PG";
  console.log(`Oggetti da creare: ${planned.length}`);
  for (const entry of planned) {
    console.log(
      `  • [${where(entry.data)}] ${entry.data.name} ×${entry.data.quantity}` +
        `${entry.data.stackable ? " (pila)" : ""}${entry.data.equipped ? " (equip.)" : ""}` +
        `  ← ${entry.source}`
    );
  }
  console.log(`\nBorse di monete da creare: ${purses.length}`);
  for (const purse of purses) {
    console.log(`  • ${pcName.get(purse.id)}: ${JSON.stringify(purse.money)}`);
  }
  if (warnings.length > 0) {
    console.log(`\n⚠ Attenzione (${warnings.length}):`);
    for (const warning of warnings) console.log(`  - ${warning}`);
  }

  if (!APPLY) {
    console.log("\nAnteprima completata. Per scrivere: npm run migrate:inventory -- --apply\n");
    return;
  }

  /* ── Scrittura (a blocchi da 400 operazioni) ── */
  const now = FieldValue.serverTimestamp();
  const ops: ((batch: FirebaseFirestore.WriteBatch) => void)[] = [];
  for (const entry of planned) {
    const ref = entry.id
      ? db.collection("party_items").doc(entry.id)
      : db.collection("party_items").doc();
    ops.push((batch) => batch.set(ref, { ...entry.data, createdAt: now, updatedAt: now }));
  }
  for (const purse of purses) {
    ops.push((batch) =>
      batch.set(db.collection("purses").doc(purse.id), {
        ...purse.money,
        location: "PC",
        characterId: purse.id,
        updatedBy: "migrazione",
        updatedByName: "Migrazione",
        updatedAt: now,
      })
    );
  }
  ops.push((batch) =>
    batch.set(db.collection("item_log").doc(), {
      action: "UPDATE",
      itemName: "",
      quantity: planned.length,
      coins: null,
      fromLabel: "",
      toLabel: "",
      reason: `Migrazione all'inventario unico: ${planned.length} oggetti, ${purses.length} borse`,
      byId: "migrazione",
      byName: "Migrazione",
      createdAt: now,
    })
  );

  for (let index = 0; index < ops.length; index += 400) {
    const batch = db.batch();
    ops.slice(index, index + 400).forEach((op) => op(batch));
    await batch.commit();
  }
  console.log(`\n✔ Scritti ${ops.length} documenti. I dati di origine non sono stati toccati.\n`);
}

main().catch((error) => {
  console.error("\n✖ Migrazione fallita:", error);
  process.exit(1);
});

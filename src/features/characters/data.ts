"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  where,
} from "firebase/firestore";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-provider";
import {
  ENTITIES_KEY,
  RELATIONS_KEY,
  entityService,
  useEntitiesByType,
  type EntityInput,
} from "@/features/entities/data";
import { COLLECTIONS } from "@/lib/constants";
import { auth, db } from "@/lib/firebase/client";
import { sortByName } from "@/lib/firebase/firestore";
import {
  ABILITIES,
  type Ability,
  type AbilityScore,
  type CharacterHistoryEntry,
  type CharacterHistoryType,
  type CharacterKind,
  type CharacterSheet,
  type CharacterStatus,
  type ClassEntry,
  type Entity,
  type EntityPrivate,
  type EntityPublicCard,
} from "@/types/entities";

import { HISTORY_TYPE_LABELS } from "./constants";

/* ============================================================
 * Data layer del Sistema Unificato dei Personaggi.
 * Riusa il CRUD generico delle entità (`entityService`) e aggiunge
 * costruttori e mutazioni specifiche: creazione PC/NPC, conversione
 * NPC rapido→completo, cambio di stato e timeline storica.
 * ============================================================ */

function genId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Scheda D&D vuota con i default 5e. */
export function emptySheet(): CharacterSheet {
  const abilities = Object.fromEntries(
    ABILITIES.map((ability) => [ability, { score: 10, tempBonus: 0 }])
  ) as Record<Ability, { score: number; tempBonus: number }>;
  return {
    subrace: "",
    background: "",
    deity: "",
    age: "",
    height: "",
    weight: "",
    gender: "",
    languages: [],
    personalityTraits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    backstory: "",
    abilities,
    armorClass: 10,
    maxHp: 0,
    currentHp: 0,
    tempHp: 0,
    initiative: 0,
    speed: "9 m",
    proficiencyBonus: 2,
    savingThrows: [],
    skills: [],
    expertise: [],
    toolProficiencies: "",
    armorProficiencies: "",
    weaponProficiencies: "",
    classes: [],
    equipment: [],
    money: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
    spellcastingAbility: "",
    spellSlots: [],
    spells: [],
    cantrips: [],
    arcaneFocus: "",
    tokenUrl: "",
    altPortraits: [],
  };
}

export interface BuildCharacterOptions {
  race?: string;
  description?: string;
  /** Solo NPC: scheda completa già dall'inizio. */
  complete?: boolean;
  /** Solo PC: uid del giocatore proprietario. */
  ownerId?: string | null;
  /** Solo PC: username del proprietario, denormalizzato per la UI. */
  ownerName?: string;
  /** Solo NPC: visibilità scelta dal Master (obbligatoria). */
  visibility?: EntityInput["visibility"];
}

/**
 * Costruisce l'input di un nuovo personaggio.
 * - PC: visibile ai giocatori, con scheda completa e proprietario.
 * - NPC: solo Master di default; «rapido» (senza scheda) o «completo».
 */
export function buildCharacterInput(
  kind: CharacterKind,
  name: string,
  options: BuildCharacterOptions = {}
): EntityInput {
  const isPC = kind === "PC";
  const complete = isPC || options.complete === true;
  const input: EntityInput = {
    type: "character",
    name: name.trim(),
    description: options.description?.trim() ?? "",
    imageUrl: "",
    gallery: [],
    tags: [],
    visibility: isPC ? "OWNER_ONLY" : (options.visibility ?? "MASTER_ONLY"),
    unlockAfterId: null,
    parentId: null,
    fields: {
      kind,
      status: "ALIVE",
      isDead: false,
      npcComplete: complete,
      partyMember: false,
      race: options.race?.trim() ?? "",
      class: "",
      level: 0,
      ownerName: isPC ? (options.ownerName?.trim() ?? "") : "",
    },
    ownerId: isPC ? (options.ownerId ?? null) : null,
    history: [],
  };
  if (complete) input.sheet = emptySheet();
  return input;
}

/* ------------------------------------------------------------------ */
/* Wizard di prima creazione del PC                                    */
/* Riusa buildCharacterInput + emptySheet: stessa struttura dati dei   */
/* PC esistenti, popolata con i campi raccolti passo-passo.            */
/* ------------------------------------------------------------------ */

export interface PcWizardDraft {
  name: string;
  imageUrl: string;
  race: string;
  /** Classi (multiclasse): la prima è la principale. */
  classes: ClassEntry[];
  alignment: string;
  gender: string;
  height: string;
  age: string;
  weight: string;
  abilities: Record<Ability, AbilityScore>;
}

/** Costruisce l'EntityInput di un PC a partire dai dati del wizard. */
export function buildPcInput(
  draft: PcWizardDraft,
  owner: { id: string; name: string }
): EntityInput {
  const input = buildCharacterInput("PC", draft.name, {
    race: draft.race,
    ownerId: owner.id,
    ownerName: owner.name,
  });
  const totalLevel = draft.classes.reduce(
    (sum, entry) => sum + (entry.level || 0),
    0
  );
  const primaryClass = draft.classes[0]?.className ?? "";

  input.imageUrl = draft.imageUrl;
  input.fields = {
    ...input.fields,
    race: draft.race.trim(),
    class: primaryClass,
    level: totalLevel,
    alignment: draft.alignment,
  };
  input.sheet = {
    ...(input.sheet ?? emptySheet()),
    classes: draft.classes,
    abilities: draft.abilities,
    gender: draft.gender.trim(),
    height: draft.height.trim(),
    age: draft.age.trim(),
    weight: draft.weight.trim(),
  };
  return input;
}

/* ------------------------------------------------------------------ */
/* Card pubblica del PC (subdoc `entities/{id}/public/card`)           */
/* La scheda PC è OWNER_ONLY; la card è ciò che gli altri vedono.       */
/* ------------------------------------------------------------------ */

function publicCardRef(entityId: string) {
  return doc(db, COLLECTIONS.entities, entityId, "public", "card");
}

/** Deriva la card pubblica di un PC dai suoi dati (campi + scheda). */
export function buildPublicCard(
  source: Pick<Entity, "name" | "imageUrl" | "fields" | "sheet">
): EntityPublicCard {
  const sheet = source.sheet;
  const classes = sheet?.classes ?? [];
  const classesSummary = classes.length
    ? classes.map((c) => `${c.className || "Classe"} ${c.level}`).join(" · ")
    : String(source.fields.class ?? "");
  const subclasses = classes
    .map((c) => c.subclass)
    .filter(Boolean)
    .join(", ");
  const level = classes.length
    ? classes.reduce((sum, c) => sum + (c.level || 0), 0)
    : Number(source.fields.level ?? 0);
  const publicEquipment = (sheet?.equipment ?? [])
    .filter((item) => item.equipped)
    .map((item) => item.name)
    .filter(Boolean);
  return {
    name: source.name,
    imageUrl: source.imageUrl,
    tokenUrl: sheet?.tokenUrl ?? "",
    kind: "PC",
    partyMember: source.fields.partyMember === true,
    status: (source.fields.status as CharacterStatus) ?? "ALIVE",
    isDead: source.fields.isDead === true,
    race: String(source.fields.race ?? ""),
    classesSummary,
    level,
    subclasses,
    publicEquipment,
    ownerName: String(source.fields.ownerName ?? ""),
  };
}

/** Scrive/aggiorna la card pubblica di un PC. */
export async function writePublicCard(
  entityId: string,
  source: Pick<Entity, "name" | "imageUrl" | "fields" | "sheet">
) {
  await setDoc(publicCardRef(entityId), buildPublicCard(source));
}

/* ----------------- Dati riservati (private/master) ----------------- */

function reservedRef(entityId: string) {
  return doc(db, COLLECTIONS.entities, entityId, "private", "master");
}

/** Scrive (merge) i dati riservati di un'entità (Master). */
export async function writeReserved(
  entityId: string,
  data: Partial<EntityPrivate>
) {
  await setDoc(reservedRef(entityId), data, { merge: true });
}

/** Card pubblica singola (fallback di lettura per non-proprietari). */
export function useEntityPublicCard(entityId: string | undefined) {
  return useQuery({
    queryKey: [ENTITIES_KEY, "publicCard", entityId ?? ""],
    enabled: Boolean(entityId),
    queryFn: async (): Promise<EntityPublicCard | null> => {
      const snapshot = await getDoc(publicCardRef(entityId!));
      return snapshot.exists()
        ? (snapshot.data() as EntityPublicCard)
        : null;
    },
  });
}

export interface PartyCardEntry {
  id: string;
  card: EntityPublicCard;
}

/** Tutte le card pubbliche dei PC del party (collectionGroup). */
export function usePartyPublicCards(enabled = true) {
  const { role } = useAuth();
  return useQuery({
    queryKey: [ENTITIES_KEY, "partyCards"],
    enabled: enabled && role !== null,
    queryFn: async (): Promise<PartyCardEntry[]> => {
      const snapshot = await getDocs(collectionGroup(db, "public"));
      return snapshot.docs
        .map((document) => ({
          id: document.ref.parent.parent!.id,
          card: document.data() as EntityPublicCard,
        }))
        .filter((entry) => entry.card.kind === "PC" && entry.card.partyMember);
    },
  });
}

/** Crea una voce di storico pronta da appendere. */
export function makeHistoryEntry(
  type: CharacterHistoryType,
  title: string,
  detail = ""
): CharacterHistoryEntry {
  return {
    id: genId(),
    date: new Date().toISOString(),
    type,
    title: title.trim() || HISTORY_TYPE_LABELS[type],
    detail: detail.trim(),
  };
}

/* ------------------------------------------------------------------ */
/* Lettura                                                            */
/* ------------------------------------------------------------------ */

/** Tutti i personaggi leggibili (Master: tutti; Player: PLAYERS + propri). */
export function useCharacters(enabled = true) {
  return useEntitiesByType("character", enabled);
}

export interface PlayerOption {
  id: string;
  username: string;
}

/** Roster minimale dei giocatori (per assegnare un PC). Solo Master/Admin. */
export function usePlayerRoster(enabled = true) {
  const { isMaster } = useAuth();
  return useQuery({
    queryKey: ["players-roster"],
    enabled: enabled && isMaster,
    queryFn: async (): Promise<PlayerOption[]> => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sessione scaduta: accedi di nuovo");
      const response = await fetch("/api/players", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Impossibile caricare i giocatori");
      }
      return (await response.json()) as PlayerOption[];
    },
  });
}

/** I personaggi giocanti di proprietà dell'utente corrente. */
export function useMyCharacters() {
  const { user, role } = useAuth();
  const uid = user?.uid;
  return useQuery({
    queryKey: [ENTITIES_KEY, "owned", uid ?? ""],
    enabled: role !== null && Boolean(uid),
    queryFn: async () =>
      sortByName(await entityService.list(where("ownerId", "==", uid))),
  });
}

/** Il PC dell'utente corrente (uno per account); null se non esiste. */
export function useMyCharacter() {
  const result = useMyCharacters();
  return { ...result, data: result.data?.[0] ?? null };
}

/* ------------------------------------------------------------------ */
/* Mutazioni specifiche dei personaggi                                */
/* ------------------------------------------------------------------ */

export function useCharacterMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [ENTITIES_KEY] });
    void queryClient.invalidateQueries({ queryKey: [RELATIONS_KEY] });
  };

  /** NPC semplice → completo: aggiunge la scheda riservata senza perdite. */
  const convertToFull = useMutation({
    mutationFn: async (entity: Entity) => {
      const history = [
        ...(entity.history ?? []),
        makeHistoryEntry("NOTE", "Convertito in scheda completa"),
      ];
      await entityService.update(entity.id, {
        fields: { ...entity.fields, npcComplete: true },
        history,
      });
      // La scheda NPC è riservata (master-only), non sul doc pubblico.
      await writeReserved(entity.id, { reservedSheet: emptySheet() });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Scheda completa abilitata");
    },
    onError: (error: Error) =>
      toast.error("Conversione non riuscita", { description: error.message }),
  });

  /** Cambio di stato con voce di storico automatica. */
  const setStatus = useMutation({
    mutationFn: async ({
      entity,
      status,
    }: {
      entity: Entity;
      status: CharacterStatus;
    }) => {
      const previous = entity.fields.status as CharacterStatus | undefined;
      if (previous === status) return;
      const isDead = status === "DEAD";
      const wasDead = previous === "DEAD";
      const historyType: CharacterHistoryType = isDead
        ? "DEATH"
        : wasDead
          ? "RESURRECTION"
          : "STATUS";
      const history = [
        ...(entity.history ?? []),
        makeHistoryEntry(historyType, HISTORY_TYPE_LABELS[historyType]),
      ];
      const fields = { ...entity.fields, status, isDead };
      await entityService.update(entity.id, { fields, history });
      // Mantiene allineata la card pubblica del PC.
      if (entity.fields.kind === "PC") {
        await writePublicCard(entity.id, { ...entity, fields });
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Stato aggiornato");
    },
    onError: (error: Error) =>
      toast.error("Aggiornamento non riuscito", { description: error.message }),
  });

  /** Aggiunge/rimuove un personaggio dal party (non lo elimina). */
  const setPartyMember = useMutation({
    mutationFn: async ({
      entity,
      member,
    }: {
      entity: Entity;
      member: boolean;
    }) => {
      const fields = { ...entity.fields, partyMember: member };
      await entityService.update(entity.id, { fields });
      if (entity.fields.kind === "PC") {
        await writePublicCard(entity.id, { ...entity, fields });
      }
    },
    onSuccess: (_data, { member }) => {
      invalidate();
      toast.success(member ? "Aggiunto al party" : "Rimosso dal party");
    },
    onError: (error: Error) =>
      toast.error("Operazione non riuscita", { description: error.message }),
  });

  /** Aggiunge una voce di storico manuale. */
  const appendHistory = useMutation({
    mutationFn: async ({
      entity,
      entry,
    }: {
      entity: Entity;
      entry: CharacterHistoryEntry;
    }) => {
      await entityService.update(entity.id, {
        history: [...(entity.history ?? []), entry],
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Aggiunto allo storico");
    },
    onError: (error: Error) =>
      toast.error("Operazione non riuscita", { description: error.message }),
  });

  /** Rimuove una voce di storico. */
  const removeHistory = useMutation({
    mutationFn: async ({
      entity,
      entryId,
    }: {
      entity: Entity;
      entryId: string;
    }) => {
      await entityService.update(entity.id, {
        history: (entity.history ?? []).filter((item) => item.id !== entryId),
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Voce rimossa dallo storico");
    },
    onError: (error: Error) =>
      toast.error("Operazione non riuscita", { description: error.message }),
  });

  return {
    convertToFull,
    setStatus,
    setPartyMember,
    appendHistory,
    removeHistory,
  };
}

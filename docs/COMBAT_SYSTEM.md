# Amberland — Combat System "Campo di Battaglia"

Analisi tecnica e piano di implementazione.
Documento di progetto: da leggere **dopo** `ARCHITECTURE.md` e insieme a
`DESIGN_CONSTITUTION.md` (v2) + `DESIGN_SYSTEM_V3.md` ("Obsidian").

Stato: **proposta architetturale** — nessun codice scritto.

---

## 0. Sintesi esecutiva

Un vero combat engine a turni, live, integrato nel portale esistente.
Le dieci decisioni che reggono tutto il resto:

| # | Decisione | Motivo |
| --- | --- | --- |
| 1 | **Collection dedicate `battles/*`, NON `entities`** | `entities` è il codex narrativo (lore, visibilità a 4 livelli, CRUD generico). Il combattimento è stato operativo ad alta frequenza di scrittura: mescolarlo inquinerebbe query, cache e rules del sistema entità. |
| 2 | **Riuso pesante di `entities` come *sorgente*** | I nemici nascono da `type: "creature"` (Bestiario), i PC sono `type: "character"` con `ownerId`. Il combattimento ne fa **snapshot**, non riferimenti vivi. |
| 3 | **Realtime = Firestore `onSnapshot`** | Già presente nello stack e già usato (`auth-provider.tsx`). Zero nuove tecnologie. Serve solo un ponte snapshot → cache React Query. |
| 4 | **Scritture di gioco via API Route + Admin SDK** | Le Security Rules non possono validare un pathfinding. Il pattern `requireMaster` / `handleApiError` esiste già: lo si estende. Le rules negano la scrittura diretta ai client sui documenti di combattimento. |
| 5 | **HP di combattimento nei documenti combattente, non nelle schede** | Risolve elegantemente "i player vedono gli HP del party ma non quelli dei nemici" senza toccare le rules di `entities` (dove i PC sono `OWNER_ONLY`). |
| 6 | **Separazione fisica pubblico/segreto** | Le rules Firestore filtrano *documenti*, mai *campi*. Gli HP numerici dei nemici vivono in `combatants/{id}/secret/master`: se stessero nel doc pubblico, un player li leggerebbe via SDK anche con la UI che li nasconde. |
| 7 | **Un documento per combattente** | Scritture granulari → nessuna contesa tra giocatori diversi, snapshot delta minimi, costi Firestore bassi. |
| 8 | **Turn order denormalizzato nel doc battaglia** | Ordine + round + turno letti atomicamente in un solo documento: nessuna query, nessuna incoerenza transitoria. |
| 9 | **Route group `(battle)` fullscreen** | La schermata di combattimento non può vivere dentro `AppShell` (sidebar + padding + `max-w-6xl`). Serve un layout gemello che riusa `AuthGuard` ma non la shell. |
| 10 | **Geometria come modulo puro riusabile** | `engine/geometry.ts` serve oggi al movimento e domani a range armi, incantesimi, AoE e line of sight, senza riscritture. |

---

## 1. Analisi dell'esistente — cosa si riusa

### 1.1 Ciò che esiste ed è direttamente riutilizzabile

| Asset esistente | Uso nel Combat System |
| --- | --- |
| `features/auth/auth-provider.tsx` (`useAuth`: `role`, `isMaster`, `canContribute`, `isVisitor`) | Gating client di ogni azione. `VISITOR` diventa naturalmente **spettatore**. |
| `features/auth/guard.tsx` (`AuthGuard`, `RoleGate`) | Protezione delle rotte `/battaglie` e della preparazione riservata al Master. |
| `lib/server/api-helpers.ts` (`ApiError`, `requireAdmin`, `requireMaster`, `handleApiError`) | Base delle API di combattimento. Va aggiunto solo `requireUser`. |
| `lib/firebase/admin.ts` | Autorità server per le mutazioni di gioco. |
| `lib/firebase/firestore.ts` (`createCrudService`) | CRUD delle Battle Map in bozza (config lato Master, bassa frequenza). **Non** per lo stato live. |
| `hooks/use-crud-mutations.ts` | Mutazioni + toast per la gestione delle mappe (lista, duplica, elimina). |
| `lib/upload/image-service.ts` (`uploadImage`, `compressImage`, `optimizeCloudinary`) | Sfondi mappa e token. Serve solo estendere `ImageFolder`. |
| `components/shared/image-upload.tsx` | Widget di caricamento già a tema. |
| `types/entities.ts` → `ConditionEntry`, `CONDITION_KINDS`, `CharacterSheet` | Le condizioni di combattimento riusano **lo stesso tipo** già usato nel Codex del personaggio. Continuità totale. |
| `entities` `type: "creature"` (Bestiario: `fields.cr`, `creatureType`, `loot`) | Sorgente dei nemici: "aggiungi dal Bestiario". |
| `entities` `type: "character"` + `ownerId` + `sheet` (`maxHp`, `currentHp`, `armorClass`, `speed`, `initiative`, `conditions`) | Sorgente dei PC: precompila il combattente. |
| `entities/{id}/public/card` (`EntityPublicCard.tokenUrl`) | Token del PC già disponibile a tutti gli autenticati. |
| `COLLECTIONS` in `lib/constants.ts` | Unico punto di verità per i nuovi nomi di collection. |
| `design-system/` + token Obsidian (`--surface-0..3`, `--hairline`, `--gold`, `--status-*`) | Skin della battle map senza inventare nulla. |
| `framer-motion` | Movimento del token, entrata dei pannelli. Nessuna libreria di canvas/mappa da aggiungere. |
| `components/shared/confirm-dialog.tsx` | Azioni distruttive del Master (uccidi, rimuovi, termina). |

### 1.2 Ciò che manca e va costruito

- Nessun pattern **realtime riutilizzabile**: `onSnapshot` compare una volta
  sola, in `auth-provider.tsx`. React Query è usato ovunque in modalità
  *fetch-and-invalidate*. Serve un ponte.
- Nessuna **API di dominio** oltre alla gestione utenti (`/api/admin/users`,
  `/api/players`). Il pattern esiste ma va esteso.
- Nessun concetto di **campagna**: l'app è mono-campagna (Amberland). Vedi §3.7.
- `firestore.indexes.json` è **vuoto**: serviranno indici compositi.
- Nessuna **rotta fullscreen**: tutto passa da `AppShell` (`lg:pl-72`, `max-w-6xl`).
- Nessun **modulo geometrico** né motore a turni.

### 1.3 Vincoli ereditati da rispettare

1. **Rules pubblicate a mano** dalla console Firebase (come già per il sistema
   personaggi): ogni fase che tocca `firestore.rules` richiede una pubblicazione
   manuale. Va messo nella checklist di fine fase.
2. **Custom claims** come fonte del ruolo nelle rules
   (`request.auth.token.role`), non il documento `users`.
3. **Nomenclatura diegetica italiana** nella UI, inglese nel codice.
4. **Design Constitution v2**: niente texture, niente ornamenti, oro ≤5%, glow
   solo su stati interattivi. La griglia sarà *hairline*, il token attivo avrà
   l'anello oro — e basta.
5. **Mobile first + `prefers-reduced-motion` + WCAG 2.2 AA**.
6. `next.config.ts` ha `images.unoptimized: true`: gli sfondi mappa vanno
   ottimizzati **in upload** (già lo fa `compressImage`) e serviti con
   `optimizeCloudinary`.

---

## 2. Architettura proposta

### 2.1 Struttura dei file

```
src/
├─ app/
│  ├─ (app)/                          # shell esistente (sidebar + padding)
│  │  └─ battaglie/
│  │     ├─ page.tsx                  # Elenco battaglie
│  │     └─ [id]/
│  │        └─ preparazione/page.tsx  # Editor Battle Map (Master) — RoleGate
│  ├─ (battle)/                       # NUOVO route group: fullscreen, no shell
│  │  ├─ layout.tsx                   # AuthGuard + contenitore 100dvh
│  │  └─ battaglia/[id]/page.tsx      # Tavolo di combattimento (live)
│  └─ api/
│     └─ battles/
│        ├─ route.ts                        # POST crea battaglia
│        └─ [id]/
│           ├─ route.ts                     # PATCH config · DELETE
│           ├─ publish/route.ts             # DRAFT|READY → LOBBY
│           ├─ join/route.ts                # PLAYER entra + sceglie PC
│           ├─ leave/route.ts
│           ├─ start/route.ts               # LOBBY → ACTIVE, costruisce turn order
│           ├─ turn/route.ts                # fine turno / skip / forza / indietro
│           ├─ state/route.ts               # PAUSED / ACTIVE / COMPLETED
│           ├─ combatants/route.ts          # POST aggiungi (+ duplica xN)
│           └─ combatants/[cid]/
│              ├─ route.ts                  # PATCH (master) · DELETE
│              ├─ move/route.ts             # movimento validato
│              ├─ hp/route.ts               # danno / cura
│              ├─ conditions/route.ts       # condizioni
│              └─ death/route.ts            # morte / resurrezione (solo Master)
│
├─ features/battle/
│  ├─ data.ts                 # hook React Query + sottoscrizioni realtime
│  ├─ api.ts                  # client tipizzato delle API (fetch + Bearer)
│  ├─ schemas.ts              # Zod — condivisi client/server (pattern auth/)
│  ├─ constants.ts            # label IT, categorie nemico, placeholder token
│  ├─ engine/
│  │  ├─ geometry.ts          # distanze, metriche, celle, AoE  (PURO)
│  │  ├─ movement.ts          # Dijkstra, reachable set, path    (PURO)
│  │  ├─ initiative.ts        # ordinamento + tiebreak           (PURO)
│  │  ├─ turn.ts              # avanzamento round/turno          (PURO)
│  │  └─ visibility.ts        # proiezione dati per ruolo        (PURO)
│  └─ components/
│     ├─ battle-canvas.tsx        # viewport: zoom, pan, fullscreen
│     ├─ battle-grid.tsx          # griglia SVG + overlay celle
│     ├─ battle-token.tsx         # pedina (drag, stati, anello attivo)
│     ├─ movement-overlay.tsx     # celle raggiungibili + percorso + costo
│     ├─ initiative-track.tsx     # ordine iniziativa (laterale/bottom)
│     ├─ combatant-inspector.tsx  # dettaglio filtrato per ruolo
│     ├─ master-toolbar.tsx       # regia del Master
│     ├─ battle-lobby.tsx         # schieramento pre-combattimento
│     ├─ map-editor.tsx           # config mappa + calibrazione griglia
│     ├─ enemy-form.tsx           # creazione/duplicazione nemici
│     └─ battle-log.tsx           # cronologia eventi
│
└─ types/battle.ts            # modelli — unico punto di verità
```

**Perché `engine/` è fatto di moduli puri**: gli stessi file girano nel browser
(preview immediata, UI ottimistica) e nelle API Route (validazione autorevole).
Nessuna duplicazione di logica → nessuna divergenza client/server.

### 2.2 Il route group `(battle)`

Il tavolo di combattimento richiede l'intero viewport. `AppShell` impone
sidebar da 288px, `max-w-6xl` e padding: inutilizzabile.

```tsx
// app/(battle)/layout.tsx
export default function BattleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="h-dvh overflow-hidden bg-surface-0">{children}</div>
    </AuthGuard>
  );
}
```

`AuthGuard` è riusato integralmente (login, `mustChangePassword`, profilo
mancante). Si perde solo la shell — che è esattamente l'obiettivo.
Un pulsante "Esci dal campo" riporta a `/battaglie`.

### 2.3 Integrazione nella navigazione

- **Sidebar / bottom nav**: nuova voce **"Campo di Battaglia"** (`/battaglie`),
  icona `Swords`, dentro il gruppo `party` (aggiungere `/battaglie` a
  `activePaths`). Non serve un sesto gruppo: la bottom nav a 5 tab resta.
- **Sala del Master** (`/master`): nuovo `TomePanel` "Tavolo di Guerra" con le
  battaglie in bozza/attive e CTA "Nuova battaglia".
- **Area Party** (`/party`): banner "Battaglia in corso — Entra nel campo"
  quando esiste una battaglia in `LOBBY` o `ACTIVE`. È l'aggancio che rende la
  feature scopribile senza cercarla.

### 2.4 Nomenclatura diegetica (UI in italiano)

| Concetto tecnico | Etichetta UI |
| --- | --- |
| Battle Map | Campo di Battaglia |
| Lobby | Schieramento |
| Turn Order | Ordine di Iniziativa |
| Round | Tornata |
| Master toolbar | Regia del Master |
| Combat log | Cronaca dello Scontro |
| Draft | Bozza di battaglia |
| Template | Terreno noto |

---

## 3. Modelli dati

### 3.1 Mappa Firestore

```
battles/{battleId}                          ← config + stato live (doc "caldo")
  ├─ combatants/{combatantId}               ← 1 doc per pedina — DATI PUBBLICI
  │    └─ secret/master                     ← HP numerici, statblock, note (MASTER)
  ├─ presence/{uid}                         ← heartbeat dei connessi
  └─ events/{eventId}                       ← log append-only (cronaca + undo)

battle_templates/{templateId}               ← mappe riusabili (fase 6)
```

Perché questa forma:

- **Un solo doc "caldo"** (`battles/{id}`) contiene round, turno e ordine: una
  sola lettura per conoscere lo stato del combattimento.
- **Combattenti separati**: muovere una pedina non riscrive l'intero
  combattimento → nessuna contesa fra un player che si muove e il Master che
  applica danni a un nemico.
- **`secret/master` come sottocollezione**: unica via per nascondere davvero dei
  dati in Firestore (§6.3).
- **`events` append-only**: cronaca, undo e audit trail con lo stesso
  meccanismo — e ricalca il pattern già in uso (`bag_log`, `note_log`,
  `chronicle_log`).

### 3.2 `battles/{battleId}`

```ts
export const BATTLE_STATUSES = [
  "DRAFT", "READY", "LOBBY", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED",
] as const;
export type BattleStatus = (typeof BATTLE_STATUSES)[number];

export const DISTANCE_UNITS = ["m", "ft"] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

/** Metrica di movimento/distanza. Predisposta, non tutta attiva in F1. */
export const DISTANCE_METRICS = [
  "CHEBYSHEV",   // 5e base: la diagonale costa 1
  "ALTERNATING", // variante DMG 5-10-5: diagonali alterne costano 2
  "EUCLIDEAN",   // reale, per range/AoE circolari
  "MANHATTAN",
] as const;
export type DistanceMetric = (typeof DISTANCE_METRICS)[number];

export interface GridConfig {
  kind: "SQUARE" | "HEX";        // HEX predisposto, non implementato in F1–F5
  /** Colonne × righe: le dimensioni LOGICHE della mappa. */
  cols: number;
  rows: number;
  /** Quanto vale UNA cella nel mondo di gioco (es. 3 = 3 metri). */
  cellSize: number;
  unit: DistanceUnit;
  metric: DistanceMetric;
  /** Solo estetico: la griglia è visibile ai giocatori? */
  visible: boolean;
  /** Calibrazione su sfondi che hanno già una griglia disegnata. */
  offsetX: number;   // px nello spazio-immagine
  offsetY: number;
  /** Scala fine dell'immagine rispetto alla griglia (1 = combacia). */
  imageScale: number;
}

export interface BackgroundImage {
  url: string;                 // Cloudinary o URL incollato
  naturalWidth: number;        // px, letti in upload
  naturalHeight: number;
  fit: "COVER" | "CONTAIN" | "STRETCH";
  /** Orientamento della mappa in gradi. */
  rotation: 0 | 90 | 180 | 270;
  /** Oscuramento per far risaltare token e griglia (0–1). */
  dim: number;
}

export interface TurnState {
  round: number;               // 1-based. 0 = non iniziato
  turnIndex: number;           // indice in `order`
  activeCombatantId: string | null;
  /** Inizio del turno corrente: base per il timer opzionale. */
  turnStartedAt: Timestamp | null;
  /** Compare-and-swap: ogni avanzamento incrementa. Anti-doppio-click. */
  version: number;
}

export interface InitiativeEntry {
  combatantId: string;
  initiative: number;
  /** Tiebreak automatico: modificatore di Destrezza. */
  dexMod: number;
  /** Tiebreak manuale del Master: vince il valore più basso. */
  manualRank: number | null;
  /** Denormalizzati per evitare join nel rendering della traccia. */
  name: string;
  side: CombatantSide;
}

export interface Battle {
  id: string;
  name: string;
  description: string;
  status: BattleStatus;
  /** Predisposizione multi-campagna. Oggi sempre "amberland". */
  campaignId: string;
  /** Più Master sullo stesso scontro (co-DM). */
  masterIds: string[];
  createdBy: string;

  grid: GridConfig;
  background: BackgroundImage | null;

  /** Ordine di iniziativa denormalizzato: già ordinato. */
  order: InitiativeEntry[];
  turn: TurnState;

  /** Regole attive su QUESTA battaglia. */
  rules: {
    /** Blocca il movimento oltre il budget (false = solo avviso). */
    enforceMovement: boolean;
    /** Le celle occupate bloccano il passaggio. */
    blockOccupied: boolean;
    /** I player vedono gli HP numerici degli alleati (default true). */
    revealAllyHp: boolean;
    /** Come mostrare la salute dei nemici ai player. */
    enemyHpDisplay: "HIDDEN" | "BAND" | "BAR" | "EXACT";
    /** Timer del turno in secondi; 0 = disattivo. */
    turnTimerSeconds: number;
    /** I player possono scegliere liberamente la casella di partenza. */
    freeDeployment: boolean;
    /** Zona di schieramento consentita ai player (rettangoli di celle). */
    deploymentZones: CellRect[];
  };

  /** Livello terreno: mappa sparsa "x,y" → tipo. Assente = normale. */
  terrain: Record<string, TerrainKind>;

  /** Collegamenti al codex — la battaglia non vive isolata. */
  links: {
    locationId: string | null;   // entities: dove si combatte
    questId: string | null;      // entities: perché si combatte
    sessionId: string | null;    // entities: quando si è combattuto
  };

  startedAt: Timestamp | null;
  endedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export const TERRAIN_KINDS = [
  "NORMAL", "DIFFICULT", "WALL", "HAZARD", "WATER", "PIT",
] as const;
export type TerrainKind = (typeof TERRAIN_KINDS)[number];

export interface CellRect { x: number; y: number; w: number; h: number }
```

Note di modellazione:

- `terrain` come **mappa sparsa** (`{"4,7": "WALL"}`) invece che matrice: una
  mappa 30×21 vuota costa 0 byte, non 630 celle. Firestore ha un limite di 1 MiB
  per documento: ~20.000 celle marcate restano ampiamente sotto. Se un giorno
  servisse di più, il livello terreno si sposta in un documento dedicato
  `battles/{id}/layers/terrain` senza toccare il resto.
- `rules` sul documento della battaglia rende ogni scontro configurabile senza
  migrazioni: aggiungere una regola = aggiungere un campo con default.
- `order` **denormalizzato con `name` e `side`** perché la traccia iniziativa è
  il componente più ridisegnato della UI: evita 16 join per frame.
- `turn.version` è la chiave dell'anti-concorrenza (§10.1).

### 3.3 `battles/{id}/combatants/{cid}` — dati pubblici

```ts
export const COMBATANT_SIDES = ["PC", "ENEMY", "ALLY", "NEUTRAL"] as const;
export type CombatantSide = (typeof COMBATANT_SIDES)[number];

export const ENEMY_CATEGORIES = [
  "BOSS", "MINI_BOSS", "ELITE", "STANDARD",
  "MELEE", "RANGED", "MAGIC", "SUPPORT", "MINION", "BEAST", "SUMMON",
] as const;
export type EnemyCategory = (typeof ENEMY_CATEGORIES)[number];

export const COMBATANT_TURN_STATES = [
  "WAITING", "ACTIVE", "COMPLETED", "SKIPPED", "DEAD", "REMOVED",
] as const;
export type CombatantTurnState = (typeof COMBATANT_TURN_STATES)[number];

/** Fascia qualitativa: ciò che i player vedono dei nemici. */
export const HEALTH_BANDS = [
  "UNHARMED", "BRUISED", "WOUNDED", "BLOODIED", "CRITICAL", "DOWN",
] as const;
export type HealthBand = (typeof HEALTH_BANDS)[number];

export interface Position { x: number; y: number }

export interface Combatant {
  id: string;
  battleId: string;
  side: CombatantSide;

  /** Nome mostrato a TUTTI. Per un nemico può essere "Figura incappucciata". */
  publicName: string;
  tokenUrl: string;            // "" → placeholder per categoria
  /** Ingombro in celle (1 = Media, 2 = Grande, 3 = Enorme). */
  size: number;
  /** Colore d'anello per distinguere i duplicati (Goblin A/B/C). */
  accent: string;

  /** Sorgente nel codex. null = creato al volo. */
  sourceEntityId: string | null;
  /** Solo PC: uid del giocatore che comanda la pedina. */
  ownerId: string | null;
  /** Delega temporanea del controllo. */
  controllerIds: string[];

  category: EnemyCategory | null;   // solo ENEMY/ALLY/NEUTRAL

  position: Position | null;        // null = non ancora schierato
  /** Movimento massimo per turno, nell'unità della mappa (es. 9 metri). */
  speed: number;
  /** Movimento già consumato nel turno corrente. */
  movementUsed: number;

  initiative: number | null;
  dexMod: number;
  turnState: CombatantTurnState;

  /** Riusa ConditionEntry da types/entities.ts: continuità col Codex. */
  conditions: ConditionEntry[];

  /* --- Salute: due rappresentazioni, esposte selettivamente --- */
  /** HP numerici. Presenti SOLO se leggibili da chi legge il doc (vedi §6.3). */
  hp: { current: number; max: number; temp: number } | null;
  /** Fascia qualitativa: SEMPRE presente, sempre pubblica. */
  healthBand: HealthBand;
  /** Il Master ha dichiarato morta la pedina. */
  isDead: boolean;
  /** Death saving throws (fase 5). */
  deathSaves: { successes: number; failures: number } | null;

  /** Testo narrativo che il Master decide di rendere pubblico. */
  publicNote: string;

  visible: boolean;            // false = pedina nascosta ai player (fog)
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}
```

**Il punto cruciale — `hp` nullable.** Per i PC e gli alleati `hp` è valorizzato
e il documento è leggibile da tutto il party: i giocatori vedono gli HP dei
compagni, come richiesto. Per i **nemici** `hp` è `null` sul documento pubblico
e i numeri veri vivono in `secret/master`. Il documento pubblico del nemico
porta solo `healthBand`, che è ciò che il Master vuole far trapelare ("il Boss
sembra gravemente ferito"). Se il Master imposta `rules.enemyHpDisplay: "EXACT"`
l'API popola anche `hp` sul doc pubblico: la scelta di rivelare è **un'azione
del Master**, non un flag della UI.

### 3.4 `battles/{id}/combatants/{cid}/secret/master`

```ts
export interface CombatantSecret {
  /** Nome vero ("Grimtooth, Sciamano dei Teschi"). */
  realName: string;
  hp: { current: number; max: number; temp: number };
  armorClass: number;
  /** Statblock: riusa CharacterSheet o resta testo libero per i mostri. */
  statBlock: Partial<CharacterSheet> | null;
  /** Copia del Bestiario al momento dell'inserimento (snapshot). */
  sourceSnapshot: Record<string, unknown> | null;
  masterNotes: string;
  /** Tattiche, resistenze, immunità. */
  tactics: string;
  lootPreview: string;
}
```

### 3.5 `battles/{id}/events/{eventId}` — cronaca e undo

```ts
export const BATTLE_EVENT_TYPES = [
  "BATTLE_CREATED", "BATTLE_PUBLISHED", "BATTLE_STARTED",
  "BATTLE_PAUSED", "BATTLE_RESUMED", "BATTLE_ENDED",
  "COMBATANT_ADDED", "COMBATANT_REMOVED", "COMBATANT_JOINED",
  "COMBATANT_MOVED", "COMBATANT_DAMAGED", "COMBATANT_HEALED",
  "COMBATANT_DIED", "COMBATANT_REVIVED",
  "CONDITION_ADDED", "CONDITION_REMOVED",
  "INITIATIVE_SET", "ORDER_CHANGED",
  "TURN_STARTED", "TURN_ENDED", "TURN_SKIPPED", "ROUND_ADVANCED",
  "MASTER_UNDO",
] as const;
export type BattleEventType = (typeof BATTLE_EVENT_TYPES)[number];

export interface BattleEvent {
  id: string;                  // = actionId del client → idempotenza
  type: BattleEventType;
  round: number;
  turnIndex: number;
  actorUid: string;
  actorName: string;
  combatantId: string | null;
  /** Testo già pronto in italiano: "Grimtooth subisce 12 danni". */
  message: string;
  /** Patch inversa per l'undo del Master (fase 6). */
  inverse: Record<string, unknown> | null;
  /** Nasconde l'evento ai player (es. HP esatti di un nemico). */
  masterOnly: boolean;
  at: Timestamp | null;
}
```

Il campo `inverse` fa dell'undo una feature **quasi gratuita**: ogni API che
muta scrive già l'evento; scrivere anche la patch inversa costa una riga.

### 3.6 `battles/{id}/presence/{uid}`

```ts
export interface BattlePresence {
  uid: string;
  username: string;
  role: Role;
  combatantId: string | null;   // PC selezionato
  lastSeenAt: Timestamp | null; // heartbeat ogni 25s
  active: boolean;              // focus della finestra
}
```

Firestore non ha `onDisconnect` (è una primitiva del Realtime Database). Si usa
un **heartbeat**: `lastSeenAt` aggiornato ogni 25s dal client, offline dopo 60s
senza aggiornamenti, valutato lato client sui dati dello snapshot. Costo: ~2
scritture/minuto/utente. Con 7 persone per 3 ore ≈ 2.500 scritture —
irrilevante. Se un giorno servisse presenza istantanea, il Realtime Database è
già nel progetto Firebase (nessun nuovo vendor).

### 3.7 Nota sul concetto di "campagna"

L'app oggi è **mono-campagna**: non esiste una collection `campaigns`, il party è
un singleton (`settings/party`) e i ruoli sono globali. Introdurre ora le
campagne significherebbe rifattorizzare `entities`, le rules e la navigazione:
fuori scopo.

Soluzione: `campaignId: "amberland"` costante su ogni battaglia, e "i giocatori
della campagna" = **tutti gli utenti con ruolo PLAYER** (più ADMIN/MASTER). Il
giorno in cui esisteranno più campagne, il campo è già lì e le query filtrano
senza migrazione dei dati.

### 3.8 Costanti da aggiungere

```ts
// lib/constants.ts
export const COLLECTIONS = {
  // …esistenti
  battles: "battles",
  battleTemplates: "battle_templates",
} as const;

// sottocollezioni (nomi letterali, usati anche nelle rules)
export const BATTLE_SUBCOLLECTIONS = {
  combatants: "combatants",
  events: "events",
  presence: "presence",
} as const;
```

E in `lib/upload/image-service.ts`:

```ts
export type ImageFolder = EntityType | "misc" | "battlemap" | "token";
```

---

## 4. Gestione realtime

### 4.1 La scelta

Firestore `onSnapshot`. **Nessuna nuova tecnologia**, come richiesto:

- è già nel bundle (`firebase@12`) e già usato in `auth-provider.tsx`;
- le Security Rules valgono anche per i listener: la stessa regola che nega la
  lettura nega la sottoscrizione;
- riconnessione, resync e cache offline sono gestiti dall'SDK;
- latenza tipica 100–300 ms: adeguata a un gioco a turni (non è un FPS).

Alternative scartate: **WebSocket custom** (nessun server long-running: Next.js
su hosting serverless), **Realtime Database** (secondo modello dati da mantenere
per un solo vantaggio, la presenza), **polling** (peggiore su ogni asse).

### 4.2 Il ponte snapshot → React Query

Tutta l'app legge via React Query. Invece di introdurre un secondo paradigma di
stato, gli snapshot **scrivono nella cache di React Query**. I componenti
continuano a usare `useQuery` e non sanno di essere live.

```ts
// features/battle/data.ts (schema)
function useDocSubscription<T>(key: QueryKey, ref: DocumentReference | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!ref) return;
    return onSnapshot(
      ref,
      (snap) => queryClient.setQueryData(key, snap.exists()
        ? ({ id: snap.id, ...snap.data() } as T)
        : null),
      (error) => toast.error("Collegamento al campo interrotto", {
        description: error.message,
      })
    );
  }, [ref?.path]);
  return useQuery<T | null>({
    queryKey: key, queryFn: () => null!, staleTime: Infinity, enabled: Boolean(ref),
  });
}
```

Hook esposti:

| Hook | Sorgente | Chi lo usa |
| --- | --- | --- |
| `useBattle(id)` | doc `battles/{id}` | tutti nel campo |
| `useCombatants(id)` | collection `combatants` | tutti |
| `useCombatantSecret(id, cid)` | doc `secret/master` | solo Master (`enabled: isMaster`) |
| `useBattleEvents(id, n)` | `events` desc, `limit(50)` | cronaca |
| `useBattlePresence(id)` | `presence` | lobby e regia |
| `useBattles(filters)` | `battles` (una-tantum, non live) | elenco |

Attenzione operativa: `enabled: isMaster` **non è sicurezza** — serve solo a non
generare errori di permessi in console. La sicurezza vera sono le rules (§6).

### 4.3 UI ottimistica

Il movimento del proprio token deve sembrare istantaneo:

1. Il client valida localmente con `engine/movement.ts` (stessa logica del server).
2. Aggiorna subito la posizione in uno **stato locale di overlay** (non nella cache).
3. Chiama `POST /move`.
4. Allo snapshot di ritorno l'overlay si spegne e vince il dato del server.
5. Se l'API rifiuta: toast + il token torna indietro con animazione.

L'overlay separato dalla cache evita il classico sfarfallio "posizione nuova →
vecchia → nuova".

---

## 5. Backend e API

### 5.1 Perché le API Route e non le sole rules

Le Security Rules sanno esprimere confronti, non algoritmi. Non possono:

- eseguire un BFS per verificare che un percorso di 3 celle sia percorribile
  aggirando un muro;
- verificare che sia davvero il turno di chi scrive **e** che il budget residuo
  basti **e** che la cella non sia occupata, in modo atomico;
- decidere quali campi rivelare in base a `rules.enemyHpDisplay`.

Quindi: **i client non scrivono mai** su `battles/**`. Ogni mutazione passa da
una API Route con Admin SDK, che bypassa le rules e applica la logica. Le rules
restano l'ultima linea di difesa in **lettura**. È già il pattern del progetto
per le operazioni sensibili (`/api/admin/users`, `/api/players`).

### 5.2 Estensione di `lib/server/api-helpers.ts`

```ts
/** Verifica il Bearer token e restituisce uid + ruolo. Nessun vincolo. */
export async function requireUser(request: NextRequest):
  Promise<{ uid: string; role: Role }>;

/** Ruolo tra quelli ammessi. */
export async function requireRole(request: NextRequest, allow: Role[]):
  Promise<{ uid: string; role: Role }>;

/** Carica la battaglia e verifica che il chiamante ne sia Master. */
export async function requireBattleMaster(request: NextRequest, battleId: string):
  Promise<{ uid: string; role: Role; battle: Battle }>;
```

`requireBattleMaster` incapsula la regola "MASTER solo sulle proprie battaglie,
ADMIN su tutte": `role === "ADMIN" || battle.masterIds.includes(uid)`.

### 5.3 Elenco delle API

| Metodo | Rotta | Chi | Effetto |
| --- | --- | --- | --- |
| POST | `/api/battles` | MASTER, ADMIN | Crea in `DRAFT`. Ritorna id. |
| PATCH | `/api/battles/[id]` | Master della battaglia | Config (nome, griglia, sfondo, regole, terreno). Vietato in `ACTIVE`, salvo campi runtime. |
| DELETE | `/api/battles/[id]` | Master, ADMIN | Elimina (ricorsiva sulle sottocollezioni). |
| POST | `/api/battles/[id]/publish` | Master | `DRAFT\|READY → LOBBY`. Valida griglia coerente e ≥1 combattente. |
| POST | `/api/battles/[id]/join` | PLAYER+ | Entra: crea/aggiorna il proprio combattente da un PC di cui è `ownerId`. |
| POST | `/api/battles/[id]/leave` | PLAYER+ | Esce; il Master decide se la pedina resta. |
| POST | `/api/battles/[id]/start` | Master | `LOBBY → ACTIVE`: costruisce `order`, `round=1`, `turnIndex=0`. |
| POST | `/api/battles/[id]/state` | Master | `PAUSED` / `ACTIVE` / `COMPLETED` / `ARCHIVED`. |
| POST | `/api/battles/[id]/turn` | Master, o proprietario del combattente attivo | `{action: "END"\|"SKIP"\|"FORCE_NEXT"\|"PREV", expectedVersion}` |
| POST | `/api/battles/[id]/combatants` | Master | Crea 1..N combattenti (`count` per la duplicazione). |
| PATCH | `/api/battles/[id]/combatants/[cid]` | Master (tutto) · Player (solo iniziativa e posizione iniziale del proprio PC, solo in `LOBBY`) | |
| DELETE | `/api/battles/[id]/combatants/[cid]` | Master | Rimuove dalla battaglia. |
| POST | `…/combatants/[cid]/move` | Master (chiunque) · Player (proprio PC, proprio turno) | Movimento validato. |
| POST | `…/combatants/[cid]/hp` | Master · Player (solo il proprio PC) | `{delta, kind: "DAMAGE"\|"HEAL"\|"TEMP"\|"SET"}` |
| POST | `…/combatants/[cid]/conditions` | Master · Player (proprio PC) | Aggiunge/rimuove `ConditionEntry`. |
| POST | `…/combatants/[cid]/death` | **Solo Master** | `{dead: boolean}` — morte e resurrezione. |
| POST | `/api/battles/[id]/undo` | Master | Applica l'ultimo `inverse` (fase 6). |
| POST | `/api/battles/[id]/duplicate` | Master | Clona come nuova bozza (fase 6). |

Ogni handler segue lo schema già in uso nel progetto:

```ts
export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }) {
  try {
    const { id } = await params;
    const body = MoveSchema.parse(await request.json());     // Zod condiviso
    const { uid, role } = await requireUser(request);
    const result = await getAdminDb().runTransaction(async (tx) => { /* … */ });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);                            // già esistente
  }
}
```

### 5.4 Validazione condivisa con Zod

Gli schemi in `features/battle/schemas.ts` sono importati **sia** dai form React
Hook Form **sia** dalle API Route — esattamente come `features/auth/schemas.ts`.
Un solo punto di verità per i vincoli (`cols` 1–100, `cellSize` > 0,
`initiative` −20…50, …).

---

## 6. Sistema dei permessi

### 6.1 Matrice

| Azione | ADMIN | MASTER (proprio) | MASTER (altrui) | PLAYER | VISITOR |
| --- | :-: | :-: | :-: | :-: | :-: |
| Creare Battle Map | ✅ | ✅ | — | ❌ | ❌ |
| Modificare config/griglia/sfondo | ✅ | ✅ | ❌ | ❌ | ❌ |
| Eliminare battaglia | ✅ | ✅ | ❌ | ❌ | ❌ |
| Aggiungere/duplicare nemici | ✅ | ✅ | ❌ | ❌ | ❌ |
| Pubblicare (→ LOBBY) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Entrare in lobby | ✅ | ✅ | ✅ | ✅ | 👁 sola vista |
| Scegliere il proprio PC | — | — | — | ✅ (solo `ownerId === uid`) | ❌ |
| Posizione iniziale del proprio PC | ✅ | ✅ | — | ✅ (in LOBBY, dentro `deploymentZones`) | ❌ |
| Inserire la propria iniziativa | ✅ | ✅ | — | ✅ | ❌ |
| Avviare / pausare / terminare | ✅ | ✅ | ❌ | ❌ | ❌ |
| Muovere il proprio PC | ✅ | ✅ | — | ✅ (solo nel proprio turno, entro il budget) | ❌ |
| Muovere altre pedine | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modificare HP propri | ✅ | ✅ | — | ✅ | ❌ |
| Modificare HP altrui/nemici | ✅ | ✅ | ❌ | ❌ | ❌ |
| Applicare condizioni ad altri | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dichiarare morto un nemico | ✅ | ✅ | ❌ | ❌ | ❌ |
| Modificare l'ordine di iniziativa | ✅ | ✅ | ❌ | ❌ | ❌ |
| Forzare il turno successivo | ✅ | ✅ | ❌ | ❌ | ❌ |
| Terminare il proprio turno | ✅ | ✅ | — | ✅ | ❌ |
| Vedere HP numerici del party | ✅ | ✅ | ✅ | ✅ (`rules.revealAllyHp`) | ✅ |
| Vedere HP numerici dei nemici | ✅ | ✅ | ✅ | ❌ | ❌ |
| Vedere statblock/note dei nemici | ✅ | ✅ | ✅ | ❌ | ❌ |
| Leggere la cronaca | ✅ | ✅ | ✅ | ✅ (esclusi `masterOnly`) | ✅ |

`VISITOR` è già read-only in tutta l'app (`isContributor()` nelle rules): entra
come **spettatore** senza controllare pedine. Zero lavoro aggiuntivo.

### 6.2 Difesa a tre strati

1. **UI** — nasconde ciò che non è permesso (comodità, non sicurezza).
2. **API Route** — autorità: verifica token, ruolo, proprietà, turno, budget.
   È qui che una richiesta viene respinta.
3. **Security Rules** — impediscono di aggirare le API scrivendo o leggendo
   direttamente con l'SDK dal browser.

### 6.3 Regole Firestore da aggiungere

```
// ---------- Campo di Battaglia ----------
match /battles/{battleId} {
  function isBattleMaster() {
    return isAdmin()
      || (isSignedIn() && request.auth.uid in resource.data.masterIds);
  }

  // Lettura: i Master sempre; gli altri solo se la battaglia è stata
  // pubblicata (le bozze restano invisibili al party).
  allow read: if isBattleMaster()
    || (isSignedIn() && resource.data.status in
        ['LOBBY', 'ACTIVE', 'PAUSED', 'COMPLETED']);

  // TUTTE le scritture passano dall'Admin SDK (API Route), che bypassa
  // queste regole. Nessun client scrive direttamente.
  allow write: if false;

  match /combatants/{combatantId} {
    allow read: if isSignedIn();     // dati pubblici per costruzione
    allow write: if false;

    // Cuore della segretezza: HP numerici, statblock e note dei nemici.
    match /secret/{docId} {
      allow read, write: if isMaster();
    }
  }

  match /events/{eventId} {
    allow read: if isMaster()
      || (isSignedIn() && resource.data.masterOnly == false);
    allow write: if false;
  }

  match /presence/{uid} {
    allow read: if isSignedIn();
    // Unica eccezione alla regola "solo Admin SDK": l'heartbeat, ad alta
    // frequenza e impatto nullo. Ognuno scrive solo il proprio.
    allow create, update: if isSelf(uid) && isContributor()
      && request.resource.data.uid == request.auth.uid;
    allow delete: if isSelf(uid) || isMaster();
  }
}

match /battle_templates/{templateId} {
  allow read: if isSignedIn();
  allow write: if isMaster();
}
```

Due punti da sottolineare:

- `allow write: if false` non è un errore: l'Admin SDK **bypassa** le rules. È la
  formulazione più sicura possibile ed elimina un'intera classe di bug.
- La query dei giocatori sulla lista battaglie **deve** includere
  `where("status", "in", ["LOBBY","ACTIVE","PAUSED","COMPLETED"])`, altrimenti
  la rule la rifiuta — esattamente come già accade con `visibility` su
  `entities`. Va documentato accanto alla nota esistente nelle rules.

> ⚠️ Le rules vanno **pubblicate a mano** dalla console Firebase, come per il
> sistema personaggi.

---

## 7. Il motore di combattimento

### 7.1 Macchina a stati della battaglia

```
DRAFT ──publish──▶ READY ──publish──▶ LOBBY ──start──▶ ACTIVE ⇄ PAUSED
  ▲                                     │                 │
  └──────── unpublish (Master) ─────────┘                 ▼
                                                     COMPLETED ──▶ ARCHIVED
```

Invarianti applicate lato API:

- **DRAFT/READY**: configurazione libera; invisibile ai giocatori.
- **LOBBY**: griglia e sfondo congelati; si accettano join, posizioni iniziali,
  iniziative. Il Master può ancora aggiungere nemici.
- **ACTIVE**: `order` immutabile salvo intervento esplicito del Master; ogni
  movimento è validato contro il turno corrente.
- **PAUSED**: nessuna azione di gioco accettata (`409 Conflict`); la mappa resta
  visibile. È lo stato del "facciamo una pausa".
- **COMPLETED**: sola lettura; la cronaca resta consultabile e collegabile a una
  sessione del Diario.

### 7.2 Algoritmo di turn order

```ts
// engine/initiative.ts
export function buildOrder(entries: InitiativeEntry[]): InitiativeEntry[] {
  return [...entries].sort((a, b) =>
    // 1. Iniziativa più alta per prima
    b.initiative - a.initiative
    // 2. Pareggio → modificatore di Destrezza più alto (regola 5e)
    || b.dexMod - a.dexMod
    // 3. Pareggio ancora → priorità manuale del Master (più basso = prima)
    || (a.manualRank ?? Number.MAX_SAFE_INTEGER)
       - (b.manualRank ?? Number.MAX_SAFE_INTEGER)
    // 4. Convenzione: a parità assoluta i PC agiscono prima dei nemici
    || sideRank(a.side) - sideRank(b.side)
    // 5. Deterministico e stabile su tutti i client
    || a.combatantId.localeCompare(b.combatantId)
  );
}
```

Il criterio 5 non è un dettaglio: garantisce che client e server producano
**identico** ordinamento a parità di input — niente ordini divergenti tra schermi
diversi.

Riordino manuale del Master: drag sulla traccia iniziativa → riscrive
`manualRank` (indice progressivo) → `buildOrder` rispetta la scelta. Chi entra
in ritardo (rinforzi) viene inserito con la sua iniziativa e agisce dalla
**tornata successiva** se il suo posto è già passato.

### 7.3 Avanzamento del turno

```ts
// engine/turn.ts — puro, testabile, senza Firestore
export function advanceTurn(battle: Battle, combatants: Combatant[]): TurnPatch {
  const actionable = battle.order.filter((e) => isActionable(byId(e.combatantId)));
  if (actionable.length === 0) return { ended: true };          // scontro finito

  let index = battle.turn.turnIndex;
  let round = battle.turn.round;
  for (let step = 0; step < battle.order.length; step++) {
    index++;
    if (index >= battle.order.length) { index = 0; round++; }
    if (isActionable(byId(battle.order[index].combatantId))) break;
  }
  return {
    round, turnIndex: index,
    activeCombatantId: battle.order[index].combatantId,
    version: battle.turn.version + 1,
  };
}
```

All'inizio di ogni turno l'API resetta, per il combattente attivo:
`movementUsed = 0`, `turnState = "ACTIVE"`; il precedente passa a `COMPLETED` (o
`SKIPPED`). All'avanzare della tornata si decrementano le durate degli effetti
temporanei (fase 5).

Chi può avanzare: il **Master** sempre; il **proprietario del combattente
attivo** solo per concludere il proprio turno. Chiunque altro → `403`.

### 7.4 Algoritmo di movimento

Il problema è "quali celle sono raggiungibili con N metri di budget, aggirando
gli ostacoli". È un **Dijkstra su griglia** (BFS pesato: il terreno difficile
costa doppio).

```ts
// engine/movement.ts
export interface MovementContext {
  grid: GridConfig;
  terrain: Record<string, TerrainKind>;
  occupied: Map<string, { combatantId: string; side: CombatantSide }>;
  mover: { position: Position; size: number; side: CombatantSide };
  /** Budget residuo nell'unità della mappa (es. 9 metri). */
  budget: number;
  rules: Pick<Battle["rules"], "blockOccupied" | "enforceMovement">;
}

/** Celle raggiungibili → costo in unità di mappa. */
export function reachableCells(ctx: MovementContext): Map<string, number>;

/** Percorso ottimo verso una cella; null se irraggiungibile. */
export function pathTo(ctx: MovementContext, target: Position): Position[] | null;
```

Costo di un passo, con `cellSize = 3 m`:

| Situazione | Costo |
| --- | --- |
| Cella normale, ortogonale o diagonale (metrica `CHEBYSHEV`, 5e base) | 3 m |
| Diagonale con metrica `ALTERNATING` (variante DMG) | 3 m / 6 m alternati |
| Terreno difficile | ×2 |
| `WALL`, `PIT` | invalicabile |
| Cella occupata da un nemico | invalicabile se `blockOccupied` |
| Cella occupata da un alleato | attraversabile, non occupabile (regola 5e) |

Complessità O(cols × rows × 8). Su 30×21 = 630 celle: **microsecondi**. Si può
ricalcolare a ogni hover senza alcuna cache.

**Esempio della richiesta**: `cellSize = 3`, `speed = 9` → budget 9 m → 3 celle
di raggio Chebyshev su terreno libero. Esattamente il comportamento atteso.

Validazione server nella transazione di `/move`:

1. La battaglia è `ACTIVE` (non `PAUSED`).
2. Il chiamante è Master **oppure** `ownerId`/`controllerIds` del combattente.
3. Se non è Master: `activeCombatantId === cid`.
4. Il combattente non è `DEAD`/`REMOVED`, né bloccato da condizioni immobilizzanti.
5. `pathTo` restituisce un percorso valido con `cost ≤ speed - movementUsed`
   (se `enforceMovement`; altrimenti passa con avviso).
6. La cella di destinazione è libera **al momento della transazione**.
7. Scrive `position`, `movementUsed += cost` e l'evento `COMBATANT_MOVED`.

Il Master **non** è soggetto ai punti 3 e 5: la sua è autorità narrativa
(teletrasporti, spinte, effetti). Ogni suo movimento resta però tracciato nella
cronaca.

### 7.5 Distanze — modulo riusabile

```ts
// engine/geometry.ts
export function cellDistance(a: Position, b: Position, metric: DistanceMetric): number;

/** Distanza nel mondo di gioco: "12 metri". */
export function worldDistance(a: Position, b: Position, grid: GridConfig): number;
export function formatDistance(value: number, unit: DistanceUnit): string;

/** Celle entro un raggio: range di armi/incantesimi, AoE. */
export function cellsInRadius(center: Position, radius: number, grid: GridConfig): Position[];
export function cellsInCone(origin: Position, direction: number, length: number, angle: number, grid: GridConfig): Position[];
export function cellsInLine(from: Position, to: Position, width: number, grid: GridConfig): Position[];
export function cellsInRect(rect: CellRect): Position[];

/** Bresenham su griglia — base per la line of sight (fase 7). */
export function lineOfSight(from: Position, to: Position, terrain: Record<string, TerrainKind>): boolean;
```

Questo modulo è **l'investimento con il rendimento più alto** dell'intero
progetto: scritto una volta in fase 2 per il movimento, alimenta senza modifiche
il righello, i range d'attacco, gli incantesimi, le aree di effetto, il fog of
war e la linea di vista.

Nella UI: selezionare una pedina e passare su un'altra mostra *"Il Goblin si
trova a 12 metri"*; un pulsante "righello" misura tra due celle qualsiasi.

### 7.6 Proiezione per ruolo

```ts
// engine/visibility.ts
export function projectCombatant(
  combatant: Combatant,
  secret: CombatantSecret | null,
  viewer: { uid: string; role: Role },
  battle: Battle
): CombatantView;
```

Funzione **pura** che decide cosa un dato utente vede di una data pedina. Usata
dalla UI per rendere e — soprattutto — dalle API per decidere quali campi
scrivere sul documento pubblico. Un solo punto di verità sulla riservatezza,
invece di condizioni sparse in venti componenti.

---

## 8. Mappa, griglia, immagini

### 8.1 Il modello a due spazi

Il concetto che tiene insieme tutto: si separa lo **spazio logico** (celle:
`cols × rows`) dallo **spazio di rendering** (pixel sullo schermo). Le posizioni
sono **sempre** in celle. Il rendering è una pura trasformazione.

```
Mondo:      30 m × 21 m,  cellSize 3 m
Logico:     10 × 7 celle                   ← ciò che si persiste
Rendering:  cellPx = viewportWidth / cols  ← ricalcolato a ogni resize
```

Zoom e pan **non toccano mai** il modello: sono `scale` e `translate` in stato
locale del componente. Ridimensionare la finestra non altera nulla di logico —
requisito esplicito della richiesta, soddisfatto per costruzione.

### 8.2 Adattamento dell'immagine

L'immagine di sfondo non determina la griglia: **la griglia è autorevole**. Al
caricamento si leggono `naturalWidth/Height` e si mostra il rapporto d'aspetto a
confronto con quello della griglia (`cols/rows`):

- rapporti coincidenti → `COVER`, allineamento perfetto;
- rapporti diversi → si avvisa il Master (*"L'immagine è 16:9, la griglia
  10:7"*) e si offrono `CONTAIN` (bande) o `COVER` (ritaglio), con anteprima
  dal vivo;
- se l'immagine ha **già** una griglia disegnata (mappe scaricate), i controlli
  `offsetX`, `offsetY`, `imageScale` permettono di allineare la griglia
  applicativa a quella dipinta. Senza questi tre campi metà delle mappe
  reperibili online sarebbe inutilizzabile: sono da mettere in fase 1.

Utility proposta:

```ts
export function suggestGrid(naturalW: number, naturalH: number, cellSize: number)
  : { cols: number; rows: number };
```

Suggerisce la griglia dal rapporto dell'immagine, così il Master parte da un
valore sensato e corregge.

### 8.3 Rendering: DOM/SVG, non canvas

| Livello | Tecnica | Perché |
| --- | --- | --- |
| Sfondo | `<img>` in un wrapper trasformato | `unoptimized: true` + `optimizeCloudinary()` |
| Griglia | **un** `<svg>` con `<pattern>` | 1 nodo DOM per l'intera griglia, nitido a ogni zoom, colore `--hairline` |
| Terreno/aree | `<rect>`/`<polygon>` nello stesso SVG | pochi nodi |
| Overlay movimento | `<rect>` per cella raggiungibile + `<path>` del percorso | ricalcolo O(celle) |
| Pedine | `<div>` in posizione assoluta + `framer-motion` | drag, avatar, badge, accessibilità gratis |
| Pannelli | React + classi `glass` | coerenza Obsidian |

Con ~30 pedine si resta abbondantemente a 60fps animando solo `transform`. Il
canvas si giustificherebbe oltre le ~300 entità: non è questo il caso, e il DOM
offre accessibilità e hit-testing che il canvas richiederebbe di riscrivere.

### 8.4 Zoom, pan, fullscreen

Nessuna libreria nuova:

- **Zoom**: `wheel` con `ctrlKey` (pinch da trackpad) e pulsanti ±; `scale`
  limitato a 0.25–4, ancorato al puntatore.
- **Pan**: pointer drag su spazio vuoto, barra spaziatrice + drag, o due dita su
  touch (`touch-action: none` sul viewport).
- **Fullscreen**: `element.requestFullscreen()`.
- **Fit**: pulsante "Adatta" che ricalcola scale/translate per contenere la mappa.
- **Reduced motion**: transizioni disattivate, movimenti istantanei.

Tablet: pointer events unificati, hit target ≥44px, la traccia iniziativa
diventa una barra orizzontale in basso.

### 8.5 Token e placeholder

Priorità della sorgente immagine di una pedina: `combatant.tokenUrl` →
`EntityPublicCard.tokenUrl` (PC) → `entity.imageUrl` (creatura) →
**placeholder per categoria**.

I placeholder sono generati, non file: iniziale del nome su disco di colore
derivato dalla categoria (BOSS cremisi, MAGIC viola, RANGED verde…), con
l'anello proprio della categoria. Zero asset da produrre, coerenza garantita,
niente texture — in linea con la Constitution v2.

### 8.6 Duplicazione dei nemici

Nel form nemico un campo **"Quantità"**. Con `count: 8` l'API crea 8 documenti:

- nomi `Goblin A`…`Goblin H` (oltre la Z: `Goblin AA`);
- `accent` da una palette ciclica per distinguerli a colpo d'occhio;
- HP identici, oppure tirati (`rollHp: "4d6+4"`) se il Master lo chiede;
- posizioni auto-disposte in blocco attorno alla cella scelta, solo celle libere;
- iniziativa unica di gruppo (uso comune al tavolo) o individuale, a scelta.

---

## 9. UX della schermata di combattimento

### 9.1 Struttura (desktop ≥1024px)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ⟵ Esci   Assedio del Ponte Nero    ● Tornata 3 · Turno di Kaelen    │ 56px, glass
├───────────────────────────────────────────────┬──────────────────────┤
│                                               │  ORDINE INIZIATIVA   │
│                                               │  ▸ Mago        22    │ 320px
│              CAMPO (zoom / pan)               │  ● Goblin A    18 ◀  │ glass
│                                               │    Guerriero   16    │
│              griglia hairline                 │    Goblin B    14    │
│              pedine · overlay movimento       │    Boss        10    │
│                                               │  ✝ Ladro        8    │
│                                               ├──────────────────────┤
│                                               │  SELEZIONATO         │
│                                               │  Kaelen ██████░ 34/48│
│  [− 100% +] [Adatta] [⛶] [📏] [🎬 Regia]      │  Movimento 6/9 m     │
│                                               │  Condizioni: Prono   │
│                                               │  [ Fine turno ]      │
└───────────────────────────────────────────────┴──────────────────────┘
```

### 9.2 Struttura mobile/tablet

Mappa a tutto schermo; la traccia iniziativa diventa una **striscia orizzontale
scorrevole** in alto; il pannello del selezionato è un **bottom sheet** a due
altezze (riassunto / esteso) — coerente con `Sheet` già in uso. "Fine turno" è
un pulsante fisso in basso a destra, visibile solo a chi è di turno. Nessun
elemento si sovrappone alla pedina attiva.

### 9.3 Segnali visivi (linguaggio Obsidian)

| Stato | Resa |
| --- | --- |
| Pedina attiva | Anello `--gold` 2px + `.glow-accent` pulsante lento (unico glow della schermata) |
| Selezionata | Anello `--hairline-strong` + pannello aperto |
| Raggiungibile | Cella `--gold` al 6% di opacità, bordo hairline |
| Percorso | Tratteggio oro con etichetta del costo ("6 m") |
| Fuori portata | Cella cremisi 8%, cursore `not-allowed` |
| Morta | Pedina in scala di grigi, opacità 45%, croce sottile, esclusa dalla traccia |
| Nemico | Anello cremisi freddo; barra vita **qualitativa** (a fasce), mai numerica |
| PC/alleato | Anello ambra; barra vita numerica |
| Turno concluso | Voce della traccia al 50% |
| Nascosta ai player | Solo per il Master: tratteggio + icona occhio barrato |

Coerente con la Constitution: superfici pulite, profondità dalla luce, oro raro e
usato **solo** per il combattente attivo — il segnale più importante dello schermo.

### 9.4 Regia del Master

Barra su vetro, apribile con `G`, ancorata in basso:

`+ Nemico` · `Sposta` · `HP` · `Condizioni` · `Iniziativa` · `Terreno` ·
`Rivela/Nascondi` · `⏸ Pausa` · `⏭ Turno successivo` · `⏹ Termina`

Il click destro su una pedina apre lo stesso menu contestuale (via
`dropdown-menu` esistente). Le azioni distruttive (uccidi, rimuovi, termina)
passano da `ConfirmDialog`, già nel progetto.

### 9.5 Scorciatoie da tastiera

`Spazio` fine turno · `Esc` deseleziona · `+/−` zoom · `F` adatta · `M` righello ·
`G` regia (Master) · `Tab` scorre le pedine (accessibilità).

Tutte le pedine sono `button` focalizzabili con `aria-label` completa: la mappa
resta navigabile da tastiera e leggibile da screen reader — requisito WCAG 2.2 AA.

---

## 10. Concorrenza, riconnessione, integrità

### 10.1 Race condition e mitigazioni

| Scenario | Rischio | Mitigazione |
| --- | --- | --- |
| Due click su "Fine turno" | Doppio avanzamento: si salta un combattente | `expectedVersion` nel body; la transazione fallisce con `409` se `turn.version` è cambiato |
| Master e player avanzano insieme | Idem | Stesso meccanismo di versione |
| Due pedine sulla stessa cella | Sovrapposizione | La transazione rilegge l'occupazione **dentro** la transazione |
| Danno applicato due volte (retry di rete) | HP sbagliati | `actionId` UUID generato dal client; l'evento usa `actionId` come **id documento** → `create` fallisce sul duplicato = idempotenza |
| Master modifica l'ordine a turno in corso | Indice incoerente | `advanceTurn` risolve per `combatantId`, non per indice; l'indice si ricalcola dall'id attivo |
| Due Master modificano lo stesso nemico | Ultimo vince | Accettabile (co-DM cooperativi); la cronaca mostra chi ha fatto cosa |
| Player muove mentre il Master lo sposta | Salto visivo | Il server è autorevole; l'overlay ottimistico si annulla |

Ogni mutazione non banale gira dentro `runTransaction` dell'Admin SDK: lettura →
validazione → scrittura, atomicamente.

### 10.2 Riconnessione

Nessuno stato vive solo in memoria: chiudere il browser e rientrare è
indistinguibile da un refresh.

1. `onSnapshot` si riconnette da solo (backoff dell'SDK).
2. Al rientro, gli snapshot ricostruiscono l'intera scena.
3. La presenza si riattiva col primo heartbeat.
4. Il client mostra *"Riconnessione al campo…"* in base a
   `snapshot.metadata.fromCache`.
5. Le richieste API in volo al momento della disconnessione sono idempotenti
   (`actionId`): un retry non raddoppia nulla.

Se un giocatore sparisce a metà turno, il Master può fare `SKIP` — nessun blocco.

### 10.3 Integrità dei dati

- **Snapshot, non riferimenti**: modificare il PC nel Codex a battaglia in corso
  non altera il combattente. Un'azione esplicita "Risincronizza dalla scheda"
  esiste, ma è una scelta del Master.
- **Al termine** (`COMPLETED`) il Master può, con conferma, riportare gli HP
  finali sulle schede dei PC — un unico punto di scrittura verso `entities`.
- La cronaca è **append-only**: nessuna API la modifica.

---

## 11. Sicurezza

| Minaccia | Difesa |
| --- | --- |
| Player legge gli HP dei nemici via SDK | Non sono nel documento pubblico: stanno in `secret/master`, negato dalle rules |
| Player muove la pedina di un altro | L'API verifica `ownerId`/`controllerIds`; le rules negano la scrittura diretta |
| Player si muove fuori turno | L'API verifica `activeCombatantId` |
| Player supera il movimento | `pathTo` calcolato **server-side** sui dati del server, non su quelli inviati dal client |
| Player si dichiara vivo dopo la morte | Solo il Master scrive `isDead` (endpoint dedicato) |
| Player altera l'iniziativa altrui | L'API accetta l'iniziativa solo per il proprio combattente e solo in `LOBBY` |
| Master di un'altra battaglia interferisce | `requireBattleMaster` verifica `masterIds` |
| Bozze visibili al party | Le rules negano la lettura fuori dagli stati pubblicati |
| Token rubato/scaduto | `verifyIdToken` a ogni chiamata (già nel pattern esistente) |
| Payload malevolo | Zod su ogni body, con limiti numerici stretti |
| Abuso di scritture | Limite di lunghezza su nomi/note; cap ai combattenti per battaglia (es. 100) |
| XSS via nomi/note | React escapa di default; nessun `dangerouslySetInnerHTML` nella feature |
| URL immagine arbitrario | `isLikelyImageUrl` esistente + CSP `img-src` (già valido per il resto dell'app) |

Principio generale: **il client non manda mai un risultato, manda un'intenzione**.
"Voglio andare alla cella (7,4)" — non "il mio movimento usato ora è 3".

---

## 12. Scalabilità e costi

### 12.1 Volume realistico

Una sessione tipo: 6 PC + 15 nemici, 3 ore, 7 client connessi.

| Operazione | Scritture | Letture (7 client) |
| --- | --- | --- |
| Un movimento | 2 (combattente + evento) | 14 |
| Un danno | 3 (pubblico + segreto + evento) | ~14 |
| Un cambio di turno | 2 (battaglia + evento) | 14 |
| Heartbeat | 7 ogni 25 s | trascurabile |

Stima per sessione: **~10.000 letture, ~4.000 scritture**. Il piano gratuito
Firestore offre 50.000 letture e 20.000 scritture al giorno: una sessione di
gioco resta comodamente dentro il free tier. Nessun problema di costi
all'orizzonte per questo progetto.

### 12.2 Limiti tecnici e margini

| Limite | Valore | Margine |
| --- | --- | --- |
| Documento Firestore | 1 MiB | `battles` con ~20.000 celle di terreno resta sotto |
| Scritture sullo stesso documento | ~1/s sostenute | `battles/{id}` cambia solo a fine turno |
| Listener per client | 100 | ne servono 4 |
| Combattenti per battaglia | pratico ~100 | oltre, il rendering DOM andrebbe rivisto |

Il collo di bottiglia potenziale sarebbe la scrittura frequente sul documento
`battles/{id}` — evitata **per design** tenendo posizione e HP nei documenti
per-combattente.

### 12.3 Indici Firestore necessari

`firestore.indexes.json` oggi è vuoto. Serviranno:

```json
{ "indexes": [
  { "collectionGroup": "battles", "queryScope": "COLLECTION",
    "fields": [ {"fieldPath":"campaignId","order":"ASCENDING"},
                {"fieldPath":"status","order":"ASCENDING"},
                {"fieldPath":"updatedAt","order":"DESCENDING"} ] },
  { "collectionGroup": "events", "queryScope": "COLLECTION",
    "fields": [ {"fieldPath":"masterOnly","order":"ASCENDING"},
                {"fieldPath":"at","order":"DESCENDING"} ] }
] }
```

---

## 13. Modifiche necessarie all'architettura esistente

Tutte **additive**: nessuna rottura di funzionalità esistenti.

| File | Modifica | Rischio |
| --- | --- | --- |
| `lib/constants.ts` | `COLLECTIONS.battles`, `battleTemplates` | nullo |
| `lib/server/api-helpers.ts` | `requireUser`, `requireRole`, `requireBattleMaster` | nullo (aggiunte) |
| `lib/upload/image-service.ts` | `ImageFolder` + `"battlemap" \| "token"` | nullo |
| `components/layout/nav-config.ts` | Voce "Campo di Battaglia" + `activePaths` | nullo |
| `firestore.rules` | Blocco `battles/**` prima del catch-all | **medio** — va pubblicato a mano e verificato |
| `firestore.indexes.json` | Indici sopra | basso |
| `app/(battle)/layout.tsx` | Nuovo route group | nullo |
| `app/(app)/master/page.tsx` | Pannello "Tavolo di Guerra" | basso |
| `app/(app)/party/page.tsx` | Banner "Battaglia in corso" | basso |
| `docs/ARCHITECTURE.md` | Sezione sulle nuove collection | nullo |

**Nessuna modifica** a: sistema entità, sistema personaggi, Codex, Cronache,
Area Personale, Party, autenticazione. Il Combat System si innesta di lato e
**consuma** il codex esistente senza alterarlo — che è esattamente il criterio
di "soluzione non isolata ma nemmeno invasiva".

Nuove dipendenze npm: **zero**.

---

## 14. Valutazione delle funzionalità (richiesta §16)

Verdetto motivato su ciascuna, con la fase di destinazione.

| Funzionalità | Verdetto | Fase | Nota architetturale |
| --- | --- | --- | --- |
| Condizioni (Prono, Stordito, Avvelenato…) | **Sì** | F3 | Riusa `ConditionEntry` del Codex: continuità col personaggio |
| Movimento diagonale | **Sì** | F2 | `metric` configurabile per battaglia |
| Celle occupate | **Sì** | F2 | Già in `MovementContext` |
| Misuratore di distanze | **Sì** | F2 | `geometry.ts`, valore altissimo per lo sforzo |
| Terreno difficile | **Sì** | F4 | Costo ×2, già previsto nel Dijkstra |
| Muri / zone non attraversabili | **Sì** | F4 | `terrain` sparso + editor pennello |
| Log degli eventi | **Sì** | F2 | `events` fin da subito: alimenta anche l'undo |
| Pausa | **Sì** | F3 | Uno stato della macchina |
| Salvataggio/ripristino | **Sì (per costruzione)** | F1 | Tutto è persistito: non è una feature, è una proprietà |
| Riconnessione | **Sì (per costruzione)** | F1 | Gestita dall'SDK |
| Iniziativa automatica | **Sì** | F3 | `1d20 + dexMod`, tiro assistito dal server |
| Timer del turno | **Sì** | F5 | `turnStartedAt` già nel modello; informativo, mai bloccante |
| Morte e Death Saves | **Sì** | F5 | `deathSaves` già nel modello |
| NPC alleati / neutrali | **Sì** | F3 | `CombatantSide` li prevede già |
| Evocazioni | **Sì** | F5 | Un combattente aggiunto a scontro in corso |
| Nascondere info ai player | **Sì** | F1 | `secret/master` + `visible`: è il fondamento, non un'aggiunta |
| Undo del Master | **Sì** | F6 | `event.inverse`: quasi gratuito avendo la cronaca |
| Duplicazione battaglia | **Sì** | F6 | Copia profonda della bozza |
| Template di mappe | **Sì** | F6 | `battle_templates` |
| Più Master | **Sì** | F1 | `masterIds: string[]` da subito: cambiarlo dopo sarebbe una migrazione |
| Range armi/incantesimi | **Sì** | F5 | Puro riuso di `geometry.ts` |
| Effetti di area | **Sì** | F5 | `cellsInRadius/Cone/Line` già progettate |
| Fog of war | **Predisposto** | F7 | Serve `visible` + posizioni **non** scritte nel doc pubblico finché nascoste: la sicurezza va progettata ora, l'implementazione può attendere |
| Line of sight | **Predisposto** | F7 | Bresenham su `terrain`; costoso in UX (per-viewer), non in algoritmo |
| Reazioni / azione bonus / concentrazione | **Predisposto** | F7 | Serve `actionEconomy` per combattente: aggiungibile senza migrazione |
| Marker sulla mappa | **Sì** | F4 | Stesso livello del terreno |
| Griglia esagonale | **Predisposta, non implementata** | — | `grid.kind: "HEX"` esiste; richiede coordinate assiali in `geometry.ts`. Raddoppia i test del motore per un beneficio marginale in 5e |
| Controllo delegato di un PC | **Sì** | F5 | `controllerIds` già nel modello |
| Tiri di dado integrati | **Consigliato, non richiesto** | F5 | Un `dice.ts` puro + eventi in cronaca completerebbe il ciclo senza dipendenze |

### 14.1 Cosa manca alla richiesta e che ritengo necessario

Cinque elementi non menzionati che, da valutazione di un vero combat system,
fanno la differenza fra "funziona" e "si usa davvero al tavolo":

1. **Fascia di salute qualitativa** (`healthBand`). Senza, l'unica scelta è fra
   rivelare gli HP dei nemici e non mostrare nulla. Con, il Master comunica *"il
   Boss è gravemente ferito"* — che è ciò che accade davvero al tavolo.
2. **Cronaca fin dalla fase 2**. Rende ogni bug diagnosticabile ("cosa è
   successo al turno 4?") e abilita undo e recap di sessione. Aggiungerla dopo
   significherebbe non avere storia degli scontri già giocati.
3. **Calibrazione della griglia** (`offsetX/Y`, `imageScale`). Senza, quasi tutte
   le mappe scaricate da internet — che hanno già una griglia disegnata —
   risultano disallineate e inutilizzabili.
4. **`masterIds` come array dal primo giorno**. Passare da `createdBy: string` a
   `masterIds: string[]` dopo richiede una migrazione dei dati; farlo ora costa
   zero.
5. **Collegamento al codex** (`links.locationId/questId/sessionId`). È ciò che
   impedisce al Combat System di essere una feature isolata: la battaglia avviene
   *in un luogo*, *per una quest*, *durante una sessione*, ed entra nelle
   Cronache a scontro concluso.

---

## 15. Piano di implementazione incrementale

Ogni fase è **rilasciabile**: al termine c'è qualcosa di usabile al tavolo.

### Fase 0 — Fondamenta (nessuna UI)

**Obiettivo**: modelli, regole, contratti. Nulla è visibile, tutto è pronto.

- `types/battle.ts` completo (§3).
- `features/battle/schemas.ts` (Zod).
- `lib/constants.ts`: nuove collection · `image-service.ts`: nuove folder.
- `api-helpers.ts`: `requireUser`, `requireRole`, `requireBattleMaster`.
- `firestore.rules`: blocco `battles/**` → **pubblicazione manuale**.
- `firestore.indexes.json`: indici.
- `engine/geometry.ts` e `engine/initiative.ts` (moduli puri, con casi di prova).

**Rinviato**: tutto il resto.

### Fase 1 — Creazione della Battle Map (Master)

**Obiettivo**: il Master crea, configura e salva una mappa.

- `POST /api/battles`, `PATCH /api/battles/[id]`, `DELETE`.
- `/battaglie` — elenco (riusa `ListPageHero` e il linguaggio delle card).
- `/battaglie/[id]/preparazione` — `map-editor.tsx`: nome, descrizione,
  cols/rows, `cellSize`, unità, sfondo (upload Cloudinary), `fit`, rotazione,
  oscuramento, calibrazione griglia, anteprima live.
- `battle-canvas.tsx` + `battle-grid.tsx`: zoom, pan, fit, fullscreen.
- Pannello "Tavolo di Guerra" nella Sala del Master.
- Stati: `DRAFT` ⇄ `READY`.

**Verificabile**: 30×21 m con celle da 3 m → griglia 10×7, immagine allineata,
zoom e pan fluidi, riapertura senza perdite.

**Rinviato**: nemici, lobby, combattimento.

### Fase 2 — Nemici, schieramento, movimento base

**Obiettivo**: pedine sulla mappa e movimento con budget. Il cuore del sistema.

- `POST /combatants` con `count` (duplicazione) e categorie.
- `enemy-form.tsx`: nome pubblico/reale, immagine, categoria, importanza, HP,
  CA, movimento, taglia, note. Import dal Bestiario (`type: "creature"`).
- Placeholder per categoria.
- `battle-token.tsx`: drag & drop sulla griglia (Master, in preparazione).
- `engine/movement.ts` + `movement-overlay.tsx`: celle raggiungibili, percorso,
  costo, movimento residuo.
- `POST /combatants/[cid]/move` con validazione transazionale.
- Righello (`geometry.ts`) e distanze mostrate al passaggio.
- `events`: cronaca attiva da qui.
- Realtime: `useBattle`, `useCombatants` via `onSnapshot`.

**Verificabile**: 8 Goblin creati in un'operazione; una pedina con 9 m si muove
al massimo di 3 celle; due browser vedono lo stesso movimento entro ~300 ms.

**Rinviato**: turni, iniziativa, HP in combattimento.

> Fase più densa del piano: conviene spezzarla in due iterazioni — prima le
> pedine statiche, poi il movimento.

### Fase 3 — Lobby, iniziativa, turni

**Obiettivo**: il ciclo completo del combattimento.

- `publish` → `LOBBY`; `join`/`leave`; presenza con heartbeat.
- `battle-lobby.tsx`: il player sceglie il PC, la posizione (dentro
  `deploymentZones`) e inserisce l'iniziativa; il Master vede i connessi e
  imposta l'iniziativa dei nemici (manuale o tirata).
- `start` → `ACTIVE`: `buildOrder`, tornata 1.
- `initiative-track.tsx`: ordine, attivo evidenziato, riordino manuale (drag).
- `turn`: fine turno, skip, forzatura, indietro; reset del movimento.
- `combatant-inspector.tsx` con `projectCombatant` (proiezione per ruolo).
- HP: `/hp` per danno/cura; `healthBand` per i nemici; condizioni base.
- `PAUSED` / `COMPLETED`.

**Verificabile**: il ciclo end-to-end della §17 della richiesta, dai passi 1 a 18.

**Rinviato**: terreno, azioni, AoE.

### Fase 4 — Terreno e strumenti del Master

- Editor terreno a pennello: `WALL`, `DIFFICULT`, `HAZARD`, `WATER`, `PIT`.
- Costi di movimento per terreno; muri come ostacoli nel pathfinding.
- Marker narrativi sulla mappa (torce, trappole, obiettivi).
- Regia completa: modifica massiva HP, condizioni, rivela/nascondi, rimozione.
- `battle-log.tsx`: cronaca filtrabile, eventi `masterOnly` esclusi ai player.

### Fase 5 — Profondità regolistica

- Economia delle azioni: azione, azione bonus, reazione, movimento
  (`actionEconomy` sul combattente).
- Range di armi e incantesimi; aree di effetto (cerchio, cono, linea, cubo).
- Death saving throws; morte e resurrezione.
- Concentrazione ed effetti temporanei con durata a tornate.
- Timer del turno (informativo).
- Evocazioni e alleati aggiunti a scontro in corso.
- Controllo delegato (`controllerIds`).
- Tiri di dado integrati con esito in cronaca.

### Fase 6 — Produttività del Master

- Undo/redo tramite `event.inverse`.
- Duplicazione di una battaglia.
- `battle_templates`: salva/carica terreni noti.
- Archiviazione e storico; collegamento a una sessione del Diario.
- Riporto degli HP finali sulle schede dei PC.
- Export della cronaca in una Cronaca del Libro.

### Fase 7 — Avanzate (solo se richieste)

- Fog of war per-giocatore (richiede documenti di visibilità per uid).
- Line of sight e coperture.
- Griglia esagonale (coordinate assiali).
- Spettatori con vista dedicata.
- Statistiche post-battaglia (danni inflitti, subiti, turni).

---

## 16. Rischi e questioni aperte

| Rischio | Impatto | Mitigazione |
| --- | --- | --- |
| Rules pubblicate a mano, dimenticate | **Alto**: dati riservati esposti | Checklist di fine fase; prova con un account PLAYER di test prima di considerare chiusa la fase |
| Latenza percepita nel movimento (API + snapshot) | Medio | UI ottimistica con overlay locale; se insufficiente, valutare la scrittura diretta del solo campo `position` con rules restrittive |
| Complessità della fase 2 (motore + drag + realtime insieme) | Medio | Spezzare in due iterazioni, come annotato |
| Rendering DOM oltre ~100 pedine | Basso | Virtualizzazione o canvas solo se emerge davvero |
| Mono-campagna dato per scontato | Basso | `campaignId` presente da subito |
| Divergenza fra logica client e server | Medio | I moduli `engine/` sono **gli stessi file** importati da entrambi i lati: non c'è duplicazione da tenere allineata |

### Decisioni che restano da confermare

1. **Un PC per giocatore o più?** `useMyCharacter()` restituisce oggi il primo PC
   posseduto; la lobby può gestire la scelta multipla senza costi aggiuntivi.
2. **Griglia esagonale**: predisposta ma non implementata. Confermare che non
   serva (in 5e è marginale).
3. **HP dei nemici visibili ai player**: il default proposto è `BAND` (fascia
   qualitativa). Confermare.
4. **Movimento diagonale**: default `CHEBYSHEV` (5e base, diagonale = 1) con
   `ALTERNATING` selezionabile per battaglia. Confermare il default.
5. **Tiri di dado integrati**: non richiesti, ma il ciclo di combattimento resta
   incompleto senza. Da decidere se includerli in F5.

---

## 17. Stato di avanzamento — handoff

> Aggiornare questa sezione alla fine di ogni sessione di lavoro.
> È il punto da cui ripartire: cosa è fatto, cosa manca, cosa è stato deciso.

**Ultimo aggiornamento**: 24 agosto 2026
**Fase corrente**: F0 — Fondamenta (parzialmente completata)
**Stato git**: tutto **non committato** (untracked), ultimo commit `b9f8e49`
**Verifica**: `npx tsc --noEmit` pulito

### Fatto

| File | Righe | Contenuto |
| --- | --: | --- |
| `docs/COMBAT_SYSTEM.md` | ~1600 | Questo documento: analisi + piano |
| `src/types/battle.ts` | 564 | Modelli completi: `Battle`, `GridConfig`, `BackgroundImage`, `Combatant`, `CombatantSecret`, `BattleEvent`, `BattlePresence`, `InitiativeEntry`, `TurnState`, `CombatantView` + default (`DEFAULT_GRID`, `DEFAULT_BATTLE_RULES`, `BATTLE_LIMITS`) |
| `src/features/battle/constants.ts` | 319 | Etichette diegetiche IT, badge di stato, categorie nemico con accenti, `TERRAIN_COST_MULTIPLIER`, soglie `HEALTH_BAND_THRESHOLDS`, `CELL_SIZE_PRESETS`, `duplicateSuffix()` |
| `src/features/battle/engine/geometry.ts` | 522 | Distanze (4 metriche), `entityDistance` con ingombro, aree (raggio/cono/linea/rettangolo), Bresenham + `lineOfSight`, celle↔pixel, `suggestGrid`, `aspectMismatch` |
| `src/features/battle/engine/initiative.ts` | 142 | `buildOrder` con i 5 criteri di spareggio, `applyManualOrder`, `upsertEntry`, `findTies` |

Nessun file esistente è stato modificato. Nessuna dipendenza npm aggiunta.

### Da fare per chiudere la F0

1. `src/features/battle/engine/health.ts` — `healthBandFor(hp)` dalle soglie già
   definite in `constants.ts`; `applyDamage` / `applyHealing` puri (con HP
   temporanei consumati per primi).
2. `src/features/battle/schemas.ts` — Zod v4, condivisi client/server: schemi di
   creazione/modifica battaglia, griglia, sfondo, combattente, movimento, HP,
   turno. Limiti da `BATTLE_LIMITS`.
3. `src/lib/constants.ts` — aggiungere a `COLLECTIONS`: `battles: "battles"`,
   `battleTemplates: "battle_templates"`.
4. `src/lib/upload/image-service.ts` — `ImageFolder` diventa
   `EntityType | "misc" | "battlemap" | "token"`.
5. `src/lib/server/api-helpers.ts` — aggiungere `requireUser`, `requireRole`,
   `requireBattleMaster` (quest'ultima legge `battles/{id}` con l'Admin SDK e
   verifica `role === "ADMIN" || masterIds.includes(uid)`).
6. `firestore.rules` — blocco `battles/**` (vedi §6.3) **prima** del catch-all
   `match /{document=**}`. ⚠️ **Da pubblicare a mano dalla console Firebase**:
   finché non è pubblicato, la feature non è sicura.
7. `firestore.indexes.json` — i due indici della §12.3 (oggi il file è vuoto).
8. `scripts/check-combat-engine.ts` — verifica dei moduli puri con `node:assert`,
   eseguibile via `tsx` (già dipendenza dev). Aggiungere lo script
   `"check:combat": "tsx scripts/check-combat-engine.ts"` in `package.json`.
   Niente framework di test: il progetto non ne ha e non serve introdurlo.

### Casi da coprire nello script di verifica

- `cellDistance`: (0,0)→(3,3) = 3 con CHEBYSHEV, 6 con MANHATTAN,
  4 con ALTERNATING (3 diagonali: 3 + floor(3/2) = 4), ~4,24 con EUCLIDEAN.
- `worldDistance` con `cellSize: 3` → (0,0)→(3,0) = 9 m (il caso della richiesta:
  9 metri di movimento = 3 celle).
- `footprint`/`entityDistance` con taglia 2: due creature Grandi adiacenti
  devono risultare a distanza `cellSize`, non `2 × cellSize`.
- `buildOrder`: pareggio a 18 risolto dal `dexMod`; pareggio pieno risolto in
  modo deterministico (stesso ordine su due invocazioni con input mescolato).
- `applyManualOrder`: la sequenza scelta dal Master sopravvive a un successivo
  `buildOrder`.
- `duplicateSuffix`: 0→"A", 25→"Z", 26→"AA".
- `suggestGrid(1920, 1080)` con lato lungo 20 → 20×11.

### Decisioni prese (default già scritti nel codice)

Assunte senza attendere conferma perché **configurabili per singola battaglia**:
cambiarle è una riga in `DEFAULT_BATTLE_RULES` / `DEFAULT_GRID`.

| Decisione | Valore | Dove |
| --- | --- | --- |
| Salute dei nemici visibile ai player | `BAND` (fascia qualitativa) | `DEFAULT_BATTLE_RULES.enemyHpDisplay` |
| Metrica diagonale | `CHEBYSHEV` (5e base) | `DEFAULT_GRID.metric` |
| Lato di cella predefinito | 1,5 m (= 5 ft) | `DEFAULT_GRID.cellSize` |
| Griglia predefinita | 20 × 15 | `DEFAULT_GRID` |
| Movimento oltre budget | bloccato | `DEFAULT_BATTLE_RULES.enforceMovement` |
| HP degli alleati visibili al party | sì | `DEFAULT_BATTLE_RULES.revealAllyHp` |

### Ancora da confermare con l'autore

1. **Un PC per giocatore o più?** `useMyCharacter()` restituisce oggi il primo PC
   posseduto; la lobby può gestire la scelta multipla senza costi aggiuntivi.
2. **Griglia esagonale**: `GRID_KINDS` la prevede, `geometry.ts` la ignora
   (tutte le funzioni assumono celle quadrate). Da implementare solo se serve.
3. **Tiri di dado integrati**: non richiesti, ma il ciclo di combattimento resta
   incompleto senza. Da decidere se includerli in F5.

### Promemoria per chi riprende

- I moduli `engine/` sono **puri**: nessun import da Firebase, React o DOM.
  Vanno importati sia dai componenti sia dalle API Route — è ciò che impedisce
  alla logica di divergere fra client e server. Non introdurre `"use client"`.
- Le API di combattimento non esistono ancora: la prima va scritta in F1
  (`POST /api/battles`), seguendo lo stile di `src/app/api/players/route.ts`
  (`runtime = "nodejs"`, `try/catch` con `handleApiError`).
- Le Security Rules del blocco `battles/**` non sono ancora scritte: finché non
  lo sono, **nessun dato di battaglia deve essere scritto in produzione**.

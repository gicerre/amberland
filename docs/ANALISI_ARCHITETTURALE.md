# Amberland — Fase 0: Analisi architetturale e funzionale

> Data: 9 novembre 2026 · Stato analizzato: `main` @ `7613a17` **più** il
> working tree non committato (31 file modificati, 17 nuovi: +3.931 / −2.020 righe,
> quasi tutto nel Combat System).
> Natura del documento: **analisi**, nessuna modifica al codice applicativo.

### Legenda delle affermazioni

| Marca | Significato |
| --- | --- |
| **[V]** Fatto verificato | Controllato leggendo il codice o eseguendo uno strumento |
| **[C]** Problema confermato | Il difetto è visibile nel codice; il meccanismo è certo |
| **[P]** Potenziale criticità | Il meccanismo esiste; l'impatto dipende dall'uso reale |
| **[I]** Ipotesi | Dedotta, non verificata: da approfondire |
| **[F]** Facoltativo | Miglioramento non necessario |

### Verifiche eseguite

| Controllo | Esito |
| --- | --- |
| `npx tsc --noEmit` | **[V]** 0 errori |
| `npx eslint src scripts` | **[V]** 0 errori, 6 warning (import inutilizzati, una dipendenza `useMemo`) |
| `npm run check:combat` | **[V]** 105 verifiche superate (unico test automatico del progetto) |
| Ricerca moduli non importati | **[V]** 5 file orfani (vedi §9) |
| `next build` | **Non eseguito**: scrive `.next` e romperebbe un eventuale dev server attivo. Il type-check copre gran parte del rischio. |
| App in esecuzione | **Non verificata**: servono credenziali e un ambiente Firebase. Tutta l'analisi dei flussi è **statica** (lettura del codice). |

---

## 1. Executive summary

Amberland è un **portale di campagna D&D 5e, mono-campagna**, scritto in
Next.js 15 + React 19 e appoggiato interamente su Firebase (Auth, Firestore).
È una **SPA client-side** dentro l'App Router: tutte le pagine sono client
component; il server Next serve solo da host e da backend per due aree
(gestione utenti e Combat System).

**Valutazione sintetica**

- **Base tecnica: buona.** Type-check e lint puliti, separazione per feature
  rispettata, registry delle entità ben progettato, regole Firestore curate,
  motore di combattimento puro e testato.
- **Modello dati: solido per il world-building, debole per lo stato "vivo"
  del tavolo.** Non esiste un concetto di sessione attiva; i dati del
  personaggio non sono in tempo reale; il salvataggio della scheda riscrive
  l'intero oggetto `sheet` (ultima scrittura vince).
- **Investimento sbilanciato.** Il Combat System è il 31% del codice
  (20.400 righe) ma **non ha ancora una schermata di gioco per i giocatori**:
  la fase F3 (lobby, iniziativa, turni) non esiste e il componente del campo
  di gioco (`battle-field.tsx`) non è collegato a nessuna route.
- **Duplicazioni di dominio reali**: tre inventari, due "modalità combattimento"
  (Codex e Battaglia) con due fonti di verità per gli HP del PC, tre concetti
  temporali (sessione, evento, cronaca).
- **Prontezza per la revisione UX: alta per il frontend, condizionata per il
  gioco dal vivo.** Navigazione, layout e componenti si possono rifare senza
  toccare il backend. Una vera esperienza "al tavolo" (Master che vede gli HP
  del party, stato condiviso) richiede invece **due interventi sui dati**:
  sottoscrizioni in tempo reale e scritture granulari della scheda.

---

## 2. Mappa architetturale

```
                         ┌────────────────────────────────────────────┐
                         │                BROWSER (SPA)               │
                         │                                            │
  app/(app)/*  ──────────┤  AuthGuard → PcCreationGate → AppShell     │
  app/(battle)/*  ───────┤  AuthGuard (schermo intero, niente shell)  │
                         │                                            │
                         │  features/*  (data.ts = hook React Query)   │
                         │     entities · characters · chronicles     │
                         │     party · personal-area · users · battle │
                         └───────┬───────────────────────┬────────────┘
                     Firestore Web SDK            fetch + Bearer ID token
                  (letture + scritture dirette)     (solo users/battles)
                                 │                       │
                 ┌───────────────▼──────┐    ┌───────────▼─────────────────┐
                 │  Cloud Firestore     │◄───│  Next Route Handlers (node)  │
                 │  + Security Rules    │    │  Admin SDK (bypassa Rules)   │
                 │  (unico guardiano    │    │  api/admin/users · players   │
                 │   per il 90% delle   │    │  api/battles/** + engine/*   │
                 │   scritture)         │    └─────────────────────────────┘
                 └──────────────────────┘
                 Firebase Auth (username→email fittizia, custom claim `role`)
                 Cloudinary (upload immagini unsigned) — `lib/upload/image-service.ts`
```

**Due modelli di scrittura coesistono** **[V]**:

1. **Client → Firestore diretto** (entità, schede, note, borsa, inventario,
   obiettivi, cronache). La sicurezza è interamente nelle Rules.
2. **Client → API Route → Admin SDK** (utenti, battaglie). Le Rules vietano
   ogni scrittura client su `battles/**`; la logica (movimento, turni) vive
   nei moduli puri `features/battle/engine/*`, importati sia dal client sia
   dal server.

È una scelta coerente: il percorso server è usato solo dove serve un arbitro
(pathfinding, segretezza degli HP nemici, gestione account).

### Dimensioni per modulo **[V]**

| Modulo | Righe | Note |
| --- | --: | --- |
| `features/battle` | 20.410 | editor tattico, engine, catalogo (107 template) |
| `features/characters` | 13.593 | Codex + componenti legacy |
| `components/` | 6.631 | `ui` (shadcn), `shared`, `layout` |
| `features/entities` | 5.879 | registry, liste, dettaglio, grafo, ricerca |
| `design-system/` | 3.510 | componenti della v1 materica (Tome, FrameCard…) |
| `features/party` | 3.232 | hub, borsa, diario |
| `app/` | 3.228 | route sottili + home/master/quest più corposi |
| `features/chronicles` | 3.180 | Libro delle Cronache |
| `types/` | 2.360 | modelli di dominio |
| `features/personal-area` | 1.875 | inventario, obiettivi, timeline, preferiti |
| altri | ~2.100 | auth, users, lib |
| **Totale `src/`** | **~66.000** | 288 file |

---

## 3. Stack tecnologico (effettivamente in uso)

| Ambito | Tecnologia | Evidenza |
| --- | --- | --- |
| Framework | Next.js 15.5 App Router, Turbopack in dev, React 19.1 | `package.json` |
| Linguaggio | TypeScript strict | `tsconfig.json`, tsc pulito |
| UI | Tailwind v4, shadcn/ui su `radix-ui`, lucide-react, Framer Motion, sonner | `components/ui/*` (24 primitivi) |
| Server state | TanStack Query v5 (`staleTime 60s`, `retry 1`, `refetchOnWindowFocus: false`) | `providers/app-providers.tsx` |
| Realtime | `onSnapshot` **solo** su profilo utente e battaglie | `auth-provider.tsx`, `battle/data.ts` |
| Form | react-hook-form + zod v4 | `*/schemas.ts` |
| Rich text | Tiptap 3 (menzioni, immagini, link) | `components/shared/rich-text*` |
| Backend | Firebase Auth + Firestore; Admin SDK nelle route `runtime = nodejs` | `lib/firebase/*` |
| Immagini | Cloudinary unsigned (Storage Firebase configurato ma secondario) | `lib/upload/image-service.ts` |
| Analytics | `@vercel/analytics` | `package.json` |
| Test | **Nessun framework**: uno script `node:assert` per l'engine | `scripts/check-combat-engine.ts` |
| Hosting | Non dichiarato nel repo; `@vercel/analytics` suggerisce Vercel **[I]** | — |

Dipendenze dichiarate ma di uso marginale: `next-themes` (il tema è solo
scuro), `shadcn` come dipendenza runtime (è una CLI) **[F]**.

---

## 4. Dominio D&D

### 4.1 Cosa esiste davvero

| Concetto | Stato | Dove vive |
| --- | --- | --- |
| Campagna | **Implicita, unica.** Nessuna entità "campagna" | — |
| Utenti e ruoli | ✅ ADMIN, MASTER, PLAYER, VISITOR (sola lettura) | `users/{uid}` + custom claim |
| Sessioni di gioco | ⚠️ Solo **archivio** (entità `session` con numero e data). Nessuna "sessione attiva" | `entities` type `session` |
| Personaggi PC/PNG | ✅ Entità `character`, `fields.kind`, scheda in `sheet` (PC) o `private/master.reservedSheet` (PNG completi) | `types/entities.ts` |
| Caratteristiche, competenze, TS, expertise | ✅ | `CharacterSheet` |
| Classi, multiclasse, livelli, XP | ✅ (livello derivato dalle classi, celebrazione al level-up) | `codex-context.tsx` |
| Razza/specie | ⚠️ Testo libero in `fields.race` + `sheet.subrace` | — |
| HP, HP temporanei, CA, iniziativa, velocità | ✅ | `CharacterSheet` |
| Condizioni ed effetti | ✅ Liste libere (nome, tipo, durata **testuale**) + indebolimento 0–6 | `ConditionEntry` |
| Risorse di classe | ✅ con ricarica (breve/lungo/giornaliera/manuale) e riposi | `panels-gear.tsx` |
| Incantesimi e slot | ✅ Slot per livello `total/used`; incantesimi **testo libero** (nome, livello, note) | `SpellEntry` |
| Equipaggiamento | ✅ ma **triplicato** (vedi 4.3) | — |
| Mostri | ✅ Entità `creature` (CR, tipo, habitat, bottino: testo) — **nessuno statblock** | registry |
| Combattimento | ⚠️ Due sistemi separati (vedi 4.3) | Codex `CombatMode` / `features/battle` |
| Iniziativa e turni | ⚠️ Engine pronto (`engine/initiative.ts`), **API e UI assenti** (F3) | — |
| Regole e manuali | ❌ Nessun compendio regole, nessun riferimento SRD | — |
| Dadi | ❌ Nessun lancio integrato (scelta dichiarata) | `COMBAT_SYSTEM.md` §17 |
| Missioni | ✅ Entità `quest` con stato; i giocatori possono aggiornarne i `fields` | registry + Rules |
| Appunti | ✅ Diario (`notes`, visibilità OWNER_ONLY/PARTY), note del Master per entità, collegamenti nota↔entità | `party/diary` |
| Mondo | ✅ Gerarchia world→region→city→location, relazioni, grafo, ricerca Ctrl+K | `features/entities` |
| Cronache | ✅ Libro con capitoli, archi, calendario, proposte dei giocatori | `features/chronicles` |

### 4.2 Modello dati (collection Firestore)

`users`, `entities` (+ `private/master`, `public/card`), `relations`,
`inventory_items`, `bag_items`, `bag_log`, `goals`, `notes`, `note_links`,
`note_log`, `chronicle_log`, `personal_areas`, `settings`, `battles`
(+ `combatants/{cid}/secret`, `events`, `presence`), `battle_templates`.
L'elenco unico è in `lib/constants.ts` → `COLLECTIONS` **[V]**.

Il cuore è la **collection universale `entities`** governata da
`features/entities/registry.ts`: ogni tipo dichiara campi, icona, card e
visibilità di default. È la scelta migliore del progetto: aggiungere un tipo
o un campo tocca un solo file **[V]**.

### 4.3 Duplicazioni e incoerenze di dominio

1. **Tre inventari [C].**
   - `sheet.equipment[]` — dentro la scheda del PC, con `equipped`.
   - `inventory_items` — collezione legata all'**utente** (`ownerId = uid`),
     non al personaggio, con un proprio flag `equipped`.
   - `bag_items` — Borsa del party.
   La mutua esclusione è garantita solo fra Borsa e `inventory_items`.
   Un giocatore ha quindi due "zaini" non collegati (Area Personale ≠ Scheda).
   Se un utente avesse più PC (il codice lo prevede: `useMyCharacters`),
   `inventory_items` sarebbe condiviso fra tutti.
2. **Due "combattimenti" e due fonti di verità per gli HP [C].**
   La `CombatMode` del Codex scrive `sheet.currentHp`. Il Combat System ha il
   suo `Combatant.hp` (snapshot, `sourceEntityId` come riferimento). Il
   progetto ha deciso esplicitamente "snapshot, non riferimenti" con
   risincronizzazione manuale e riporto a fine battaglia
   (`COMBAT_SYSTEM.md` §10.3), ma il codice di sincronizzazione non esiste
   ancora. In UX questo significa: durante una battaglia il giocatore avrà due
   numeri di HP in due schermate diverse.
3. **Tre concetti temporali [P].** `session` (archivio sessioni), `event`
   (timeline con `eventOrder`), `chronicle` (capitoli con calendario e archi),
   più la `history` del personaggio e la timeline dell'Area Personale.
   Non sono errori, ma per l'utente il "quando è successo" è sparso in 5 posti.
4. **Visibilità: documentazione disallineata [C].** I valori reali sono
   `PUBLIC | PARTY_ONLY | MASTER_ONLY | OWNER_ONLY`; l'intestazione di
   `firestore.rules` e `docs/ARCHITECTURE.md` parlano ancora di
   `PLAYERS | MASTER | LOCKED`. `PARTY_ONLY` e `PUBLIC` sono oggi equivalenti
   (lo dichiara il commento in `types/entities.ts`).
5. **`fields` vs `sheet` [P].** Razza, classe e livello stanno in `fields`
   (per card e filtri) e sono derivati dalla `sheet`; la sincronizzazione
   avviene solo quando si passa da `patchSheet` con `classes`. Modifiche fatte
   da altre vie (form generico) possono disallinearli **[I]**.
6. **Proiezione pubblica del PC** (`public/card`) riscritta dal client a ogni
   salvataggio della scheda, **in una seconda scrittura non atomica** [C].
   Se la seconda fallisce, ciò che vedono gli altri giocatori resta vecchio.

---

## 5. Flussi applicativi end-to-end

> Tutti ricostruiti **staticamente** dal codice.

### 5.1 Accesso
`/login` → `LoginForm` mappa username → `username@AUTH_EMAIL_DOMAIN` →
Firebase Auth → `AuthProvider` apre `onSnapshot(users/{uid})` (profilo **in
tempo reale**) e forza il refresh del token se il ruolo nel claim è diverso →
redirect a `/home` (o `/cambia-password`) → `AuthGuard` → `PcCreationGate`:
un PLAYER senza PC **non può navigare** finché non completa il wizard **[V]**.

Nota: dopo il login si atterra su `/home`, ma il logo porta a `/party` e la
tab mobile "Il Mio Tomo" porta a `/area-personale` **[V]** — tre "case" diverse.

### 5.2 Aprire la propria scheda
Non esiste una route dedicata. Percorsi possibili **[V]**:
- tab *Codex* → `/personaggi` (dashboard) → card del PC → `/entita/{id}`;
- tab *Il Mio Tomo* → `/area-personale` → pannello PC → `/entita/{id}`.

`/entita/[id]` → `EntityView` → `useEntity(id)`; se `type === "character"`
monta `CharacterCodex` → `CodexProvider` (normalizza la scheda, gestisce
permessi e salvataggi). Se il PC è `OWNER_ONLY` e non leggibile, ripiega su
`public/card` (`PublicCharacterView`).

### 5.3 Modificare i punti ferita
`HpConsole` (dashboard) o `CombatMode` (dialog a schermo intero) →
`damagePatch/healPatch` (`derive.ts`, consuma prima gli HP temporanei) →
`patchSheet` → merge su `latestSheetRef` (evita che due tocchi rapidi si
annullino) → `useMutation`:
1. **optimistic update** della cache React Query;
2. `updateDoc(entities/{id}, { sheet: <scheda intera> })`;
3. `setDoc(entities/{id}/public/card, …)` (seconda scrittura);
4. `onSettled` → invalidazione di **tutte** le query `entities`.

Undo: solo dentro `CombatMode`, in memoria, solo HP **[V]**.

**Come lo vedono gli altri**: non lo vedono finché non rifanno la query.
Nessun `onSnapshot` su `entities`; `staleTime` 60 s e
`refetchOnWindowFocus: false` **[V]**. Il Master che tiene aperta la scheda del
PC vede HP vecchi a tempo indeterminato.

### 5.4 Consumare uno slot incantesimo
`MagicTab` (`combat-tabs.tsx`) → click su un pallino → `patchSheet` con
`spellSlots` aggiornato → stesso percorso del 5.3. Riposo lungo/breve
(`panels-gear.tsx`) ripristina HP, slot e risorse e aggiunge una voce alla
`history` **[V]**. Non c'è undo per gli slot.

### 5.5 Aggiornare l'inventario
- **Scheda**: `PanelInventory` → `patchSheet({ equipment })`.
- **Area Personale**: `inventory_items` via `createCrudService`.
- **Borsa → inventario**: `inventoryService.create(...)` **poi**
  `bagItemService.remove(...)`, **non atomico** [C]. Un errore fra le due
  scritture duplica l'oggetto; due giocatori che prelevano insieme lo stesso
  oggetto lo ottengono entrambi (nessuna transazione).

### 5.6 Combattimento (Combat System)
Master: `/battaglie` → `BattleCreateDialog` → `POST /api/battles` (DRAFT) →
`/battaglie/{id}/editor` (route group `(battle)`, schermo intero) →
autosalvataggio `PUT /api/battles/{id}/map` → pedine
`POST …/combatants` → stato `POST …/state` (DRAFT ⇄ READY).
Movimento: `POST …/combatants/{cid}/move` con transazione server, percorso
ricalcolato dall'engine, `actionId` idempotente.
Lettura: `onSnapshot` su battaglia e pedine che **scrive dentro la cache
React Query** — l'unico punto davvero realtime del progetto **[V]**.

**Giocatore**: vede l'elenco, ma `hrefFor` restituisce `undefined` per chi non
è Master → card **non cliccabili** [V]. Non esistono lobby, join, iniziativa,
turni né schermata di scontro (F3). `battle-field.tsx` è modificato nel working
tree ma **non importato da alcuna route** [V].

### 5.7 Passaggio fra sessioni
Non esiste come flusso. Una "sessione" è un'entità d'archivio che il Master
crea a posteriori e a cui si collegano capitoli di cronaca e voci di storico.
Nessuno stato "sessione in corso", nessun reset di risorse legato alla
sessione.

### 5.8 Sincronizzazione fra giocatori — sintesi

| Dato | Realtime | Conflitti |
| --- | --- | --- |
| Profilo utente/ruolo | ✅ | — |
| Battaglie, pedine, eventi | ✅ | Transazioni + `actionId` sul server |
| Scheda PC | ❌ (≤60 s o navigazione) | **Ultima scrittura vince sull'intera `sheet`** [C] |
| Borsa del party | ❌ | Nessuna transazione [C] |
| Diario, cronache, quest | ❌ | Ultima scrittura vince [P] |

---

## 6. Architettura frontend

- **Tutto client-side [V].** Ogni `page.tsx` è `"use client"` o delega a un
  client component; nessun Server Component carica dati. È coerente con un
  backend Firebase + Rules (il token è nel browser), ma esclude streaming e
  prefetch server: ogni pagina parte da uno skeleton.
- **Routing**: route group `(app)` con `AuthGuard` + `AppShell`; `(battle)`
  senza shell per l'editor. `master/` e `admin/` protetti da `RoleGate`.
  Redirect legacy: `/missioni → /quest`, `/battaglie/[id]/preparazione → editor`.
- **Stato**: server state in React Query; stato UI locale con `useState`.
  **Nessuno stato di navigazione nell'URL** (0 usi di `useSearchParams`) [V]:
  tab degli hub, sezione del Codex, `CombatMode` aperta, filtri — tutto si
  perde con refresh, back o blocco schermo su mobile.
- **Layout**: sidebar fissa da `lg` (288 px), su mobile topbar + drawer +
  bottom bar a 5 gruppi. Navigazione dichiarata in `nav-config.ts`.
- **Componenti**: `ui/` (shadcn, coerenti), `shared/` (28 componenti di
  dominio: hero, hub, chip, rich text, upload…), `design-system/` (v1 materica,
  in parte neutralizzata: `Tome`, `FrameCard`, `StatGrid`).
- **Pattern di dati**: un file `data.ts` per feature con hook React Query e
  mutazioni con toast. `createCrudService<T>` generico. Invalidazioni ampie
  (`[ENTITIES_KEY]` invalida tutte le entità a ogni salvataggio di scheda).

## 7. Architettura backend e dati

- **API Route** (11): `admin/users` (CRUD account), `players` (roster),
  `battles/**` (8 endpoint). Autorizzazione in `lib/server/api-helpers.ts`
  (`requireUser/Role/Admin/Master/BattleMaster`), errori normalizzati da
  `handleApiError` [V].
- **Security Rules** dettagliate e commentate: RBAC su custom claim,
  proprietario del PC con chiavi protette, quest aggiornabili dal party,
  segretezza degli HP nemici per **documento** (`secret/master`) [V].
- **Indici**: 2 indici composti in `firestore.indexes.json`, entrambi del
  Combat System (correzione: la prima stesura riportava 7, era un conteggio
  errato). Dopo la rimozione del Combat System il file è vuoto.
- **Script**: seed admin/utenti, deploy rules, ottimizzazione immagini,
  check engine. Rules e indici vanno pubblicati a mano (memoria di progetto).
- **Offline**: nessuna persistenza Firestore (`persistentLocalCache` non
  configurata) [V]. Con rete instabile le scritture restano in coda solo
  finché la scheda del browser resta aperta.

---

## 8. Qualità architetturale

### Punti di forza (da preservare)
1. **Registry delle entità** — config-driven reale, non solo dichiarato.
2. **Engine di combattimento puro** — nessun import da React/Firebase,
   condiviso client/server, 105 verifiche.
3. **Segretezza by design** — HP nemici e note del Master in documenti
   separati; le Rules filtrano documenti, non campi (scelta corretta).
4. **Idempotenza e transazioni** nel Combat System (`actionId`, CAS sul turno).
5. **Inline editing con optimistic update** nel Codex, con merge su
   `latestSheetRef` per i tocchi rapidi.
6. **Convenzioni coerenti**: nomenclatura italiana diegetica, un `data.ts`
   per feature, tipi centralizzati, tsc/lint puliti.
7. **Documentazione di progetto ricca** (`COMBAT_SYSTEM.md` con handoff).

### Debolezze

| Criterio | Valutazione | Evidenza |
| --- | --- | --- |
| Separazione responsabilità | Buona nelle feature; il Codex concentra molto (inspector 1.360 righe) | `codex/inspector.tsx` |
| Coesione | Media: inventario e "combattimento" divisi fra feature | §4.3 |
| Accoppiamento | Basso fra feature, alto fra UI e forma del documento (la UI scrive oggetti interi) | `codex-context.tsx` |
| Consistenza dei modelli | Media: visibilità documentata in due modi, `fields`/`sheet` duplicati | §4.3 |
| Robustezza | Media: scritture multiple non atomiche lato client | §5.3, §5.5 |
| Sicurezza | Buona, con una fuga di dati (§9, C-4) | `firestore.rules` |
| Prestazioni | Icone PNG da 330–500 KB servite come `<img>` | §9, C-6 |
| Testabilità | Bassa fuori dall'engine: nessun test UI/integrazione/Rules | — |
| Complessità non necessaria | Alta nel Combat System rispetto all'uso attuale (catalogo da 107 template, generatore, analisi immagine) prima che esista una partita giocabile | §9, C-3 |
| Adeguatezza delle scelte | Adeguate: Firebase + Next per un gruppo di 4–6 persone è proporzionato | — |

---

## 9. Criticità (ordinate per impatto sul gioco dal vivo)

| # | Criticità | Tipo | Impatto concreto | Intervenire? |
| --- | --- | --- | --- | --- |
| C-1 | **Schede non in tempo reale.** Nessun `onSnapshot` su `entities`; staleTime 60 s, niente refetch al focus | [C] | Il Master non vede HP/condizioni del party durante la sessione; un secondo dispositivo mostra dati vecchi | **Sì**, prerequisito di qualunque "vista party live" |
| C-2 | **Salvataggio della scheda per oggetto intero.** `updateDoc({ sheet })` | [C] meccanismo / [P] impatto | Master e giocatore che modificano lo stesso PC in contemporanea si cancellano a vicenda (es. Master applica una condizione mentre il giocatore spende uno slot) | **Sì** se C-1 viene risolto (con il realtime le modifiche concorrenti diventano normali). Soluzione: patch per percorso (`sheet.currentHp`), non l'oggetto intero |
| C-3 | **Combat System senza schermata di gioco.** F3 assente, `battle-field.tsx` orfano, card non cliccabili per i giocatori | [V] | Il 31% del codice non è ancora utilizzabile al tavolo | Decisione di prodotto (vedi §11) |
| C-4 | **Fuga di spoiler via `relations`.** `relations` leggibile da ogni utente; `/grafo` scarica **tutte** le relazioni con `aName`/`bName`/`label`, anche di entità `MASTER_ONLY` | [C] | Un giocatore con DevTools legge nomi e legami segreti. La UI li filtra, ma i dati arrivano al browser | Sì, se la segretezza conta per il gruppo; altrimenti accettabile in un gruppo di fiducia |
| C-5 | **Scritture multiple non atomiche** (scheda + card pubblica; borsa → inventario) | [C] | Card pubblica obsoleta; oggetti duplicati o prelevati due volte | Sì per la borsa (`runTransaction`/`writeBatch`); `writeBatch` per scheda+card |
| C-6 | **Peso delle icone.** 36 PNG, 14 MB in `public/icons`, 330–500 KB l'una, servite con `<img>` senza ottimizzazione | [V] | La bottom bar mobile carica ~390 KB solo per l'icona del Party; la home una decina di icone (~4 MB). Al tavolo con rete mobile: lentezza percepita | Sì, intervento solo asset (WebP 64–128 px) |
| C-7 | **Nessuno stato nell'URL** | [V] | Refresh/blocco schermo/back perdono tab, sezione e `CombatMode` | Sì, nel redesign |
| C-8 | **Tre inventari** | [C] | Il giocatore non sa dove guardare; dati divergenti | Decisione di dominio (vedi §11) |
| C-9 | **Nessuna persistenza offline** | [V] | Wi-Fi instabile al tavolo → modifiche perse alla chiusura della scheda | Consigliato (`persistentLocalCache`, una riga) |
| C-10 | **Codice morto** | [V] | `character-view.tsx` (851) + `sheet-display.tsx` (934, usato solo da lì), `use-crud-mutations.ts`, `loading-ink.tsx`, `ui/separator.tsx`: ~1.900 righe. `battle-field.tsx` è "parcheggiato" per F3 | Pulizia a basso rischio, non urgente |
| C-11 | **Documentazione obsoleta** | [V] | `ARCHITECTURE.md` descrive feature rimosse (`missions/`, `world/`, `items/`), font Crimson Pro e palette v1; intestazione Rules con visibilità vecchie | Aggiornare: chi riprende il lavoro viene ingannato |
| C-12 | **Lavoro non committato consistente** (+3.931/−2.020 righe, 17 file nuovi) | [V] | Rischio di perdita e di regressioni non tracciabili prima di un redesign | Committare prima di iniziare |
| C-13 | **Nessun test fuori dall'engine** (UI, Rules, flussi) | [V] | Un redesign della navigazione non ha rete di sicurezza | Consigliato: test delle Rules sull'emulatore + qualche E2E dei flussi critici |
| C-14 | `handleApiError` restituisce il `message` degli errori interni | [P] | Esposizione di dettagli interni; impatto basso | Facoltativo |
| C-15 | Bag: ogni contributor può `delete` qualunque oggetto | [P] | Cancellazioni accidentali senza ripristino (c'è `bag_log` ma non un undo) | Valutare nel redesign (undo) |

**Non sono problemi** (preferenze, nessun intervento necessario): SPA tutta
client-side; React Query + Firestore invece di un ORM; nomi legacy dei
componenti (`SealChip`, `LeverToggle`); file grandi ma coesi.

---

## 10. Vincoli UX/UI per la riprogettazione

1. **Mantenibili invariati**: auth, Rules (salvo C-4), API e engine del
   Combat System, registry delle entità, `createCrudService`, tipi di dominio,
   Tiptap, primitivi `ui/`.
2. **Riutilizzabili**: `CodexProvider` (patchSheet, permessi, optimistic) —
   è il punto giusto su cui costruire qualunque vista "live" della scheda;
   `derive.ts` (danno/cura); `HpConsole`, `Counter`, tab di `CombatMode`;
   `GlobalSearchDialog`; `HubShell`; `EntityCard`/card specializzate.
3. **Fortemente accoppiati all'interfaccia attuale**: `nav-config.ts`
   (raggruppamento e bottom bar), `AppShell` (padding, `PageTransition`),
   `CharacterCodex` (hero a tutta larghezza calcolato su `w-[calc(100vw-18rem)]`
   = larghezza sidebar), `HubShell` con tab in stato locale.
4. **Ostacoli architetturali**: C-1 e C-2 per qualunque vista condivisa;
   C-7 per la continuità del contesto; C-8 per un inventario unico.
5. **Solo frontend**: navigazione, gerarchia informativa, routing (incluse
   route dedicate tipo "il mio personaggio"), stato nell'URL, quick actions,
   undo locale, ottimizzazione icone, riorganizzazione del Codex, vista
   "sessione" del giocatore basata sui dati esistenti.
6. **Richiedono dati/backend**: realtime sulle schede (solo client SDK, ma
   cambia il pattern dati); patch granulari della scheda; concetto di
   "sessione attiva" (nuovo documento, es. `settings/session`); unificazione
   degli inventari (migrazione); sync HP fra Codex e battaglia; restrizione
   delle relazioni (Rules + forse denormalizzazione della visibilità).
7. **Rischi di regressione**: Rules (le query dei giocatori devono restare
   allineate ai filtri `visibility in [...]`); `PcCreationGate` (blocca i
   giocatori); optimistic update del Codex; link esistenti `/entita/{id}` usati
   da menzioni Tiptap e note.
8. **Da preservare**: segretezza per documento, idempotenza delle azioni di
   battaglia, mobile-first, `prefers-reduced-motion`, nomenclatura diegetica,
   Design Constitution v2.

### Modalità "Gestione campagna" vs "Gioco dal vivo"
**L'architettura la supporta** senza stravolgimenti: le route group di Next
permettono già una shell diversa (`(battle)` lo fa), e tutti i dati necessari
esistono. Ciò che manca è (a) un segnale condiviso di "sessione in corso",
(b) il realtime, (c) un ingresso diretto al proprio personaggio. Se sia la
soluzione migliore è una domanda UX, trattata nel documento
`UX_REVIEW_FASE_A.md`.

---

## 11. Raccomandazioni

**Necessarie (prima o durante il redesign)**
1. Committare il working tree attuale (C-12).
2. Decidere il ruolo del Combat System nel gioco dal vivo (C-3): completare F3
   **oppure** congelarlo e puntare prima sulla scheda live. Il redesign UX
   dipende da questa scelta.
3. Realtime sulle schede dei PC del party + patch granulari (C-1, C-2): sono
   un'unica modifica concettuale nel `CodexProvider`/`data.ts`.

**Consigliate**
4. Transazione per borsa ↔ inventario; `writeBatch` scheda + card (C-5).
5. Icone in WebP ridimensionate (C-6).
6. Stato di navigazione nell'URL (C-7) — si fa naturalmente nel redesign.
7. Persistenza offline Firestore (C-9).
8. Decidere l'inventario unico (C-8) prima di disegnare l'inventario nuovo.
9. Restringere `relations` per i giocatori (C-4), se la segretezza conta.
10. Aggiornare `ARCHITECTURE.md` e l'intestazione delle Rules (C-11).

**Facoltative**
11. Rimuovere il codice morto (C-10).
12. Test delle Rules sull'emulatore e 3–4 E2E dei flussi critici (C-13).
13. Rimuovere `next-themes` e spostare `shadcn` in devDependencies.

---

## 12. Conclusione

Il progetto è **architetturalmente pronto per una revisione UX/UI del
frontend**: routing, layout, navigazione e componenti si possono riprogettare
senza toccare né i dati né il backend, e il `CodexProvider` offre già il
nucleo giusto (permessi + salvataggio ottimistico) per viste nuove della
scheda.

Non è invece pronto per un'**esperienza di tavolo condivisa** (Master che
segue il party, stato visto da tutti, combattimento a turni): mancano
realtime e scritture granulari sulle schede, e il Combat System non ha ancora
la sua parte giocabile. Questi limiti non impediscono di iniziare il
redesign, ma ne condizionano l'ambizione: vanno decisi **prima** di disegnare
una modalità "Sessione Live".

### Come usare questi risultati nella fase successiva
1. Le criticità C-1, C-2, C-3, C-8 diventano **domande di prodotto** nel
   confronto UX (vedi `UX_REVIEW_FASE_A.md`, §7).
2. I flussi del §5 sono la base delle **simulazioni di sessione** (Fase B):
   ogni passo è già mappato su componenti e scritture reali.
3. Le parti "solo frontend" del §10 delimitano ciò che si può prototipare
   subito senza rischi sui dati.

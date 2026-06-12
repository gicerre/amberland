# Amberland — Architettura

Portale ufficiale della campagna D&D *Amberland — Le Cronache del Regno*.
Applicazione web Next.js 15 (App Router) + Firebase, dark fantasy, mobile-first, estendibile.

---

## 1. Stack

| Ambito | Tecnologia |
| --- | --- |
| Framework | Next.js 15 (App Router, Turbopack) · React 19 · TypeScript |
| Stile | TailwindCSS v4 · shadcn/UI (Radix) · tema dark fantasy custom |
| Animazioni | Framer Motion · canvas particellare custom (braci) |
| Dati server-state | TanStack Query (React Query) |
| Form & validazione | React Hook Form · Zod (schemi condivisi client/server) |
| Auth | Firebase Authentication (Email/Password mappato su username) |
| Database | Cloud Firestore |
| Immagini | Cloudinary (unsigned upload, piano gratuito) · fallback URL incollato |
| Admin / API | Firebase Admin SDK in Route Handlers (`runtime = nodejs`) |
| Icone | Lucide |

---

## 2. Struttura delle cartelle (feature-based)

```
src/
├─ app/                          # Routing (App Router)
│  ├─ layout.tsx                 # Root: font, AppProviders, Toaster
│  ├─ page.tsx                   # Landing cinematografica
│  ├─ login/                     # Accesso
│  ├─ cambia-password/           # Cambio password (1° accesso + on-demand)
│  ├─ not-found.tsx              # 404 a tema
│  ├─ icon.svg                   # Favicon (stemma)
│  ├─ (app)/                     # GRUPPO AUTENTICATO (AuthGuard + AppShell)
│  │  ├─ layout.tsx
│  │  ├─ home/                   # Dashboard
│  │  ├─ missioni/
│  │  ├─ mondo/  ├─ page.tsx  └─ [slug]/      # Sezioni geografiche dinamiche
│  │  ├─ party/
│  │  ├─ oggetti/  ├─ page.tsx  └─ [categoria]/
│  │  ├─ commercio/             # Predisposta (fase futura)
│  │  ├─ area-personale/        # Privata (solo proprietario)
│  │  ├─ master/                # Pannello contenuti (RoleGate MASTER/ADMIN)
│  │  │  ├─ missioni/  mondo/  oggetti/  personaggi/
│  │  └─ admin/                 # Gestione utenti (RoleGate ADMIN)
│  └─ api/
│     └─ admin/users/           # CRUD account via Admin SDK
│        ├─ route.ts            # GET (lista) · POST (crea)
│        └─ [uid]/route.ts      # PATCH (ruolo/password/blocco) · DELETE
│
├─ features/                     # Logica di dominio per feature
│  ├─ auth/        # provider, guard, service, schemas, components (form)
│  ├─ missions/    # data (hooks) + components (card, manager, form)
│  ├─ world/       # config (gerarchia + sezioni), data, components
│  ├─ items/       # categories, data, components
│  ├─ characters/  # data, components
│  ├─ personal-area/ # data, components (note/inventario/obiettivi/diario)
│  └─ users/       # data (client API), schemas, components (tabella, dialog)
│
├─ components/
│  ├─ ui/          # Primitivi shadcn (button, dialog, form, table, …)
│  ├─ layout/      # sidebar, app-shell, user-menu, nav-config
│  └─ shared/      # fantasy-card, page-header, empty-state, image-upload,
│                  #   fantasy-image, particles, loading-screen, confirm-dialog
│
├─ hooks/          # use-crud-mutations (mutazioni standard + toast)
├─ lib/
│  ├─ firebase/    # client, admin, firestore (CRUD generico), storage
│  ├─ server/      # api-helpers (requireAdmin, error handling, DTO)
│  ├─ constants.ts # COLLECTIONS, label/badge ruoli·stati·rarità
│  └─ utils.ts     # cn, slugify, usernameToEmail, formatDate, generatePassword
├─ providers/      # app-providers (React Query + Auth + Motion + Tooltip)
└─ types/          # models.ts (interfacce di dominio)

scripts/
├─ create-admin.ts        # Seed del primo ADMIN (Admin SDK)
└─ optimize-images.mjs    # PNG sorgente → WebP in /public/images

firestore.rules · storage.rules · firestore.indexes.json · firebase.json
```

**Principio guida:** ogni feature è autonoma (`data` + `components` + `schemas`).
Il routing in `app/` resta sottile e delega alle feature. Aggiungere una sezione
= nuova cartella in `features/` + una pagina in `app/`.

---

## 3. Schema Firestore — Sistema Universale delle Entità

Tutti gli elementi dell'ambientazione vivono in **un'unica collection
`entities`** (stile World Anvil/Obsidian), collegati dalla collection
`relations`. I timestamp sono `serverTimestamp()`.

### `users/{uid}`  — id documento = uid di Firebase Auth
| campo | tipo | note |
| --- | --- | --- |
| username | string | univoco, minuscolo (trattini ammessi) |
| role | `ADMIN` \| `MASTER` \| `PLAYER` | duplicato nei **custom claims** del token |
| disabled | boolean | blocco accesso |
| mustChangePassword | boolean | forza il cambio al primo accesso |
| createdAt / lastLogin | timestamp \| null | |

### `entities/{id}` — il cuore del sistema
| campo | tipo | note |
| --- | --- | --- |
| type | enum 11 valori | `world` `region` `city` `location` `character` `faction` `quest` `item` `creature` `event` `session` |
| name, description | string | descrizione = cronache (pergamena) |
| imageUrl | string | immagine principale |
| gallery | string[] | galleria (riordino drag & drop) |
| tags | string[] | ricerca e filtri |
| visibility | `PLAYERS` \| `MASTER` \| `LOCKED` | sistema conoscenza Master/Giocatori |
| unlockAfterId | string \| null | promemoria di sblocco (quest/sessione) |
| parentId | string \| null | gerarchia geo: world→region→city→location |
| fields | map | campi specifici del tipo, definiti dal **registry** (razza, CR, stato quest, …) |

I campi per tipo sono dichiarati in `features/entities/registry.ts`
(`ENTITY_REGISTRY`): form, schede, card e filtri si generano da lì.
**Aggiungere un tipo o un campo = toccare solo il registry.**

### `entities/{id}/private/master` — area riservata
`masterNotes`, `secrets`: leggibili/scrivibili **solo** da Master/Admin a
livello di Security Rules (i giocatori non possono leggerli nemmeno via API).

### `relations/{id}` — relazioni many-to-many
`aId/aType/aName`, `bId/bType/bName` (nomi denormalizzati, risincronizzati al
rename), `label` ("si trova a", "membro di", "nemico di"…). Bidirezionali:
una relazione, visibile da entrambe le pagine. Alimentano il pannello
"Entità correlate" e la **vista grafo** (`/grafo`).

### `personal_areas/{uid}`  — id documento = uid del proprietario
`userId`, `notes`, `inventory[]`, `journal[]`, `goals[]`, `updatedAt`.
Documento 1:1 con l'utente, creato pigramente al primo salvataggio.

### Visibilità & query
I giocatori interrogano la collection `entities` **sempre** con
`where('visibility', '==', 'PLAYERS')` (obbligatorio per le rules). Lo sblocco
delle voci `LOCKED` è una decisione del Master (pulsante "Rivela"); la Sala del
Master elenca le voci pronte (quest di sblocco completata).

---

## 4. RBAC — Controllo accessi basato sui ruoli

Il ruolo vive in **due posti** che restano sincronizzati:
1. `users/{uid}.role` — letto dalla UI.
2. **Custom claims** del token Firebase (`request.auth.token.role`) — letto dalle
   Security Rules e dalle API. Impostato dall'Admin SDK alla creazione e ad ogni
   cambio ruolo; l'`AuthProvider` forza un refresh del token quei due divergono.

| | ADMIN | MASTER | PLAYER |
| --- | :---: | :---: | :---: |
| Gestione utenti / ruoli / password | ✅ | — | — |
| CRUD contenuti (missioni, mondo, oggetti, personaggi) | ✅ | ✅ | — |
| Lettura contenuti del regno | ✅ | ✅ | ✅ |
| Propria area personale | ✅ | ✅ | ✅ |

Difesa in profondità su 3 livelli:
- **UI** — `nav-config` e `RoleGate` nascondono ciò che non è permesso.
- **Security Rules** — Firestore e Storage applicano i permessi lato server.
- **API admin** — `requireAdmin()` verifica il Bearer token + claim `ADMIN`.

La gestione account passa **solo** dalle API server (Admin SDK): il client non
crea né modifica mai gli account direttamente (le rules vietano create/delete su `users`).

---

## 5. Autenticazione — login con username

Firebase non supporta username nativi, quindi `username` → email fittizia
`username@${NEXT_PUBLIC_AUTH_EMAIL_DOMAIN}` (l'email reale non viene mai usata né
mostrata). Niente verifica email, niente reset via email (da requisiti).

Flusso: **ADMIN crea l'account** (username + password iniziale, `mustChangePassword=true`)
→ il giocatore accede → **cambio password obbligatorio** → home.
Il reset password dell'admin revoca le sessioni attive e rimette `mustChangePassword=true`.

---

## 6. Layer dati

`createCrudService<T>(collection)` (in `lib/firebase/firestore.ts`) fornisce
`list/get/create/update/remove` tipizzati, con converter e timestamp automatici.
Ogni feature crea il proprio servizio e lo espone tramite hook React Query
(`useMissions`, `useItems`, `useGeoList`, …). Le mutazioni passano da
`useCrudMutations` (invalidazione cache + toast a tema coerenti).

Il filtraggio (categorie oggetti, missioni per stato) avviene **client-side** su
un'unica query in cache: dataset di campagna contenuto → niente indici compositi.

---

## 7. Tema grafico

Palette in `globals.css` (CSS variables): oro antico `#c9a227`, cremisi `#8b1e2d`,
nero `#0a0c12`, blu notte `#131c31`, pergamena `#e8dcc0`. Tema **solo scuro**
(`<html class="dark">`). Font: **Cinzel** (titoli) + **Crimson Pro** (testo).
Componenti firma: `FantasyCard` (angoli ornamentali), superficie `.parchment`,
`text-gold-gradient`, braci particellari su canvas (rispetta `prefers-reduced-motion`).

---

## 8. Piano di sviluppo — fase per fase

- **Fase 0 — Fondamenta** ✅ Scaffold, tema, Firebase, auth username, RBAC, layout
  responsive, Security Rules, seed admin.
- **Fase 1 — Contenuti core** ✅ (sostituita dal sistema entità in Fase 4).
- **Fase 2 — Amministrazione** ✅ Dashboard utenti (crea/ruoli/reset/blocco/elimina).
- **Fase 4 — World building** ✅ Sistema Universale delle Entità (11 tipi),
  relazioni many-to-many con pannello correlate, gerarchia geografica dinamica
  (onboarding + albero in sidebar), visibilità Master/Giocatori/Bloccata con
  area privata, gallerie drag & drop, ricerca globale Ctrl+K, vista grafo,
  timeline eventi e diario sessioni, breadcrumb dinamici.
- **Fase 3 — Commercio** ⏳ (sezione predisposta) Botteghe per città, mercanti,
  tesoro del party, transazioni.
- **Fase 5 — Collaborazione** Commenti del party, note condivise Master↔Player,
  notifiche, log attività reale (collection `activity`).
- **Fase 6 — Rifiniture** PWA/offline, export PDF delle schede, mappa interattiva,
  i18n, test (Vitest + Playwright), CI/CD.

---

## 9. Best practice per la scalabilità

- **Config-driven UI** — menu (`nav-config`), gerarchia mondo (`world/config`),
  categorie (`items/categories`): aggiungere una voce = una riga, non codice sparso.
- **Servizio CRUD generico** — nuove entità in pochi minuti riusando `createCrudService`.
- **Schemi Zod condivisi** client e server (es. `users/schemas`): validazione unica.
- **Confini netti** — Admin SDK e segreti **solo** sotto `app/api` e `scripts`
  (`runtime = nodejs`); il client non li tocca mai.
- **Sicurezza server-side** — non fidarsi mai della UI: rules + `requireAdmin`.
- **Costi/perf** — query in cache + filtri client per la campagna; passare a query
  Firestore mirate + indici quando i dataset crescono (es. `activity`, log).
- **Accessibilità** — label, `aria-*`, focus ring dorato, riduzione movimento.

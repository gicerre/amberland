<div align="center">

# ⚔ AMBERLAND
### Le Cronache del Regno

Portale ufficiale della campagna **Dungeons & Dragons – Amberland**.
Next.js 15 · React 19 · TypeScript · Firebase · TailwindCSS · shadcn/UI

</div>

---

## Cos'è

Web app dark-fantasy, responsive e mobile-first per gestire una campagna D&D:
missioni, mondo (mondi → regioni → città → luoghi), party, oggetti, area personale
di ogni giocatore e pannelli di gestione per Master e Admin.

Architettura e schema completi: **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**.

---

## Requisiti

- Node.js ≥ 20
- Un progetto **Firebase** con **Authentication** e **Cloud Firestore** attivi (il piano gratuito *Spark* basta)
- *(facoltativo)* un account **Cloudinary** gratuito per il caricamento diretto delle immagini

---

## Setup rapido

### 1. Dipendenze
```bash
npm install
```

### 2. Variabili d'ambiente
Copia il template e compila i valori:
```bash
cp .env.local.example .env.local
```

| Variabile | Dove trovarla |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Console → Impostazioni progetto → Le tue app → Web (`apiKey`, inizia con `AIza…`) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` / `PROJECT_ID` / `STORAGE_BUCKET` / `MESSAGING_SENDER_ID` / `APP_ID` | stessa schermata |
| `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` | dominio fittizio per il login con username (es. `amberland.app`) |
| `FIREBASE_ADMIN_PROJECT_ID` / `CLIENT_EMAIL` / `PRIVATE_KEY` | Console → Impostazioni → **Account di servizio** → *Genera nuova chiave privata* |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | *(facoltativi)* upload immagini gratuito — vedi sezione **Immagini** |
| `SEED_ADMIN_USERNAME` / `SEED_DM_USERNAME` | username dei due account iniziali (default `admin` / `dungeon-master`) |

> ⚠️ La `PRIVATE_KEY` va su una sola riga con i ritorni a capo come `\n` (tra virgolette).
> `.env.local` **non** viene committato (è in `.gitignore`).

### 3. Configura il progetto Firebase (console)
1. **Authentication** → *Sign-in method* → abilita **Email/Password**.
2. **Firestore Database** → crea il database (modalità produzione).

> **Storage non serve.** Le immagini usano Cloudinary o un URL incollato (vedi
> sezione *Immagini*), così resti sul piano gratuito *Spark*.

### 4. Deploy delle regole di sicurezza
Con la [Firebase CLI](https://firebase.google.com/docs/cli) (`npm i -g firebase-tools`):
```bash
firebase login
firebase use <PROJECT_ID>
firebase deploy --only firestore:rules
```

### 5. Crea gli account iniziali
```bash
npm run seed:users
# dungeon-master con ruolo ADMIN invece di MASTER:  npm run seed:users -- ADMIN
```
Crea **`admin`** (ruolo ADMIN) e **`dungeon-master`** (ruolo MASTER) con password
temporanee, stampate a fine esecuzione. Al primo accesso ognuno sceglie la propria.
Lo script è idempotente (rilanciarlo rigenera le password temporanee).

### 6. Avvia
```bash
npm run dev
```
Apri http://localhost:3000 → **Entra in Amberland** → accedi con le credenziali admin.

---

## Script disponibili

| Comando | Azione |
| --- | --- |
| `npm run dev` | Sviluppo (Turbopack) |
| `npm run build` | Build di produzione |
| `npm start` | Avvio in produzione |
| `npm run lint` | ESLint |
| `npm run seed:users` | Crea/aggiorna gli account `admin` + `dungeon-master` |
| `npm run seed:admin` | Crea/aggiorna un singolo ADMIN (richiede `SEED_ADMIN_PASSWORD`) |
| `npm run optimize:images` | Converte i PNG in `/img` in WebP ottimizzati |
| `npm run emulators` | Avvia gli emulatori Firebase (richiede CLI) |

---

## Flusso d'uso

1. L'**ADMIN** crea gli account (username + password iniziale) da `/admin` e assegna i ruoli.
2. Al **primo accesso** ogni utente cambia obbligatoriamente la password.
3. Il **MASTER** (o l'ADMIN) popola i contenuti dal **Pannello Master** (`/master`),
   con upload immagini su Storage.
4. I **PLAYER** leggono i contenuti del regno e gestiscono la propria **Area Personale**.

---

## Ruoli

| Ruolo | Permessi |
| --- | --- |
| **ADMIN** | Tutto: gestione utenti, ruoli, password, blocco + tutti i contenuti |
| **MASTER** | CRUD di missioni, mondo, oggetti, personaggi + upload immagini |
| **PLAYER** | Lettura dei contenuti pubblici + propria area personale |

---

## Immagini (storage gratuito)

Firebase Storage richiede il piano a pagamento, quindi le immagini **non** lo usano.
Due opzioni, entrambe gratuite:

1. **Incolla un URL** — funziona subito, zero configurazione: nel form del Master
   incolli il link di un'immagine già online.
2. **Caricamento diretto con Cloudinary** (consigliato) — account gratuito senza carta:
   1. Crea un account su [cloudinary.com](https://cloudinary.com).
   2. *Settings → Upload → Add upload preset* → **Signing Mode: Unsigned** → salva il nome del preset.
   3. In `.env.local` imposta `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (Dashboard) e
      `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` (il preset creato).
   3. Riavvia `npm run dev`: nei form comparirà il caricamento file.

In entrambi i casi in Firestore viene salvato solo l'URL dell'immagine.

## Sviluppo locale con emulatori (facoltativo)

Per lavorare senza toccare il progetto reale: imposta
`NEXT_PUBLIC_USE_EMULATORS=true` in `.env.local`, poi `npm run emulators` e, in
un altro terminale, `npm run dev`.
   
--- Changelog
add familiars
add list tabel cards and quests on party view
restyle
restyle UI fomrs
fix button
add realistic icons
fix layers
fuix rela layout
refactor UI UX mobile
immersive group emblem
dd pther icons
add favico
update layout of main UI
fix home layout
update pg sheet and chronicles

# Amberland — Proposta: inventario unico del party

> 9 novembre 2026 · Stato: **proposta da valutare**, nessuna modifica al codice.
> Requisiti: quelli che hai scritto (Borsa Conservante + Zaino del PG, vista
> globale "Oggetti del party", trasferimenti atomici e parziali, acquisizione
> con destinatario facoltativo).

---

## 1. Come funziona oggi (analisi del codice)

Oggi gli oggetti vivono in **quattro posti** che non si parlano:

| Dove | Collection / campo | Legato a | Quantità | Note |
| --- | --- | --- | --- | --- |
| Catalogo oggetti | `entities` type `item` | — | — | Il "modello" (nome, rarità, effetti, `conservabile`, approvazione del Master) |
| Borsa Conservante | `bag_items` | catalogo (`itemId`) | sì | Log in `bag_log`; chiunque nel party può modificare |
| Zaino (Area Personale) | `inventory_items` | **utente** (`ownerId = uid`), non personaggio | sì | Flag `equipped` proprio |
| Equipaggiamento della scheda | `sheet.equipment[]` dentro il PG | **niente** (testo libero) | sì | È ciò che usa il combattimento: arma principale (`derive.ts`), equipaggiamento pubblico (`buildPublicCard`) |

### Cosa non soddisfa i requisiti

1. **Spostamenti solo in blocco** — `moveFromBag`/`moveToBag` spostano tutta
   la pila: non si possono prelevare 2 pozioni su 5. (Requisito 5.5)
2. **Un modello del catalogo può stare in un posto solo** — il filtro
   `useAvailableForInventory` esclude gli oggetti già in Borsa: non puoi avere
   pozioni sia in Borsa sia nello zaino. Contraddice il tuo esempio.
3. **Spostamenti non atomici** — prima crea nella destinazione, poi cancella
   dall'origine, senza transazione: un errore a metà duplica l'oggetto; due
   giocatori che prelevano insieme lo ottengono entrambi. (Requisito 5.7)
4. **Nessun trasferimento fra PG** — le Security Rules permettono di creare in
   `inventory_items` solo con il proprio `ownerId`: Syl non può dare una
   pozione a un altro PG. (Requisito 3)
5. **Lo zaino è dell'utente, non del personaggio**, ed è **separato
   dall'equipaggiamento della scheda**: un oggetto preso dalla Borsa non
   compare nella scheda né in combattimento.
6. **Nessuna vista globale** del patrimonio del party.
7. **Niente tempo reale**: le viste si aggiornano solo ricaricando. (Requisito 5.8)
8. **Due classificazioni diverse**: il catalogo usa la **rarità** (Comune…
   Artefatto, Trama), la scheda una **tipologia** funzionale (arma, armatura,
   scudo, magico, consumabile, varie). Servono entrambe.

### Cosa si riusa

- **Catalogo oggetti** (`entities` type `item`) e il suo flusso di
  approvazione del Master: restano il "modello" degli oggetti.
- **Log dei movimenti** (`bag_log`): diventa il registro di tutti i movimenti.
- **UI della Borsa e dello Zaino** (`bag-section.tsx`, `inventory-section.tsx`):
  si adattano, non si rifanno da zero.
- **Pannello Inventario del Codex** e la scheda Arsenale della modalità
  combattimento: leggono dalla nuova fonte invece che da `sheet.equipment`.

---

## 2. Modello proposto

### Un principio

> **Ogni oggetto posseduto è un solo documento, e il documento dice dove si
> trova.** Borsa, zaini e vista globale sono tre *filtri* sulla stessa
> collection, non tre inventari.

### Collection `party_items` (sostituisce `bag_items` e `inventory_items`)

```ts
interface PartyItem {
  id: string;
  // Che cos'è
  catalogId: string | null;   // modello del catalogo; null = oggetto libero ("Corda, 15 m")
  name: string;               // denormalizzato dal catalogo, o libero
  type: "weapon" | "armor" | "shield" | "consumable" | "magic" | "tool" | "misc";
  rarity: "COMMON" | "RARE" | "MAGIC" | "LEGENDARY" | "ARTIFACT" | "STORY" | null;
  imageUrl: string;

  // Quanti
  quantity: number;           // ≥ 1; gli oggetti unici hanno sempre 1
  stackable: boolean;         // pozioni sì; "Spada di Kael +1" no

  // Dove (UNA sola collocazione)
  location: "BAG" | "PC";
  characterId: string | null; // valorizzato se location = "PC"

  // Stato sul personaggio (ha senso solo nello zaino)
  equipped: boolean;
  attuned: boolean;

  // Identità individuale (oggetti unici)
  notes: string;              // "incisione sul pomolo", cariche residue…
  charges: { current: number; max: number } | null;

  createdAt; updatedAt; updatedBy;
}
```

### Le tre viste

| Vista | Query | Uso |
| --- | --- | --- |
| **Borsa Conservante** | `location == "BAG"` | Hub del Party |
| **Zaino di Syl** | `characterId == <id di Syl>` | Scheda del PG / vista da tavolo |
| **Oggetti del party** | tutta la collection, raggruppata per `catalogId` (o nome) | Totale + distribuzione: "Pozione di guarigione · 5 · Borsa 3 · Syl 2" |

Il party ha poche centinaia di oggetti al massimo: l'aggregazione si fa nel
browser, nessun contatore da tenere allineato. **Il totale è sempre la somma,
per costruzione** (requisito 5.1).

### Pile e oggetti unici

- **Impilabili** (pozioni, frecce, monete speciali): una pila per collocazione.
  Trasferire 2 su 5 = la pila d'origine scende a 3, quella di destinazione
  sale di 2 (o viene creata). Se l'origine arriva a 0 il documento sparisce.
- **Unici** (`stackable: false`): non si fondono mai. Trasferirli cambia
  **solo** `location`/`characterId` dello **stesso documento**: id, note,
  cariche e sintonia restano (requisito 5.6).

---

## 3. Operazioni

Ogni operazione è **una transazione Firestore** (`runTransaction`): legge le
quantità attuali, verifica, scrive origine + destinazione + log insieme. Se
due giocatori prelevano contemporaneamente l'ultima pozione, uno dei due
riceve "Ne è rimasta 0" invece di duplicarla (requisiti 5.2, 5.3, 5.7).

| Operazione | Effetto |
| --- | --- |
| **Acquisisci** (oggetto nuovo, dal catalogo o libero) | Destinatario facoltativo: nessuno → Borsa (caso A); un PG → il suo zaino (caso B). Se esiste già una pila uguale nella destinazione, si somma |
| **Trasferisci** (quantità N) | Borsa ↔ zaino, zaino ↔ zaino. N ≤ disponibile; parziale per le pile, intero per gli unici |
| **Usa / consuma** | −1 (o −N) sulla pila; a 0 sparisce. Pensato per la vista da tavolo: un tocco su "Bevi" |
| **Perdi / elimina** | Come consumo, con motivo nel log |
| **Equipaggia / sintonizza** | Solo negli zaini |

Il **log** (`item_log`, evoluzione di `bag_log`) registra: chi, cosa,
quantità, da → a, motivo. Serve per "dove è finita la pozione?" e come base
per un **Annulla** sull'ultimo movimento.

### Tempo reale
La collection è piccola: un `onSnapshot` su `party_items` (pattern già usato
per le battaglie, che scrive nella cache React Query) aggiorna Borsa, zaini e
vista globale su tutti i telefoni (requisito 5.8). È l'unico punto in cui il
realtime serve davvero subito, perché la Borsa è condivisa.

### Sicurezza
Coerente con D-8 ("gruppo di fiducia"): ogni membro del party può leggere e
spostare tutti gli oggetti — è ciò che fa già oggi la Borsa. Le Rules
controllano solo la forma (quantità ≥ 1, collocazione coerente). Niente API
server: le transazioni client bastano.

---

## 4. Effetti sul resto dell'app

- **Scheda del PG**: il pannello Inventario e la scheda Arsenale leggono
  `party_items` del personaggio; `sheet.equipment` viene dismesso.
  L'arma principale e l'equipaggiamento pubblico si derivano dagli oggetti
  equipaggiati nello zaino.
- **Area Personale**: perde la sezione Inventario (lo zaino sta nella scheda).
- **Hub del Party**: la tab "Borsa Conservante" diventa "Oggetti", con un
  interruttore **Borsa / Tutto il party**.
- **Catalogo**: resta il posto dei modelli e dell'approvazione; registrare un
  oggetto libero (non nel catalogo) è possibile direttamente dallo zaino o
  dalla Borsa, senza approvazione. *(Da confermare — domanda 1.)*

### Casi limite

| Caso | Proposta |
| --- | --- |
| PG eliminato o uscito dal party | Il suo zaino torna in Borsa (una transazione), con voce nel log |
| PG morto | Lo zaino resta suo (il party può "saccheggiarlo" con un trasferimento) |
| Due prelievi simultanei | Transazione: il secondo fallisce con messaggio chiaro |
| Offline al tavolo | Le transazioni richiedono rete: il pulsante si disattiva con un avviso, nessuna perdita silenziosa |
| Oggetto del catalogo eliminato | Le copie possedute restano (nome e dati sono denormalizzati) |
| Oggetto in attesa di approvazione | Si può già possedere e spostare; un'etichetta "in attesa" lo segnala |

---

## 5. Migrazione dei dati esistenti

Uno script una tantum (`scripts/`, Admin SDK, come `create-admin.ts`), con
**anteprima obbligatoria** prima della scrittura:

1. `bag_items` → `party_items` con `location: "BAG"`.
2. `inventory_items` → `party_items` nello zaino del **PG dell'utente**
   (`ownerId` → personaggio con quell'`ownerId`). Se un utente ha più PG, lo
   script si ferma e chiede.
3. `sheet.equipment[]` di ogni PG → `party_items` con `catalogId: null`,
   mantenendo tipo, quantità, `equipped` e note.
4. `bag_log` resta leggibile come storico; i nuovi movimenti vanno in `item_log`.

Le vecchie collection restano intatte finché non verifichi che tutto torna;
la pulizia è un passo separato.

---

## 6. Costo e rischio

| Parte | Stima |
| --- | --- |
| Modello, transazioni, realtime, log | medio |
| Adattare Borsa, zaino nel Codex, vista globale | medio |
| Migrazione + verifica | piccolo, ma delicato |
| Rules e indici (da pubblicare a mano) | piccolo |

Rischio principale: la migrazione di `sheet.equipment` (testo libero,
possibili voci strane). Mitigazione: anteprima + vecchi dati non toccati.

---

## 7. Decisioni (9 nov 2026)

1. **Oggetti liberi: sì.** `catalogId: null`, nessuna approvazione; il
   catalogo resta per gli oggetti della campagna.
2. **Tesoro del party: sì** (vedi §8).
3. **Tutti i membri del party possono spostare** oggetti da qualunque zaino.
   Ogni movimento resta nel log con l'autore.

---

## 8. Denaro e tesoro del party

Stesso principio degli oggetti: **una borsa di monete per collocazione**,
un totale che è sempre la somma.

```ts
// purses/{id}  —  id = "BAG" (tesoro del party) oppure l'id del PG
interface Purse {
  location: "BAG" | "PC";
  characterId: string | null;
  pp: number; gp: number; ep: number; sp: number; cp: number;  // tutti ≥ 0
  updatedAt; updatedBy;
}
```

| Operazione | Effetto |
| --- | --- |
| **Incassa** | Destinatario facoltativo: nessuno → tesoro; un PG → la sua borsa. Opzione "dividi fra i presenti" (es. 120 mo su 4 PG = 30 a testa, il resto al tesoro) |
| **Trasferisci** | Tesoro ↔ PG, PG ↔ PG, per taglio di moneta; mai sotto zero |
| **Spendi** | Sottrae dalla borsa indicata |

Transazioni e log come per gli oggetti (`item_log` con tipo "denaro").
La vista **Oggetti del party** mostra in testa il patrimonio: tesoro, borse
dei PG e totale, anche convertito in monete d'oro.
Migrazione: `sheet.money` di ogni PG → `purses/{id del PG}`; il tesoro nasce
vuoto. Conversioni automatiche fra tagli (resto in argento/rame): **no**
nella prima versione — si spende dal taglio scelto.

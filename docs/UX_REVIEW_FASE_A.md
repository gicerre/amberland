# Amberland — Revisione UX/UI · Fase A: audit dello stato attuale

> Data: 9 novembre 2026 · Prerequisito: `docs/ANALISI_ARCHITETTURALE.md`
> (riferimenti `C-n` = criticità di quel documento).
>
> **Metodo e limiti.** Analisi **statica**: codice, route, componenti, stati.
> L'app **non è stata provata in esecuzione** (servono credenziali e un
> ambiente Firebase). I conteggi di tocchi e cambi di schermata sono
> **simulazioni teoriche** ricavate dal codice, non misurazioni. Lo segnalo
> ogni volta che conta.

---

## 1. Valutazione complessiva

**Qualità tecnica: alta. Completezza funzionale: alta per la campagna,
parziale per il tavolo. Qualità dell'esperienza durante il gioco: bassa.**

L'applicazione è stata progettata come **un'enciclopedia della campagna con
schede personaggio**, e in quel ruolo funziona: atlante, codex, cronache,
grafo, diario, borsa, ricerca globale. La navigazione riflette questa
origine: è organizzata per **tipo di contenuto** (Party, Atlante, Cronache,
Codex, Tomo), non per **momento d'uso** (preparo / gioco / ricordo).

Il momento in cui l'app dovrebbe aiutare di più — il turno al tavolo — è
quello in cui chiede più passaggi:

- **il proprio personaggio non ha un posto fisso**: non c'è una tab, non c'è
  una route; si arriva alla scheda attraverso un elenco;
- **la modalità combattimento è un dialog effimero**: non sopravvive a un
  refresh o al blocco dello schermo, e non ha un indirizzo;
- **il Master non ha una vista del party**: per sapere gli HP di un
  giocatore deve aprirne la scheda, e i dati possono essere vecchi (C-1);
- **il Combat System non è ancora giocabile** dai giocatori (C-3).

Cosa funziona davvero e va preservato:

| Elemento | Perché funziona |
| --- | --- |
| Codex con **inline editing** e Inspector | Modificare sul posto senza form è il paradigma giusto per il tavolo |
| `CombatMode` (contenuto) | PF con Danno/Cura, undo dei PF, tab Arsenale/Magia/Stato: è già quasi la "vista turno" ideale — è sbagliato il contenitore, non il contenuto |
| Danno che consuma prima gli HP temporanei, riposi breve/lungo | Regole 5e automatizzate dove si sbaglia più spesso |
| Ricerca globale Ctrl+K (e lente in topbar mobile) | Il modo più rapido per "chi era quel PNG?" |
| Visibilità e rivelazione dei segreti | Distinzione Master/giocatori chiara a livello di dati |
| Linguaggio diegetico italiano + Cinzel | Identità forte senza costo di leggibilità |
| Bottom bar con etichette sempre visibili | Scelta corretta per il mobile |

---

## 2. Mappa dell'attuale navigazione

```
Landing (/) ── Accedi (/login) ── [primo accesso] Cambia password
                                   │
                                   ▼  dopo il login si atterra su /home
           ┌──────────── PcCreationGate (PLAYER senza PC: wizard obbligatorio)
           ▼
AppShell  ─ desktop: sidebar 288px · mobile: topbar (☰ · logo→/party · 🔍 · avatar) + bottom bar
│
├─ PARTY ............................ tab mobile → /party
│   ├─ Il Party (/party)  [hub a tab locali: Personaggi · Borsa · Diario]
│   └─ Campi di Battaglia (/battaglie)
│        └─ (Master) /battaglie/:id/editor  → schermo intero, fuori dalla shell
│        └─ (Player) card NON cliccabili
├─ ATLANTE .......................... tab mobile → /mondo
│   ├─ Mondi & Luoghi (/mondo)  + albero dinamico in sidebar
│   └─ Missioni (/quest)
├─ CRONACHE ......................... tab mobile → /cronache
│   ├─ Cronache (/cronache)  [tab: Libro · Sessioni]
│   └─ Mappa delle Relazioni (/grafo)
├─ CODEX ............................ tab mobile → /personaggi
│   ├─ Personaggi (/personaggi)   ← qui si trova anche il PROPRIO PC
│   ├─ Fazioni · Oggetti · Bestiario
├─ IL MIO TOMO ...................... tab mobile → /area-personale
│   ├─ Area Personale [tab locali: Inventario · Obiettivi · Diario] + timeline
│   └─ Il Tomo (/home)  ← la pagina d'atterraggio, in seconda posizione
└─ GESTIONE (Master/Admin, solo sidebar/drawer)
    ├─ Commercio (segnaposto) · Sala del Master (/master) · Amministrazione (/admin)

Dettaglio universale: /entita/:id
   ├─ character → Codex (scheda) ──[pulsante]──► CombatMode (dialog a schermo intero)
   ├─ chronicle → lettura capitolo
   └─ altri tipi → pagina entità generica
```

Profondità per raggiungere la **propria scheda**: 2 livelli + 1 scelta da
elenco. Per la **modalità combattimento**: 3 livelli + 1 dialog.

---

## 3. Problemi principali, ordinati per impatto sull'esperienza di gioco

Gravità: **S1** blocca o rallenta il gioco · **S2** attrito frequente ·
**S3** attrito occasionale o di qualità.

| # | Problema | Tipo | Gravità | Evidenza |
| --- | --- | --- | --- | --- |
| U-1 | **Il proprio PC non ha un posto fisso.** Nessuna tab né route "il mio personaggio"; si passa da `/personaggi` o dall'Area Personale | Navigazione | S1 | `nav-config.ts`, §5.2 analisi |
| U-2 | **CombatMode effimera**: dialog con stato locale, nessun URL; blocco schermo/refresh → si torna alla scheda in alto | Stato/contesto | S1 | `combat-mode.tsx`, C-7 |
| U-3 | **Nessuna vista del party per il Master**, e dati non in tempo reale | Funzionale (dati) | S1 per il Master | C-1 |
| U-4 | **Combattimento a due teste**: CombatMode (scheda) e Campi di Battaglia (mappa) non si parlano; il secondo non è giocabile dai player | Funzionale | S1 se si usa la mappa / S3 altrimenti | C-3, §4.3 analisi |
| U-5 | **Navigazione per tipo di contenuto, non per momento d'uso**: durante il gioco servono 2–3 cose, il menu ne offre 15 | Architettura informativa | S2 | §2 |
| U-6 | **Tre "case"**: login → `/home`, logo → `/party`, tab Tomo → `/area-personale`. `/home` è la seconda voce del suo gruppo | Navigazione | S2 | `login-form.tsx`, `app-shell.tsx` |
| U-7 | **Collisione di nomi**: "Codex" è sia il gruppo di menu (Personaggi/Fazioni/Oggetti/Bestiario) sia il nome della scheda personaggio; "Cronache" è sia gruppo sia voce; "Il Tomo" ≠ "Il Mio Tomo" | Linguaggio | S2 | `nav-config.ts`, `character-codex.tsx` |
| U-8 | **Due inventari per il giocatore** (Scheda ≠ Area Personale) più la Borsa | Funzionale (dati) | S2 | C-8 |
| U-9 | **Stato di navigazione perso**: tab degli hub, sezione della scheda, filtri non sono nell'URL; "indietro" non riporta dov'eri | Stato/contesto | S2 | C-7 |
| U-10 | **Hero grandi in ogni pagina elenco** (8 `ListPageHero`) e banner con immagine negli hub: al tavolo il primo schermo è decorazione, il contenuto è sotto la piega | Presentazione | S2 su mobile | `home`, `party-hub`, `area-personale` |
| U-11 | **Peso delle icone** (PNG da ~400 KB) → caricamento lento su rete mobile al tavolo | Prestazioni | S2 | C-6 |
| U-12 | **Undo solo per i PF** e solo dentro CombatMode; slot, risorse, condizioni e borsa non si annullano | Prevenzione errori | S2 | `combat-mode.tsx` |
| U-13 | **Condizioni a testo libero**: "Spaventato" non spiega cosa comporta; nessun riferimento alle regole senza uscire dall'app | Funzionale | S2 | `ConditionEntry` |
| U-14 | **Nessun "adesso"**: niente sessione corrente, quest attiva in evidenza solo in `/home` | Funzionale | S2 | §5.7 analisi |
| U-15 | **Texture e immagini di sfondo residue** (`texture_boxes.webp`, `bg_party.webp`, `bg_personal.webp`, trama a lame in CombatMode, trama sulla sidebar) in contrasto con la Design Constitution v2 | Presentazione | S3 | `home/page.tsx`, `hub-shell`, `sidebar.tsx` |
| U-16 | **Gestione nascosta su mobile**: Sala del Master solo nel drawer, non nella bottom bar | Navigazione (Master) | S3 | `app-shell.tsx` |
| U-17 | **Wizard obbligatorio** per il PLAYER senza PC: blocca anche la consultazione dell'atlante | Onboarding | S3 | `pc-creation-gate.tsx` |

---

## 4. Utilizzo attuale vs ideale durante una sessione

> Simulazioni **teoriche** su smartphone, giocatore già autenticato.
> "Tocchi" = tocchi/digitazioni; "Cambi" = cambi di schermata o apertura di
> un livello a schermo intero.

### Giocatore

| Scenario | Percorso attuale | Tocchi / Cambi | Attriti | Ideale | Tocchi / Cambi |
| --- | --- | --- | --- | --- | --- |
| **G1 · "Prendi 7 danni"** (era in Missioni) | tab Codex → `/personaggi` → trova il PC → `/entita/id` → «Combattimento» → digita 7 → Danno | ~7 / 3 | Due caricamenti di pagina, scelta da elenco, dialog | tab Personaggio → «−» → 7 → conferma | 4 / 0–1 |
| **G2 · "Lancio Palla di Fuoco"** (già in CombatMode) | tab Magia → tocco sullo slot di 3° | 2 / 0 | Buono. Nessun undo dello slot | Uguale + undo | 2 / 0 |
| **G3 · "Sono Spaventato: cosa significa?"** | Condizione aggiunta a mano come testo; il significato va cercato fuori dall'app | — / esce dall'app | Nessun glossario | Chip condizione → tocco → descrizione in un foglio temporaneo | 1 / 0 |
| **G4 · "Ho competenza in Furtività?"** (fuori combattimento) | Raggiungere la scheda (vedi G1) → pannello Caratteristiche | ~4 / 2 | Il percorso verso la scheda | tab Personaggio → Abilità | 1–2 / 0 |
| **G5 · "Chi era Marek?"** | 🔍 → digita → risultato | 3+ / 1 | Buono | Uguale | 3+ / 1 |
| **G6 · Telefono bloccato a metà turno** | Riapertura → la pagina può ricaricarsi → CombatMode chiusa, scroll perso | +3 / +2 | Perdita del contesto | Si riapre dove si era (URL) | 0 / 0 |
| **G7 · "Raccolgo la pozione dalla Borsa"** | tab Party → hub → tab Borsa → oggetto → Preleva → finisce in **Area Personale**, non nella scheda | ~5 / 2 | L'oggetto non compare dove lo si cerca in combattimento | Un solo inventario del PC | ~3 / 1 |

### Master

| Scenario | Percorso attuale | Attriti | Ideale |
| --- | --- | --- | --- |
| **M1 · "Quanti PF ha il guerriero?"** | Aprire la scheda del PC (≥3 tocchi); il dato può essere vecchio fino a navigazione/refresh | Dato inaffidabile (C-1), un PC alla volta | Striscia del party sempre visibile, aggiornata in tempo reale |
| **M2 · Tenere l'iniziativa senza mappa** | Non supportato: la traccia dell'iniziativa esiste solo nell'engine del Combat System (F3 non fatta) | Si usa carta o un'altra app | Tracker leggero: ordine, turno corrente, round |
| **M3 · "Il ladro è avvelenato"** | Aprire la scheda del PC → aggiungere condizione | Rischio di sovrascrivere modifiche concorrenti del giocatore (C-2) | Applicare dalla striscia del party, il giocatore lo vede subito |
| **M4 · Rivelare un luogo** | Sala del Master → "Segreti pronti" → Rivela | Buono | Uguale, raggiungibile in 1 tocco durante la sessione |
| **M5 · Appunto veloce durante il gioco** | tab Party → hub → tab Diario → nuova nota | 4+ tocchi, contesto perso | Nota rapida sempre disponibile |

### Criteri oggettivi proposti per confrontare le soluzioni

| Criterio | Come si misura | Obiettivo |
| --- | --- | --- |
| Tocchi per le 5 azioni più frequenti (PF, slot, risorsa, condizione, consultare abilità) | Conteggio sul prototipo | ≤ 3 ciascuna, dalla vista di gioco |
| Cambi di schermata durante un turno | Conteggio | 0 per le azioni frequenti |
| Tempo per sapere "PF/CA/condizioni" | Cronometro sul prototipo | Visibili senza tocchi nella vista di gioco |
| Persistenza del contesto | Blocco schermo / refresh / indietro | Si torna esattamente allo stesso punto |
| Errori reversibili | Azioni frequenti con undo | 100% delle azioni sul personaggio |
| Informazione irrilevante nella vista di gioco | Elementi non usati in combattimento | Nessun hero/banner/navigazione di catalogo |
| Freschezza del dato condiviso | Ritardo fra modifica del giocatore e vista del Master | < 2 s |
| Peso della prima vista su mobile | DevTools, rete 4G | < 1 MB di immagini |

Sono **obiettivi**, non misure già fatte: la misura avviene sui prototipi
della Fase E e, dove possibile, in una sessione reale.

---

## 5. Prime direzioni progettuali

Tre approcci realmente diversi. Non sono ancora sviluppati: servono a
decidere la direzione.

### Direzione A — "Il personaggio al centro" (riorganizzazione)

La navigazione si riorganizza per **momento d'uso**. Per il giocatore la
prima tab diventa **il proprio personaggio** (route stabile, es. `/pg`), con
una vista compatta "da tavolo" (PF, CA, condizioni, slot, risorse, azioni)
che è l'evoluzione di CombatMode resa pagina — non più dialog — e stato
nell'URL. Il resto (atlante, codex, cronache) confluisce in una tab
**Campagna**. Il Master ha una tab **Tavolo** con la striscia del party.

- **Vantaggi**: risolve U-1, U-2, U-5, U-6, U-7, U-9 quasi interamente nel
  frontend; rischio basso; riusa `CodexProvider`, `derive.ts`, tab di CombatMode.
- **Svantaggi**: non risolve da sola U-3 (serve il realtime); cambia
  abitudini già acquisite.
- **Impatto sui dati**: nessuno, salvo il realtime per la striscia del Master.

### Direzione B — "Modalità Sessione Live" (doppia modalità)

Due modalità esplicite. **Campagna** = l'app di oggi, riordinata.
**Sessione** = una shell dedicata (route group separato, come `(battle)`)
attivata dal Master: per i giocatori mostra solo personaggio, party, quest
attiva, note rapide e ricerca; per il Master striscia del party, iniziativa
leggera, rivelazioni, note di sessione. All'uscita, la sessione diventa una
voce d'archivio già collegata a cronache e storico.

- **Vantaggi**: massima riduzione del carico cognitivo durante il gioco;
  dà finalmente un "adesso" (U-14) e un ponte naturale verso le cronache.
- **Svantaggi**: due shell da mantenere; rischio di "dove sono finito?" se il
  passaggio fra modalità non è evidente; più lavoro.
- **Impatto sui dati**: documento di sessione attiva, realtime sulle schede,
  patch granulari (C-1, C-2).

### Direzione C — "Il tavolo è la battaglia" (combattimento come perno)

Si completa il Combat System (F3) e lo si rende il cuore della sessione:
mappa, iniziativa e turni condivisi, con la scheda del personaggio come
pannello laterale della battaglia; gli HP vivono nel combattente durante lo
scontro e tornano sulla scheda alla fine.

- **Vantaggi**: valorizza il 31% del codice già scritto; esperienza ricca se
  il gruppo gioca su mappa condivisa (schermo o tablet al centro del tavolo).
- **Svantaggi**: copre solo il combattimento, non esplorazione e interazione;
  è la direzione più costosa; due fonti di verità sugli HP da riconciliare.
- **Impatto sui dati**: F3 completa + sincronizzazione scheda ↔ combattente.

### Raccomandazione preliminare

**A come fondamenta, B come evoluzione, C solo se il gruppo gioca davvero
su mappa condivisa.**

A risolve la maggior parte degli attriti S1/S2 con poco rischio, e i suoi
pezzi (vista da tavolo del PC, striscia del party) sono esattamente quelli
che servirebbero a B. B diventa sensata dopo il realtime sulle schede. C
dipende da una risposta che non posso dedurre dal codice: come giocate al
tavolo (domanda 1).

---

## 6. Problemi che probabilmente non avevi individuato

1. **Il Combat System non è raggiungibile dai giocatori.** Le card delle
   battaglie non hanno link per chi non è Master, e il campo di gioco
   (`battle-field.tsx`) non è montato da nessuna pagina. È facile non
   accorgersene testando sempre come Master.
2. **Il Master vede HP vecchi senza saperlo.** Nessun indicatore segnala che
   un dato può essere vecchio; con 60 s di staleTime e niente refetch al
   focus, una scheda tenuta aperta può restare indietro per tutta la sessione.
3. **Modifiche concorrenti che si cancellano.** Oggi è raro perché nessuno
   vede l'altro in tempo reale; diventerà frequente appena il Master potrà
   intervenire sulle schede durante la sessione (C-2). Va risolto **insieme**
   al realtime, non dopo.
4. **"Preleva dalla Borsa" porta l'oggetto in un inventario diverso da quello
   della scheda.** Il giocatore lo cercherà in combattimento e non lo troverà.
5. **Spoiler nel grafo.** I giocatori scaricano nomi ed etichette di tutte le
   relazioni, anche quelle segrete (C-4).
6. **Peso delle icone**: la sola icona del Party nella bottom bar è ~390 KB;
   al tavolo con rete mobile si sente.
7. **Il wizard obbligatorio blocca tutto**, anche la sola lettura: un nuovo
   giocatore che vuole prima leggere l'ambientazione non può.
8. **La documentazione inganna**: `ARCHITECTURE.md` descrive cartelle e
   visibilità che non esistono più. Per un redesign condotto in più sessioni
   è un rischio concreto.
9. **Circa 4.000 righe non committate** nel Combat System: prima di toccare
   la navigazione andrebbero messe al sicuro.

---

## 7. Domande necessarie per avviare la progettazione condivisa

Solo quelle da cui dipende davvero la direzione.

1. **Come giocate al tavolo?** In presenza, online o misto? Ognuno usa il
   proprio telefono, c'è un tablet/TV condiviso, o il Master proietta la
   mappa? E usate mappe a griglia per i combattimenti, o teatro della mente?
   *(Decide fra A/B e C, e la priorità di F3.)*
2. **Il Master usa l'app durante la sessione, e su quale dispositivo?**
   Laptop dietro lo schermo, tablet, telefono? *(Decide quanto investire
   nella vista Master live e il suo layout.)*
3. **Chi modifica la scheda durante il gioco?** Solo il giocatore, o anche il
   Master (danni, condizioni)? *(Decide se realtime e patch granulari sono
   indispensabili subito.)*
4. **Inventario: quale deve restare?** La scheda (`equipment`) o l'Area
   Personale (`inventory_items`)? Si possono fondere, ma serve sapere quale
   dei due i giocatori usano davvero. *(Decide una migrazione dati.)*
5. **Il Combat System va completato ora?** Oppure si congela allo stato di
   editor del Master e si dà priorità alla vista da tavolo del personaggio?
6. **Quanto contano gli spoiler fra voi?** Se il gruppo è di fiducia, C-4
   può aspettare; altrimenti va corretto presto.

---

## Registro decisioni (Fase D)

| # | Data | Decisione | Conseguenza |
| --- | --- | --- | --- |
| D-1 | 9 nov 2026 | Si gioca **in presenza, ognuno col proprio telefono, senza mappa** | Il cuore della sessione è la scheda del PG su mobile, usata a una mano |
| D-2 | 9 nov 2026 | Il Master **quasi non usa l'app in sessione** (prepara e archivia) | Niente vista Master live, niente modalità Sessione Live condivisa (direzione B scartata) |
| D-3 | 9 nov 2026 | La scheda la gestisce **il giocatore (99%)**; il Master corregge di rado | Realtime e patch granulari (C-1, C-2) non sono prerequisiti: bastano refetch al ritorno sulla pagina e salvataggi robusti |
| D-4 | 9 nov 2026 | **Campi di Battaglia tolti per ora** | Direzione C scartata; modalità di rimozione da decidere (vedi sotto) |
| D-5 | 9 nov 2026 | Direzione adottata: **A — "il personaggio al centro"** | Prossimo passo: definire la vista da tavolo del PG |

| D-6 | 9 nov 2026 | Campi di Battaglia: **eliminare il codice** (recuperabile dal commit `8c64ce5` sul branch `refactor/ux-live`) | Da eseguire come primo passo dell'implementazione, dopo il via |
| D-7 | 9 nov 2026 | La vista da tavolo deve coprire **tutto ciò che un PG può fare**: PF, incantesimi e slot, abilità/TS/bonus, risorse, condizioni, oggetti | Serve una gerarchia: sempre visibile / un tocco / approfondimento |
| D-8 | 9 nov 2026 | **Spoiler: non importa** (gruppo di fiducia) | C-4 non si corregge; le Rules possono restare permissive fra membri del party |
| D-9 | 9 nov 2026 | Inventario: **Borsa Conservante + Zaino del PG come un unico sistema**, con vista globale "Oggetti del party", trasferimenti atomici e parziali | Proposta in `docs/PROPOSTA_INVENTARIO.md`, da valutare |

| D-10 | 9 nov 2026 | **Oggetti liberi** ammessi (senza catalogo né approvazione) | `catalogId: null` |
| D-11 | 9 nov 2026 | **Tesoro del party** con trasferimenti di denaro | `purses/*`, vedi `PROPOSTA_INVENTARIO.md` §8 |
| D-12 | 9 nov 2026 | **Tutti** i membri possono spostare oggetti da qualunque zaino | Rules permissive fra membri, log con autore |

Domande ancora aperte: la struttura della vista da tavolo (da valutare
su prototipo).

---

## Prossimi passi proposti (dopo il confronto)

1. Mettere al sicuro il working tree (commit) — lo faccio solo se me lo chiedi.
2. **Fase B**: simulazioni dettagliate dei 3–4 scenari più rilevanti per il
   vostro modo di giocare (dopo le risposte alla domanda 1).
3. **Fase C**: sviluppo completo delle direzioni scelte, con schizzi delle
   schermate chiave.
4. **Fase E**: prototipo navigabile della vista da tavolo del personaggio,
   isolato dall'app (route separata non collegata o pagina di prototipo).

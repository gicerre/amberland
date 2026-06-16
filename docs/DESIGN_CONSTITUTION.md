# DESIGN CONSTITUTION — DARK FANTASY CAMPAIGN MANAGER

> Documento vincolante per qualsiasi schermata, componente e interazione futura.

---

## PRINCIPIO FONDAMENTALE

Questa non è una web application.
Questa non è una dashboard.
Questa non è una piattaforma SaaS.
Questa non è una raccolta di schermate amministrative.

**L'applicazione è un artefatto narrativo.**

L'intero sistema deve apparire come un gigantesco archivio vivente utilizzato da:

- Maestri di Gilda
- Cronisti Reali
- Custodi degli Archivi
- Bibliotecari Arcani
- Ordini Religiosi
- Accademie Magiche
- Casate Nobiliari

Ogni interazione deve sembrare l'utilizzo di strumenti appartenenti a questo mondo.

L'utente non deve percepire di gestire dati.
Deve percepire di consultare e compilare documenti reali provenienti da un universo fantasy.

---

## DESIGN PHILOSOPHY

### Ogni elemento UI deve trasmettere:
- Matericità
- Peso
- Profondità
- Artigianalità
- Imperfezione controllata
- Antichità
- Autorevolezza

### Mai:
- Flat Design
- Glassmorphism
- Neumorphism
- Material Design
- SaaS Design
- Startup Aesthetic
- Enterprise Dashboard

---

## WORLD BUILDING VISIVO

Prima di generare qualsiasi schermata identificare:

1. Chi utilizza quello strumento nel mondo fantasy
2. Dove si trova fisicamente
3. Da chi è stato costruito
4. Con quali materiali è stato realizzato
5. Quale funzione narrativa svolge

**Ogni schermata deve avere una giustificazione diegetica.**

### Esempi di nomenclatura corretta

| Linguaggio tecnico | Linguaggio diegetico |
|---|---|
| Character Creation Form | Registro Anagrafico della Gilda degli Avventurieri |
| Monster Database Entry | Archivio Bestiario delle Terre Conosciute |
| Quest Management | Bacheca delle Commesse e delle Imprese |
| User Settings | Sigillo Personale dell'Archivista |
| Party Dashboard | Il Tomo dell'Archivista — Registro della Compagnia |
| Item Inventory | Borsa Conservante — Inventario dei Tesori |
| Campaign Diary | Cronache della Compagnia |
| Faction List | Registro degli Ordini e delle Casate |

---

## DESIGN SYSTEM FOUNDATION

### MATERIALI PRIMARI

#### Metallo Forgiato
- **Utilizzo:** cornici, CTA principali, separatori, badge speciali
- **Varianti:** ferro annerito, bronzo consumato, ottone inciso, argento lavorato, oro antico

#### Pergamena
- **Utilizzo:** form, descrizioni, campi testuali, schede informative
- **Varianti:** pergamena chiara, pergamena consumata, carta archivistica, pelle lavorata

#### Pietra Incisa
- **Utilizzo:** dashboard principali, header, statistiche importanti, titoli

#### Legno Nobile
- **Utilizzo:** navigazione, sidebar, menu contestuali

---

## SISTEMA DI GERARCHIA VISIVA

La gerarchia **non** viene costruita tramite:
- Ombre moderne
- Blur
- Glow neon

La gerarchia viene costruita tramite:
- **Materiali** — più raro = più importante
- **Dimensioni** — elemento più grande = più rilevante
- **Profondità fisica** — rilievo, incisione, tridimensionalità
- **Lavorazione artigianale** — più complessa = più autorevole
- **Complessità delle incisioni** — ornamenti = importanza

> Più un elemento è importante, più appare costoso da realizzare.

---

## TIPOLOGIA DEGLI OGGETTI UI

### Documento
- **Utilizzato per:** schede, descrizioni, biografie, quest
- **Aspetto:** pagina di tomo, bordi di carta consumata

### Archivio
- **Utilizzato per:** tabelle, liste, raccolte di entità
- **Aspetto:** schedari imperiali, indici rilegati

### Reliquia
- **Utilizzato per:** CTA, azioni speciali, oggetti importanti
- **Aspetto:** oggetto fisico da attivare, non un bottone

### Sigillo
- **Utilizzato per:** tag, stati, rarità
- **Aspetto:** marchio nobiliare, ceralacca, stemma

### Targa
- **Utilizzato per:** header, titoli, intestazioni
- **Aspetto:** lastra incisa su pietra o metallo

---

## SISTEMA DELLE ANIMAZIONI

Ogni animazione deve simulare materia reale.

### Mai:
- Bounce
- Elastic
- Cartoon Motion
- Mobile Animation style

### Sempre:
- Peso
- Attrito
- Inerzia
- Scorrimento meccanico
- Apertura di oggetti fisici

### Esempi specifici

| Azione UI | Animazione fisica |
|---|---|
| Apertura Dialog | Il tomo si apre, la pagina scorre, i sigilli si spezzano |
| Cambio Tab | Il segnalibro viene spostato, la pagina viene girata |
| Salvataggio | Comparsa di un sigillo, incisione della registrazione, timbro ufficiale |
| Caricamento | Sabbia che scorre, fiamma che si accende, ruota meccanica |
| Eliminazione | Carta che brucia, incisione che sbiadisce |
| Errore | Scuotimento di catene, sigillo rifiutato |

---

## REGOLE UX ASSOLUTE

1. Massimo tre livelli gerarchici visivi per schermata
2. Nessuna informazione importante richiede hover per essere visibile
3. Ogni azione primaria deve essere immediatamente identificabile
4. L'estetica non deve compromettere la leggibilità
5. Il fantasy deve migliorare la comprensione, non essere semplice decorazione
6. Ogni elemento decorativo deve avere una funzione narrativa
7. Ogni nuovo componente deve derivare da un componente base già esistente

---

## REGOLE PER LO SVILUPPO (CLAUDE)

Quando progetti una nuova schermata:

1. Identifica il **ruolo narrativo** della schermata
2. Identifica la sua **controparte nel mondo fantasy**
3. Identifica il **materiale dominante** (Metallo / Pergamena / Pietra / Legno)
4. Identifica il **livello gerarchico**
5. Seleziona i **componenti base** del Design System
6. Mantieni **coerenza assoluta** con tutte le schermate esistenti
7. Evita qualsiasi pattern tipico delle web app moderne
8. Giustifica ogni scelta estetica tramite motivazioni UX **e** narrative
9. Progetta prima l'**esperienza** e poi l'**estetica**
10. Ogni nuova schermata deve sembrare appartenente **allo stesso tomo**

---

## ROADMAP IMPLEMENTAZIONE FASE G

### G1 — Palette dark fantasy (solo codice)
Spostare da blue-black verso toni più organici e grezzi.
Definire palette cromatica finale prima di procedere.

### G2 — Texture di sfondo (asset PNG tileable)
- Body: pietra nera/ossidiana seamless
- Card: cuoio scuro consumato
- Sidebar: pietra incisa

### G3 — Ornamenti SVG (asset da creare/trovare)
- Angoli card: teschio/spine/rune (da game-icons.net o custom)
- Divisori sezione: catena, ossa, runa
- Sigilli: ceralacca, stemma, pentagramma

### G4 — Frame card con border-image
SVG o PNG strip per bordi metallo/legno/pergamena sulle card.

### G5 — Effetti speciali (solo codice)
- Fiamma/torcia flicker su elementi importanti
- Noise ambientale sul background
- Particelle braci (opzionale)

### G6 — Font heading alternativo (opzionale)
Solo se si decide di sostituire Cinzel con un font più gotico.

---

*Documento vincolante — versione 1.0 — Amberland Dark Fantasy Campaign Manager*

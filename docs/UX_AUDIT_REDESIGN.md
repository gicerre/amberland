# UX AUDIT & REDESIGN — AMBERLAND

> Audit critico di tutte le schermate + specifica di redesign.
> **NOTA (2 lug 2026):** direzione pivotata a Next-Gen (Constitution v2 +
> `DESIGN_SYSTEM_V3.md`). Le **diagnosi UX** di questo documento (gerarchie,
> hero, a11y, colori hardcoded, dedup) restano valide; le **prescrizioni
> materiche** (pergamena, legno, ceralacca, torcia) sono superate — dove
> questo doc dice "sigillo/targa/legno", leggere l'equivalente Obsidian in V3.
> Versione 1.1 — luglio 2026

---

## PARTE 0 — DIAGNOSI GLOBALE

La maggior parte dei problemi non appartiene a una singola schermata: appartiene ai
sistemi condivisi. Correggere qui propaga il fix ovunque. Le violazioni sono ordinate
per gravità rispetto alla Design Constitution.

### 0.1 La palette è ancora "blue-black SaaS" (violazione G1)

**Evidenza** (`globals.css`): `--stone-mid: #181c24`, `--stone-surface: #1f2430`,
`--stone-highlight: #262d3a`, `--night: #11151c` — sono tutti **grigi freddi a
dominante blu**, la palette tipica di ogni dashboard dark-mode (Linear, Vercel,
GitHub dark). L'onboarding di Mondo usa perfino `rgba(19,28,49,…)` hardcoded — blu notte.

**Perché è un problema**: la Constitution chiede pietra, ossidiana, cuoio, legno —
materiali *organici e caldi*. Il blu freddo comunica "software", non "archivio antico".
È la singola scelta che più tradisce l'identità: qualunque texture o ornamento
appoggiato su un fondo blu-acciaio continuerà a sembrare un tema dark di shadcn.

**Redesign (G1)** — spostare l'intera scala neutra verso il basalto caldo / bruno fumo:

| Token | Attuale | Proposto | Materiale |
|---|---|---|---|
| `--background` | `#06070a` (blu-nero) | `#0a0805` (nero fuliggine) | ossidiana/fuliggine |
| `--stone-deep` | `#0b0d12` | `#100d09` | basalto profondo |
| `--stone-mid` / `--card` | `#181c24` | `#1a1510` | pietra fumo caldo |
| `--stone-surface` | `#1f2430` | `#241c14` | pietra illuminata da torcia |
| `--stone-highlight` | `#262d3a` | `#2e2418` | spigolo inciso |
| `--night` | `#11151c` | `#141008` | ombra di sala |

Aggiungere token materiali mancanti: `--wood-dark #2a1d12`, `--wood-mid #3d2b1a`
(sidebar, bacheche), `--leather #241812` (copertine card), `--ash #8a7f6d`
(testo secondario caldo al posto del muted grigio). `--crimson #b91c1c` è il rosso
Tailwind di default: sostituire con un sangue-ruggine `#8f1d1d` / `#b3402e`.
I `muted-foreground` vanno ricalibrati sulla nuova scala mantenendo contrasto ≥ 4.5:1.

### 0.2 La gerarchia è costruita con glow e blur (vietati esplicitamente)

**Evidenza**: `boxShadow: 0 0 12px ${accent}` sulle barre di sezione delle quest;
`animate-glow-pulse` sul CTA "Crea il primo mondo"; `shadow-[0_0_50px_rgba(212,175,55,…)]`
e `shadow-[0_0_30px_…]` su icone e pannelli; `backdrop-blur-sm` su login card e nav
mobile; `drop-shadow-[0_0_30px_rgba(212,175,55,0.3)]` sul logo. La Constitution:
*"La gerarchia non viene costruita tramite ombre moderne, blur, glow neon."*

**Redesign** — sostituire sistematicamente con equivalenti materici:
- **Glow dorato diffuso** → **rim-light di torcia**: bordo superiore chiaro 1px
  (`inset 0 1px 0 rgba(232,201,121,0.25)`) + ombra di contatto corta e scura sotto
  (`0 2px 0 rgba(0,0,0,0.6)`). L'oggetto "prende luce da fuoco", non emette luce propria.
- **Glow pulsante sui CTA** → **flicker di fiamma** (G5): variazione lenta e
  irregolare di luminosità del rim-light (±6%, curva a gradini), mai una pulsazione sinusoidale.
- **Backdrop-blur** → pannello **opaco con texture** (cuoio/pergamena scurita). Il blur
  non esiste nel mondo fisico dell'archivio.
- **Barre-glow di stato** → **sigilli di ceralacca** o chiodi forgiati (vedi 0.4).

### 0.3 Due linguaggi coesistono: "poster fantasy" e "dashboard nuda"

**Evidenza**: Mondo/Quest/Bestiario/Fazioni/Oggetti/Home hanno hero cinematografici;
Master, Admin, Grafo e Commercio usano il `PageHeader` piatto con `StatGrid` e tabelle
shadcn di default. Sembrano due applicazioni diverse. La Constitution: *"Ogni nuova
schermata deve sembrare appartenente allo stesso tomo."*

**Redesign**: definire **tre registri di pagina** canonici e assegnarli:
1. **Sala** (hero immersivo + contenuto) — sezioni pubbliche del mondo: Mondo, Quest,
   Bestiario, Fazioni, Oggetti, Personaggi, Cronache, Home.
2. **Scrittoio** (targa incisa compatta + piano di lavoro in legno/pergamena) — strumenti
   operativi: Master, Admin, Grafo, Commercio. Niente hero da 45rem, ma nemmeno il
   `PageHeader` nudo: una **Targa** (lastra di metallo incisa, ~96px) con il nome
   diegetico della sala e il materiale del piano sottostante.
3. **Tomo privato** (HubShell) — Party e Area Personale (già coerenti tra loro).

### 0.4 Componenti SaaS non reinterpretati (chip, segmented control, tabella, tabs, skeleton)

**Evidenza**: `FilterChip` è una pill `rounded-full`; `ViewToggle` è un segmented
control; `EntityTable` è una tabella shadcn con intestazioni generiche
("Nome / Dettagli / Stato") e un pallino colorato come unica indicazione di tipo;
i Tabs delle Cronache sono shadcn default con contatori tra parentesi; gli skeleton
sono rettangoli shimmer.

**Redesign per componente**:
- **FilterChip → Sigillo**: bottone esagonale/scudetto con bordo in ottone inciso;
  stato attivo = ceralacca pressata (fondo rilievo scuro + inset shadow, non gradiente
  dorato). Motivazione UX: la forma non-pill distingue i filtri dai tag di contenuto.
- **ViewToggle → Leva d'archivio**: due incavi in una piastra di ferro, l'indicatore è
  una linguetta di ottone che *scorre* (transizione con attrito, `cubic-bezier(0.2, 0, 0, 1)`,
  180ms) tra le posizioni "Codex" (card) e "Registro" (tabella). Rinominare le viste
  con lessico diegetico.
- **EntityTable → Registro**: righe rigate come un libro mastro (bordi orizzontali
  `--gold-dim` al 20%), numerazione romana/ordinale nella prima colonna, il pallino
  colorato sostituito da un **glifo del tipo + etichetta testuale** (il colore da solo
  è una violazione di accessibilità — daltonismo). Prima riga di intestazione in
  Cinzel maiuscoletto inciso.
- **Tabs → Segnalibri**: linguette di stoffa/cuoio che sporgono dal bordo superiore
  del "libro"; il cambio tab sposta fisicamente il segnalibro e la pagina fa un
  cross-fade con leggero slittamento orizzontale (page-turn semplificato, 240ms).
- **Skeleton → caricamento diegetico**: sostituire i rettangoli shimmer con
  **inchiostro che si asciuga** (blocchi di testo che emergono da una macchia scura,
  animazione opacity+mask) o braci che si accendono per le card. Un solo componente
  `LoadingInk` riusato ovunque (regola 7: derivare dai base component).
- **Badge → Ceralacca**: già vicino; togliere `rounded-full`, usare forma di goccia
  di cera schiacciata (border-radius irregolare) con micro-rilievo.

### 0.5 L'hero immersivo è identico ovunque e costa troppo (spazio + LCP)

**Evidenza**: `ImmersiveHero` è alto `lg:h-[45rem]` (**720px**) su *ogni* lista; stessa
struttura (occhiello tracking-[0.45em] → H1 gold-gradient 6xl → sottotitolo →
`CrestBanner` con lo **stesso logo** incastonato). Mondo e Quest duplicano perfino il
markup del wrapper full-bleed invece di usare `ListPageHero` (violazione regola 7).

**Perché è un problema**:
1. **Gerarchia**: se ogni sala ha lo stesso monumento d'ingresso, nessuna sala è
   speciale — *"più un elemento è importante, più appare costoso"* smette di funzionare.
2. **Produttività**: 720px di hero spingono il contenuto sotto la piega a ogni visita;
   l'utente che torna sulla bacheca quest 10 volte a sessione paga 10 volte lo scroll.
3. **Performance**: immagine full-viewport `priority` su ogni route = LCP pesante,
   soprattutto mobile.

**Redesign**:
- Ridurre le altezze: `h-56 sm:h-72 lg:h-96` (~384px max) per le liste; il 45rem resta
  **solo** per la pagina di dettaglio entità (dove l'immagine È il contenuto) e per
  l'onboarding di Mondo.
- **Hero collassabile allo scroll**: dopo il primo scroll la testata si riduce a una
  **Targa** sticky di 64px (titolo + azioni), così ricerca e filtri restano raggiungibili.
- **Differenziare il materiale per sala**: la cornice inferiore dell'hero non deve
  essere sempre l'onda+stemma. Bestiario = bordo di pelle graffiata; Quest = asse di
  legno con chiodi; Mondo = arco di pietra; Fazioni = drappo araldico. Lo stemma del
  regno resta solo su Home e Landing (dove rappresenta il regno intero).
- Deduplicare: Mondo e Quest devono consumare `ListPageHero`, non copiarne il markup.

### 0.6 Colori di stato hardcoded e fuori palette

**Evidenza**: in `quest/page.tsx` gli accent di sezione sono esadecimali inline
(`#ff7a18`, `#7c5cff`, `#9a907c`); `personaggi` passa `#e8dcc0`, `fazioni` `#c43146`,
`cronache` `#f1c40f`. Il viola `#7c5cff` non esiste nei token (l'arcano in palette è
`--arcane-*`).

**Redesign**: creare in `@theme` una scala semantica di stato
(`--status-active`, `--status-next`, `--status-secret`, `--status-archive`) derivata
dalla palette G1, e un token `accent` per tipo di entità nel `ENTITY_REGISTRY` che
punti ai token CSS, non a esadecimali. Nessun colore inline nelle pagine.

### 0.7 Accessibilità — problemi ricorrenti

1. **Micro-tipografia**: etichette a `text-[10px]`/`text-[11px]` con
   `tracking-[0.16em]+` e maiuscolo (quick links Home, occhielli, nav mobile HubShell).
   Sotto i 12px il maiuscolo spaziato è illeggibile. Minimo 12px, meglio 13px.
2. **Colore come unico segnale**: pallino-tipo nella tabella, barre di stato quest.
   Sempre accoppiare glifo o testo.
3. **Icone senza etichetta**: HubShell `bareIcons` elimina l'etichetta visibile su
   mobile (resta solo `aria-label`) — la riconoscibilità delle PNG illustrate non è
   garantita. Mostrare sempre l'etichetta (10→12px, sotto l'icona ridotta).
4. **Contrasto su texture**: `text-muted-foreground` sopra pannelli traslucidi con
   texture al 30% scende facilmente sotto 4.5:1. Regola: il testo poggia sempre su
   uno scrim locale pieno (≥ 85% opacità), mai direttamente sulla texture.
5. **Affordance solo hover**: l'indicatore zoom dell'hero appare solo in hover
   (`opacity-0 group-hover:opacity-100`) — invisibile su touch. Mostrarlo sempre su
   viewport touch (media query `(hover: none)`).
6. **`prefers-reduced-motion`**: particelle (EmberParticles), starfield e flicker vanno
   disattivati o ridotti a statico sotto questa media query — oggi non risulta gestito.
7. **Focus visibile**: le card-link e i sigilli/chip devono avere un focus ring inciso
   (doppio bordo oro scuro), non l'anello di default del browser né nessun anello.

### 0.8 Iconografia incoerente

**Evidenza**: convivono icone lucide (Swords, Globe, Plus…) e PNG illustrate via
`imageIcon` (world.png, crown.png…), spesso nella stessa schermata (Master:
`StatGrid` con PNG, header con lucide). Le PNG appaiono a taglie enormi
(`size-20` decorativa accanto a un titolo `text-base` in `HomePanel` — gerarchia
invertita: l'ornamento pesa più del contenuto).

**Redesign**: due livelli con ruoli fissi. **Lucide** (stroke 1.5, sempre 16–20px) =
icone *funzionali* (azioni, campi, nav testuale). **PNG/SVG illustrate** = icone
*narrative*, solo come emblema di sezione o su card di navigazione, taglia 48–96px,
mai inline col testo. In Fase G3 le lucide più visibili (stati quest, tipi entità)
vengono sostituite da glifi SVG incisi custom.

---

## PARTE 1 — SCHERMATE PUBBLICHE (fuori dal portale)

### 1.1 Landing `/` — "I Cancelli di Amberland"

**Ruolo narrativo**: la soglia del regno. Materiale: pietra + cielo notturno.

**Stato attuale — cosa funziona**: scenografia full-viewport, stagger d'ingresso con
easing decelerato, braci, logo illustrato. È la schermata più vicina alla Constitution.

**Problemi**:
1. `hover:scale-[1.03]` + `brightness-110` sul CTA: micro-zoom da web app, non peso fisico.
2. Il CTA è un `Button` shadcn allungato: per la Constitution un'azione di questo rango
   è una **Reliquia**, non un bottone.
3. Vignetta + gradiente + drop-shadow dorato sul logo = glow (0.2).
4. Nessuna transizione verso `/login`: il "varco" si risolve in una navigazione secca.

**Redesign**:
- **CTA-Reliquia**: piastra di bronzo forgiato (gradiente metallico verticale già in
  palette gold-bright→gold-dark), bordo cesellato 2px, testo Cinzel inciso
  (text-shadow 0 1px 0 scuro sopra, 0 -1px 0 chiaro sotto). Hover: la piastra si
  *illumina di torcia* (rim-light +15%) e si abbassa di 1px come premuta; active:
  affonda 2px con ombra di contatto ridotta. Niente scale.
- **Transizione d'ingresso**: al click, dissolvenza a nero con le braci che
  accelerano verso l'alto (400ms) prima della navigazione — "si attraversa il cancello".
- Responsive: già corretto (`clamp` sul logo). Verificare che le 45 particelle scendano
  a ~20 sotto 640px e a 0 con `prefers-reduced-motion`.

### 1.2 Login `/login` — "Il Cancello" → *Sigillo d'Ingresso alla Gilda*

**Problemi**:
1. `backdrop-blur-sm` sulla card (vietato) + glow dorato nell'ombra.
2. La card è un modulo di login qualunque con cornice: manca la controparte diegetica
   del *presentare le credenziali a un guardiano*.
3. Copy ottimo ("Pronuncia le tue credenziali"), ma l'errore di autenticazione (nel
   `LoginForm`) dovrebbe essere il **sigillo rifiutato** della Constitution.

**Redesign**:
- Card = **pagina del registro della guardiania**: fondo pergamena scura
  (`--parchment` scurita al 12% su cuoio), niente blur — pannello opaco.
- Campi = righe del registro: bordo solo inferiore inciso, etichette in Cinzel
  maiuscoletto 12px, focus = la riga si "inchiostra" (il bordo passa da gold-dim a
  gold con una scia da sinistra, 200ms).
- Submit = **timbro**: il bottone è un sigillo tondo in ceralacca; al submit si preme
  (translate-y 2px) e in caso di successo lascia l'impronta (flash di rilievo) prima
  del redirect.
- Errore = **scuotimento di catene**: shake orizzontale smorzato (3 oscillazioni,
  ampiezza decrescente 6→2px) + il sigillo diventa cremisi per 1.5s. Mai il rosso
  Tailwind puro: usare il nuovo `--crimson` ruggine.

### 1.3 Cambia password `/cambia-password` — *Forgiatura della Nuova Chiave*

**Problemi**: struttura corretta (FrameCard, alert primo accesso), ma: icona lucide
`KeyRound` in un cerchio con glow (0.2); il titolo urlato in maiuscolo tracking-widest
a 2xl è più aggressivo che autorevole; nessuna animazione di conferma.

**Redesign**: metafora = **riforgiare la chiave**. Icona: chiave illustrata su
incudine (PNG/SVG narrativa). Alla conferma: breve animazione di *tempra* (la chiave
si illumina di brace e si spegne, 600ms) + toast-sigillo "La nuova chiave è stata
forgiata". Indicatore di robustezza password = non una barra colorata ma **tacche di
forgiatura** incise (1–4 tacche sul gambo della chiave). Il link "Non sei tu? Esci"
va bene com'è (azione secondaria, ghost).

---

## PARTE 2 — HOME E SALE PRINCIPALI

### 2.1 Home `/home` — *Il Tomo dell'Archivista*

**Problemi**:
1. **Stat nascoste su mobile** (`hidden md:inline-flex`): le tre cifre chiave
   (imprese, personaggi, luoghi) spariscono proprio dove lo spazio andrebbe guadagnato
   riducendo l'hero. Violazione: informazione importante non disponibile.
2. **StatChip sbilanciato**: icona PNG `size-10` (40px) accanto a testo 14px — l'icona
   domina il dato.
3. **HomePanel**: icona decorativa `size-20` (80px) accanto a un titolo `text-base` —
   gerarchia invertita (0.8); tripla sovrapposizione texture+2 gradienti con la texture
   al 30% = fanghiglia visiva su cui il muted-foreground perde contrasto.
4. **Quick links**: griglia `grid-cols-4` su mobile con etichette 10px maiuscole
   spaziate = illeggibili; `hover:scale-110` sull'icona (cartoon, vietato).
5. Le due liste (imprese, cronache) sono liste-link ordinarie: nessun segno materico.

**Redesign**:
- **Hero ridotto** (h-56/h-72) con saluto e — *anche su mobile* — le tre statistiche
  come **targhe incise** in fila sotto il titolo: piastrine di pietra con numero in
  Cinzel 24px inciso e etichetta 12px. Su mobile scorrono in orizzontale.
- **"Imprese in corso"** = *pagina del registro*: ogni quest è una riga di libro
  mastro con sigillo di stato in ceralacca a sinistra, titolo in Cinzel, estratto in
  Crimson Pro corsivo. Hover: la riga si illumina di torcia (fondo +4% caldo), non
  bordo dorato che appare dal nulla.
- **"Ultime cronache"** = *annotazioni a margine*: lista con capolettera o glifo del
  tipo di entità inciso, data in maiuscoletto.
- **Quick links** = *portali delle sale*: massimo `grid-cols-3` su mobile, tessere
  verticali in legno con cornice in ottone, icona illustrata 48px, etichetta **13px**
  peso 600 senza tracking esagerato. Hover: rim-light + inclinazione prospettica ≤ 1°
  (peso, non zoom). I link riservati (Master/Admin) portano un piccolo sigillo di rango.
- Ordine delle sezioni invariato (corretto: stato → contenuti → navigazione).

### 2.2 Mondo `/mondo` — *L'Atlante dei Mondi*

**Cosa funziona**: l'onboarding a stati (PLAYER vs MASTER senza mondi) è il pattern
giusto; i portali-mondo come Reliquie sono l'idea più forte dell'app.

**Problemi**:
1. Onboarding Master: sfondo blu (`rgba(19,28,49,…)` hardcoded → 0.1),
   `animate-glow-pulse` sul CTA (→ 0.2), icona lucide `Globe` in cerchio glow.
2. Markup hero duplicato invece di `ListPageHero` (→ 0.5).
3. Hero 45rem + Starfield + EmberParticles sulla stessa pagina: tre sistemi
   atmosferici concorrenti; su mobile è costoso e dispersivo.
4. La nota footer in corsivo ("Espandi un mondo dalla sua pagina…") è un tooltip
   travestito: istruzione d'uso fuori contesto.

**Redesign**:
- Onboarding: fondale **osservatorio di pietra** (nuova palette), il CTA diventa
  Reliquia con flicker di fiamma (0.2). L'icona: astrolabio/globo illustrato.
- Hero: consumare `ListPageHero` con cornice ad **arco di pietra** (materiale della
  sala); h-72/h-96. Lo Starfield resta l'atmosfera della griglia portali (è la sua
  giustificazione diegetica: i mondi fluttuano nel firmamento) ma le EmberParticles
  si tolgono qui.
- La nota footer diventa una **postilla dell'archivista** dentro l'ultima card della
  griglia (card "aggiungi/espandi" per il Master) o si elimina.

### 2.3 Quest `/quest` — *L'Albo delle Imprese*

**Cosa funziona**: raggruppamento per stato in ordine di urgenza narrativa; copy dei
gruppi eccellente ("Trame segrete", "Negli annali").

**Problemi**:
1. Barre-glow di sezione con `boxShadow: 0 0 12px` e colori hardcoded fuori palette (0.2, 0.6).
2. L'"albo/bacheca" non esiste visivamente: i gruppi galleggiano sul fondo pagina
   come sezioni di una dashboard. Il materiale dichiarato (bacheca di legno con
   incarichi affissi) non è mai reso.
3. Ricerca: input shadcn nudo, unico controllo su una riga — spazio sprecato.
4. Hero duplicato (0.5).

**Redesign**:
- **Fondo-bacheca**: la zona contenuti poggia su texture di legno scuro (G2). Ogni
  gruppo di stato è una **sezione dell'albo**: intestazione = asse orizzontale con
  etichetta bruciata/incisa e un **sigillo di ceralacca** nel colore-stato tokenizzato
  (al posto della barra-glow); il conteggio dentro il sigillo.
- Le `QuestBoardCard` diventano **incarichi affissi**: pergamena con chiodo/ceralacca
  in alto, rotazione casuale deterministica ±0.6° (seed = id) per l'imperfezione
  controllata. Hover: la pergamena si stacca di 2px dall'asse (ombra di contatto che
  cresce), non translate-y col bordo dorato.
- "Trame segrete" (solo Master): trattamento distintivo — carta più scura, sigillo
  arcano, angolo bruciato.
- Ricerca in linea con le azioni sotto l'hero collassabile (0.5), placeholder
  "Cerca tra le imprese…" ok.

### 2.4 Bestiario / Fazioni / Oggetti (`EntityListPage`) — *Archivi*

Categoria Constitution: **Archivio** (schedario imperiale). Oggi è una pagina-lista
SaaS ben fatta: hero + search + chip + segmented control + griglia/tabella.

**Problemi** (tutti sistemici, risolti in Parte 0): chip-pill (0.4), segmented
control (0.4), tabella generica con pallino-colore (0.4, 0.7), skeleton shimmer (0.4),
hero uniforme (0.5), accent hardcoded (0.6).

**Redesign specifico per sala** (stessa struttura, materiale diverso — è così che si
ottiene varietà senza rompere la coerenza):
- **Bestiario**: cornice hero in pelle graffiata da artigli; sigilli-filtro per
  `creatureType` con glifi di categoria; le card ritratto hanno già il taglio giusto —
  aggiungere in G4 la cornice "trofeo di caccia" (legno+ferro).
- **Fazioni**: hero con drappo araldico; i sigilli-filtro per `factionType` sono
  *stemmi* (è il caso d'uso perfetto della categoria Sigillo).
- **Oggetti**: hero "camera del tesoro"; raggruppamento visivo per rarità in G4/G5
  (bordo card che sale di materiale: ferro → argento → oro) — la gerarchia
  "più raro = più prezioso" applicata letteralmente.
- La **vista Registro** (tabella) va rinominata e ridisegnata come da 0.4; è la vista
  "consultazione rapida dell'archivista" e merita parità di cura con le card.

### 2.5 Personaggi `/personaggi` — *I Volti del Regno*

Delega a `CharacterDashboard` (già in stile portrait-codex, fase C–D) e il trattamento
`FALLEN_FILTER`+`FallenOverlay` per i caduti è il miglior esempio nel codebase di
"effetto con funzione narrativa". Da correggere solo: accent hardcoded `#e8dcc0` (0.6)
e l'adozione dell'hero ridotto/collassabile (0.5). Verificare che il velo "fallen"
mantenga leggibile il nome del personaggio (contrasto su cremisi).

### 2.6 Cronache `/cronache` — *Le Cronache del Regno*

**Problemi**:
1. Hero senza immagine (TODO in codice): la sala appare "in cantiere".
2. Tabs shadcn default con "(12)" tra parentesi — da Constitution il cambio tab è un
   segnalibro spostato (0.4).
3. Timeline: pattern standard border-left + marker; le card evento hanno
   `hover:-translate-y-0.5` (levitazione da web app: le cose incise non levitano).
4. Il pulsante "Evento"/"Sessione" appare sopra il contenuto allineato a destra,
   staccato dal contesto.

**Redesign**:
- Metafora: **il grande libro della storia**. Tabs → due segnalibri di stoffa
  ("Eventi del mondo" / "Diario delle sessioni"), conteggio in un sigillo sul nastro.
- Timeline → **cronaca miniata**: il filo è una linea d'inchiostro con volute; ogni
  evento è un *capoverso* con capolettera decorato e la data in un cartiglio (non un
  Badge pill). Hover: il capoverso si illumina di candela, nessun translate.
- Sessioni → **pagine di diario**: le card mostrano numero sessione come numero di
  pagina, data in maiuscoletto, estratto in corsivo.
- Aggiungere `cronache.webp` (biblioteca/scriptorium) e definire l'accent dai token (0.6).

---

## PARTE 3 — TOMI PRIVATI E STRUMENTI

### 3.1 Party `/party` e Area Personale `/area-personale` (HubShell)

**Cosa funziona**: l'impianto banner + pannello PC + nav a card + swipe mobile con
soglia e discriminazione asse verticale è solido; la mutua esclusione inventario
personale/Borsa è chiara.

**Problemi**:
1. Nav mobile `bareIcons`: icona sola senza etichetta visibile (0.7.3).
2. Banner: `backdrop-blur` nella pill-nav mobile (0.2) e doppio gradiente+radial gold
   sul `WindowPanel` (fanghiglia, come Home).
3. `TimelinePanel` "sempre visibile come layer secondario" sta *sotto* la sezione
   attiva: su mobile è irraggiungibile senza molto scroll e l'utente non sa che esiste.
4. Le card di navigazione desktop con `cardImage` scuriscono al 95% in basso: il
   testo descrittivo cade nella zona più scura — ok — ma la texture al top al 28% può
   impastarsi con le icone PNG chiare.

**Redesign**:
- Nav mobile: icona 40px + etichetta 12px sempre visibile; il segnalibro attivo è una
  linguetta che sporge 2px sopra il bordo (già accennato con la riga dorata: renderla
  una linguetta fisica).
- `TimelinePanel` → diventa una **quarta sezione** ("Cronologia") oppure un cassetto
  a scomparsa ancorato in basso (maniglia visibile con etichetta) — mai contenuto
  fantasma sotto il fold.
- Il diario a libro (`DiaryBook`) è la componente più diegetica dell'app: farne il
  riferimento qualitativo per le altre sezioni.

### 3.2 Dettaglio entità `/entita/[id]`

`EntityView` universale con `ImmersiveHero`: è la pagina dove l'hero 45rem è
*giustificato* (l'immagine è contenuto). Raccomandazioni: qui vive la categoria
**Documento** — il corpo (EntityDetailBody, fase D) deve leggersi come pagina di tomo:
colonna di testo max ~70ch, capolettera sul primo paragrafo della descrizione,
metadati in margine come glosse. Il trattamento `fallen` va mantenuto. Le azioni del
Master (modifica/visibilità) vanno raggruppate in un unico **scrittoio degli
strumenti** (barra sticky in basso su mobile), non sparse.

### 3.3 Grafo `/grafo` — *La Ragnatela delle Cronache*

**Problemi**: `PageHeader` nudo (registro "Scrittoio" mancante, 0.3); il grafo è
presumibilmente su fondo piatto; nessuna legenda diegetica.

**Redesign**: cornice **tavolo cartografico**: il canvas del grafo poggia su
pergamena scura/carta stellare (G2), i nodi usano i glifi-tipo (G3) e la legenda è
una **bussola dei simboli** in un angolo (card pergamena, sempre visibile, non hover).
Targa d'intestazione compatta. I fili delle relazioni: inchiostro, con lo stato
visibile per tratteggio *e* colore (0.7.2).

### 3.4 Master `/master` — *La Sala del Master*

**Problemi**: è la schermata più "enterprise" dell'app: `PageHeader` + `StatGrid` +
pannelli = admin dashboard con parole fantasy. Icone `imageIcon` create **dentro il
render** a ogni ciclo (anche difetto tecnico: definirle a modulo). Le PNG in StatGrid
convivono con lucide nell'header (0.8).

**Redesign**: metafora = **tavolo da guerra del narratore**.
- Targa d'ingresso (registro Scrittoio) su piano di legno scuro.
- `StatGrid` → **targhe di pietra incise** (numero grande Cinzel, etichetta piccola);
  l'accento amber/emerald per "Nascoste"/"Pronte" diventa una gemma incastonata
  nella targa, non un colore di testo.
- "Segreti pronti alla rivelazione" → **lettere sigillate da aprire**: ogni voce è una
  busta con sigillo intatto; l'azione "rivela" spezza il sigillo (animazione di
  frattura 300ms + le briciole di cera cadono). È l'occasione perfetta per l'animazione
  "i sigilli si spezzano" della Constitution.
- La griglia dei tipi/creazione rapida: scaffale d'archivio con un cassetto per tipo
  (conteggio inciso sul frontalino).

### 3.5 Admin `/admin` — *Il Registro degli Abitanti*

**Problemi**: come Master — dashboard con StatGrid e tabella shadcn; tutte icone lucide.

**Redesign**: registro anagrafico del regno. `UsersTable` → **Registro** (0.4) con
righe rigate; il ruolo è un sigillo di rango (corona=Master, scudo=Custode,
spada=Giocatore) + testo; l'account disabilitato è una riga **depennata**
(line-through d'inchiostro + opacità) invece di un badge rosso. "Nuovo utente" =
"Registra un abitante", con l'animazione timbro alla conferma.

### 3.6 Commercio `/commercio` — placeholder

Accettabile come teaser, ma con tre FrameCard a `opacity-60` sembra rotto più che
"in arrivo". **Redesign**: un'unica scena — **il portone del mercato incatenato**
(illustrazione + catene), targa "Il mercato aprirà presto", e le tre future sale
(Botteghe, Mercanti, Tesoro) come insegne di legno appese ancora coperte da teli.
Un solo empty-state narrativo forte batte tre card spente.

### 3.7 Missioni `/missioni`

Solo redirect a `/quest`: corretto, nessun intervento.

---

## PARTE 4 — SISTEMA DELLE ANIMAZIONI (spec unificata)

Curve e durate canoniche (da applicare ovunque, sostituendo i valori sparsi):

| Nome | Valore | Uso |
|---|---|---|
| `ease-weight` | `cubic-bezier(0.2, 0, 0, 1)` | oggetti che si muovono (leve, segnalibri, cassetti) |
| `ease-settle` | `cubic-bezier(0.22, 1, 0.36, 1)` | ingressi di pagina/card (già usato in landing: mantenere) |
| durate | 150–200ms micro / 240–320ms transizioni / 400–600ms cerimonie (sigillo, timbro, tempra) | — |

Regole: mai `scale` come feedback hover (sostituire con rim-light + affondo 1-2px);
mai levitazione (`-translate-y` su hover) per oggetti "pesanti" (card pietra/legno) —
ammessa solo per carta/pergamena (2px max, con ombra di contatto coerente);
`prefers-reduced-motion`: particelle off, cerimonie ridotte a dissolvenze 150ms.

---

## PARTE 5 — PRIORITÀ D'INTERVENTO

Mappate sulla roadmap Fase G esistente:

1. **G1 — Palette calda** (0.1, 0.6): il moltiplicatore di tutto il resto. Include la
   scala di stato tokenizzata e la bonifica degli esadecimali inline.
2. **Bonifica glow/blur** (0.2) + **spec animazioni** (Parte 4): solo codice, alto impatto.
3. **Registro "Scrittoio"** per Master/Admin/Grafo/Commercio (0.3): elimina la
   spaccatura dei due linguaggi.
4. **Hero: riduzione altezze + collasso sticky + dedup** (0.5): produttività e LCP.
5. **Componenti reinterpretati** (0.4): Sigillo-filtro, Leva, Registro, Segnalibri,
   LoadingInk — un componente alla volta, partendo da FilterChip (il più visibile).
6. **G2–G4 texture/ornamenti/cornici** per sala (Parte 2): dopo la palette, mai prima.
7. **Cerimonie** (timbro, sigillo spezzato, tempra) e G5 effetti: per ultime — sono
   la ciliegina, non la torta.

Accessibilità (0.7) non è una fase: ogni intervento sopra la incorpora come vincolo
(contrasto ≥ 4.5:1, etichette ≥ 12px, mai solo-colore, focus inciso, reduced-motion).

---

*Documento di lavoro — v1.0 — da aggiornare a valle di ogni fase G completata.*

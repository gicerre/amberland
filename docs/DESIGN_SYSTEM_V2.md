# AMBERLAND DESIGN SYSTEM v2 — "L'ARCHIVIO"

> Specifica completa e vincolante del sistema di design.
> Gerarchia documentale: `DESIGN_CONSTITUTION.md` (principi) → **questo documento**
> (sistema) → `UX_AUDIT_REDESIGN.md` (diagnosi e redesign schermata per schermata).
> In caso di conflitto vince la Constitution.
> Versione 2.0 — luglio 2026

---

## 1. VISIONE

Un software ambientato in un universo dark fantasy, con la qualità artistica di un
titolo AAA (Baldur's Gate 3, Diablo IV, Elden Ring) e l'usabilità di un prodotto
enterprise moderno (Linear, Notion, Stripe).

Tre test che ogni schermata deve superare:

1. **Test dello screenshot** — uno screenshot fuori contesto deve sembrare l'UI di un
   gioco Larian/Blizzard, mai un template Bootstrap o un tema dark di shadcn.
2. **Test della produttività** — un utente che entra 10 volte al giorno deve trovare
   il contenuto in ≤ 1 scroll e completare le azioni frequenti in ≤ 2 interazioni.
3. **Test del silenzio** — l'atmosfera si costruisce con materia, luce e tipografia,
   mai con rumore visivo: se un elemento decorativo non ha funzione narrativa, si toglie.

**Mobile first, sempre**: ogni layout nasce a 320px e si espande. Il desktop è il
mobile che ha guadagnato spazio, mai il contrario.

---

## 2. INFORMATION ARCHITECTURE

### 2.1 Mappa del regno (sitemap)

```
/                      La Soglia (landing pubblica)
/login                 Il Cancello della Guardiania
/cambia-password       La Forgia della Chiave

── Portale (autenticato) ──────────────────────────────
/home                  Il Tomo dell'Archivista        [Sala]
/mondo                 L'Atlante dei Mondi            [Sala]
/quest                 L'Albo delle Imprese           [Sala]
/bestiario             Archivio Bestiario             [Sala]
/fazioni               Registro degli Ordini          [Sala]
/oggetti               Camera dei Tesori              [Sala]
/personaggi            I Volti del Regno              [Sala]
/cronache              Le Cronache del Regno          [Sala]
/entita/[id]           Pagina del Tomo                [Documento]
/party                 Registro della Compagnia       [Tomo privato]
/area-personale        Scrittoio Personale            [Tomo privato]
/grafo                 Tavolo Cartografico            [Scrittoio]
/master                Tavolo da Guerra del Narratore [Scrittoio · MASTER]
/admin                 Registro degli Abitanti        [Scrittoio · ADMIN]
/commercio             Il Mercato (portone chiuso)    [Scrittoio · teaser]
```

### 2.2 I tre registri di pagina (canonici, vedi audit 0.3)

| Registro | Schermate | Testata | Materiale dominante |
|---|---|---|---|
| **Sala** | sezioni pubbliche del mondo | hero immersivo ridotto (h-56/72/96) che collassa in Targa sticky 64px | pietra + materiale della sala |
| **Scrittoio** | strumenti operativi (Master, Admin, Grafo, Commercio) | Targa incisa compatta (~96px), nessun hero | legno scuro + metallo |
| **Tomo privato** | Party, Area Personale (HubShell) | banner + pannello PC | cuoio + pergamena |

L'hero a piena altezza (45rem) è riservato **solo** al dettaglio entità (dove
l'immagine è contenuto) e all'onboarding di Mondo.

### 2.3 Navigazione

- **Desktop**: sidebar in legno nobile (collassabile a 64px con soli glifi + tooltip),
  gruppi con `nav-group-label`, voce attiva = incavo illuminato da torcia (fondo +4%
  caldo, filo d'oro a sinistra come segnalibro).
- **Mobile**: bottom bar a 5 destinazioni max (Home, Quest, Mondo, Party, ⋯ Altro come
  drawer). Icona 24px + **etichetta 12px sempre visibile** (mai `bareIcons`, audit 0.7.3).
  Attivo = linguetta di ottone che sporge 2px dal bordo superiore.
- **Ricerca globale**: Ctrl+K ovunque ("Consulta l'Indice") — dialog-tomo con risultati
  raggruppati per tipo di entità, glifo + etichetta.
- **Breadcrumb**: solo su pagine di profondità ≥ 2 (dettaglio entità), come filo
  d'inchiostro: `Sala › Documento`, 13px, mai su Sala di primo livello.
- **Profondità massima**: 3 livelli. Nessuna pagina raggiungibile solo da hover o menu
  annidati.

---

## 3. FOUNDATIONS

### 3.1 Color tokens — palette "Basalto e Torcia" (G1 definitiva)

Regola madre: **neutri caldi** (bruno-fumo, mai blu), l'**oro è risorsa scarsa**
(≤ 10% dell'area di una schermata), ogni colore vive in un token — **zero esadecimali
inline nelle pagine** (audit 0.6).

#### Neutri (sostituiscono la scala blu attuale)

| Token | Valore | Materiale / uso |
|---|---|---|
| `--background` | `#0a0805` | fuliggine — fondo app |
| `--stone-deep` | `#100d09` | basalto profondo — sidebar, incassi |
| `--night` | `#141008` | ombra di sala — pannelli incassati |
| `--stone-mid` / `--card` | `#1a1510` | pietra fumo — superficie card |
| `--stone-surface` | `#241c14` | pietra alla torcia — popover, hover |
| `--stone-highlight` | `#2e2418` | spigolo inciso — bordi in luce |
| `--wood-dark` | `#2a1d12` | legno scuro — sidebar, bacheche |
| `--wood-mid` | `#3d2b1a` | legno in luce — piani di lavoro |
| `--leather` | `#241812` | cuoio — copertine, HubShell |
| `--iron-dark` | `#2b241c` | ferro brunito (era blu `#262d3a`) |
| `--iron-mid` | `#453a2c` | ferro in luce |

#### Testo (contrasto AA obbligatorio su `--card`)

| Token | Valore | Uso | Contrasto su `#1a1510` |
|---|---|---|---|
| `--parchment` | `#f1e8d2` | titoli, valori importanti | ~13:1 |
| `--foreground` | `#d7ccb4` | corpo testo | ~9.5:1 |
| `--ash` (nuovo `--muted-foreground`) | `#a89a82` | testo secondario caldo | ~5.5:1 |

`--ash` sostituisce il grigio freddo `#9a907c`. Nessun testo sotto 4.5:1; testo
≥ 18.5px bold può scendere a 3:1 (solo cifre decorative delle targhe).

#### Oro (invariato — già corretto)

`--gold #c8a75d` · `--gold-bright #d4af37` · `--gold-light #e8c979` ·
`--gold-dark #9a7e3a` · `--gold-dim #4a3c1c`. Bordi standard:
`--border rgba(200,167,93,0.14)`, `--input …0.20`, `--ring …0.50`.

#### Semantici e di stato (nuovi, tokenizzati)

| Token | Valore | Uso |
|---|---|---|
| `--crimson` | `#8f1d1d` | sangue-ruggine — errori, caduti (sostituisce `#b91c1c`) |
| `--crimson-bright` | `#b3402e` | accento errore su fondo scuro |
| `--crimson-light` | `#d98a70` | testo cremisi leggibile su fondo scuro |
| `--ember` | `#cf7a2e` | brace — warning, eventi (sostituisce `#ff7a18`) |
| `--ember-bright` | `#e89a52` | brace viva |
| `--verdant` | `#5f7a3a` | successo, natura (sostituisce lime `#84cc16`) |
| `--verdant-bright` | `#8aa860` | conferme su fondo scuro |
| `--arcane` | `#6b5a9e` | arcano, segreti (desaturato dal viola neon `#7c5cff`) |
| `--arcane-bright` | `#9d8ac9` | accento arcano leggibile |
| `--status-active` | → `--gold-bright` | imprese in corso (l'oro è dell'adesso) |
| `--status-next` | → `--ember` | prossime — brace che sta per accendersi |
| `--status-available` | → `--ash` | sulla bacheca, in attesa |
| `--status-secret` | → `--arcane-bright` | trame segrete |
| `--status-archive` | → `--gold-dark` | negli annali — oro tarnito dal tempo |
| `--status-done` | → `--verdant-bright` | completata |
| `--status-failed` | → `--crimson-bright` | fallita |

Ogni stato è **sempre** colore + glifo/testo, mai solo colore (audit 0.7.2).

#### Rarità (gerarchia materica letterale: più raro = metallo più prezioso)

| Rarità | Materiale bordo | Token |
|---|---|---|
| Comune | ferro | `--iron-mid` |
| Non comune | bronzo | `--gold-dark` |
| Raro | argento | `#9aa0a6` (`--silver`, nuovo) |
| Epico | arcano | `--arcane-bright` |
| Leggendario | oro + flicker torcia | `--gold-bright` |
| Artefatto | sangue | `--crimson-bright` |

Niente `glow-pulse` sulle rarità: il leggendario usa il flicker di fiamma (§3.7).

#### Grafici

Serie in ordine fisso: oro → brace → arcano → verdant → argento. Ogni serie oltre al
colore ha un tratteggio o marker distintivo (accessibilità daltonismo). Fondo grafico:
`--night` con griglia `--gold-dim` al 25%, mai griglie bianche.

### 3.2 Tipografia

| Ruolo | Font | Note |
|---|---|---|
| Display | Cinzel 700 (opz. G6: Cinzel Decorative solo per landing/celebrazioni) | H1 hero, cifre delle targhe |
| Heading | Cinzel 600–700 | H2–H4, etichette incise |
| Body | Caudex 400/700 | testo corrente, corsivo per citazioni/estratti |
| Mono | Cascadia Code | solo debug/codici |

> Nota: CLAUDE.md cita Crimson Pro ma il progetto monta **Caudex** — Caudex è la
> scelta confermata (calligrafico, ottima resa dark). Aggiornare CLAUDE.md.

#### Scala fluida (clamp, mobile-first)

| Token | clamp() | Uso |
|---|---|---|
| `--text-display` | `clamp(2rem, 1.2rem + 4vw, 3.75rem)` | H1 hero |
| `--text-h1` | `clamp(1.6rem, 1.2rem + 2vw, 2.5rem)` | titolo pagina |
| `--text-h2` | `clamp(1.3rem, 1.1rem + 1vw, 1.75rem)` | sezioni |
| `--text-h3` | `1.125rem` | card title |
| `--text-body` | `1rem / 1.7` | corpo |
| `--text-small` | `0.875rem` | metadati |
| `--text-label` | `0.8125rem` (13px) | etichette, nav |
| `--text-caption` | `0.75rem` (12px) | **minimo assoluto** |

Regole dure (audit 0.7.1): niente testo sotto 12px; maiuscolo + tracking ≥ 0.16em
solo da 12px in su e mai su più di 3 parole; tracking massimo 0.3em (occhielli hero);
lunghezza riga di lettura max 70ch; line-height 1.7 per il corpo, 1.15 per i display.

### 3.3 Spaziatura, griglia, breakpoints

- **Base 4px**. Scala: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. Ritmo verticale tra
  sezioni: 48px mobile / 64px desktop.
- **Container**: contenuto app `max-w-6xl` (72rem); colonna di lettura `max-w-[70ch]`;
  ultrawide: cap a `96rem` centrato, lo spazio eccedente riempito dalla texture di
  fondo con vignetta laterale (la "sala" continua oltre il contenuto).
- **Breakpoints** (Tailwind default + regole):

| Viewport | Colonne griglia entità | Nav | Hero liste |
|---|---|---|---|
| 320–639 | 1–2 (card dense) | bottom bar | h-56 |
| 640–767 | 2 | bottom bar | h-64 |
| 768–1023 | 2–3 | sidebar collassata | h-72 |
| 1024–1439 | 3 | sidebar estesa | h-80 |
| 1440–1919 | 4 | sidebar estesa | h-96 |
| ≥ 1920 | 4 (cap container) | sidebar estesa | h-96 |

- **Touch target** minimo 44×44px; spaziatura tra target adiacenti ≥ 8px.

### 3.4 Elevazione — il modello "luce di torcia"

La luce viene da un fuoco in alto: gli oggetti **prendono luce**, non la emettono.
Vietati: glow ambientale, `backdrop-blur`, ombre colorate diffuse (audit 0.2).

| Livello | Nome | Ricetta | Uso |
|---|---|---|---|
| E-1 | Inciso | `inset 0 1px 3px rgba(0,0,0,0.55)` | input, incavi, leve |
| E0 | Appoggiato | nessuna ombra, solo bordo | contenuto in pagina |
| E1 | Rilievo | `inset 0 1px 0 rgba(232,201,121,0.18)` (rim-light) + `0 2px 0 rgba(0,0,0,0.55)` (contatto) | card, targhe, bottoni |
| E2 | Carta sollevata | rim-light + `0 6px 12px -6px rgba(0,0,0,0.7)` | pergamene, popover, dropdown |
| E3 | Flottante | rim-light + `0 24px 48px -12px rgba(0,0,0,0.85)` + velo `modal-vignette` | dialog, drawer |

Hover di rango superiore = rim-light +15% e/o distacco di 2px **con ombra di contatto
coerente**, mai `scale` né glow.

### 3.5 Radius e linguaggio delle forme

`--radius 0.625rem` resta la base per le superfici morbide (carta, cuoio). Forme dure:

- **Pietra/metallo**: angoli tagliati (`clip-angled-*`, `clip-octagon-*` già in codice).
- **Ceralacca**: radius irregolare `borderRadius: 46% 54% 52% 48% / 52% 46% 54% 48%`.
- **Pill (`rounded-full`)**: vietata su chip e badge (audit 0.4) — ammessa solo per
  avatar e scrollbar.

### 3.6 Materiali e texture (G2)

| Materiale | Texture | Dove | Regole |
|---|---|---|---|
| Ossidiana/basalto | pietra scura seamless | body | opacità ≤ 8%, `background-attachment: fixed` solo desktop |
| Pietra incisa | grana media | targhe, stat | opacità ≤ 15% |
| Legno nobile | venatura scura | sidebar, bacheca quest, piani Scrittoio | ≤ 20% |
| Cuoio | grana pelle | copertine card, HubShell | ≤ 20% |
| Pergamena | `parchment-1.webp` (esistente) | documenti, diario | piena, con testo scuro |
| Metallo | gradiente verticale, niente texture bitmap | cornici, CTA, sigilli | — |

**Regola dello scrim** (audit 0.7.4): il testo non poggia mai direttamente su una
texture — sempre su uno scrim locale pieno ≥ 85% di opacità. **Mai più di una texture
+ un gradiente** sovrapposti sullo stesso pannello (anti-fanghiglia).

Budget: ogni texture tileable ≤ 60KB WebP, max 4 texture caricate per route.

### 3.7 Motion tokens (Parte 4 dell'audit, estesa)

| Token | Valore | Uso |
|---|---|---|
| `--ease-weight` | `cubic-bezier(0.2, 0, 0, 1)` | oggetti che si muovono: leve, segnalibri, cassetti, drawer |
| `--ease-settle` | `cubic-bezier(0.22, 1, 0.36, 1)` | ingressi di pagina e card |
| `--ease-press` | `cubic-bezier(0.4, 0, 1, 1)` | affondo di pressione (solo andata) |
| `--dur-micro` | 150ms | hover, focus, press |
| `--dur-quick` | 200ms | chip, toggle, tooltip |
| `--dur-move` | 280ms | tab, drawer, accordion, page-turn |
| `--dur-ceremony` | 500ms | timbro, sigillo spezzato, tempra (max 600ms) |

Vocabolario canonico delle cerimonie:

| Evento | Animazione |
|---|---|
| Salvataggio | **timbro**: pressa 2px + impronta flash di rilievo (450ms) |
| Rivelazione segreto | **sigillo spezzato**: frattura + briciole di cera (300ms) |
| Eliminazione | **carta che brucia**: dissolve con maschera dal bordo (500ms) |
| Errore su submit | **catene**: shake orizzontale smorzato 6→2px, 3 oscillazioni |
| Caricamento | **inchiostro che si asciuga** (`LoadingInk`, §4.14) |
| Apertura dialog | **tomo che si apre**: `forge-in` esistente, senza blur del contenuto |
| Cambio tab | **segnalibro spostato** + cross-fade con slittamento 10px |

Divieti: bounce/elastic (`cubic-bezier` con overshoot — rimuovere `0.34,1.56,0.64,1`
da `.card-hover`), `scale` su hover, levitazione su oggetti pesanti (pietra/metallo);
la carta può staccarsi max 2px. Stagger di ingresso liste: 30ms/item, max 8 item poi
tutti insieme.

**`prefers-reduced-motion`**: particelle e flicker OFF, cerimonie ridotte a
dissolvenze 150ms, parallax e collasso hero istantanei. Obbligatorio su ogni
animazione, senza eccezioni (audit 0.7.6).

### 3.8 Iconografia (audit 0.8)

- **Funzionale** — lucide, stroke 1.5, taglie 16/20px, colore `currentColor`. Azioni,
  campi, nav testuale. Mai sopra i 20px.
- **Narrativa** — PNG/SVG illustrate, taglie 48–96px, solo come emblema di sezione o
  su card di navigazione. Mai inline col testo, mai come icona d'azione.
- **Glifi incisi** (G3) — SVG custom monocromatici per tipi di entità e stati quest:
  riempimento `--gold-dark`, tratto inciso (highlight sopra, ombra sotto). Usati in
  tabelle-Registro, grafo, sigilli-filtro.

---

## 4. LIBRERIA COMPONENTI

Ogni componente dichiara: categoria Constitution, anatomia, stati, motion, a11y.
Stati obbligatori per tutti: default · hover · focus-visible · active · disabled ·
loading (se async) · error (se input). Focus visibile = **anello inciso**: doppio
bordo `0 0 0 2px background, 0 0 0 4px rgba(200,167,93,0.6)` (già in globals — mai
rimuoverlo, mai lasciare il default browser).

### 4.1 Bottoni — tre ranghi

| Rango | Categoria | Aspetto | Uso |
|---|---|---|---|
| **Reliquia** | Reliquia | piastra di bronzo forgiato: gradiente `gold-dark→gold→gold-dark`, bordo cesellato 2px, Cinzel inciso (text-shadow `0 1px 0` scuro) | max 1 per schermata (CTA primaria) |
| **Strumento** | — | fondo `--stone-surface`, bordo `--border`, testo `--foreground` | azioni secondarie |
| **Postilla** | — | ghost, testo `--gold` con underline al hover | azioni terziarie, link |

Stati Reliquia: hover = rim-light +15% e affondo 1px; active = affondo 2px + ombra di
contatto ridotta + `inset` scuro; loading = il testo si spegne e una brace percorre il
bordo; disabled = bronzo ossidato (desaturato, niente opacity generica).
Distruttivo = rango Strumento con bordo/testo `--crimson-bright`, mai piastra rossa
piena. Icone lucide 16px a sinistra del testo, mai da sole senza `aria-label`.

### 4.2 Input / Textarea — campi del registro

Base: `.field-engraved` esistente, con correzioni: al focus **niente glow diffuso** —
il bordo si "inchiostra" (da `gold-dim` a `gold` con scia da sinistra, 200ms) +
l'anello inciso. Etichetta sopra il campo, Cinzel maiuscoletto 13px `--ash`; testo
inserito Caudex 16px (previene lo zoom iOS). Placeholder corsivo al 40%.
Errore: bordo `--crimson-bright` + **annotazione a margine** sotto il campo (12px,
glifo ⚠ + testo, `role="alert"`); il campo non si scuote (lo shake è riservato al
submit del form). Help contestuale: postilla corsiva 12px sotto l'etichetta, non
tooltip nascosto.

### 4.3 Select / Combobox / Dropdown

Trigger = campo inciso con chevron di ottone che **ruota con peso** (`--ease-weight`,
200ms). Pannello = E2 carta sollevata su `--stone-surface`, apertura `slide-up` 240ms
come un cassetto che si estrae. Opzione attiva = riga illuminata di torcia + filo
d'oro a sinistra; selezionata = piccolo sigillo di ceralacca (non checkmark blu).
Combobox: input di ricerca in testa al pannello, risultati con glifo tipo + testo,
navigazione tastiera completa (`aria-activedescendant`).

### 4.4 Search

Campo inciso con lucide `Search` 16px e scorciatoia visibile (`Ctrl K` in cornicetta
di ottone 11px — eccezione ammessa ai 12px perché è un keycap, non testo). Ricerca
immediata con debounce 200ms; i risultati contano nel vivo: "12 imprese trovate"
(`aria-live="polite"`). Pulizia con `Esc` e icona ✕ (target 44px).

### 4.5 Sigillo (Chip/Badge/Tag — audit 0.4)

- **Sigillo-filtro** (interattivo): scudetto con angoli tagliati (`clip-angled-sm`),
  bordo ottone inciso, glifo + etichetta 13px. Attivo = ceralacca pressata: fondo
  scuro in rilievo + inset shadow + bordo `--gold`. `aria-pressed`, focus inciso.
- **Sigillo-stato** (statico): goccia di ceralacca (radius irregolare §3.5) nel colore
  di stato + glifo. Mai pill.
- **Sigillo-rango**: corona (Master), scudo (Custode), spada (Giocatore) — glifo +
  testo, usato in Admin e nei quick link riservati.

### 4.6 Leva (Toggle / Segmented / Switch)

- **ViewToggle → Leva d'archivio**: piastra di ferro con incavi ("Codex" / "Registro"),
  linguetta di ottone che scorre con attrito (`--ease-weight`, 180ms). `role="radiogroup"`.
- **Switch**: chiavistello — il pomello di ottone scorre in una guida incisa; ON =
  guida che si scalda (`--gold-dim` → `--gold-dark`). Mai verde acceso.

### 4.7 Tabs — segnalibri (audit 0.4)

Linguette di stoffa/cuoio che sporgono dal bordo superiore del pannello-libro; la
attiva sporge 4px in più ed è cucita (bordo superiore `--gold`). Conteggi dentro un
piccolo sigillo sul nastro, non "(12)". Cambio: il segnalibro si sposta
(`--ease-weight` 200ms), la pagina fa cross-fade + slittamento 10px (240ms).
Mobile: le linguette scorrono orizzontalmente con fade ai bordi, mai wrap su due righe.
`role="tablist"` con frecce tastiera.

### 4.8 Card — le tre famiglie

- **Documento** (pagina di tomo): fondo pergamena scura o `--card` con bordo carta,
  E1. Per biografie, quest, descrizioni. Titolo Cinzel, estratto Caudex corsivo.
- **Archivio** (scheda di schedario): la entity-card/portrait esistente + cornice G4
  per sala (trofeo di caccia per Bestiario, drappo per Fazioni, teca per Oggetti).
  Hover: rim-light + distacco 2px (è cartoncino), MAI scale.
- **Reliquia** (portale/oggetto): i portali-mondo — cornice metallica, immagine
  dominante, flicker di torcia sul bordo al hover.

Tutte derivano da `fantasy-card.tsx` (regola 7 Constitution). Card cliccabile =
intera superficie link con focus inciso; azioni secondarie in un angolo con target
44px separato.

### 4.9 Dialog / Modal — il tomo si apre

Velo `modal-vignette` (vignetta scura, **non** backdrop-blur). Pannello E3 con
`forge-in` (mantenere, togliendo il blur d'ingresso sul contenuto testuale).
Testata = targa incisa con titolo Cinzel; chiusura = ✕ di ferro 44px in alto a destra
+ `Esc`. Azioni in calce: Reliquia a destra, Postilla "Annulla" a sinistra.
Conferme distruttive: il dialog è una **lettera di condanna** — testo esplicito su
cosa brucia, bottone Strumento cremisi, digitare-per-confermare solo per perdite
irreversibili di interi mondi. Focus trap + `aria-modal`; su mobile ≤ 640px diventa
sheet dal basso (cassetto, `--ease-weight`).

### 4.10 Drawer / Sheet — il cassetto d'archivio

Scorre con attrito (`--ease-weight`, 280ms), maniglia visibile (barra di ottone).
Usi: "Altro" della bottom bar, filtri avanzati su mobile, TimelinePanel del HubShell
(audit 3.1). Il fondo pagina non scala né sfoca: si scurisce solo (velo 40%).

### 4.11 Toast / Notification — missiva sigillata

Base Sonner esistente (`amber-toast`): pergamena con sigillo di ceralacca a sinistra
nel colore semantico + glifo (successo = sigillo impresso, errore = sigillo spezzato).
Entrata: scivola dal bordo con peso; uscita: dissolvenza. Durata 5s, pausa su hover,
`role="status"` (o `alert` per errori). Mai più di 3 impilate.

### 4.12 Alert / Banner — editto affisso

Striscia di pergamena con chiodi ai lati, bordo sinistro 3px nel colore semantico +
glifo + titolo Cinzel 14px. Persistente (niente auto-dismiss); dismissibile solo se
l'informazione è recuperabile altrove.

### 4.13 Tabella → Registro (punto di forza, audit 0.4)

Anatomia:
- **Intestazione**: lastra `--stone-surface` incisa, Cinzel maiuscoletto 13px,
  **sticky** con ombra di contatto che appare solo allo scroll. Ordinamento = freccia
  di ottone incisa + `aria-sort`.
- **Righe**: rigate come libro mastro (bordo inferiore `--gold-dim` al 20%), altezza
  48px (densità "Registro") o 40px ("Indice", toggle-Leva). Prima colonna: ordinale
  inciso 12px `--ash`. Tipo entità = **glifo + etichetta**, mai solo pallino.
- **Hover**: la riga si illumina di torcia (fondo +4% caldo). Riga cliccabile intera.
- **Azioni contestuali**: colonna finale con menu ⋯ (44px); azioni comuni anche in
  testata quando c'è selezione multipla (checkbox = quadratino inciso).
- **Raggruppamenti**: sottotestata = asse di legno con etichetta bruciata + conteggio
  in sigillo.
- **Filtri**: fila di Sigilli-filtro sopra la tabella + ricerca immediata; i filtri
  attivi restano visibili (mai nascosti in un solo menu).
- **Mobile (< 768px)**: la tabella **collassa in schede d'archivio** — ogni riga
  diventa una mini-card Documento con le 3 colonne chiave; le altre in un accordion
  "Dettagli". Mai scroll orizzontale come unica opzione.
- **Vuoto**: empty-state narrativo (pagina bianca del registro + postilla + CTA).
- **Paginazione**: "Pagina III di XII" in Cinzel + frecce di ottone; preferire
  infinite scroll SOLO negli archivi consultivi, paginazione negli strumenti.

### 4.14 Skeleton → `LoadingInk` (unico, riusato ovunque)

Blocchi di testo che emergono come **inchiostro che si asciuga**: macchia scura →
opacity+mask verso il testo definitivo (800ms loop lento). Per le card: braci che si
accendono lungo la cornice. Shape fedele al contenuto finale (niente rettangoli
generici). Con reduced-motion: dissolvenza statica al 60%.

### 4.15 Accordion — il fascicolo

Testata = costola di fascicolo con chevron di ottone che ruota con peso; apertura =
il fascicolo si spiega (`grid-template-rows` con `--ease-weight` 280ms). Bordo
sinistro d'inchiostro sull'elemento aperto.

### 4.16 Stepper / Wizard — la compilazione del registro

Passi = sigilli sulla costola: da compilare (cerchio inciso vuoto) → attivo (sigillo
d'oro) → completato (ceralacca impressa con ceremony timbro 300ms). Etichetta 13px
sotto ogni sigillo. Navigazione: avanti = Reliquia, indietro = Postilla; i passi
completati sono cliccabili. Mobile: barra di progresso a tacche di forgiatura +
"Passo II di IV".

### 4.17 Timeline — cronaca miniata

Filo d'inchiostro con volute; ogni evento = capoverso con capolettera/glifo e data in
cartiglio (non Badge). Hover: luce di candela, **nessun translate** (audit 2.6).

### 4.18 Progress — tacche di forgiatura

Barra = guida incisa nel metallo; riempimento = colata d'oro con testa incandescente
(1px `--gold-light`). Varianti a tacche (password strength: 1–4 tacche sul gambo
della chiave). `role="progressbar"` + testo percentuale visibile.

### 4.19 Tooltip / Popover — la postilla

Tooltip: cartiglio scuro E2, 13px, freccia incisa, delay 400ms, mai contenuto
essenziale (regola 2 Constitution). Popover: pergamena E2 con chiodo nell'angolo.
Su touch il contenuto del tooltip deve esistere altrove in forma visibile.

### 4.20 Avatar / Ritratto

Cornice ottagonale incisa (`clip-octagon-sm`) con bordo di rango; fallback = sigillo
con iniziali Cinzel su `--stone-surface`. Caduti: velo `FallenOverlay` (mantiene
nome leggibile, audit 2.5).

### 4.21 Empty state — la pagina bianca

Sempre narrativo: illustrazione/glifo 64–96px + una riga diegetica ("Nessuna impresa
è ancora stata affissa all'albo") + postilla operativa + CTA (se l'utente può creare).
Un solo empty-state forte, mai tre card spente (audit 3.6).

### 4.22 Dashboard widget — targhe e gemme

- **Stat** = targa di pietra incisa: cifra Cinzel 24–32px + etichetta 13px; l'accento
  semantico è una **gemma incastonata** nell'angolo (8px, colore token), non testo
  colorato. Su mobile scorrono in orizzontale, **mai nascoste** (audit 2.1).
- **Grafici**: fondo `--night`, assi e griglia `--gold-dim`, serie §3.1, tooltip
  cartiglio, animazione di disegno "a inchiostro" 600ms una sola volta.
- **Liste widget** = pagine di registro (righe rigate + sigillo di stato).

---

## 5. PATTERN

### 5.1 Form

1. Layout a colonna singola, max 480px; gruppi = sezioni del registro con targhetta.
2. Validazione: onBlur per campo (annotazione a margine immediata), onSubmit per il
   form (shake-catene + focus sul primo errore + riepilogo `role="alert"` in testa se
   gli errori sono > 2).
3. Feedback positivo: micro-sigillo verde a fianco del campo appena corretto.
4. Submit: Reliquia con ceremony timbro; doppio-submit prevenuto (loading sul bordo).
5. Autosave (diario, note): postilla "Inchiostro asciutto — salvato" con timestamp,
   mai toast ripetuti.
6. Form lunghi → wizard (§4.16), mai scroll infinito di 20 campi.

### 5.2 Gerarchia di pagina (regola dei 3 livelli)

Ogni schermata: 1) Targa/hero (dove sono), 2) contenuto primario (cosa c'è),
3) azioni/navigazione (cosa posso fare). Mai più di 3 livelli visivi (Constitution
regola 1). CTA primaria sempre visibile senza scroll: desktop nella testata, mobile
come Reliquia sticky in basso (sopra la bottom bar).

### 5.3 Stati di caricamento ed errore di pagina

- Route loading: `LoadingInk` nella shape della pagina attesa.
- Errore di caricamento: "L'archivio non risponde" + glifo catena spezzata + retry
  (Strumento). Mai stack trace, mai pagina bianca.
- Offline/Firestore lento: banner-editto non bloccante.

### 5.4 Responsive — regole di trasformazione

| Pattern | Mobile → Desktop |
|---|---|
| Sidebar | bottom bar 5 voci → sidebar legno |
| Tabella | schede d'archivio → Registro completo |
| Filtri | drawer-cassetto → fila di sigilli inline |
| Dialog | sheet dal basso → tomo centrato |
| Stat | fila orizzontale scrollabile → griglia targhe |
| Hero | h-56 → h-96, collasso sticky identico |
| Azioni riga | menu ⋯ → icone inline al hover **+ sempre nel menu** |

### 5.5 Accessibilità (WCAG 2.2 AA — vincoli trasversali)

- Contrasto ≥ 4.5:1 testo, ≥ 3:1 UI/grafica; verificare ogni token su ogni superficie.
- Focus inciso su TUTTO l'interattivo; ordine di tab = ordine visivo; skip-link
  "Salta all'archivio" prima della sidebar.
- Mai solo-colore; mai solo-hover; mai solo-icona senza etichetta (visibile o
  `aria-label` con tooltip).
- Target 44px; `dragging` mai richiesto (2.2): lo swipe del HubShell ha sempre i dot
  + frecce equivalenti.
- Screen reader: landmark (`nav`, `main`, `aside`), heading gerarchici senza salti,
  `aria-live` per conteggi/filtri, cerimonie annunciate con testo ("Registrazione
  salvata").
- `prefers-reduced-motion` come da §3.7; `prefers-contrast: more` = bordi al 40%.

### 5.6 Performance visiva

- LCP: immagine `priority` SOLO su landing e dettaglio entità; hero liste con
  `loading="lazy"` sotto il fold del collasso, `sizes` corretti, AVIF/WebP.
- Particelle (braci, starfield): max 20 su mobile, 0 con reduced-motion, `canvas`
  unico, `requestAnimationFrame` in pausa quando `document.hidden`.
- Texture: §3.6 (≤ 60KB, ≤ 4 per route); `content-visibility: auto` sulle sezioni
  sotto il fold; font `display: swap` con fallback Georgia metricamente vicino.
- Animazioni solo su `transform`/`opacity` (mai layout); `will-change` solo durante
  l'animazione.

---

## 6. NAMING CONVENTION

- Token CSS: `--{materiale|semantico}-{variante}` (`--wood-dark`, `--status-secret`).
- Componenti: nome tecnico inglese nel codice (`SealChip`, `LedgerTable`, `LeverToggle`,
  `LoadingInk`, `RelicButton`), nome diegetico italiano SOLO nella UI.
- Varianti: `variant="relic|tool|note"` (bottoni), `register="hall|desk|tome"` (pagine).
- Un componente = un file; ogni nuovo componente deriva da un base esistente
  (Constitution regola 7) e viene aggiunto alla tabella §4 di questo documento.

---

## 7. ROADMAP DI ADOZIONE

Ordine vincolante (dettaglio interventi per schermata in `UX_AUDIT_REDESIGN.md` Parte 5):

1. **G1** — palette §3.1 in `globals.css` + bonifica esadecimali inline + `--ash`.
2. **Bonifica luce** — glow/blur → modello torcia §3.4; motion tokens §3.7.
3. **Registro Scrittoio** — Targa per Master/Admin/Grafo/Commercio.
4. **Hero** — altezze ridotte + collasso sticky + dedup su `ListPageHero`.
5. **Componenti reinterpretati** — SealChip → LeverToggle → LedgerTable →
   Tabs-segnalibro → LoadingInk (uno alla volta, sostituendo ovunque).
6. **G2–G4** — texture, glifi, cornici per sala.
7. **Cerimonie + G5** — timbro, sigillo spezzato, tempra, flicker.

Ogni PR di fase: screenshot ai breakpoint 320/768/1440, check contrasto sui nuovi
accostamenti, test tastiera del componente toccato.

---

*Documento vincolante — v2.0 — complementare a DESIGN_CONSTITUTION.md e UX_AUDIT_REDESIGN.md*

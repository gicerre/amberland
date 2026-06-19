# Audit Responsive & WCAG 2.2 AA — Amberland

> Audit completo di responsività, overflow/clipping e accessibilità su tutta
> l'applicazione. Obiettivo: nessun overflow orizzontale indesiderato, nessun
> contenuto tagliato, usabilità da 320 px fino a Ultra Wide, conformità WCAG 2.2 AA.
> Vincolo: zero regressioni visive, identità e design system invariati
> (vedi `docs/DESIGN_CONSTITUTION.md`).

## Metodo

- Analisi statica esperta componente-per-componente (fondamenta → primitive UI →
  feature → pagine).
- Ragionamento per ogni breakpoint richiesto (320, 360, 375, 390, 414, 768, 820,
  1024, 1280, 1366, 1440, 1920, 2560).
- Verifica regressioni: `tsc --noEmit` (OK) + `eslint` (0 errori).
- **Limite di verifica runtime:** le pagine autenticate sono protette da
  `AuthGuard` (Firebase Auth + dati Firestore), quindi un test pixel-level
  automatizzato sui 16 viewport non è eseguibile in questo ambiente senza
  credenziali/seed. La validazione è per analisi + ragionamento per-breakpoint.
  Le sole pagine renderizzabili senza login sono `/` (landing) e `/login`.

## Esito sintetico

La codebase è **già costruita con forte consapevolezza responsive**: uso
sistematico di `min-w-0 flex-1` + `truncate` + `shrink-0`, griglie con prefissi
breakpoint, `minmax(0,…)` dove serve, colonne tabella nascoste progressivamente
(`hidden sm:table-cell`…), tabelle in contenitori `overflow-x-auto`, input a
`text-base` su mobile (anti-zoom iOS), `:focus-visible` globale.

I difetti reali erano pochi e localizzati. **5 problemi strutturali corretti**;
3 aree di accessibilità documentate come trade-off di design (decisione del
committente, vedi §3).

---

## 1. Problemi corretti (overflow / clipping / layout)

### 1.1 Landing — titolo `AMBERLAND` tagliato sotto i 360 px
- **Componente:** `src/app/page.tsx` (hero `<h1>`).
- **Problema:** parola singola di 9 lettere a `text-6xl` (60 px) + `tracking-[0.1em]`
  supera la larghezza utile a 320–360 px; il `<main>` è `overflow-hidden`, quindi
  le lettere esterne venivano **clippate** (non potendo andare a capo una parola unica).
- **Causa:** dimensione minima del font troppo grande per il viewport più stretto.
- **Soluzione:** tipografia fluida `text-[clamp(2.25rem,10vw,8rem)]` al posto della
  scala discreta `text-6xl sm:text-7xl md:text-8xl`. A 320 px ≈ 36 px (rientra con
  margine), cresce a fluido fino a 128 px sui grandi schermi. Tracking e drop-shadow
  invariati → resa identica da ~600 px in su.
- **Verifica:** a 320 px larghezza titolo ≈ 233 px < 272 px disponibili. Nessun clip.

### 1.2 Landing — CTA «Entra in Amberland» al limite a 320 px
- **Componente:** `src/app/page.tsx` (Button `asChild`).
- **Problema:** `whitespace-nowrap` (da `buttonVariants`) + `px-10` + `tracking-[0.2em]`
  portavano il bottone ~282 px > 272 px → bordi clippati a 320 px.
- **Soluzione:** padding/tracking responsive: `px-8 … sm:px-10` e
  `tracking-[0.15em] sm:tracking-[0.2em]`. Resa invariata da `sm` in su.
- **Verifica:** a 320 px ≈ 251 px < 272 px.

### 1.3 Scheda personaggio — righe-form con scroll orizzontale nel dialog (320–390 px)
- **Componente:** `src/features/characters/components/sheet-sections.tsx`
  (Caratteristiche ×2, Classi, Equipaggiamento, Slot incantesimo, Incantesimi).
- **Problema:** griglie `grid-cols-[1fr_…]` arbitrarie. Un `1fr` **nudo** equivale a
  `minmax(auto,1fr)`: ha un *floor* di `min-content`. Con due input `w-16` (64 px) +
  `w-10` e label lunghe ("Costituzione", "Sottoclasse"), il totale supera la
  larghezza del `DialogContent` (`calc(100%-2rem)` = 288 px a 320 px, meno `px-6`),
  generando uno **scroll orizzontale contenuto** nell'area `overflow-y-auto`.
  > Nota: le griglie numeriche di Tailwind (`grid-cols-3`, `grid-cols-6`…) compilano
  > a `repeat(n, minmax(0,1fr))` → **non** soggette a questo problema. Solo le
  > griglie arbitrarie con `1fr` nudo lo erano.
- **Soluzione:** `1fr` → `minmax(0,1fr)` nei 6 template di riga. La colonna può ora
  ridursi sotto il `min-content` (input con `min-w-0` si restringono, le label vanno
  a capo). **Resa identica quando il contenuto entra**, overflow-proof quando no.
  Soluzione strutturale e scalabile (indipendente da lunghezza label/locale).
- **Verifica:** nessuna traccia ≥320 px; su desktop comportamento invariato.

### 1.4 Wizard creazione PC — bottoni di navigazione clippati a 320 px
- **Componente:** `src/features/characters/components/pc-creation-wizard.tsx`.
- **Problema:** allo step finale, `flex justify-center gap-3` con «Indietro»
  (`min-w-32` = 128 px) + «Conferma e crea personaggio» (`min-w-56` = 224 px) = 364 px,
  senza wrap → clip a 320 px (contenitore `overflow-hidden`).
- **Soluzione:** aggiunto `flex-wrap`: su schermi stretti il bottone di conferma va
  a capo sotto «Indietro», entrambi pienamente visibili e tappabili.
- **Verifica:** nessun overflow; su desktop i bottoni restano in linea.

### 1.5 Dettaglio personaggio — azioni header in scroll di pagina a 320 px
- **Componente:** `src/features/characters/components/character-view.tsx`.
- **Problema:** la riga azioni interna `flex items-center gap-2` (fino a 4 bottoni:
  «Completa scheda» / «Stato» / «Modifica» / menu) non andava a capo → ~396 px →
  **scroll orizzontale di pagina** a 320 px (caso Master su NPC incompleto).
- **Soluzione:** `flex flex-wrap items-center justify-end gap-2`. I bottoni vanno a
  capo allineati a destra.
- **Verifica:** nessuno scroll orizzontale; layout desktop invariato.

### 1.6 Editor entità — tab clippate a 320 px
- **Componente:** `src/features/entities/components/entity-form-sheet.tsx`.
- **Problema:** `TabsList` `w-fit` senza scroll; 4 tab (Scheda/Dettagli/Immagini/
  Master) ≈ 250 px > ~240 px utili a 320 px → tab «Master» tagliata.
- **Soluzione:** allineato al pattern già provato nella scheda PG:
  `flex w-fit max-w-[calc(100%-3rem)] overflow-x-auto` → le tab scrollano
  orizzontalmente solo se necessario.
- **Verifica:** nessun clip; da 360 px in su entrano senza scroll.

---

## 2. Verificato conforme (nessuna modifica necessaria)

- **Shell/layout** (`app-shell`, `sidebar`): `min-h-svh`, `max-w-6xl` centrato,
  padding responsive (`px-3 sm:px-5 lg:px-10`), `lg:pl-72` per la sidebar fissa;
  topbar/bottom-nav mobile con `env(safe-area-inset-*)`. ✔
- **Viewport / zoom:** Next inietta `width=device-width, initial-scale=1`; **nessun**
  `maximum-scale`/`user-scalable=no` → zoom fino a 400 % consentito (WCAG 1.4.4/1.4.10). ✔
- **Reflow a 320 px (1.4.10):** layout fluido senza contenitori a larghezza fissa di
  pagina; dopo i fix §1, reflow pulito a 320 px (= layout mobile, equivalente a 400 %
  di zoom su 1280). ✔
- **Tabelle** (`ui/table`, `users-table`, `EntityTable`): wrapper `overflow-x-auto` +
  nascondimento progressivo colonne. Lo scroll orizzontale di una tabella dati è
  esplicitamente esentato da WCAG 1.4.10. ✔
- **Toolbar di ricerca** (bag/goals/inventory/diary/character-dashboard): `flex
  flex-wrap`; `min-w-56` (224 px) rientra nei ~296 px utili a 320 px, il select va a capo. ✔
- **Immagini:** tutte via `next/image` (nessun `<img>` grezzo) con `sizes` corretti
  → responsive e senza distorsione (`object-cover` + container con aspect ratio). ✔
- **Dialog/Sheet/Modali** (`dialog`, `sheet`, `global-search`): `max-w-[calc(100%-2rem)]`
  su mobile (margini laterali), contenuto in `overflow-y-auto`; liste con
  `min-w-0 flex-1` + `truncate`. ✔
- **Griglie:** correttamente gated con breakpoint e `minmax(0,…)` dove necessario
  (`hub-shell`, `entity-detail-body`, dashboard). ✔
- **Focus visibile (2.4.7):** `:focus-visible` globale (ring oro) in `globals.css`
  + `focus-visible:ring` sui bottoni. ✔
- **Navigazione da tastiera (2.1.1):** controlli nativi (`<button>`, `<a>`, `<input>`)
  e primitive Radix (Dialog, Dropdown, Select, Tabs, Sheet, Collapsible, Switch,
  Checkbox) — accessibili da tastiera di default. ✔ (eccezione: §3.3)
- **Input mobile:** `text-base` su mobile previene l'auto-zoom iOS al focus. ✔

---

## 3. Aree di accessibilità — trade-off di design (decisione del committente)

Questi punti contrappongono WCAG AA all'identità visiva dark-fantasy, che il
prompt chiede esplicitamente di **non** alterare. Non modificati unilateralmente
per evitare regressioni visive; documentati con dati e raccomandazioni.

### 3.1 Contrasto testo (WCAG 1.4.3 AA — 4.5:1 testo normale, 3:1 testo grande/UI)
Rapporti calcolati sui token principali:

| Testo | Sfondo | Ratio | Esito |
|---|---|---|---|
| `--foreground` `#dcd0b0` | `--background` `#060608` | ~13:1 | ✔ |
| `--muted-foreground` `#88785e` | `#060608` (pagina) | 4.72:1 | ✔ (limite) |
| `--muted-foreground` `#88785e` | `#0b0c11` (card) | ~4.6:1 | ✔ (limite) |
| `--muted-foreground` `#88785e` | `#10111a` (stone-surface) | **4.38:1** | ✖ testo piccolo |
| `nav-group-label` gold @45% | `#060608` | ~2.2:1 | ✖ (etichetta decorativa) |
| label `text-gold/40–50` | superfici scure | ~3.5–4:1 | ✖ testo piccolo |

- **Raccomandazione minima e mirata** (se si accetta un ritocco impercettibile dei
  token): schiarire `--muted-foreground` di ~6–8 % (es. `#88785e` → ~`#9a8a66`) per
  superare 4.5:1 anche su `stone-surface`; portare le **etichette funzionali** in oro
  da opacità ≤50 % a ≥70 %. Le micro-etichette puramente decorative (divisori,
  incisioni sbiadite) possono restare come scelta estetica.
- **Perché non applicato ora:** `--muted-foreground` è un token globale pervasivo;
  modificarlo cambia l'identità su tutta l'app. Va approvato visivamente.
  → *Posso eseguire un "contrast pass" mirato su richiesta.*

### 3.2 Dimensione target tattile
- **Stato attuale:** il sistema bottoni arriva a `icon-lg` = 36 px; `icon` = 32 px;
  `icon-sm` = 28 px; `icon-xs` = 24 px. Controlli "nudi" più piccoli (checkbox 16 px,
  switch 20 px) sono **avvolti in `<label>`/righe più alte**, quindi il target
  effettivo è maggiore.
- **WCAG 2.2 SC 2.5.8 (AA) = 24×24 px** o spaziatura equivalente → **rispettato**
  (tutti i target ≥24 px o con spacing/equivalente). I "dot indicator" da 6 px in
  `hub-shell` ricadono nell'eccezione "controllo equivalente" (le pill-tab e lo swipe
  svolgono la stessa funzione).
- **44×44 px** richiamato nel prompt è **SC 2.5.5 (AAA)** / raccomandazione: forzarlo
  ovunque stravolgerebbe la UI densa fantasy (regressione vietata dalla Design
  Constitution). Non applicato per scelta consapevole.

### 3.3 Grafo delle relazioni — tastiera (WCAG 2.1.1)
- **Componente:** `src/features/entities/components/graph-view.tsx` (canvas force-graph
  stile Obsidian). I nodi non sono focalizzabili/azionabili da tastiera.
- **Mitigazione esistente (accesso equivalente):** ogni entità è raggiungibile via
  ricerca globale (`⌃K`), pagine elenco e link — il grafo è una visualizzazione
  *aggiuntiva*, non l'unico percorso. Ha `aria-label`.
- **Nota:** rendere navigabile il grafo da tastiera è una *feature* (fuori dallo scope
  di un audit responsive/layout). Documentato come limite noto.

---

## 4. Quality Gate

| Criterio | Esito |
|---|---|
| Nessuno scroll orizzontale di pagina indesiderato (320→Ultra Wide) | ✔ dopo §1 |
| Nessun elemento fuori dal viewport / nessun contenuto tagliato | ✔ dopo §1 |
| Componenti pienamente responsive 320 px → Ultra Wide | ✔ |
| Reflow 1.4.10 / Zoom 400 % / focus visibile / tastiera (native+Radix) | ✔ |
| Contrasto 1.4.3, target 44 px (AAA), tastiera nel grafo | ⚠ trade-off documentati §3 |
| Nessuna regressione (`tsc` OK, `eslint` 0 errori) | ✔ |

**Conclusione:** gli obiettivi di responsività, anti-overflow e anti-clipping sono
raggiunti senza alterare design system o identità. I punti residui di §3 sono scelte
di prodotto (AA stretto ↔ estetica dark-fantasy) che richiedono l'approvazione del
committente prima di toccare i token o la densità della UI.

---

## 5. Consolidamento azioni Mobile-First (overflow menu)

Strategia mobile-first per ridurre l'occupazione orizzontale delle barre azioni sui
viewport ridotti, **senza** alterare funzionalità, workflow o permessi (RBAC).

### Pattern adottato (scalabile, coerente con l'architettura esistente)
Le pagine di dettaglio espongono **due cluster** di azioni nello stesso contenitore:

- **Desktop (`hidden sm:flex`):** barra estesa con etichette — invariata rispetto a
  prima (zero regressione desktop/tablet ≥640 px).
- **Mobile (`flex sm:hidden`):** **azione primaria** («Modifica») + **un solo menu
  overflow ⋮** che consolida tutte le azioni secondarie.

Risultato mobile: `[Modifica] [⋮]` (~230 px) → nessun wrap, nessun overflow a 320 px.

### Preservazione RBAC (requisito critico)
Le voci azione sono definite **una sola volta** in costanti locali
(`statusItems`, `adminItems` / `overflowItems`) protette dalle **stesse identiche
guardie già presenti** e riusate nei due cluster. Nessuna guardia è spostata o
indebolita:

| Componente | Guardia invariata | Visibile a |
|---|---|---|
| `character-view` · «Completa scheda» | `kind==="NPC" && !npcComplete && isMaster` | Master |
| `character-view` · «Stato» (sottomenu) | dentro `canEdit` | Master + Owner |
| `character-view` · `adminItems` (visibilità/party/elimina) | `isMaster ? … : null` | Master |
| `entity-view` · tutta la barra + `overflowItems` | `isMaster` | Master |

Un'azione non concessa a un ruolo **non compare in nessuno** dei due cluster
(le voci master sono `null` per gli altri ruoli). Handler e mutation identici.

### WCAG 2.2 AA
- Trigger overflow con `aria-label="Altre azioni"`; «Modifica» mantiene testo
  visibile (no `aria-label` ridondante → SC 2.5.3 Label in Name).
- Azioni secondarie su mobile = **voci di menu con etichetta testuale** (non icone
  hover-only) → nessuna funzione dipende dall'hover; «Stato» è un
  `DropdownMenuSub` navigabile da tastiera.
- Target tattili dei trigger mobile = **44×44 px** (`size-11` per il ⋮,
  `min-h-11` per «Modifica»). Menu Radix: focus/tastiera nativi, focus ring globale.
- Nessuna perdita di informazione o funzionalità dopo il collasso.

### File toccati
- `src/features/characters/components/character-view.tsx`
- `src/features/entities/components/entity-view.tsx`

### Verifica
`tsc --noEmit` OK · `eslint` 0 errori. Nota: l'unica nuova warning eslint
(`page.tsx` import `Pencil` inutilizzato) deriva da una modifica esterna in corso
sulla CTA della landing, **non** da questo refactor.


# AMBERLAND DESIGN SYSTEM v3 — "OBSIDIAN"

> Specifica operativa della direzione **Next-Gen Dark Fantasy**
> (Constitution v2). Sostituisce `DESIGN_SYSTEM_V2.md` ("L'Archivio",
> direzione materica — superato). Versione 3.0 — 2 luglio 2026.

---

## 1. VISIONE

Neri profondi, luce disciplinata, superfici di vetro appena percettibili,
un filo d'oro freddo come firma. L'interfaccia del 2026 per un universo
dark fantasy: **Diablo IV incontra Linear**.

Tre test per ogni schermata:
1. **Screenshot** → sembra un menu AAA next-gen, mai un sito.
2. **Produttività** → contenuto in ≤ 1 scroll, azioni frequenti in ≤ 2 tap.
3. **Silenzio** → tolto un elemento a caso, la schermata deve perdere
   qualcosa; se non perde nulla, andava tolto prima.

---

## 2. COLOR TOKENS — "Obsidian & Aurum"

Neutri **freddi** (via i bruni v2), contrasti alti, un accento d'oro
champagne desaturato come firma del brand (continuità col logo).

### Neutri

| Token | Valore | Uso |
|---|---|---|
| `--background` | `#060709` | palcoscenico — quasi nero, freddo |
| `--surface-0` / `--night` | `#0A0C10` | incassi, pannelli sotto-livello |
| `--surface-1` / `--card` | `#0E1116` | card, pannelli base |
| `--surface-2` / `--popover` | `#141821` | popover, righe hover, elevato |
| `--surface-3` | `#1B2029` | attivo, selezione, top-layer |
| `--hairline` | `rgba(255,255,255,0.08)` | bordi standard |
| `--hairline-strong` | `rgba(255,255,255,0.14)` | bordi in evidenza |

### Testo (AA su `--surface-1`)

| Token | Valore | Contrasto | Uso |
|---|---|---|---|
| `--text-hi` / `--parchment` | `#F2F4F8` | ~15:1 | titoli, valori chiave |
| `--foreground` | `#C8CDD6` | ~10:1 | corpo |
| `--muted-foreground` | `#8B93A1` | ~5.4:1 | secondario, metadati |

### Accento firma — Aurum (oro champagne, freddo)

| Token | Valore | Uso |
|---|---|---|
| `--gold` | `#D6B25E` | accento base, bordi attivi, icone |
| `--gold-bright` | `#EACB77` | hover d'accento, valori dorati |
| `--gold-dark` | `#9C824A` | accento quieto |
| `--gold-dim` | `rgba(214,178,94,0.16)` | fondi tinti d'accento |

Budget: l'oro è ≤ 5% dell'area di una schermata. Un solo elemento
dorato pieno per vista (la CTA primaria).

### Semantici (saturazione moderna, mai neon)

| Token | Valore | Significato |
|---|---|---|
| `--arcane` / `-bright` | `#7C6FC4` / `#A79AE6` | segreti, magia |
| `--ember` / `-bright` | `#D9822B` / `#F0A45A` | warning, eventi |
| `--blood` (`--crimson`) / `-bright` | `#C2413B` / `#E06A5E` | errori, caduti |
| `--verdant` / `-bright` | `#3FA57A` / `#6CC9A0` | successo |
| `--silver` | `#9AA3AF` | raro, neutro pregiato |

Stati quest (`--status-*`) rimappati su questa scala (attiva=gold,
prossima=ember, segreta=arcane, annali=silver, fallita=blood,
completata=verdant, disponibile=muted). **Sempre colore + glifo/testo.**

### Rarità (luce, non metallo)

comune=muted · raro=silver · magico=arcane · leggendario=gold(+glow focus)
· artefatto=blood. Il bordo resta 1px; la rarità alta aggiunge un glow
tenue (§5) — mai animazioni in loop.

### Vetro (glass tokens)

| Token | Ricetta |
|---|---|
| `--glass-bg` | `rgba(14,17,22,0.72)` |
| `--glass-blur` | `blur(20px) saturate(1.2)` |
| Ricetta completa | glass-bg + backdrop-filter + hairline + `inset 0 1px 0 rgba(255,255,255,0.06)` |

Solo per layer flottanti: topbar/bottombar, sidebar overlay, dialog,
popover, tooltip, barre sticky. Mai per card in-page (lì superfici solide).

---

## 3. TIPOGRAFIA

| Ruolo | Font | Note |
|---|---|---|
| Display | **Cinzel** 600–700 | H1/hero, targhe, cifre celebrative — l'anima fantasy |
| UI | **Inter** (nuovo) 400–600 | tutto il resto: nav, label, corpo, tabelle, form |
| Prosa narrativa | Caudex 400 corsivo/regular | solo lore: descrizioni, diario, citazioni |
| Mono | Cascadia Code | codici/debug |

Scala fluida (clamp): display `clamp(1.9rem,1.2rem+3vw,3.25rem)` ·
h2 `clamp(1.25rem,1rem+1vw,1.6rem)` · h3 `1.125rem` · body `0.9375rem/1.65`
· label `0.8125rem` · caption `0.75rem` (minimo assoluto).
Etichette navigazione/sezione: Inter 12–13px, peso 600, tracking 0.06–0.12em
(mai gli 0.3em+ della v2 se non su un singolo occhiello display).
Numeri tabellari: `font-variant-numeric: tabular-nums`.

---

## 4. SPAZIO, GRIGLIA, RADIUS

- Base 4px; ritmo sezioni 48/64px; container `max-w-6xl`, lettura 70ch,
  ultrawide cap 96rem col palcoscenico che continua ai lati.
- Breakpoints Tailwind; colonne griglie: 1–2 / 2 / 3 / 4 (≥1440).
- **Radius**: `--radius 0.75rem`; sm 8, md 12, lg 16, xl 20, pill 999.
  Angoli tagliati (`clip-angled-*`) **dismessi**.
- Touch target ≥ 44px, gap tra target ≥ 8px.

## 5. PROFONDITÀ — modello "luce fredda"

| Livello | Ricetta | Uso |
|---|---|---|
| E0 flat | solo `--hairline` | contenuto in pagina |
| E1 card | hairline + `inset 0 1px 0 rgba(255,255,255,0.04)` + `0 1px 2px rgba(0,0,0,0.4)` | card base |
| E2 raised | hairline-strong + `0 8px 24px -12px rgba(0,0,0,0.7)` | hover card, dropdown |
| E3 floating | **glass** + `0 24px 64px -16px rgba(0,0,0,0.8)` | dialog, drawer, barre |
| Focus/glow | `0 0 0 1px var(--gold)` + `0 0 24px rgba(214,178,94,0.18)` | focus, attivo d'accento |

Il glow esiste **solo** al livello Focus/glow e sui semantici equivalenti
(errore = blood al posto di gold). Niente `glow-*` ambientali.

## 6. MOTION

| Token | Valore | Uso |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22,1,0.36,1)` | ingressi, espansioni |
| `--ease-in-out` | `cubic-bezier(0.65,0,0.35,1)` | movimenti, slider |
| micro 120–160ms · transizione 200–280ms · scena 320–420ms | | |

Vocabolario: fade+rise 8px (ingressi), **blur-fade** (cambio scena/dialog:
opacity+blur 4px→0), scale 0.98→1 (popover), slide con `--ease-out`
(drawer/sheet), shimmer di luce lineare *una tantum* su successo (mai loop).
Cerimonie v2 (catene, sigillo spezzato) → sostituite da: errore = shake
smorzato 4px + bordo blood; rivelazione = blur-fade out + luce che sale.
Solo `transform`/`opacity`; 60fps; `prefers-reduced-motion` = tutto ≤150ms
senza traslazioni.

## 7. ICONE

Solo **lucide**, stroke 1.5–1.75, taglie 16/20/24, `currentColor`.
Le PNG illustrate restano SOLO come emblemi narrativi grandi (≥64px) su
card di navigazione/empty state — mai inline, mai come icone funzione.

---

## 8. COMPONENTI (nuova identità — sostituiscono le controparti v2)

Stati obbligatori ovunque: default / hover / focus-visible / active /
disabled / loading / error. Focus = anello gold Focus/glow (§5).

- **Button** — primario: riempimento `--gold` piatto, testo near-black,
  radius md; hover = `--gold-bright` + glow tenue; active = scale 0.98.
  Secondario: superficie 2 + hairline. Ghost: testo+icona. Destructive:
  ghost/outline blood. Icona sola sempre con `aria-label`. Un primario per vista.
- **Input/Textarea/Select** — fondo `--surface-0`, hairline, radius md,
  h-11; focus = hairline→gold + glow; label sopra (Inter 13/600);
  errore = bordo blood + messaggio 12px con icona; icone integrate a sinistra.
- **SearchBar** — protagonista: pill grande su glass nelle testate,
  `Ctrl K` keycap, risultati in pannello E3 raggruppati con conteggi live.
- **Chip/Tag** — pill, hairline, 13px; attivo = fondo `--gold-dim` +
  bordo gold + testo gold-bright. (Sostituisce SealChip.)
- **Segmented (viste Codex/Registro)** — contenitore surface-0 pill,
  indicatore surface-3 che scivola (`--ease-in-out` 200ms). (Sostituisce LeverToggle.)
- **Card** — componente principale: surface-1 + hairline + E1, radius lg,
  immagine full-bleed col contenuto su scrim sfumato; hover = E2 +
  hairline-strong + (solo card d'accento) glow. Niente rotazioni/ornamenti.
- **Tabs** — minimal: testo muted → hi, indicatore 2px gold che scorre;
  contenuto in blur-fade. (Sostituisce i segnalibri.)
- **Table** — aria e pulizia: header 12px/600 uppercase muted sticky,
  righe h-12 hairline 6%, hover surface-2, selezione bordo sinistro gold;
  toolbar integrata (search+filtri+densità); mobile → card list.
- **Dialog/Drawer** — E3 glass, blur-fade in 280ms; mobile: sheet dal
  basso con maniglia. Overlay `rgba(4,5,7,0.6)` + blur 8px.
- **Toast** — glass compatto, barra accento 2px semantica, icona, 5s.
- **Skeleton** — pulse di luminanza surface-1↔surface-2 (via ink-dry).
- **Empty state** — emblema PNG 72px desaturato + titolo Cinzel +
  riga diegetica + CTA. Uno solo, centrato, molto spazio.
- **Stat/KPI** — cifra Cinzel 28–32 `--text-hi`, label 12px muted,
  delta semantico con freccia; su mobile fila scrollabile, mai nascoste.
- **Progress** — track surface-0, fill gold con punta luminosa; a step:
  segmenti con divisori.
- **Timeline** — filo hairline, nodi-anello gold, data 12px muted;
  hover = surface-2, nessun translate.
- **Tooltip/Popover** — glass sm, 13px, delay 400ms, mai contenuto essenziale.
- **Avatar** — cerchio, anello 1px (rango = colore anello + label).
- **WaxSeal / CornerOrnaments / SectionDivider gemmati** — **dismessi**.

## 9. NAVIGAZIONE E REGISTRI DI PAGINA

- **Desktop**: sidebar scura `--surface-0` (niente texture), voci Inter
  13px, attiva = barra 2px gold + testo hi + fondo surface-2;
  collassabile a rail 72px con tooltip.
- **Mobile**: bottom bar **glass** 64px, 5 voci, icona 24 + label 11px
  sempre visibile, attiva = icona gold + dot.
- **Registri**: *Sala* = hero cinematico pulito (immagine + scrim,
  h-56→h-96, collasso in barra glass sticky 64px — meccanica già
  costruita, da ri-skinnare); *Scrittoio* = header compatto con titolo
  Cinzel + azioni su hairline (DeskPlaque ri-skinnata senza legno);
  *Tomo privato* = HubShell su superfici pulite.

## 10. ACCESSIBILITÀ E PERFORMANCE

Invariate dalla v2 (restano vincolanti): AA 4.5:1, focus ovunque, mai
solo-colore/solo-hover, target 44px, landmark/aria-live, reduced-motion.
Attenzione nuova: testo su glass → la tinta glass deve garantire AA
(alpha ≥ 0.72 su contenuti scuri). `backdrop-filter` limitato a ≤ 3
elementi visibili contemporaneamente (costo GPU mobile); `priority`
immagini solo landing + dettaglio entità.

---

## 11. ROADMAP N1–N6

1. **N1 Fondamenta** — palette fredda + glass/hairline/elevation utilities
   in `globals.css`; Inter montato; rimozione texture/torch/glow-legacy.
2. **N2 Componenti core** — Button, Input, Chip, Segmented, Card, Tabs,
   Skeleton (ri-skin delle basi condivise già unificate).
3. **N3 Navigazione** — sidebar, bottom bar glass, barre sticky, ricerca.
4. **N4 Superfici flottanti** — dialog, drawer, toast, popover su glass.
5. **N5 Schermate** — Sale/Scrittoi/Tomi con la nuova pelle; tabelle; form.
6. **N6 Polish** — micro-interazioni, blur-fade di scena, stati rari,
   passata contrasto + reduced-motion completa.

Nota migrazione: la **struttura** costruita nella fase materica resta
(hero ridotti + collasso sticky, DeskPlaque, componenti condivisi, token
semantici, a11y): N1–N2 sono in gran parte una sostituzione di pelle sui
medesimi punti di aggancio. Si eliminano: texture-*, torch-*, WaxSeal,
rotazioni bacheca, clip-angled sui componenti.

---

*Documento operativo — v3.0 — vincolato a DESIGN_CONSTITUTION v2*

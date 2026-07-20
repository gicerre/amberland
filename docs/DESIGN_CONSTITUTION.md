# DESIGN CONSTITUTION v2 — NEXT-GEN DARK FANTASY

> Documento vincolante per qualsiasi schermata, componente e interazione.
> **Sostituisce integralmente la v1 "materica"** (pergamena/pietra/legno):
> pivot deciso il 2 luglio 2026. In caso di conflitto con qualunque altro
> documento, vince questa Constitution.

---

## PRINCIPIO FONDAMENTALE

L'applicazione è il **software ufficiale di un universo dark fantasy,
progettato nel 2026**: la qualità visiva di un videogioco AAA next-gen
(PS5 Pro / Series X) con gli standard d'uso di un prodotto professionale.

Riferimenti: Diablo IV, Elden Ring (HUD), Final Fantasy XVI, Destiny 2,
The Witcher 3 Next-Gen, WoW Dragonflight, Throne and Liberty.

Il palcoscenico è **nero profondo e silenzioso**; i protagonisti sono i
**contenuti** (artwork, ritratti, nomi, numeri). L'interfaccia non imita
materiali antichi: costruisce atmosfera con **luce, profondità, contrasto
e spazio negativo**. Il fantasy vive nei contenuti, nella tipografia
display e nel linguaggio — non nelle texture.

**Un solo test:** ogni schermata deve sembrare l'interfaccia di un gioco
AAA del 2026 — mai un sito web, mai un template, mai un tema del 2010.

---

## FILOSOFIA

Ogni elemento deve comunicare qualità. Ogni pixel ha uno scopo.

- **Minimal ma d'impatto** — pochi elementi, perfetti; il vuoto è un materiale.
- **Cinematografico** — immagini a pieno campo, scrim morbidi, transizioni fluide.
- **Leggibile prima di tutto** — l'estetica non costa mai un punto di contrasto.
- **Il colore è segnale, non decorazione** — accenti rari che guidano l'occhio.
- **Mobile first** — ogni layout nasce a 320px; desktop e ultrawide sono
  espansioni ripensate, non allargamenti.

---

## LINGUAGGIO VISIVO

### Sempre
- Neri profondi e grigi freddi; superfici pulite, senza grana.
- Profondità tramite **luce**: hairline (bordi 1px a bassa alpha),
  highlight superiore sottile, ombre morbide e larghe, layering.
- **Vetro satinato leggerissimo** solo per i layer flottanti
  (nav, dialog, popover): blur + tinta scura + hairline.
- **Glow disciplinato**: solo su stati interattivi (focus, attivo, hover
  d'accento), sempre tenue, mai come decorazione ambientale.
- Radius generosi e coerenti; pill ammessa per chip e tag.
- Spazio negativo abbondante; densità solo dove serve operatività.

### Mai
- Texture bitmap o procedurali visibili (pergamena, pietra, legno, cuoio).
- Ornamenti medievali: ceralacca, rivetti, cornici barocche, capilettera.
- Gradienti dorati pieni su superfici ampie; oro come colore dominante.
- Neon saturi, glow ambientale diffuso, ombre colorate.
- Bounce/elastic, animazioni cartoon, parallax gratuito.
- Bordi spessi, box su box, rumore visivo, effetti "medieval 2010".

---

## GERARCHIA

Massimo **tre livelli visivi** per schermata:

1. **Palcoscenico** — fondo quasi nero, quasi invisibile.
2. **Superficie** — pannelli appena più chiari con hairline.
3. **Accento** — l'unico livello che può brillare: CTA, stato attivo, dato chiave.

La gerarchia si costruisce con: dimensione tipografica, contrasto,
luminanza della superficie, posizione. Non con ornamenti.

---

## REGOLE UX ASSOLUTE

1. Nessuna informazione importante richiede hover (touch first).
2. L'azione primaria di ogni schermata è identificabile in < 1 secondo.
3. Meno click: le azioni frequenti a ≤ 2 interazioni.
4. WCAG 2.2 AA: contrasto ≥ 4.5:1, focus visibile, target ≥ 44px,
   mai solo-colore, `prefers-reduced-motion` rispettato ovunque.
5. Testo UI ≥ 12px; etichette maiuscole spaziate solo ≥ 12px.
6. Ogni animazione migliora la comprensione o il feedback — altrimenti si toglie.
7. Ogni nuovo componente deriva dal Design System (`DESIGN_SYSTEM_V3.md`);
   niente stili una-tantum nelle pagine.

---

## LINGUAGGIO E CONTENUTI

La **nomenclatura diegetica italiana resta** (Albo delle Imprese, Registro
degli Abitanti, Cronache…): è il fantasy che vive nel linguaggio.
La **tipografia display** (Cinzel) resta l'anima fantasy del brand,
usata con disciplina su titoli ed elementi cerimoniali.
Gli **artwork** sono il colore dell'app: l'interfaccia li incornicia
con scrim neutri, non compete con loro.

---

## GERARCHIA DOCUMENTALE

1. Questa Constitution (principi vincolanti)
2. `DESIGN_SYSTEM_V3.md` (token, componenti, pattern, roadmap N1–N6)
3. `UX_AUDIT_REDESIGN.md` (diagnosi UX ancora valide; le prescrizioni
   materiche v1 sono superate)

---

*Documento vincolante — v2.0 — 2 luglio 2026*

# Amberland — Istruzioni per Claude Code

## Stack tecnico
- Next.js 15 App Router, TypeScript, Tailwind CSS v4, Firebase/Firestore
- shadcn/ui, Framer Motion
- Font: Cinzel (font-heading), Cinzel Decorative (display), Crimson Pro (font-sans/body)
- Token CSS in `src/app/globals.css` blocco `@theme inline`

## DESIGN CONSTITUTION — OBBLIGATORIA

Ogni schermata, componente e interazione deve rispettare la Design Constitution
salvata in `docs/DESIGN_CONSTITUTION.md`.

**Principio fondamentale:** questa non è una web app. È un artefatto narrativo.
L'utente non gestisce dati. Consulta e compila documenti di un universo fantasy.

### Checklist prima di creare qualsiasi componente

1. Qual è il ruolo narrativo di questa schermata?
2. Qual è la sua controparte nel mondo fantasy (non "form", ma "Registro della Gilda")?
3. Materiale dominante: Metallo / Pergamena / Pietra / Legno?
4. A quale categoria UI appartiene: Documento / Archivio / Reliquia / Sigillo / Targa?
5. Il componente deriva da un base component già esistente?
6. Ogni elemento decorativo ha una funzione narrativa?

### Categorie UI canoniche
- **Documento** — schede, biografie, quest → aspetto: pagina di tomo
- **Archivio** — tabelle, liste, raccolte → aspetto: schedario imperiale
- **Reliquia** — CTA, azioni speciali → aspetto: oggetto fisico da attivare
- **Sigillo** — tag, stati, rarità → aspetto: marchio nobiliare
- **Targa** — header, titoli → aspetto: lastra incisa

### Mai usare
- Flat Design, Glassmorphism, Neumorphism, Material Design
- Ombre moderne, blur come gerarchia, glow neon
- Linguaggio SaaS/dashboard/enterprise
- Animazioni bounce, elastic, cartoon

### Animazioni: simulano materia reale
- Peso, attrito, inerzia, scorrimento meccanico
- Dialog: il tomo si apre, i sigilli si spezzano
- Tab: il segnalibro viene spostato, la pagina girata
- Salvataggio: timbro ufficiale, incisione della registrazione

### Nomenclatura diegetica (esempi)
| Tecnico | Fantasy |
|---|---|
| Character Creation Form | Registro Anagrafico della Gilda degli Avventurieri |
| Monster Database | Archivio Bestiario delle Terre Conosciute |
| Quest Management | Bacheca delle Commesse e delle Imprese |
| User Settings | Sigillo Personale dell'Archivista |
| Dashboard | Il Tomo dell'Archivista |

## Fasi UX completate (A → F)
- **A–B**: token CSS, sidebar, mobile nav, fantasy-card utilities, entity-card, button
- **C**: SpecializedEntityCard (Quest/Character/Monster/Item/Faction)
- **D**: EntityDetailBody (QuestBody, CreatureBody, DefaultBody)
- **E**: CelebrationOverlay (level-up, quest-complete, item-acquired)
- **Sezioni**: fazioni, bestiario, bag, diario, party characters → portrait card style
- **F**: HubShell mobile nav + swipe gesture + dot indicator, griglie dense mobile

## Fase G — In corso
Vedere `docs/DESIGN_CONSTITUTION.md` per la roadmap completa.
Ordine: G1 Palette → G2 Texture → G3 SVG ornamenti → G4 Frame card → G5 Effetti → G6 Font.

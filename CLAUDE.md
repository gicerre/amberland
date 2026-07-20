# Amberland — Istruzioni per Claude Code

## Stack tecnico
- Next.js 15 App Router, TypeScript, Tailwind CSS v4, Firebase/Firestore
- shadcn/ui, Framer Motion
- Font: Cinzel (font-heading), Caudex (font-sans/body) — vedi `src/app/layout.tsx`
- Token CSS in `src/app/globals.css` blocco `@theme inline`

## DESIGN CONSTITUTION v2 — NEXT-GEN DARK FANTASY (OBBLIGATORIA)

Direzione pivotata il 2 lug 2026: **Next-Gen Dark Fantasy** ("Obsidian") —
qualità AAA 2026 (Diablo IV, Elden Ring HUD, FFXVI, Destiny 2) con usabilità
professionale. La v1 materica (pergamena/pietra/legno/ceralacca) è superata.

**Principi chiave** (dettaglio in `docs/DESIGN_CONSTITUTION.md`):
- Neri profondi e grigi FREDDI; superfici pulite senza texture; profondità
  via luce (hairline 1px, highlight, ombre morbide, layering).
- Vetro satinato leggero SOLO su layer flottanti (nav, dialog, popover, barre).
- Glow disciplinato: solo stati interattivi (focus/attivo), mai ambientale.
- Oro champagne `--gold` come firma rara (≤5% area, 1 CTA piena per vista).
- Max 3 livelli visivi; spazio negativo abbondante; colore = segnale.
- MAI: texture bitmap/procedurali, ornamenti medievali, ceralacca, bounce,
  neon, gradienti dorati ampi, bordi spessi.
- La nomenclatura diegetica italiana e Cinzel display RESTANO (fantasy nel
  linguaggio e nella tipografia, non nelle texture).
- Mobile first; WCAG 2.2 AA; `prefers-reduced-motion`; 60fps transform/opacity.

## Fasi UX completate
- **A–F** (era materica): entity cards, detail body, celebration, HubShell.
- **G1–G5 parziali** (era materica, ora da ri-skinnare): palette token,
  hero ridotti + collasso sticky (`ListPageHero`), `DeskPlaque`, componenti
  condivisi (`SealChip`→Chip, `LeverToggle`→Segmented, Registro, tabs,
  skeleton base unica), scala `--status-*`, bonifica esadecimali inline.
  La STRUTTURA resta; la pelle cambia in N1–N2.

## Fase N — Obsidian (N1–N6 COMPLETATE, 2 lug 2026)
Gerarchia documentale (in ordine di precedenza):
1. `docs/DESIGN_CONSTITUTION.md` — v2, principi vincolanti
2. `docs/DESIGN_SYSTEM_V3.md` — "Obsidian": token freddi, glass/hairline,
   tipografia Cinzel+Inter(+Caudex solo lore), motion, componenti, roadmap N1–N6
3. `docs/UX_AUDIT_REDESIGN.md` — diagnosi UX valide (prescrizioni materiche superate)

Fatto: palette fredda + Inter + utilities glass/elev/glow-accent; componenti core
(button/tabs/skeleton/chip/segmented); navigazione (sidebar barra-gold, bottom bar
glass); superfici flottanti su vetro con forge-in blur-fade; FrameOverlay/
CornerOrnaments/SectionDivider neutralizzati; sweep border-gold<30 → hairline.
Convenzioni: bordi = hairline/hairline-strong; oro SOLO su attivo/CTA/focus;
glow SOLO .glow-accent; superfici = surface-0..3 (alias stone-* deprecati).
Residui tollerati: nomi file/componenti legacy (fantasy-card, SealChip,
LeverToggle…) da rinominare in un refactor dedicato.

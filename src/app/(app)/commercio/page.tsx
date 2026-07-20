"use client";

import { Coins, Handshake, Lock, Store } from "lucide-react";

import { DeskPlaque } from "@/components/shared/desk-plaque";

/** Le sale future del mercato: insegne appese, ancora coperte. */
const FUTURE_HALLS = [
  {
    icon: Store,
    label: "Botteghe",
    hint: "Inventari dei negozi per città, con prezzi e disponibilità.",
  },
  {
    icon: Handshake,
    label: "Mercanti",
    hint: "Schede dei mercanti, reputazione e trattative in corso.",
  },
  {
    icon: Coins,
    label: "Tesoro del party",
    hint: "Registro delle entrate, delle spese e del bottino condiviso.",
  },
];

/**
 * Commercio — il portone del mercato è ancora incatenato: un solo
 * empty-state narrativo forte al posto di tre card spente
 * (UX_AUDIT_REDESIGN 3.6).
 */
export default function CommercePage() {
  return (
    <div>
      <DeskPlaque
        eyebrow="Le vie del mercato"
        title="Il Mercato di Amberland"
        subtitle="Banchi, botteghe e scambi del regno."
      />

      {/* Il portone incatenato */}
      <div className="elev-1 relative overflow-hidden rounded-2xl border border-hairline-strong bg-gradient-to-b from-wood-mid/40 via-wood-dark/60 to-stone-deep">
        <div className="relative mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center sm:py-20">
          <span className="elev-1 flex size-20 items-center justify-center rounded-full border border-gold/40 bg-night/70">
            <Lock className="size-9 text-gold/80" />
          </span>
          <h2 className="mt-6 font-heading text-2xl font-bold tracking-wider text-parchment sm:text-3xl">
            Il portone è ancora incatenato
          </h2>
          <p className="mt-3 text-muted-foreground">
            I mercanti di Amberland stanno caricando i carri. Quando le catene
            cadranno, queste sale apriranno i battenti:
          </p>

          {/* Insegne di legno, appese e coperte da teli */}
          <ul className="mt-8 grid w-full gap-3 text-left sm:grid-cols-3">
            {FUTURE_HALLS.map(({ icon: Icon, label, hint }) => (
              <li
                key={label}
                className="rounded-lg border border-hairline bg-wood-dark/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(232,201,121,0.08),0_2px_0_rgba(0,0,0,0.5)]"
              >
                <span className="flex items-center gap-2 font-heading text-sm font-semibold text-gold/80">
                  <Icon className="size-4 shrink-0" />
                  {label}
                </span>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {hint}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-8 font-heading text-xs tracking-[0.3em] text-gold/50 uppercase">
            Inaugurazione in un prossimo aggiornamento delle cronache
          </p>
        </div>
      </div>
    </div>
  );
}

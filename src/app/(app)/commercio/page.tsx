"use client";

import { Coins, Handshake, Store } from "lucide-react";

import { FantasyCard } from "@/components/shared/fantasy-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

/**
 * Commercio: sezione predisposta per le prossime fasi
 * (mercanti, botteghe, scambi del party).
 */
export default function CommercePage() {
  return (
    <div>
      <PageHeader
        title="Commercio"
        subtitle="I banchi del mercato, le botteghe e gli scambi del regno."
      />

      <EmptyState
        icon={Coins}
        title="Il mercato aprirà presto"
        description="I mercanti di Amberland stanno ancora caricando i carri. Questa sala del portale verrà inaugurata in un prossimo aggiornamento delle cronache."
      />

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <FantasyCard className="opacity-60">
          <Store className="size-6 text-gold/60" />
          <h3 className="mt-3 font-heading font-semibold">Botteghe</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventari dei negozi per città, con prezzi e disponibilità.
          </p>
        </FantasyCard>
        <FantasyCard className="opacity-60">
          <Handshake className="size-6 text-gold/60" />
          <h3 className="mt-3 font-heading font-semibold">Mercanti</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Schede dei mercanti, reputazione e trattative in corso.
          </p>
        </FantasyCard>
        <FantasyCard className="opacity-60">
          <Coins className="size-6 text-gold/60" />
          <h3 className="mt-3 font-heading font-semibold">Tesoro del party</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro delle entrate, delle spese e del bottino condiviso.
          </p>
        </FantasyCard>
      </div>
    </div>
  );
}

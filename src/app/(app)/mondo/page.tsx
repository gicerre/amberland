"use client";

import { Globe, Network, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { SectionDivider } from "@/components/shared/fantasy-card";
import { ImmersiveHero } from "@/components/shared/immersive-hero";
import { EmberParticles } from "@/components/shared/particles";
import { PageHeader } from "@/components/shared/page-header";
import { Starfield } from "@/components/shared/starfield";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { useEntitiesByType } from "@/features/entities/data";
import { QuickCreateDialog } from "@/features/entities/components/quick-create-dialog";
import { WorldPortalCard } from "@/features/entities/components/world-portal-card";

/**
 * Atlante del regno: onboarding alla prima visita (nessun mondo),
 * poi panoramica dei mondi creati dal Master.
 */
export default function WorldOverviewPage() {
  const { isMaster } = useAuth();
  const { data: worlds, isLoading } = useEntitiesByType("world");
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3 bg-muted/60" />
        <Skeleton className="h-72 w-full rounded-xl bg-muted/60" />
      </div>
    );
  }

  // ---------- Onboarding: nessun mondo ----------
  if (!worlds || worlds.length === 0) {
    if (!isMaster) {
      return (
        <div>
          <PageHeader
            title="Mondo"
            subtitle="L'atlante vivente della campagna."
          />
          <EmptyState
            icon={Globe}
            title="Il mondo non è ancora stato plasmato"
            description="Il Dungeon Master non ha ancora dato forma alle terre di Amberland. Torna presto: la creazione è all'opera."
          />
        </div>
      );
    }

    return (
      <div className="relative flex min-h-[70svh] items-center justify-center overflow-hidden rounded-2xl border border-gold/20 bg-[radial-gradient(ellipse_at_top,rgba(19,28,49,0.9),rgba(10,12,18,0.98))]">
        <EmberParticles density={35} />
        <div className="relative z-10 max-w-xl px-6 py-16 text-center">
          <span className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full border border-gold/50 bg-gold/10 shadow-[0_0_50px_rgba(212,175,55,0.25)]">
            <Globe className="size-9 text-gold" />
          </span>
          <p className="font-heading text-xs tracking-[0.4em] text-gold/80 uppercase">
            L&rsquo;atlante è bianco
          </p>
          <h1 className="text-gold-gradient mt-3 font-heading text-4xl font-black tracking-wider sm:text-5xl">
            Plasma il tuo mondo
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Ogni grande campagna comincia da una mappa vuota. Crea il primo
            mondo: da lì nasceranno regioni, città, luoghi, personaggi, fazioni
            e tutte le storie che li intrecciano.
          </p>
          <Button
            size="lg"
            onClick={() => setCreateOpen(true)}
            className="animate-glow-pulse mt-8 h-12 border border-gold-bright/60 bg-gradient-to-b from-gold-bright via-gold to-gold-dark px-8 font-heading text-base font-bold tracking-[0.15em] text-[#1a1206] uppercase hover:brightness-110"
          >
            <Sparkles className="size-5" />
            Crea il primo mondo
          </Button>
        </div>
        <QuickCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          type="world"
        />
      </div>
    );
  }

  // ---------- Atlante ----------
  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" asChild>
        <Link href="/grafo">
          <Network className="size-4" />
          Vista rete
        </Link>
      </Button>
      {isMaster && (
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Nuovo mondo
        </Button>
      )}
    </div>
  );

  return (
    <div>
      {/* ════════ Hero immersivo a piena larghezza, con titolo sovrapposto ════════ */}
      <div className="relative left-1/2 -mt-4 mb-8 w-screen -translate-x-1/2 sm:-mt-6 lg:-mt-10 lg:w-[calc(100vw-18rem)]">
        <ImmersiveHero
          src="/images/atlante-dei-mondi.webp"
          alt="Atlante dei Mondi"
          accent="#d4af37"
          priority
          className="rounded-none border-0"
        >
          <div className="max-w-3xl">
            <p className="font-heading text-[11px] font-semibold tracking-[0.45em] text-arcane-bright/90 uppercase sm:text-xs">
              Le terre conosciute
            </p>
            <h1 className="text-gold-gradient mt-3 font-heading text-4xl font-black tracking-wider drop-shadow-[0_2px_20px_rgba(0,0,0,0.85)] sm:text-5xl lg:text-6xl">
              L&rsquo;Atlante dei Mondi
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-parchment-dark/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-base">
              Ogni mondo è una soglia. Oltrepassala per scoprire regioni, città,
              luoghi, fazioni e le storie che li intrecciano.
            </p>
          </div>
          {actions}
        </ImmersiveHero>
      </div>

      {/* ════════ Griglia dei portali su campo stellato ════════ */}
      <div className="relative -mx-2 px-2 py-4 sm:-mx-4 sm:px-4">
        <Starfield className="rounded-3xl" />
        <div className="relative z-10 grid gap-6 sm:grid-cols-2">
          {worlds.map((world, index) => (
            <WorldPortalCard
              key={world.id}
              entity={world}
              featured={index === 0 && worlds.length % 2 === 1}
            />
          ))}
        </div>
      </div>

      <div className="mt-10">
        <SectionDivider />
        <p className="mt-4 text-center text-sm text-muted-foreground italic">
          Espandi un mondo dalla sua pagina: regioni, città e luoghi appariranno
          anche nell&rsquo;albero del menu laterale.
        </p>
      </div>

      {isMaster && (
        <QuickCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          type="world"
        />
      )}
    </div>
  );
}

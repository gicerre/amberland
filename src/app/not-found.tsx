import { Compass } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** 404 a tema: terre non cartografate. */
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
        <Compass className="size-9 text-gold" />
      </div>
      <p className="font-heading text-sm tracking-[0.4em] text-muted-foreground uppercase">
        Errore 404
      </p>
      <h1 className="text-gold-gradient mt-3 font-heading text-4xl font-bold tracking-wider sm:text-5xl">
        Terre Inesplorate
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        La pagina che cerchi non figura su alcuna mappa del regno. Forse un
        incantesimo l&rsquo;ha nascosta, o forse non è mai esistita.
      </p>
      <Button asChild className="mt-8">
        <Link href="/home">Torna in territorio conosciuto</Link>
      </Button>
    </main>
  );
}

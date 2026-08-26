"use client";

import { Lock, Swords } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { useBattle } from "@/features/battle/data";

import { BattlemapEditor } from "./battlemap-editor";

/**
 * Guardia dell'editor: la mappa la disegna il Master. Il controllo vero
 * resta lato server (`requireBattleMaster` sulla rotta di salvataggio):
 * qui si evita solo di mostrare strumenti che verrebbero respinti.
 */
export function BattlemapEditorPage({ id }: { id: string }) {
  const { isMaster, role } = useAuth();
  const { data: battle, isLoading } = useBattle(id);

  if (role !== null && !isMaster) {
    return (
      <Centered>
        <EmptyState
          icon={Lock}
          title="Solo il Master disegna il campo"
          description="L'editor delle battlemap è riservato a chi dirige lo scontro."
        />
      </Centered>
    );
  }

  if (isLoading || role === null) {
    return (
      <div className="flex h-[100dvh] flex-col gap-2 p-2">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex min-h-0 flex-1 gap-2">
          <Skeleton className="hidden w-56 rounded-xl md:block" />
          <Skeleton className="min-w-0 flex-1 rounded-xl" />
          <Skeleton className="hidden w-80 rounded-xl lg:block" />
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <Centered>
        <EmptyState
          icon={Swords}
          title="Campo introvabile"
          description="La battaglia è stata smantellata, oppure non hai il diritto di vederla."
        />
        <Button asChild variant="outline" className="mt-4">
          <Link href="/battaglie">Torna ai campi di battaglia</Link>
        </Button>
      </Centered>
    );
  }

  return <BattlemapEditor battle={battle} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center p-6">
      {children}
    </div>
  );
}

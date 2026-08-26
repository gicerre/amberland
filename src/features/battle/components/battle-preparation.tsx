"use client";

import { Lock, Swords } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { useBattle } from "@/features/battle/data";

import { MapEditor } from "./map-editor";

/**
 * Guardia della preparazione: solo il Master disegna il campo.
 * Il controllo vero resta lato server (`requireBattleMaster`), qui si
 * evita solo di mostrare comandi che verrebbero comunque respinti.
 */
export function BattlePreparation({ id }: { id: string }) {
  const { isMaster, role } = useAuth();
  const { data: battle, isLoading } = useBattle(id);

  if (role !== null && !isMaster) {
    return (
      <EmptyState
        icon={Lock}
        title="Solo il Master traccia il campo"
        description="La preparazione di una battaglia è riservata a chi la dirige."
      />
    );
  }

  if (isLoading || role === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-[26rem] w-full rounded-2xl lg:h-[38rem]" />
          <Skeleton className="h-[26rem] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <EmptyState
        icon={Swords}
        title="Campo introvabile"
        description="La battaglia è stata smantellata, oppure non hai il diritto di vederla."
      />
    );
  }

  return <MapEditor battle={battle} />;
}

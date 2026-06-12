"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

import { LoadingScreen } from "@/components/shared/loading-screen";
import { useAuth } from "@/features/auth/auth-provider";

import { useMyCharacter } from "../data";
import { PcCreationWizard } from "./pc-creation-wizard";

/**
 * Gate del primo accesso: un giocatore (PLAYER) senza personaggio viene
 * accompagnato dal wizard di creazione guidata. Finché non crea il PC non
 * può navigare nel resto dell'applicazione. Master e Admin sono esenti.
 */
export function PcCreationGate({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const isPlayer = role === "PLAYER";
  const { data: myCharacter, isLoading, isError } = useMyCharacter();
  // Appena creato: entriamo subito, senza aspettare il refetch della query.
  const [justCreated, setJustCreated] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);

  // Esenti: Master/Admin. Chi ha già un PC (o lo ha appena creato) entra.
  if (!isPlayer) return <>{children}</>;
  if (myCharacter || justCreated) return <>{children}</>;
  // Verifica ancora in corso: non mostrare la creazione (evita il "flash").
  if (isLoading) return <LoadingScreen />;
  // Se non riusciamo a verificare (es. permessi/offline) NON intrappolare il
  // giocatore in un loop di creazione: lo facciamo entrare, ma lo avvisiamo.
  if (isError) {
    return (
      <>
        {!warningDismissed && (
          <PcCheckWarning onDismiss={() => setWarningDismissed(true)} />
        )}
        {children}
      </>
    );
  }

  return <PcCreationWizard onCreated={() => setJustCreated(true)} />;
}

/**
 * Avviso mostrato quando non riusciamo a verificare il personaggio del
 * giocatore (tipicamente regole Firestore non aggiornate): lo lasciamo
 * entrare ma segnaliamo il possibile problema di permessi.
 */
function PcCheckWarning({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-3">
      <div className="flex w-full max-w-2xl items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-950/90 px-4 py-3 shadow-lg backdrop-blur-sm">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-400" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-amber-200">
            Impossibile verificare il tuo personaggio
          </p>
          <p className="mt-0.5 text-amber-100/80">
            Probabile problema di permessi (regole Firestore non aggiornate).
            Puoi comunque usare l&rsquo;app, ma alcune funzioni potrebbero non
            funzionare: avvisa il Master di ripubblicare le regole.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Chiudi avviso"
          className="shrink-0 rounded-md p-1 text-amber-300/70 transition-colors hover:bg-amber-500/15 hover:text-amber-200"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

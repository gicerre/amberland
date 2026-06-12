"use client";

import { ShieldAlert, ShieldX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LoadingScreen } from "@/components/shared/loading-screen";
import { Button } from "@/components/ui/button";
import type { Role } from "@/types/models";

import { useAuth } from "./auth-provider";

/**
 * Protegge l'area applicativa: reindirizza al login se non autenticati
 * e alla pagina di cambio password se `mustChangePassword` è attivo.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status, profile, signOutUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && profile?.mustChangePassword) {
      router.replace("/cambia-password");
    }
  }, [status, profile, router]);

  if (status === "loading" || status === "unauthenticated") {
    return <LoadingScreen />;
  }

  if (!profile) {
    return (
      <GuardScreen
        icon={<ShieldAlert className="size-7 text-crimson-bright" />}
        title="Profilo non trovato"
        description="Il tuo account esiste ma non è registrato nelle cronache del regno. Contatta un amministratore."
      >
        <Button variant="outline" onClick={() => void signOutUser()}>
          Esci
        </Button>
      </GuardScreen>
    );
  }

  if (profile.mustChangePassword) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

/** Mostra i figli solo se il ruolo corrente è tra quelli ammessi. */
export function RoleGate({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const { role } = useAuth();

  if (!role || !allow.includes(role)) {
    return (
      <GuardScreen
        icon={<ShieldX className="size-7 text-crimson-bright" />}
        title="Accesso negato"
        description="Le antiche rune ti negano l'ingresso in questa sala: il tuo grado non è sufficiente."
      >
        <Button variant="outline" asChild>
          <Link href="/home">Torna alla Home</Link>
        </Button>
      </GuardScreen>
    );
  }

  return <>{children}</>;
}

function GuardScreen({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full border border-crimson-bright/40 bg-crimson/15">
        {icon}
      </div>
      <h2 className="font-heading text-2xl font-bold text-foreground">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-muted-foreground">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

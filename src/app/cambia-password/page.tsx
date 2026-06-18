"use client";

import { motion } from "framer-motion";
import { KeyRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LoadingScreen } from "@/components/shared/loading-screen";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FrameCard } from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

/**
 * Cambio password: obbligatorio al primo accesso
 * (mustChangePassword), sempre disponibile dal menu utente.
 */
export default function ChangePasswordPage() {
  const { status, profile, signOutUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return <LoadingScreen />;

  const firstAccess = Boolean(profile?.mustChangePassword);

  const handleSignOut = async () => {
    await signOutUser();
    router.replace("/login");
  };

  return (
    <main className="relative flex min-h-svh items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <FrameCard
          className="bg-card/90 shadow-[0_25px_70px_-20px_rgba(0,0,0,0.9)]"
          contentClassName="p-8 sm:p-10"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-full border border-gold/50 bg-gold/10">
              <KeyRound className="size-6 text-gold" />
            </span>
            <h1 className="text-gold-gradient font-heading text-2xl font-bold tracking-widest">
              NUOVA PAROLA D&rsquo;ORDINE
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Per la sicurezza del regno, scegli una nuova chiave segreta.
            </p>
          </div>

          {firstAccess && (
            <Alert className="mb-6 border-gold/30 bg-gold/5">
              <KeyRound className="size-4 text-gold" />
              <AlertTitle>Primo accesso</AlertTitle>
              <AlertDescription>
                Il cambio della password è obbligatorio prima di poter
                esplorare Amberland.
              </AlertDescription>
            </Alert>
          )}

          <ChangePasswordForm />

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => void handleSignOut()}
            >
              <LogOut className="size-4" />
              Non sei tu? Esci
            </Button>
          </div>
        </FrameCard>
      </motion.div>
    </main>
  );
}

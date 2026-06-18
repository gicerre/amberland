"use client";

import { motion } from "framer-motion";
import { Castle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { EmberParticles } from "@/components/shared/particles";
import { FrameCard } from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import { LoginForm } from "@/features/auth/components/login-form";

/** Pagina di accesso al regno. */
export default function LoginPage() {
  const { status, profile } = useAuth();
  const router = useRouter();

  // Già autenticato: salta il login
  useEffect(() => {
    if (status === "authenticated" && profile) {
      router.replace(
        profile.mustChangePassword ? "/cambia-password" : "/home"
      );
    }
  }, [status, profile, router]);

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-10">
      <Image
        src="/images/landing-bg.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-50"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      <EmberParticles density={25} className="z-10" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-20 w-full max-w-md"
      >
        <FrameCard
          className="bg-card/90 shadow-[0_25px_70px_-20px_rgba(0,0,0,0.9),0_0_40px_rgba(212,175,55,0.06)] backdrop-blur-sm"
          contentClassName="p-8 sm:p-10"
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="mb-4 flex size-14 items-center justify-center rounded-full border border-gold/50 bg-gold/10 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
              <Castle className="size-6 text-gold" />
            </span>
            <h1 className="text-gold-gradient font-heading text-2xl font-bold tracking-widest">
              VARCA I CANCELLI
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pronuncia le tue credenziali, viandante: il regno attende.
            </p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Non possiedi un accesso? Chiedi a un Custode del Regno di
            registrarti.
          </p>
        </FrameCard>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-gold"
          >
            ← Torna al portale
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

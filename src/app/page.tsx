"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import { EmberParticles } from "@/components/shared/particles";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.22, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/** Landing page: schermata cinematografica d'ingresso al portale. */
export default function LandingPage() {
  const { status } = useAuth();
  const destination = status === "authenticated" ? "/home" : "/login";

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden">
      {/* Scenografia */}
      <Image
        src="/images/landing-bg.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/35 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(10,8,5,0.85)_100%)]" />
      <EmberParticles density={45} className="z-10" />

      {/* Titolo */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative z-20 flex flex-col items-center px-6 text-center"
      >
        <motion.p
          variants={item}
          className="mb-6 font-heading text-xs font-semibold tracking-[0.5em] text-gold/80 uppercase sm:text-sm"
        >
          Una campagna di Dungeons &amp; Dragons
        </motion.p>

        <motion.div variants={item}>
          <Image
            src="/logo/full_logo_name.png"
            alt="Amberland — Le Cronache del Regno"
            width={480}
            height={560}
            priority
            sizes="(max-width: 640px) 70vw, 480px"
            className="h-auto w-[clamp(15rem,55vw,30rem)] object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
          />
        </motion.div>

        <motion.div variants={item} className="mt-10 w-full max-w-xs sm:max-w-sm">
          <Link href={destination} className="block">
            {/* Reliquia: la piastra prende luce di torcia (flicker) e
                affonda alla pressione — mai scale/brightness. */}
            <Button className="glow-accent h-14 w-full px-6 font-heading text-sm font-bold tracking-[0.15em] uppercase transition-transform hover:-translate-y-px active:translate-y-0.5 sm:h-16 sm:px-10 sm:text-base sm:tracking-[0.2em]">
              Entra in Amberland
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}

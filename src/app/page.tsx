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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(10,12,18,0.85)_100%)]" />
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

        <motion.h1
          variants={item}
          className="text-gold-gradient font-heading text-6xl font-black tracking-[0.1em] drop-shadow-[0_0_40px_rgba(212,175,55,0.35)] sm:text-7xl md:text-8xl"
        >
          AMBERLAND
        </motion.h1>

        <motion.div
          variants={item}
          className="mt-5 flex w-full max-w-md items-center gap-4"
          aria-hidden
        >
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/70" />
          <span className="size-2 rotate-45 border border-gold/80 bg-gold/30" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/70" />
        </motion.div>

        <motion.p
          variants={item}
          className="mt-5 font-heading text-base tracking-[0.45em] text-parchment/90 uppercase sm:text-lg"
        >
          Le Cronache del Regno
        </motion.p>

        <motion.div variants={item} className="mt-12">
          <Button
            asChild
            size="lg"
            className="animate-glow-pulse h-13 rounded-md border border-gold-bright/60 bg-gradient-to-b from-gold-bright via-gold to-gold-dark px-10 font-heading text-base font-bold tracking-[0.2em] text-[#1a1206] uppercase transition-transform hover:scale-[1.03] hover:brightness-110"
          >
            <Link href={destination}>Entra in Amberland</Link>
          </Button>
        </motion.div>
      </motion.div>
    </main>
  );
}

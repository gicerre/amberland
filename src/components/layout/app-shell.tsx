"use client";

import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { PageTransition } from "@/components/shared/page-transition";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PcCreationGate } from "@/features/characters/components/pc-creation-gate";
import { GlobalSearchDialog } from "@/features/entities/components/global-search";

import { AppSidebar, SidebarContent } from "./sidebar";
import { UserMenu } from "./user-menu";

/**
 * Struttura dell'area autenticata: sidebar su desktop, topbar con
 * drawer su mobile, ricerca globale (Ctrl/Cmd + K) e transizioni.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Scorciatoia da tastiera per la ricerca globale
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <PcCreationGate>
      <div className="min-h-svh">
        <AppSidebar onSearch={() => setSearchOpen(true)} />

      {/* Topbar mobile */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gold/15 bg-background/90 px-3 backdrop-blur lg:hidden">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Apri il menu">
              <Menu className="size-5 text-gold" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 border-gold/15 bg-sidebar p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu di navigazione</SheetTitle>
            </SheetHeader>
            <SidebarContent
              onNavigate={() => setDrawerOpen(false)}
              onSearch={() => {
                setDrawerOpen(false);
                setSearchOpen(true);
              }}
            />
          </SheetContent>
        </Sheet>

        <Link
          href="/home"
          className="text-gold-gradient font-heading text-base font-extrabold tracking-[0.2em]"
        >
          AMBERLAND
        </Link>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cerca nel regno"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-5 text-gold" />
          </Button>
          <UserMenu compact />
        </div>
      </header>

      {/* Contenuto */}
      <main className="lg:pl-72">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <PageTransition key={pathname}>{children}</PageTransition>
        </div>
      </main>

        <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </PcCreationGate>
  );
}

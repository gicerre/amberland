"use client";

import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { CelebrationProvider } from "@/components/shared/celebration";
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
import { cn } from "@/lib/utils";

import { NAV_GROUPS, getActiveGroupId } from "./nav-config";
import { AppSidebar, SidebarContent } from "./sidebar";
import { UserMenu } from "./user-menu";

/**
 * Bottom navigation bar per mobile.
 * Mostra i 5 gruppi principali come tab fisse in fondo allo schermo.
 */
function MobileBottomNav() {
  const pathname = usePathname();
  const activeGroupId = getActiveGroupId(pathname);

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-gold/12 bg-sidebar/98 backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Striscia ornamentale superiore */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent"
      />

      {NAV_GROUPS.map((group) => {
        const Icon = group.icon;
        const isActive = activeGroupId === group.id;
        const primaryHref = group.entries[0]?.href ?? "/";

        return (
          <Link
            key={group.id}
            href={primaryHref}
            className={cn(
              "group relative flex flex-1 flex-col items-center justify-center gap-0.5 px-1 transition-colors",
              isActive ? "text-gold-bright" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {/* Indicatore attivo — barretta superiore */}
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-gradient-to-r from-transparent via-gold to-transparent"
              />
            )}

            {/* Bagliore sfondo quando attivo */}
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-x-1 inset-y-1 rounded-lg bg-gold/8"
              />
            )}

            <Icon
              className={cn(
                "relative size-5 transition-all",
                isActive
                  ? "text-gold drop-shadow-[0_0_6px_rgba(212,175,55,0.6)]"
                  : "group-hover:text-gold/70"
              )}
            />
            <span
              className={cn(
                "relative font-heading text-[9px] tracking-[0.12em] uppercase transition-colors",
                isActive ? "text-gold/90" : "text-muted-foreground/70"
              )}
            >
              {group.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Struttura dell'area autenticata: sidebar su desktop, topbar con
 * drawer su mobile, bottom nav mobile, ricerca globale (Ctrl/Cmd + K).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
    <CelebrationProvider>
    <PcCreationGate>
      <div className="min-h-svh">
        {/* Sidebar desktop */}
        <AppSidebar onSearch={() => setSearchOpen(true)} />

        {/* Topbar mobile */}
        <header className="sticky top-0 z-40 flex h-13 items-center justify-between border-b border-gold/12 bg-background/92 px-3 backdrop-blur-sm lg:hidden">
          {/* Striscia ornamentale inferiore */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent"
          />

          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Apri il menu completo"
                className="text-gold/70 hover:text-gold hover:bg-gold/8"
              >
                <Menu className="size-5" />
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

          {/* Brand centrato */}
          <Link
            href="/party"
            className="text-gold-gradient absolute left-1/2 -translate-x-1/2 font-heading text-[15px] font-extrabold tracking-[0.22em]"
          >
            AMBERLAND
          </Link>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerca nel regno"
              className="text-gold/70 hover:text-gold hover:bg-gold/8"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-5" />
            </Button>
            <UserMenu compact />
          </div>
        </header>

        {/* Contenuto principale */}
        <main className="lg:pl-72">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:px-10 lg:py-10 lg:pb-10">
            <PageTransition key={pathname}>{children}</PageTransition>
          </div>
        </main>

        {/* Bottom nav solo mobile */}
        <MobileBottomNav />

        <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </PcCreationGate>
    </CelebrationProvider>
  );
}

"use client";

import { Menu, Search } from "lucide-react";
import Image from "next/image";
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
import { PartyItemsSync } from "@/features/items/data";
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
    /* Bottom bar Obsidian (V3 §9): vetro satinato, icona 24 + label 11px
       sempre visibile, attiva = icona gold + dot. */
    <nav
      aria-label="Navigazione principale"
      className="glass fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-x-0 border-b-0 border-t border-hairline lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_GROUPS.map((group) => {
        const Icon = group.icon;
        const isActive = activeGroupId === group.id;
        const primaryHref = group.entries[0]?.href ?? "/";

        return (
          <Link
            key={group.id}
            href={primaryHref}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors",
              isActive ? "text-parchment" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "size-6 transition-colors",
                isActive ? "text-gold" : "group-hover:text-foreground"
              )}
            />
            <span className="flex items-center gap-1 text-[11px] font-medium leading-none">
              {group.label}
              {isActive && (
                <span aria-hidden className="size-1 rounded-full bg-gold" />
              )}
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
        {/* Topbar mobile su vetro (V3 §9) */}
        <header className="glass sticky top-0 z-40 flex h-12 items-center justify-between border-x-0 border-t-0 border-b border-hairline px-2 sm:h-13 sm:px-3 lg:hidden">

          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Apri il menu completo"
                className="text-gold/70 hover:text-gold hover:bg-gold/8"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 border-hairline bg-sidebar p-0">
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
            aria-label="Amberland"
            className="absolute left-1/2 -translate-x-1/2"
          >
            <Image
              src="/logo/logo_name.png"
              alt="Amberland"
              width={150}
              height={32}
              priority
              className="h-5 w-auto object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
            />
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
        <main className="overflow-x-clip lg:pl-72">
          <div className="mx-auto w-full max-w-6xl px-3 py-4 pb-20 sm:px-5 sm:py-6 sm:pb-24 lg:px-10 lg:py-10 lg:pb-10">
            <PageTransition key={pathname}>{children}</PageTransition>
          </div>
        </main>

        {/* Bottom nav solo mobile */}
        <MobileBottomNav />

        <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        <PartyItemsSync />
      </div>
    </PcCreationGate>
    </CelebrationProvider>
  );
}

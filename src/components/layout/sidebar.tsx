"use client";

import { Castle, ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CornerOrnaments } from "@/components/shared/fantasy-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth/auth-provider";
import { WorldTree } from "@/features/entities/components/world-tree";
import { cn } from "@/lib/utils";

import { MAIN_NAV, MANAGEMENT_NAV, type NavEntry } from "./nav-config";
import { UserMenu } from "./user-menu";

/** Marchio del regno mostrato in testa alla sidebar. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/home"
      className={cn("flex items-center gap-3 px-2", className)}
    >
      <span className="flex size-10 items-center justify-center rounded-full border border-gold/50 bg-gold/10 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
        <Castle className="size-5 text-gold" />
      </span>
      <span className="flex flex-col">
        <span className="text-gold-gradient font-heading text-lg font-extrabold tracking-[0.18em]">
          AMBERLAND
        </span>
        <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
          Le Cronache del Regno
        </span>
      </span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  entry,
  pathname,
  onNavigate,
}: {
  entry: NavEntry;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, entry.href);
  const [open, setOpen] = useState(entry.worldTree ? true : active);
  const Icon = entry.icon;

  // Voce in evidenza: CTA dedicata, a tema fantasy.
  if (entry.featured) {
    return (
      <Link
        href={entry.href}
        onClick={onNavigate}
        className={cn(
          "group relative my-1 flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 transition-all",
          active
            ? "border-gold/60 bg-gradient-to-r from-gold/25 via-gold/10 to-transparent shadow-[0_0_24px_rgba(212,175,55,0.18)]"
            : "border-gold/30 bg-gradient-to-r from-gold/10 to-transparent hover:border-gold/55 hover:shadow-[0_0_24px_rgba(212,175,55,0.15)]"
        )}
      >
        <CornerOrnaments className="size-3 border-gold/50" />
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-gold/15 text-gold shadow-inner">
          <Icon className="size-5" />
        </span>
        <span className="flex flex-col">
          <span className="font-heading text-[15px] font-bold tracking-wide text-gold-bright">
            {entry.label}
          </span>
          {entry.tagline && (
            <span className="text-[11px] text-muted-foreground">
              {entry.tagline}
            </span>
          )}
        </span>
      </Link>
    );
  }

  const linkClasses = cn(
    "group flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-[15px] transition-colors",
    active
      ? "bg-gold/10 font-semibold text-gold-bright"
      : "text-foreground/75 hover:bg-accent hover:text-foreground"
  );

  const iconElement = (
    <Icon
      className={cn(
        "size-[18px] shrink-0 transition-colors",
        active ? "text-gold" : "text-muted-foreground group-hover:text-gold/80"
      )}
    />
  );

  if (!entry.worldTree) {
    return (
      <Link href={entry.href} onClick={onNavigate} className={linkClasses}>
        {iconElement}
        {entry.label}
      </Link>
    );
  }

  // Voce "Mondo": link + albero dinamico dell'atlante
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-1">
        <Link href={entry.href} onClick={onNavigate} className={linkClasses}>
          {iconElement}
          {entry.label}
        </Link>
        <CollapsibleTrigger
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-gold"
          aria-label={`Espandi ${entry.label}`}
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <WorldTree onNavigate={onNavigate} />
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Contenuto della navigazione, condiviso tra sidebar desktop e drawer mobile.
 * `onNavigate` chiude il drawer dopo un click su mobile.
 */
export function SidebarContent({
  onNavigate,
  onSearch,
}: {
  onNavigate?: () => void;
  onSearch?: () => void;
}) {
  const pathname = usePathname();
  const { role } = useAuth();

  const managementEntries = MANAGEMENT_NAV.filter(
    (entry) => !entry.roles || (role !== null && entry.roles.includes(role))
  );

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-5 pb-4">
        <Brand />
      </div>
      <Separator className="bg-gold/10" />

      {onSearch && (
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={onSearch}
            className="flex w-full items-center gap-2.5 rounded-lg border border-gold/20 bg-night/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground"
          >
            <Search className="size-4 text-gold/60" />
            <span className="flex-1 text-left">Cerca nel regno…</span>
            <kbd className="rounded border border-gold/20 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              Ctrl K
            </kbd>
          </button>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-4">
        <nav aria-label="Navigazione principale">
          <ul className="space-y-0.5">
            {MAIN_NAV.map((entry) => (
              <li key={entry.href}>
                <NavLink
                  entry={entry}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>

          {managementEntries.length > 0 && (
            <>
              <p className="mt-6 mb-2 px-3 font-heading text-[11px] font-semibold tracking-[0.25em] text-gold/60 uppercase">
                Gestione
              </p>
              <ul className="space-y-0.5">
                {managementEntries.map((entry) => (
                  <li key={entry.href}>
                    <NavLink
                      entry={entry}
                      pathname={pathname}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>
      </ScrollArea>

      <div className="border-t border-gold/10 p-3">
        <UserMenu />
      </div>
    </div>
  );
}

/** Sidebar fissa, visibile da lg in su. */
export function AppSidebar({ onSearch }: { onSearch?: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-gold/15 bg-sidebar/95 backdrop-blur lg:flex">
      <SidebarContent onSearch={onSearch} />
    </aside>
  );
}

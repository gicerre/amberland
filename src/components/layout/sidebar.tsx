"use client";

import { ChevronDown, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/features/auth/auth-provider";
import { WorldTree } from "@/features/entities/components/world-tree";
import { cn } from "@/lib/utils";

import {
  MANAGEMENT_NAV,
  groupsFor,
  homeFor,
  type NavEntry,
  type NavGroup,
} from "./nav-config";
import { UserMenu } from "./user-menu";

/** Marchio del regno mostrato in testa alla sidebar. */
export function Brand({ className }: { className?: string }) {
  const { role } = useAuth();
  return (
    <Link
      href={homeFor(role)}
      className={cn("group flex items-center gap-3 px-2", className)}
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]">
        <Image
          src="/logo/logo.png"
          alt="Emblema di Amberland"
          width={44}
          height={44}
          priority
          className="size-full object-contain"
        />
      </span>
      <span className="flex flex-col">
        <span className="text-gold-gradient font-heading text-[17px] font-extrabold tracking-[0.22em]">
          AMBERLAND
        </span>
        <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
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

  /* Voce in evidenza (Party): card d'accento quieta, emblema contenuto. */
  if (entry.featured) {
    return (
      <Link
        href={entry.href}
        onClick={onNavigate}
        className={cn(
          "group relative my-1 flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 transition-all",
          active
            ? "elev-1 border-gold/50 bg-gold-dim"
            : "border-hairline bg-surface-1 hover:elev-1 hover:border-hairline-strong hover:bg-surface-2"
        )}
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-12" />
        </span>
        <span className="flex flex-col">
          <span
            className={cn(
              "text-sm font-semibold tracking-wide",
              active ? "text-gold-bright" : "text-foreground"
            )}
          >
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
    "group relative flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
    active
      ? "bg-surface-2 font-semibold text-parchment"
      : "text-muted-foreground hover:bg-surface-2/70 hover:text-foreground"
  );

  const iconElement = (
    <Icon
      className={cn(
        "size-4 shrink-0 transition-colors",
        active ? "text-gold" : "text-muted-foreground group-hover:text-foreground"
      )}
    />
  );

  /* Indicatore attivo: barra 2px gold a sinistra (V3 §9) */
  const activeBar = active ? (
    <span
      aria-hidden
      className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-gold"
    />
  ) : null;

  if (!entry.worldTree) {
    return (
      <Link href={entry.href} onClick={onNavigate} className={linkClasses}>
        {activeBar}
        {iconElement}
        {entry.label}
      </Link>
    );
  }

  /* Voce "Atlante": link + albero dinamico */
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-1">
        <Link href={entry.href} onClick={onNavigate} className={linkClasses}>
          {activeBar}
          {iconElement}
          {entry.label}
        </Link>
        <CollapsibleTrigger
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-stone-highlight/60 hover:text-gold"
          aria-label={`Espandi ${entry.label}`}
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform duration-200",
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

/** Separatore tra gruppi: hairline quieta (Obsidian). */
function GroupDivider() {
  return (
    <div aria-hidden className="my-1 px-3">
      <span className="block h-px bg-hairline" />
    </div>
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
      {/* Brand */}
      <div className="relative px-4 py-5">
        <Brand />
        {/* Linea ornamentale sotto il brand */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
      </div>

      {/* Ricerca */}
      {onSearch && (
        <div className="px-3 pt-3 pb-1">
          <button
            type="button"
            onClick={onSearch}
            className="group flex w-full items-center gap-2.5 rounded-lg border border-hairline bg-stone-surface/60 px-3 py-2 text-sm text-muted-foreground transition-all hover:border-gold/35 hover:bg-stone-highlight/60 hover:text-foreground"
          >
            <Search className="size-3.5 text-gold/50 transition-colors group-hover:text-gold/80" />
            <span className="flex-1 text-left text-[13px]">Cerca nel regno…</span>
            <kbd className="rounded border border-hairline bg-stone-surface px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/60">
              ⌃K
            </kbd>
          </button>
        </div>
      )}

      {/* Navigazione principale a gruppi */}
      <ScrollArea className="min-h-0 flex-1 overflow-hidden px-3 py-3">
        <nav aria-label="Navigazione principale">
          {groupsFor(role).map((group: NavGroup, groupIndex: number) => (
            <div key={group.id}>
              {groupIndex > 0 && <GroupDivider />}

              {/* Label gruppo */}
              <p className="nav-group-label">
                {group.label}
              </p>

              <ul className="space-y-0.5">
                {group.entries.map((entry) => (
                  <li key={entry.href}>
                    <NavLink
                      entry={entry}
                      pathname={pathname}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Gestione */}
          {managementEntries.length > 0 && (
            <>
              <GroupDivider />
              <p className="nav-group-label">
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

      {/* User menu */}
      <div className="relative p-3">
        {/* Linea ornamentale sopra lo user menu */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <UserMenu />
      </div>
    </div>
  );
}

/** Sidebar fissa, visibile da lg in su. */
export function AppSidebar({ onSearch }: { onSearch?: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-hairline bg-sidebar lg:flex">
      <SidebarContent onSearch={onSearch} />
    </aside>
  );
}

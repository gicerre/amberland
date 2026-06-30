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
import { CornerOrnaments } from "@/components/shared/fantasy-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/features/auth/auth-provider";
import { WorldTree } from "@/features/entities/components/world-tree";
import { cn } from "@/lib/utils";

import {
  NAV_GROUPS,
  MANAGEMENT_NAV,
  type NavEntry,
  type NavGroup,
} from "./nav-config";
import { UserMenu } from "./user-menu";

/** Marchio del regno mostrato in testa alla sidebar. */
export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/party"
      className={cn("group flex items-center gap-3 px-2", className)}
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center drop-shadow-[0_0_10px_rgba(212,175,55,0.25)] transition-[filter] group-hover:drop-shadow-[0_0_16px_rgba(212,175,55,0.45)]">
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
        <span className="text-[9px] tracking-[0.32em] text-gold/40 uppercase">
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

  /* Voce in evidenza: CTA dedicata, a tema fantasy. */
  if (entry.featured) {
    return (
      <Link
        href={entry.href}
        onClick={onNavigate}
        className={cn(
          "group relative my-1 flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 transition-all",
          active
            ? "border-gold/55 bg-gradient-to-r from-gold/22 via-gold/10 to-transparent shadow-[0_0_28px_rgba(212,175,55,0.2)]"
            : "border-gold/25 bg-gradient-to-r from-gold/8 to-transparent hover:border-gold/50 hover:from-gold/15 hover:shadow-[0_0_22px_rgba(212,175,55,0.15)]"
        )}
      >
        <CornerOrnaments size="sm" />
        {/* Striscia superiore dorata */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        <span className={cn(
          "flex size-20 ml-3 shrink-0 items-center justify-center rounded-lg transition-all",
        )}>
          <Icon className="size-20 ml-5 mr-5 text-gold" />
        </span>
        <span className="flex flex-col">
          <span className="font-heading text-[14px] font-bold tracking-wide text-gold-bright">
            {entry.label}
          </span>
          {entry.tagline && (
            <span className="text-[10px] text-gold/50">
              {entry.tagline}
            </span>
          )}
        </span>
      </Link>
    );
  }

  const linkClasses = cn(
    "group relative flex flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-[14px] transition-all",
    active
      ? "bg-gold/10 font-semibold text-gold-bright"
      : "text-foreground/70 hover:bg-stone-highlight/80 hover:text-foreground"
  );

  const iconElement = (
    <Icon
      className={cn(
        "size-[16px] shrink-0 transition-colors",
        active ? "text-gold drop-shadow-[0_0_4px_rgba(212,175,55,0.5)]" : "text-muted-foreground group-hover:text-gold/75"
      )}
    />
  );

  /* Indicatore attivo: barretta sinistra */
  const activeBar = active ? (
    <span
      aria-hidden
      className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-transparent via-gold to-transparent"
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

/** Separatore ornamentale tra gruppi. */
function GroupDivider() {
  return (
    <div aria-hidden className="my-1 flex items-center gap-2 px-3">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <span className="size-1 rotate-45 bg-gold/25" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/20 to-transparent" />
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
            className="group flex w-full items-center gap-2.5 rounded-lg border border-gold/15 bg-stone-surface/60 px-3 py-2 text-sm text-muted-foreground transition-all hover:border-gold/35 hover:bg-stone-highlight/60 hover:text-foreground"
          >
            <Search className="size-3.5 text-gold/50 transition-colors group-hover:text-gold/80" />
            <span className="flex-1 text-left text-[13px]">Cerca nel regno…</span>
            <kbd className="rounded border border-gold/15 bg-stone-surface px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/60">
              ⌃K
            </kbd>
          </button>
        </div>
      )}

      {/* Navigazione principale a gruppi */}
      <ScrollArea className="min-h-0 flex-1 overflow-hidden px-3 py-3">
        <nav aria-label="Navigazione principale">
          {NAV_GROUPS.map((group: NavGroup, groupIndex: number) => (
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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-gold/12 bg-sidebar/98 backdrop-blur-sm lg:flex">
      {/* Texture sottile sulla sidebar */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(212,175,55,0.5) 0px, transparent 1px, transparent 6px, rgba(212,175,55,0.5) 7px)",
          backgroundSize: "10px 10px",
        }}
      />
      <SidebarContent onSearch={onSearch} />
    </aside>
  );
}

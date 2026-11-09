import {
  BookMarked,
  BookOpen,
  Coins,
  Crown,
  Flag,
  Gem,
  Hourglass,
  LayoutDashboard,
  Map,
  Network,
  ScrollText,
  Shield,
  Skull,
  Swords,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/types/models";
import { imageIcon } from "../shared/image-icon";

export interface NavEntry {
  label: string;
  href: string;
  icon: ReturnType<typeof imageIcon> | LucideIcon;
  /** Voce con albero dinamico dell'atlante (mondi → luoghi). */
  worldTree?: boolean;
  /** Se presente, la voce è visibile solo a questi ruoli. */
  roles?: Role[];
  /** Voce in evidenza (CTA principale, stile dedicato). */
  featured?: boolean;
  /** Sottotitolo mostrato nelle voci in evidenza. */
  tagline?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  /** Icona del gruppo — usata nella bottom nav mobile (sempre Lucide: leggera). */
  icon: LucideIcon;
  entries: NavEntry[];
  /** Se presente, il gruppo è visibile solo a questi ruoli. */
  roles?: Role[];
  /** Ruoli per cui il gruppo NON occupa una tab della bottom nav mobile. */
  hideInBottomBarFor?: Role[];
  /** Prefissi di percorso che "attivano" il gruppo nella bottom nav. */
  activePaths: string[];
}

/* ============================================================
 * Navigazione per MOMENTO D'USO (docs/UX_REVIEW_FASE_A.md, dir. A).
 *
 * Giocatore — bottom nav: Eroe · Party · Atlante · Compendio · Cronache.
 *   "Eroe" (/pg) è il personaggio pronto per il tavolo: un tocco.
 * Master/Admin — bottom nav: Party · Atlante · Compendio · Cronache ·
 *   Personale (non hanno un PG da giocare).
 * "Personale" (panoramica, obiettivi, diario) per il giocatore resta
 * nella sidebar/drawer e nel menu utente.
 * ============================================================ */

const DragonIcon = imageIcon("/icons/dragon.png");

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "eroe",
    label: "Eroe",
    icon: Swords,
    roles: ["PLAYER"],
    activePaths: ["/pg"],
    entries: [
      {
        label: "Il mio eroe",
        href: "/pg",
        icon: Swords,
        featured: true,
        tagline: "Pronto per il tavolo",
      },
    ],
  },
  {
    id: "party",
    label: "Party",
    icon: Users,
    activePaths: ["/party"],
    entries: [
      {
        label: "Il Party",
        href: "/party",
        icon: DragonIcon,
        tagline: "Compagni, oggetti e diario",
      },
    ],
  },
  {
    id: "atlante",
    label: "Atlante",
    icon: Map,
    activePaths: ["/mondo", "/quest"],
    entries: [
      { label: "Mondi & Luoghi", href: "/mondo", icon: Map, worldTree: true },
      { label: "Missioni", href: "/quest", icon: ScrollText },
    ],
  },
  {
    id: "compendio",
    label: "Compendio",
    icon: BookOpen,
    activePaths: ["/personaggi", "/fazioni", "/oggetti", "/bestiario"],
    entries: [
      { label: "Personaggi", href: "/personaggi", icon: User },
      { label: "Fazioni", href: "/fazioni", icon: Flag },
      { label: "Oggetti", href: "/oggetti", icon: Gem },
      { label: "Bestiario", href: "/bestiario", icon: Skull },
    ],
  },
  {
    id: "cronache",
    label: "Cronache",
    icon: Hourglass,
    activePaths: ["/cronache", "/grafo"],
    entries: [
      { label: "Libro delle Cronache", href: "/cronache", icon: Hourglass },
      { label: "Mappa delle Relazioni", href: "/grafo", icon: Network },
    ],
  },
  {
    id: "personale",
    label: "Personale",
    icon: BookMarked,
    hideInBottomBarFor: ["PLAYER"],
    activePaths: ["/home", "/area-personale"],
    entries: [
      { label: "Panoramica", href: "/home", icon: LayoutDashboard },
      { label: "Obiettivi e diario", href: "/area-personale", icon: BookMarked },
    ],
  },
];

/** Sezione di gestione, filtrata per ruolo. */
export const MANAGEMENT_NAV: NavEntry[] = [
  {
    label: "Commercio",
    href: "/commercio",
    icon: Coins,
    roles: ["ADMIN", "MASTER"],
  },
  {
    label: "Sala del Master",
    href: "/master",
    icon: Crown,
    roles: ["ADMIN", "MASTER"],
  },
  {
    label: "Amministrazione",
    href: "/admin",
    icon: Shield,
    roles: ["ADMIN"],
  },
];

/** Gruppi visibili a un ruolo (sidebar/drawer). */
export function groupsFor(role: Role | null): NavGroup[] {
  return NAV_GROUPS.filter(
    (group) => !group.roles || (role !== null && group.roles.includes(role))
  );
}

/** Gruppi che occupano una tab della bottom nav mobile per quel ruolo. */
export function bottomBarGroupsFor(role: Role | null): NavGroup[] {
  return groupsFor(role).filter(
    (group) => !(role && group.hideInBottomBarFor?.includes(role))
  );
}

/** La "casa" di ogni ruolo: il giocatore entra dal suo eroe. */
export function homeFor(role: Role | null | undefined): string {
  return role === "PLAYER" ? "/pg" : "/home";
}

/**
 * Restituisce l'id del gruppo attivo in base al pathname corrente.
 * Usato dalla bottom nav mobile per evidenziare la tab.
 */
export function getActiveGroupId(pathname: string): string | null {
  for (const group of NAV_GROUPS) {
    if (group.activePaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return group.id;
    }
  }
  return null;
}

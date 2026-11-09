import {
  BookMarked,
  BookOpen,
  Coins,
  Crown,
  Flag,
  Gem,
  Hourglass,
  Map,
  Network,
  ScrollText,
  Shield,
  Skull,
  User,
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
  /** Icona del gruppo — usata nella bottom nav mobile. */
  icon: ReturnType<typeof imageIcon> | LucideIcon;
  entries: NavEntry[];
  /** Se presente, il gruppo è visibile solo a questi ruoli. */
  roles?: Role[];
  /** Prefissi di percorso che "attivano" il gruppo nella bottom nav. */
  activePaths: string[];
}

/**
 * Navigazione a 5 gruppi semantici + gestione.
 * Ogni gruppo corrisponde a una tab della bottom nav mobile
 * e a una sezione visiva nella sidebar desktop.
 */

const DragonIcon = imageIcon("/icons/dragon.png");

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "party",
    label: "Party",
    icon: DragonIcon,
    activePaths: ["/party"],
    entries: [
      {
        label: "Il Party",
        href: "/party",
        icon: DragonIcon,
        featured: true,
        tagline: "Il cuore del gruppo",
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
    id: "cronache",
    label: "Cronache",
    icon: Hourglass,
    activePaths: ["/cronache", "/grafo"],
    entries: [
      { label: "Cronache", href: "/cronache", icon: Hourglass },
      { label: "Mappa delle Relazioni", href: "/grafo", icon: Network },
    ],
  },
  {
    id: "codex",
    label: "Codex",
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
    id: "personale",
    label: "Il Mio Tomo",
    icon: BookMarked,
    activePaths: ["/area-personale", "/home"],
    entries: [
      { label: "Area Personale", href: "/area-personale", icon: BookMarked },
      { label: "Il Tomo", href: "/home", icon: BookOpen },
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

/** Flat list derivata dai gruppi — per compatibilità retroattiva. */
export const MAIN_NAV: NavEntry[] = NAV_GROUPS.flatMap((g) => g.entries);

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

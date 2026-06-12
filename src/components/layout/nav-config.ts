import {
  BookMarked,
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
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/types/models";

export interface NavEntry {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Voce con albero dinamico dell'atlante (mondi → luoghi). */
  worldTree?: boolean;
  /** Se presente, la voce è visibile solo a questi ruoli. */
  roles?: Role[];
  /** Voce in evidenza (CTA principale, stile dedicato). */
  featured?: boolean;
  /** Sottotitolo mostrato nelle voci in evidenza. */
  tagline?: string;
}

/**
 * Menu principale — Party in evidenza come prima voce; "Mondi" si espande
 * con l'albero dinamico dell'atlante.
 */
export const MAIN_NAV: NavEntry[] = [
  {
    label: "Party",
    href: "/party",
    icon: Swords,
    featured: true,
    tagline: "Il cuore del gruppo",
  },
  { label: "Dashboard", href: "/home", icon: LayoutDashboard },
  { label: "Mondi", href: "/mondo", icon: Map, worldTree: true },
  { label: "Missioni", href: "/quest", icon: ScrollText },
  { label: "Personaggi", href: "/personaggi", icon: User },
  { label: "Fazioni", href: "/fazioni", icon: Flag },
  { label: "Oggetti", href: "/oggetti", icon: Gem },
  { label: "Bestiario", href: "/bestiario", icon: Skull },
  { label: "Cronache", href: "/cronache", icon: Hourglass },
  { label: "Mappa delle Relazioni", href: "/grafo", icon: Network },
  { label: "Commercio", href: "/commercio", icon: Coins },
  { label: "Area Personale", href: "/area-personale", icon: BookMarked },
];

/** Sezione di gestione, filtrata per ruolo. */
export const MANAGEMENT_NAV: NavEntry[] = [
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

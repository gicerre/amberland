"use client";

import {
  AppWindow,
  Blocks,
  BrickWall,
  Box,
  Cable,
  Columns3,
  Crosshair,
  DoorClosed,
  DoorOpen,
  Fence,
  Flame,
  Footprints,
  Grid2x2,
  Logs,
  Mountain,
  Package,
  Ship,
  Shrub,
  SquareDashedBottom,
  Tent,
  ToggleLeft,
  TreePine,
  Truck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

/**
 * Icone del catalogo, importate per nome esplicito.
 *
 * Nessuna emoji nell'interfaccia (Constitution v2) e nessun import
 * dinamico dell'intera libreria: solo ciò che serve davvero finisce nel
 * bundle.
 */
export const OBJECT_ICONS: Record<string, LucideIcon> = {
  TreePine,
  Shrub,
  Mountain,
  Logs,
  BrickWall,
  DoorClosed,
  DoorOpen,
  AppWindow,
  Columns3,
  Footprints,
  Cable,
  Package,
  Flame,
  Grid2x2,
  SquareDashedBottom,
  ToggleLeft,
  Box,
  Fence,
  Blocks,
  Truck,
  Tent,
  Crosshair,
  Ship,
};

export function objectIcon(name: string): LucideIcon {
  return OBJECT_ICONS[name] ?? TriangleAlert;
}

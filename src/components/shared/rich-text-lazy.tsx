"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/* Caricamento lazy dell'editor/renderer Tiptap: la libreria (pesante)
 * entra nel bundle solo quando serve davvero. */

export const RichTextEditor = dynamic(
  () => import("./rich-text").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-40 w-full rounded-lg bg-muted/60" />
    ),
  }
);

export const RichTextRenderer = dynamic(
  () => import("./rich-text").then((m) => m.RichTextRenderer),
  { ssr: false }
);

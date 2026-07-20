"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntity } from "@/features/entities/data";
import { ENTITY_REGISTRY } from "@/features/entities/registry";
import { cn } from "@/lib/utils";

import { richTextToPlainText } from "./rich-text-utils";

/* ============================================================
 * Riquadro informativo delle citazioni inline: passando il mouse
 * su una @menzione compare una mini-scheda dell'entità (ritratto,
 * nome, tipo, incipit); il click porta alla sua pagina.
 * ============================================================ */

const CARD_WIDTH = 288;

interface Anchor {
  id: string;
  left: number;
  top: number;
}

/**
 * Area che delega hover e click sulle menzioni contenute (span
 * `[data-type="mention"]` prodotti dal renderer Tiptap).
 */
export function MentionHoverArea({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimer.current = setTimeout(() => setAnchor(null), 180);
  }, [cancelHide]);

  const mentionFrom = (target: EventTarget | null): HTMLElement | null =>
    target instanceof Element
      ? (target.closest('[data-type="mention"]') as HTMLElement | null)
      : null;

  return (
    <div
      className={className}
      onMouseOver={(event) => {
        const mention = mentionFrom(event.target);
        if (!mention) return;
        const id = mention.getAttribute("data-id");
        if (!id) return;
        cancelHide();
        const rect = mention.getBoundingClientRect();
        const left = Math.max(
          8,
          Math.min(rect.left, window.innerWidth - CARD_WIDTH - 8)
        );
        setAnchor({ id, left, top: rect.bottom + 8 });
      }}
      onMouseOut={(event) => {
        if (mentionFrom(event.target)) scheduleHide();
      }}
      onClick={(event) => {
        const mention = mentionFrom(event.target);
        const id = mention?.getAttribute("data-id");
        if (!id) return;
        event.preventDefault();
        router.push(`/entita/${id}`);
      }}
    >
      {children}
      {anchor && (
        <EntityHoverCard
          anchor={anchor}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
          onNavigate={() => router.push(`/entita/${anchor.id}`)}
        />
      )}
    </div>
  );
}

function EntityHoverCard({
  anchor,
  onMouseEnter,
  onMouseLeave,
  onNavigate,
}: {
  anchor: Anchor;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onNavigate: () => void;
}) {
  const { data: entity, isLoading } = useEntity(anchor.id);

  // Entità non leggibile (permessi) o rimossa: nessun riquadro.
  if (!isLoading && !entity) return null;

  const config = entity ? ENTITY_REGISTRY[entity.type] : null;
  const excerpt = entity
    ? entity.chronicle?.contentText || richTextToPlainText(entity.description)
    : "";

  return (
    <div
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onNavigate}
      className="glass fixed z-[90] w-72 cursor-pointer overflow-hidden rounded-xl border border-hairline-strong shadow-2xl"
      style={{ left: anchor.left, top: anchor.top }}
    >
      {isLoading || !entity ? (
        <div className="space-y-2 p-3">
          <Skeleton className="h-4 w-2/3 bg-muted/60" />
          <Skeleton className="h-3 w-full bg-muted/60" />
        </div>
      ) : (
        <div className="flex gap-3 p-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-hairline bg-night/60">
            {entity.imageUrl ? (
              <Image
                src={entity.imageUrl}
                alt={entity.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              config && (
                <span className="grid h-full place-items-center text-gold/40">
                  <config.icon className="size-6" />
                </span>
              )
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading truncate text-sm font-semibold text-foreground">
              {entity.name}
            </p>
            {config && (
              <Badge
                variant="outline"
                className={cn("mt-0.5 text-[10px]", config.badgeClass)}
              >
                {config.label}
              </Badge>
            )}
            {excerpt && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {excerpt}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

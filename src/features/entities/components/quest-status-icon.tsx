import { cn } from "@/lib/utils";

import { QUEST_EVENT_STYLE } from "../registry";

/**
 * Icone di stato delle missioni (arte custom in /public/icons).
 * Mappa decisa con il committente:
 *   AVAILABLE → disponibile · NEXT → in_corso · ACTIVE → attiva
 *   COMPLETED → completata · FAILED → fallita
 * Lo stato SECRET non ha arte dedicata: ricade sull'icona lucide del registro.
 */
const QUEST_STATUS_IMG: Record<string, string> = {
  AVAILABLE: "/icons/disponibile.png",
  NEXT: "/icons/in_corso.png",
  ACTIVE: "/icons/attiva.png",
  COMPLETED: "/icons/completata.png",
  FAILED: "/icons/fallita.png",
  WORLD: "/icons/world.png",
};

/** Renderizza l'icona dello stato quest: PNG custom o fallback lucide (SECRET). */
export function QuestStatusIcon({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const src = status ? QUEST_STATUS_IMG[status] : undefined;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden
        className={cn("object-contain select-none", className)}
        draggable={false}
      />
    );
  }
  const Fallback = status ? QUEST_EVENT_STYLE[status]?.icon : undefined;
  return Fallback ? <Fallback className={className} /> : null;
}

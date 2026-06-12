import { Sparkles, type LucideIcon } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface FantasyImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Icona mostrata quando manca l'immagine. */
  fallbackIcon?: LucideIcon;
  /**
   * Ancoraggio del ritaglio (object-position). Default "top": le copertine
   * mostrano sempre la parte ALTA dell'immagine invece di tagliarla.
   */
  position?: "top" | "center" | "bottom";
}

const POSITION_CLASS = {
  top: "object-top",
  center: "object-center",
  bottom: "object-bottom",
} as const;

/**
 * Immagine con riempimento del contenitore e segnaposto decorativo
 * quando l'URL non è disponibile. Funziona con immagini locali
 * (/public) e con gli URL di Firebase Storage.
 */
export function FantasyImage({
  src,
  alt,
  className,
  sizes,
  priority,
  fallbackIcon: FallbackIcon = Sparkles,
  position = "top",
}: FantasyImageProps) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-night via-card to-background",
          className
        )}
        aria-label={alt}
      >
        <FallbackIcon className="size-8 text-gold/25" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes ?? "(max-width: 768px) 100vw, 33vw"}
        className={cn("object-cover", POSITION_CLASS[position])}
      />
    </div>
  );
}

import { cn } from "@/lib/utils";

/**
 * Crea un componente "icona" a partire da un'immagine statica (PNG/WebP in
 * /public). Espone la stessa interfaccia delle icone lucide ({ className }),
 * così è interscambiabile ovunque venga reso `<Icon className="size-…" />`.
 */
export function imageIcon(src: string) {
  function ImageIcon({ className }: { className?: string }) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden
        draggable={false}
        className={cn("object-contain select-none", className)}
      />
    );
  }
  ImageIcon.displayName = `ImageIcon(${src})`;
  return ImageIcon;
}

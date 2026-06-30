import { ScrollText, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { imageIcon } from "./image-icon";

interface EmptyStateProps {
  icon?: ReturnType<typeof imageIcon> | LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Stato vuoto a tema fantasy, con icona, testo e azione opzionale. */
export function EmptyState({
  icon: Icon = ScrollText,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-gold/20 bg-card/40 px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
        <Icon className="size-6 text-gold" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

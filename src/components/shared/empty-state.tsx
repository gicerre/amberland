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

/** Empty state Obsidian (V3 §8): emblema quieto, titolo Cinzel, molto spazio. */
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
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-hairline-strong bg-surface-1/50 px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-hairline bg-surface-2">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-parchment">
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

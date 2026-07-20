import { cn } from "@/lib/utils"

/**
 * Skeleton Obsidian (V3 §8): pulse lento di luminanza tra surface-1 e
 * surface-2 — niente shimmer, niente pattern. Base unica dell'app.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-[ink-dry_2.4s_ease-in-out_infinite] rounded-lg bg-surface-2",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-gold/40 bg-gradient-to-b from-gold to-gold-dark text-[#180e02] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] [a]:hover:from-gold-bright",
        secondary:
          "border-iron-mid/60 bg-stone-highlight/70 text-secondary-foreground [a]:hover:bg-stone-highlight",
        destructive:
          "border-crimson-bright/50 bg-crimson/20 text-red-300 focus-visible:ring-destructive/30 [a]:hover:bg-crimson/30",
        outline:
          "border-gold/30 bg-black/20 text-foreground/90 [a]:hover:border-gold/55 [a]:hover:text-foreground",
        ghost:
          "hover:bg-stone-highlight/60 hover:text-foreground",
        link: "text-gold underline-offset-4 hover:underline hover:text-gold-bright",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

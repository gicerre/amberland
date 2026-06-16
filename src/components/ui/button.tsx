import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-gold/90 to-gold border-gold/40 text-[#181102] text-[0.78rem] font-heading font-bold tracking-[0.08em] uppercase shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-gold-bright hover:to-gold hover:border-gold-bright/60 hover:shadow-[0_0_18px_rgba(201,162,39,0.4),0_2px_8px_rgba(0,0,0,0.4)]",
        outline:
          "border-gold/28 bg-stone-surface/50 text-foreground/85 text-sm hover:bg-stone-highlight/70 hover:border-gold/50 hover:text-foreground aria-expanded:bg-stone-highlight aria-expanded:border-gold/40",
        secondary:
          "bg-stone-surface border-iron-dark text-foreground/80 text-sm hover:bg-stone-highlight hover:border-iron-mid hover:text-foreground aria-expanded:bg-stone-highlight",
        ghost:
          "text-sm hover:bg-stone-highlight/60 hover:text-foreground aria-expanded:bg-stone-highlight/60",
        destructive:
          "border-crimson/40 bg-crimson/10 text-red-300 text-sm hover:bg-crimson/20 hover:border-crimson/60 hover:text-red-200 focus-visible:ring-crimson/50",
        link: "text-gold underline-offset-4 hover:underline hover:text-gold-bright text-sm",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.78rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-2 px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

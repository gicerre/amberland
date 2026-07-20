import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border border-l-[3px] px-3.5 py-2.5 text-left text-sm shadow-[0_6px_22px_-10px_rgba(0,0,0,0.7)] has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-hairline-strong border-l-gold bg-card/80 text-card-foreground *:[svg]:text-gold",
        destructive:
          "border-crimson/30 border-l-crimson-bright bg-crimson/10 text-red-200 *:data-[slot=alert-description]:text-red-200/80 *:[svg]:text-crimson-bright",
        success:
          "border-emerald/30 border-l-emerald-bright bg-emerald-deep/40 text-emerald-bright *:data-[slot=alert-description]:text-emerald-bright/80",
        warning:
          "border-amber/30 border-l-amber-bright bg-amber-deep/25 text-amber-bright *:data-[slot=alert-description]:text-amber-bright/80",
        info:
          "border-arcane-bright/30 border-l-arcane-bright bg-arcane-blue/30 text-foreground *:[svg]:text-arcane-bright",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }

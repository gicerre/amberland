"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-gold/35 bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.55)] transition-all outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-gold/60 focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 data-checked:border-gold data-checked:bg-gradient-to-b data-checked:from-gold-bright data-checked:to-gold data-checked:text-[#180e02] data-checked:shadow-[0_0_10px_rgba(200,167,93,0.40),inset_0_1px_0_rgba(255,255,255,0.30)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none data-checked:animate-[scale-in_140ms_cubic-bezier(0.16,1,0.3,1)] [&>svg]:size-3.5 [&>svg]:stroke-[3]"
      >
        <CheckIcon
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }

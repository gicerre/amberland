"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-hairline-strong transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] data-unchecked:bg-black/55 data-unchecked:shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] data-checked:border-gold/50 data-checked:bg-gradient-to-r data-checked:from-gold/75 data-checked:to-gold data-checked:shadow-[0_0_12px_rgba(200,167,93,0.35),inset_0_1px_0_rgba(255,255,255,0.20)] data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-gradient-to-b from-parchment to-parchment-dark shadow-[0_1px_2px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.4)] ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 data-checked:from-[#fff4d0] data-checked:to-gold-light"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }

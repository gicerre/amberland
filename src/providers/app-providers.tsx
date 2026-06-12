"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { useState } from "react";

import { LightboxProvider } from "@/components/shared/lightbox";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/auth-provider";

/**
 * Provider globali dell'applicazione: React Query, autenticazione,
 * configurazione animazioni e tooltip.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <TooltipProvider delayDuration={200}>
            <LightboxProvider>{children}</LightboxProvider>
          </TooltipProvider>
        </MotionConfig>
      </AuthProvider>
    </QueryClientProvider>
  );
}

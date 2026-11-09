"use client";

import { Suspense } from "react";

import { LoadingScreen } from "@/components/shared/loading-screen";
import { PartyHub } from "@/features/party/components/party-hub";

export default function PartyPage() {
  // PartyHub legge la sezione dall'URL (useSearchParams → Suspense).
  return (
    <Suspense fallback={<LoadingScreen className="min-h-[60svh]" />}>
      <PartyHub />
    </Suspense>
  );
}

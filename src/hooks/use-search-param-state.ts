"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Stato di navigazione nell'URL (?chiave=valore): sopravvive a refresh,
 * blocco schermo e "indietro". Valori non ammessi → fallback.
 * Il componente che lo usa va avvolto in <Suspense> (useSearchParams).
 */
export function useSearchParamState<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[]
): [T, (next: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get(key);
  const value =
    raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;

  const setValue = useCallback(
    (next: T) => {
      const query = new URLSearchParams(params.toString());
      if (next === fallback) query.delete(key);
      else query.set(key, next);
      const search = query.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [fallback, key, params, pathname, router]
  );

  return [value, setValue];
}

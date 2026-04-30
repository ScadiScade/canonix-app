"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
});

/** Generic SWR hook for API data */
export function useApi<T>(url: string | null, opts?: { refreshInterval?: number; revalidateOnFocus?: boolean }) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: opts?.revalidateOnFocus ?? true,
    refreshInterval: opts?.refreshInterval,
    dedupingInterval: 5000,
  });
}

/** Hook for user profile */
export function useProfile() {
  return useApi<{ id: string; name: string; email: string; image: string | null; bio: string | null }>("/api/user");
}

/** Hook for universes list */
export function useUniverses() {
  return useApi<Array<{
    id: string; name: string; slug: string; description: string | null;
    visibility: string; updatedAt: string;
    _count: { entities: number; relations: number };
  }>>("/api/universes");
}

/** Hook for subscription */
export function useSubscription() {
  return useApi<{ plan: string; status: string; currentPeriodEnd: string | null }>("/api/subscription");
}

/** Hook for AI credits */
export function useCredits() {
  return useApi<{ balance: number; totalUsed: number; totalBought: number }>("/api/ai/credits");
}

"use client";

import {
  DehydratedState,
  QueryClient,
  QueryClientProvider,
  dehydrate,
  hydrate,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAppAuth } from "@/components/auth/app-auth-provider";

interface QueryProviderProps {
  children: React.ReactNode;
}

const QUERY_CACHE_STORAGE_KEY = "cosmic-index:rq-cache:v2";
const QUERY_CACHE_MAX_AGE_MS = 30 * 60 * 1000;
const QUERY_CACHE_WRITE_THROTTLE_MS = 750;

function shouldDehydrateUserQuery(query: { queryKey: readonly unknown[]; state: { status: string } }) {
  return query.state.status === "success" && query.queryKey[0] === "user";
}

export function getQueryCacheStorageKey(userId: string | null): string {
  return `${QUERY_CACHE_STORAGE_KEY}:${userId ?? "signed-out"}`;
}

function ScopedQueryProvider({
  children,
  userId,
}: QueryProviderProps & { userId: string | null }) {
  const storageKey = getQueryCacheStorageKey(userId);
  const [queryClient] = useState(
    () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      });

      if (typeof window !== "undefined") {
        try {
          const raw = window.sessionStorage.getItem(storageKey);
          if (!raw) return client;

          const parsed = JSON.parse(raw) as {
            persistedAt?: number;
            state?: DehydratedState;
          };
          const persistedAt = Number(parsed.persistedAt ?? 0);
          if (!persistedAt || Date.now() - persistedAt > QUERY_CACHE_MAX_AGE_MS) {
            window.sessionStorage.removeItem(storageKey);
            return client;
          }

          if (parsed.state) {
            hydrate(client, parsed.state);
          }
        } catch {
          window.sessionStorage.removeItem(storageKey);
        }
      }

      return client;
    }
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: number | undefined;

    const persist = () => {
      try {
        const state = dehydrate(queryClient, {
          shouldDehydrateQuery: shouldDehydrateUserQuery,
          shouldDehydrateMutation: () => false,
        });

        const payload = JSON.stringify({
          persistedAt: Date.now(),
          state,
        });

        window.sessionStorage.setItem(storageKey, payload);
      } catch {
        // Ignore transient storage serialization/quota errors.
      }
    };

    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (timeoutId !== undefined) return;

      timeoutId = window.setTimeout(() => {
        timeoutId = undefined;
        persist();
      }, QUERY_CACHE_WRITE_THROTTLE_MS);
    });

    return () => {
      unsubscribe();
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [queryClient, storageKey]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const auth = useAppAuth();
  const scope = auth.isLoaded ? auth.userId : null;

  return (
    <ScopedQueryProvider key={scope ?? "signed-out"} userId={scope}>
      {children}
    </ScopedQueryProvider>
  );
}

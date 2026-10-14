"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiClientError } from "@/lib/api-client";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 4_000,
            refetchOnWindowFocus: false,
            // Retry transient failures once, but never retry client errors
            // (4xx, e.g. a missing incident) — those will not succeed.
            retry: (failureCount, error) =>
              !(error instanceof ApiClientError && error.status < 500) && failureCount < 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

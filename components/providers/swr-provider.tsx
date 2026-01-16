"use client";

import { SWRConfig } from "swr";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 30000,
        errorRetryCount: 2,
        keepPreviousData: true,
        provider: () => new Map(), // Use in-memory cache
      }}
    >
      {children}
    </SWRConfig>
  );
}


'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,                 // Don't keep data in memory (always fresh for dApp)
        staleTime: 0,              // Data is always stale (refetch immediately)
        refetchOnWindowFocus: true, // Refetch when user returns to tab
        refetchOnReconnect: true,  // Refetch when reconnect
        retry: 3,                   // Retry failed queries 3 times
      },
    },
  }));

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

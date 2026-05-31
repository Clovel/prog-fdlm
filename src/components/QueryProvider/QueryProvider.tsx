'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Module imports -------------------------------------- */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/* QueryProvider component prop types ------------------ */
interface QueryProviderProps {
  children: React.ReactNode;
}

/* QueryProvider component ----------------------------- */
const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  const [client] = useState<QueryClient>(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
};

/* Export QueryProvider component ---------------------- */
export default QueryProvider;

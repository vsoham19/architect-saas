'use client';

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useDBStore } from '../store/dbStore';
import { useThemeStore } from '../store/themeStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const initializeDB = useDBStore((state) => state.initializeDB);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);

  useEffect(() => {
    // Run initializations in browser
    initializeTheme();
    initializeDB();
    initializeAuth();
  }, [initializeAuth, initializeDB, initializeTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

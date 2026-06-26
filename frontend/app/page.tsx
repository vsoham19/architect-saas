'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export default function RootPage() {
  const router = useRouter();
  const { currentUser, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized) {
      if (currentUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, isInitialized, router]);

  // Loading skeleton during redirect evaluation
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFAFA] text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
        <p className="text-muted-foreground text-xs font-mono tracking-wider uppercase animate-pulse motion-reduce:animate-none">
          Verifying Workspace Session...
        </p>
      </div>
    </div>
  );
}

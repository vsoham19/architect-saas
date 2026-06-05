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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-xs font-mono tracking-wider uppercase animate-pulse">
          Verifying Workspace Session...
        </p>
      </div>
    </div>
  );
}

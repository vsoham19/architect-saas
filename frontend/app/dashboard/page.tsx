'use client';

import React from 'react';
import { useAuthStore } from '../../store/authStore';
import PrincipalDashboard from '../../features/dashboard/PrincipalDashboard';
import SeniorDashboard from '../../features/dashboard/SeniorDashboard';
import JuniorDashboard from '../../features/dashboard/JuniorDashboard';
import AdminDashboard from '../../features/dashboard/AdminDashboard';

export default function DashboardPage() {
  const { currentRole } = useAuthStore();

  switch (currentRole) {
    case 'principal':
      return <PrincipalDashboard />;
    case 'senior':
      return <SeniorDashboard />;
    case 'junior':
      return <JuniorDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-muted-foreground text-xs font-mono">Loading Role Workspace...</p>
        </div>
      );
  }
}

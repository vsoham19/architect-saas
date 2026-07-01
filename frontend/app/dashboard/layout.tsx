'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useDBStore } from '../../store/dbStore';
import NotificationCenter from '../../components/NotificationCenter';
import ArchieAssistant from '../../components/ArchieAssistant';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, isInitialized, login, allUsers, currentRole } = useAuthStore();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Click outside to close switcher dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isInitialized && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, isInitialized, router]);

  if (!isInitialized || !currentUser) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-surface-container-low text-on-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-xs font-mono uppercase tracking-wider animate-pulse">
            Loading Workspace Session...
          </p>
        </div>
      </div>
    );
  }

  const handleUserChange = (nextUserId: string) => {
    login(nextUserId);
    setSwitcherOpen(false);
    router.push('/dashboard');
    router.refresh();
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { name: 'Projects', href: '/dashboard/projects', icon: 'architecture' },
    { name: 'Tasks', href: '/dashboard/tasks', icon: 'view_kanban' },
    { name: 'Teams', href: '/dashboard/teams', icon: 'group', roles: ['admin', 'principal', 'senior'] },
    { name: 'Audit Trail', href: '/dashboard/audit', icon: 'history', roles: ['admin', 'principal'] },
    { name: 'Settings', href: '/dashboard/settings', icon: 'settings' },
  ];

  // Filter based on user role
  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(currentRole || '');
  });

  const getRoleTitle = (role: string) => {
    switch (role) {
      case 'principal': return 'Principal Architect';
      case 'senior': return 'Senior Lead';
      case 'junior': return 'Junior Architect';
      case 'admin': return 'System Admin';
      default: return 'Architect';
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleCreateProjectClick = () => {
    router.push('/dashboard/projects?create=true');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-on-surface font-body select-none">
      
      {/* Sidebar Navigation */}
      <aside className="flex flex-col h-full py-6 px-4 bg-surface border-r border-outline-variant w-64 shrink-0 z-50">
        
        {/* Brand/Office Title */}
        <div className="mb-6 px-4">
          <h1 className="font-headline text-headline-sm font-bold text-primary tracking-tight">Studio Alpha</h1>
          <p className="font-sans text-xs text-on-surface-variant font-medium mt-0.5">
            {getRoleTitle(currentRole || 'junior')}
          </p>
        </div>

        {/* Quick Action button in sidebar */}
        {(currentRole === 'principal' || currentRole === 'admin') && (
          <button
            onClick={handleCreateProjectClick}
            className="mx-4 mb-6 bg-primary text-primary-foreground hover:bg-primary/95 py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 duration-150 transition-all font-bold text-xs uppercase tracking-wider shadow-sm cursor-pointer border border-primary/20"
          >
            <span className="material-symbols-outlined text-sm font-bold">add</span>
            New Project
          </button>
        )}

        {/* Main Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-2">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(item.href);
                }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-150 active:scale-98 cursor-pointer ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container font-bold border border-outline-variant/30 shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined text-lg ${isActive ? 'text-primary font-semibold' : 'text-on-surface-variant/80'}`}>
                  {item.icon}
                </span>
                <span className="font-sans text-xs font-semibold tracking-wide">{item.name}</span>
              </a>
            );
          })}
        </nav>

        {/* Sidebar Footer & Interactive Profile Switcher */}
        <div className="mt-auto border-t border-outline-variant pt-4 relative" ref={switcherRef}>
          
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              router.push('/dashboard/settings');
            }}
            className="flex items-center gap-3 px-4 py-2.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded-xl transition-all duration-150 active:scale-98 font-sans text-xs font-semibold mb-2"
          >
            <span className="material-symbols-outlined text-lg text-on-surface-variant/80">contact_support</span>
            <span>Support Helpdesk</span>
          </a>

          {/* Role Switcher Popover List (Appears Above Profile) */}
          {switcherOpen && (
            <div className="absolute bottom-20 left-2 right-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl p-2 z-50 flex flex-col gap-1 max-h-64 overflow-y-auto font-sans text-xs animate-in slide-in-from-bottom-2 duration-150">
              <div className="px-3 py-2 border-b border-outline-variant/40 text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">
                Swap Workspace Persona
              </div>
              {allUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserChange(user.id)}
                  className={`w-full text-left flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface-container-low transition-colors duration-150 cursor-pointer ${
                    user.id === currentUser.id ? 'bg-secondary-container/45 font-bold border border-outline-variant/35' : ''
                  }`}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover border border-outline-variant/40" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center font-bold text-[9px]">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-on-surface truncate font-semibold leading-tight">{user.name}</p>
                    <p className="text-[10px] text-on-surface-variant capitalize truncate">{getRoleTitle(user.role)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* User Profile Action Trigger */}
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-surface-container-high transition-all duration-150 border border-transparent hover:border-outline-variant/40 cursor-pointer active:scale-98 text-left"
          >
            {currentUser.avatar_url ? (
              <div className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant/75 bg-secondary-container shrink-0 shadow-xs">
                <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container border border-outline-variant flex items-center justify-center font-bold font-sans text-xs shrink-0 shadow-xs">
                {getInitials(currentUser.name)}
              </div>
            )}
            <div className="flex-1 min-w-0 font-sans">
              <p className="text-on-surface font-bold text-xs truncate leading-snug">{currentUser.name}</p>
              <p className="text-on-surface-variant text-[10px] font-medium capitalize truncate">{getRoleTitle(currentRole || 'junior')}</p>
            </div>
            <span className="material-symbols-outlined text-sm text-on-surface-variant/80 select-none">
              unfold_more
            </span>
          </button>

        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative blueprint-grid">
        
        {/* Top Header Bar */}
        <header className="flex justify-between items-center px-8 w-full shrink-0 bg-surface-container-lowest h-16 border-b border-outline-variant z-40">
          <div className="flex items-center gap-6 flex-1">
            <h2 className="text-headline-sm font-headline font-bold text-primary shrink-0 leading-none">ArchStudio ERP</h2>
            
            {/* Global Search Bar (pure aesthetic/local filter hook placeholder) */}
            <div className="relative max-w-md w-full ml-4 group hidden md:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 group-focus-within:text-primary transition-colors text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Search projects, blueprints, or workflows..."
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none font-sans text-xs text-on-surface placeholder:text-muted-foreground/50 shadow-xs"
              />
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-4">
            
            {/* Notification Center Popover */}
            <NotificationCenter />

            <button
              onClick={() => router.push('/dashboard/settings')}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all duration-150 cursor-pointer active:opacity-85 border border-transparent hover:border-outline-variant/30"
              title="Settings desk"
            >
              <span className="material-symbols-outlined text-lg">settings</span>
            </button>

            <button
              onClick={() => router.push('/dashboard/settings')}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all duration-150 cursor-pointer active:opacity-85 border border-transparent hover:border-outline-variant/30"
              title="Helpdesk documentation"
            >
              <span className="material-symbols-outlined text-lg">help</span>
            </button>

            <div className="w-px h-5 bg-outline-variant/60 mx-1"></div>

            {/* Quick Action Button (Create Project) */}
            {(currentRole === 'principal' || currentRole === 'admin') && (
              <button
                onClick={handleCreateProjectClick}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-2.5 rounded-xl font-bold font-sans text-xs active:scale-95 duration-150 transition-all shadow-sm border border-primary/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm font-bold">add</span>
                <span>Create Project</span>
              </button>
            )}
          </div>
        </header>

        {/* Dashboard Core Content Screen */}
        <div className="flex-1 overflow-y-auto relative min-h-0 min-w-0">
          <div className="mx-auto max-w-[1440px] px-8 py-8 w-full h-full">
            {children}
          </div>
        </div>

        {/* Floating AI Dashboard Assistant */}
        <ArchieAssistant />

      </main>

    </div>
  );
}
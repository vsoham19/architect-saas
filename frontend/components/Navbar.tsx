'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { useDBStore } from '../store/dbStore';
import NotificationCenter from './NotificationCenter';
import {
  Sparkles, ChevronDown, Award, Shield, Hammer, Wrench, Menu, X, Check,
  LayoutDashboard, FolderKanban, Users, CheckSquare, History, Settings, LogOut
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, login, allUsers, currentUser, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const switcherRef = useRef<HTMLDivElement>(null);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Escape key listener
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleUserChange = (nextUserId: string) => {
    login(nextUserId);
    router.refresh();
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
    { name: 'Teams', href: '/dashboard/teams', icon: Users, roles: ['admin', 'principal', 'senior'] },
    { name: 'Audit Trail', href: '/dashboard/audit', icon: History, roles: ['admin', 'principal'] },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  // Filter based on user role
  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(currentRole || '');
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'principal': return Award;
      case 'senior': return Shield;
      case 'junior': return Hammer;
      case 'admin': return Wrench;
      default: return Wrench;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-teal-600 bg-teal-500/5 border-teal-500/15';
      case 'principal': return 'text-amber-600 bg-amber-500/5 border-amber-500/15';
      case 'senior': return 'text-primary bg-primary/5 border-primary/15';
      case 'junior': return 'text-emerald-600 bg-emerald-500/5 border-emerald-500/15';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getInitialsColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
      case 'principal': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'senior': return 'bg-teal-500/10 text-teal-600 border-teal-500/20'; // slate-blue theme
      case 'junior': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'; // neutral gray
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    const search = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search) ||
      u.role.toLowerCase().includes(search)
    );
  });

  const switcherGroups = [
    {
      id: 'you',
      label: 'You',
      users: filteredUsers.filter((u) => u.id === currentUser?.id),
    },
    {
      id: 'admin',
      label: 'Admin',
      users: filteredUsers.filter((u) => u.role === 'admin' && u.id !== currentUser?.id),
    },
    {
      id: 'principal',
      label: 'Principal',
      users: filteredUsers.filter((u) => u.role === 'principal' && u.id !== currentUser?.id),
    },
    {
      id: 'senior',
      label: 'Senior Lead',
      users: filteredUsers.filter((u) => u.role === 'senior' && u.id !== currentUser?.id),
    },
    {
      id: 'junior',
      label: 'Junior Architect',
      users: filteredUsers.filter((u) => u.role === 'junior' && u.id !== currentUser?.id),
    },
  ].filter((g) => g.users.length > 0);

  const RoleIcon = getRoleIcon(currentRole || '');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-md select-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Brand logo */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 font-black text-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm border border-primary/60">
                <span className="text-sm font-black text-primary-foreground font-mono">S</span>
              </div>
              <span className="text-sm tracking-wider font-extrabold font-mono uppercase text-foreground">
                SAAS <span className="font-light text-muted-foreground">ERP</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {filteredNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-[0.97] ${isActive
                      ? 'bg-accent text-accent-foreground border border-primary/30 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
                      }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            {/* Subtle vertical separator */}
            <div className="hidden md:block h-6 w-px bg-border/60 mx-1" />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* User Profile Switcher Dropdown */}
            <div className="relative" ref={switcherRef}>
              <button
                onClick={() => setSwitcherOpen(!switcherOpen)}
                aria-haspopup="listbox"
                aria-expanded={switcherOpen}
                aria-label="Switch user"
                className="flex items-center justify-between gap-3 px-3 py-1.5 bg-secondary border border-border rounded-lg hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring transition-all text-left cursor-pointer"
              >
                <div className="flex flex-col pr-1 select-none">
                  <span className="text-[11px] font-bold text-foreground leading-tight">
                    {currentUser?.name}
                  </span>
                  <span className="text-[9px] font-bold text-teal-600 uppercase tracking-wider leading-none mt-0.5">
                    {currentUser?.role}
                  </span>
                </div>
                <ChevronDown size={12} className="text-muted-foreground shrink-0" />
              </button>

              {switcherOpen && (
                <div className="absolute right-0 mt-2 z-50 w-80 rounded-xl border border-border bg-popover p-2 shadow-lg flex flex-col gap-1.5">
                  {/* Search field */}
                  <div className="px-1 py-1">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full text-[11px] bg-muted border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/70"
                      autoFocus
                    />
                  </div>

                  {/* Scrollable list of groups */}
                  <div className="max-h-60 overflow-y-auto pr-0.5 flex flex-col gap-2">
                    {switcherGroups.length === 0 ? (
                      <div className="text-[10px] text-muted-foreground text-center py-4 font-medium">
                        No users found
                      </div>
                    ) : (
                      switcherGroups.map((group) => (
                        <div key={group.id} className="flex flex-col gap-1">
                          <div className="px-2.5 py-0.5 text-[8px] font-bold tracking-widest text-muted-foreground uppercase">
                            {group.label}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {group.users.map((u) => {
                              const isSelected = u.id === currentUser?.id;
                              return (
                                <button
                                  key={u.id}
                                  onClick={() => {
                                    handleUserChange(u.id);
                                    setSwitcherOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${isSelected
                                      ? 'bg-teal-500/10 hover:bg-teal-500/15'
                                      : 'hover:bg-secondary'
                                    }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 border ${getInitialsColor(u.role)}`}>
                                      {getInitials(u.name)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[11px] font-bold text-foreground truncate">
                                        {u.name}
                                      </span>
                                      <span className="text-[9px] text-muted-foreground truncate leading-none mt-0.5">
                                        {u.email}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider ${getRoleColor(u.role)}`}>
                                      {u.role}
                                    </span>
                                    {isSelected && (
                                      <Check size={12} className="text-teal-600 shrink-0" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <NotificationCenter />

            {/* Profile Dropdown */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-label="User profile menu"
                  className="flex items-center justify-center p-1.5 rounded-full border border-border hover:bg-secondary cursor-pointer transition-all active:scale-95 focus:outline-none"
                >
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.name}
                      className="h-8 w-8 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[11px] font-bold">
                      {currentUser.name[0]}
                    </div>
                  )}
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 z-40 w-56 rounded-xl border border-border bg-popover p-2 shadow-lg">
                      <div className="px-3 py-2 border-b border-border mb-1">
                        <p className="text-xs font-bold text-popover-foreground">{currentUser.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{currentUser.email}</p>
                        <div className="mt-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-semibold border ${getRoleColor(currentRole || '')}`}>
                            <RoleIcon size={8} />
                            {currentRole?.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold uppercase text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-all active:scale-95"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
              >
                <item.icon size={16} />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
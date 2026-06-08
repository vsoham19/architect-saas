'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { useDBStore } from '../store/dbStore';
import NotificationCenter from './NotificationCenter';
import { 
  Sparkles, ChevronDown, Award, Shield, Hammer, Wrench, Menu, X,
  LayoutDashboard, FolderKanban, Users, CheckSquare, History, Settings, LogOut
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, login, allUsers, currentUser, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextUserId = e.target.value;
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
      default: return Wrench;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'principal': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'senior': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      case 'junior': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const RoleIcon = getRoleIcon(currentRole || '');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md select-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Brand logo */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 font-black text-slate-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-sm border border-blue-700">
                <span className="text-sm font-black text-white font-mono">S</span>
              </div>
              <span className="text-sm tracking-wider font-extrabold font-mono uppercase text-slate-900">
                SAAS <span className="font-light text-slate-500">ERP</span>
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
                    className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-150 ${
                      isActive
                        ? 'bg-[#0f172a] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* User Profile Switcher Dropdown */}
            <div className="relative flex items-center">
              <select
                value={currentUser?.id || ''}
                onChange={handleUserChange}
                className="text-xs font-bold bg-[#f1f5f9] border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 hover:bg-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer text-slate-700"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.role.toUpperCase()}: {u.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 pointer-events-none text-slate-500">
                <ChevronDown size={12} />
              </div>
            </div>

            {/* Notifications Bell */}
            <NotificationCenter />

            {/* Profile Dropdown */}
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1 rounded-full border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors focus:outline-none"
                >
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.name}
                      className="h-7 w-7 rounded-full object-cover border border-slate-100"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold">
                      {currentUser.name[0]}
                    </div>
                  )}
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 z-40 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                      <div className="px-3 py-2 border-b border-slate-100 mb-1">
                        <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                        <div className="mt-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-semibold border ${getRoleColor(currentRole || '')}`}>
                            <RoleIcon size={8} />
                            {currentRole?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold uppercase text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
              className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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

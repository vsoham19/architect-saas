'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, FolderKanban, Users, CheckSquare, 
  History, Settings, LogOut, Shield, ChevronLeft, ChevronRight, Award, Hammer, Wrench
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, currentRole } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
    { name: 'Team Roster', href: '/dashboard/teams', icon: Users, roles: ['admin', 'principal', 'senior'] },
    { name: 'Task Board', href: '/dashboard/tasks', icon: CheckSquare },
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
      case 'principal': return 'text-amber-700 bg-amber-500/5 border-amber-500/20';
      case 'senior': return 'text-indigo-700 bg-indigo-500/5 border-indigo-500/20';
      case 'junior': return 'text-teal-700 bg-teal-500/5 border-teal-500/20';
      default: return 'text-slate-600 bg-slate-500/5 border-slate-500/20';
    }
  };

  const RoleIcon = getRoleIcon(currentRole || '');

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 flex flex-col border-r border-border bg-card text-foreground transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 font-black text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-md">
            <span className="text-sm text-white">A</span>
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-md tracking-wider text-foreground font-black uppercase"
            >
              AURA ERP
            </motion.span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'hover:bg-secondary hover:text-foreground text-muted-foreground'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Profile / Bottom actions */}
      <div className="border-t border-border p-4">
        {currentUser && (
          <div className="mb-4">
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-2 rounded-xl bg-secondary/40 border border-border/80`}>
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="h-8 w-8 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                  {currentUser.name[0]}
                </div>
              )}
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{currentUser.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.25 rounded text-[8px] font-semibold border ${getRoleColor(currentRole || '')}`}>
                      <RoleIcon size={8} />
                      {currentRole}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold uppercase text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-all duration-150 cursor-pointer"
        >
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

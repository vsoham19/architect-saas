'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDBStore } from '../store/dbStore';
import { useAuthStore } from '../store/authStore';
import { Bell, Check, CircleAlert, FileClock, ClipboardList, Info, Trash2 } from 'lucide-react';
import { NotificationType } from '../types';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useDBStore();

  const userNotifications = notifications.filter(n => n.user_id === currentUser?.id);
  const unreadCount = userNotifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotifIcon = (type: NotificationType) => {
    switch (type) {
      case 'approval_required':
        return <CircleAlert size={16} className="text-amber-500" />;
      case 'peer_change':
        return <FileClock size={16} className="text-indigo-400" />;
      case 'task_updated':
        return <ClipboardList size={16} className="text-teal-400" />;
      default:
        return <Info size={16} className="text-purple-400" />;
    }
  };

  const handleNotificationClick = (n: any) => {
    markNotificationRead(n.id);
    setIsOpen(false);

    // Dynamic routing based on metadata
    if (n.metadata?.document_id) {
      router.push(`/dashboard/workspace/${n.metadata.document_id}?version=${n.metadata.version_id || ''}`);
    } else if (n.metadata?.task_id) {
      router.push(`/dashboard/tasks`);
    } else if (n.metadata?.project_id) {
      router.push(`/dashboard/projects/${n.metadata.project_id}`);
    } else {
      router.push('/dashboard');
    }
  };

  const getRelativeTime = (isoString: string) => {
    const now = new Date();
    const date = new Date(isoString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-2xl border border-border bg-card shadow-xl z-30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => currentUser && markAllNotificationsRead(currentUser.id)}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
            {userNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <Bell size={24} className="mx-auto text-slate-600 mb-2 opacity-50" />
                No notifications yet.
              </div>
            ) : (
              userNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 flex gap-3 cursor-pointer hover:bg-secondary/40 transition-colors ${
                    !n.read ? 'bg-indigo-500/5' : ''
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    <div className="h-8 w-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center">
                      {getNotifIcon(n.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-xs truncate ${!n.read ? 'font-bold text-foreground' : 'text-slate-400'}`}>
                        {n.title}
                      </p>
                      <span className="text-[9px] text-slate-500 flex-shrink-0">
                        {getRelativeTime(n.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="self-center flex-shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

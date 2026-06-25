'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDBStore } from '../store/dbStore';
import { useAuthStore } from '../store/authStore';
import { Bell, Check, CircleAlert, FileClock, ClipboardList, Info } from 'lucide-react';
import { NotificationType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

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
        return <CircleAlert size={13} className="text-[#92400E]" />;
      case 'peer_change':
        return <FileClock size={13} className="text-teal-600" />;
      case 'task_updated':
        return <ClipboardList size={13} className="text-[#166534]" />;
      default:
        return <Info size={13} className="text-[#52525B]" />;
    }
  };

  const getNotifIconBg = (type: NotificationType) => {
    switch (type) {
      case 'approval_required': return 'bg-[#FFFBEB] border-[#FDE68A]';
      case 'peer_change':       return 'bg-teal-50 border-teal-100';
      case 'task_updated':      return 'bg-[#F0FDF4] border-[#BBF7D0]';
      default:                  return 'bg-[#FAFAFA] border-[#E4E4E7]';
    }
  };

  const handleNotificationClick = (n: any) => {
    markNotificationRead(n.id);
    setIsOpen(false);
    if (n.metadata?.document_id) {
      router.push(`/dashboard/workspace/${n.metadata.document_id}?version=${n.metadata.version_id || ''}`);
    } else if (n.metadata?.task_id) {
      router.push('/dashboard/tasks');
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

      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className={`relative p-2 rounded-lg border transition-colors cursor-pointer ${
          isOpen
            ? 'bg-[#F5F5F5] border-[#D4D4D8] text-[#09090B]'
            : 'bg-white border-[#E4E4E7] text-[#71717A] hover:text-[#09090B] hover:bg-[#F5F5F5]'
        }`}
      >
        <Bell size={16} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-white tabular-nums">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-1.5 w-[340px] md:w-[360px] rounded-xl border border-[#E4E4E7] bg-white shadow-lg shadow-black/[0.06] overflow-hidden z-50 origin-top-right"
          >

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#F5F5F5]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#09090B]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary text-[9px] font-medium text-white tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => currentUser && markAllNotificationsRead(currentUser.id)}
                  className="flex items-center gap-1 text-xs text-[#71717A] hover:text-[#09090B] transition-colors cursor-pointer"
                >
                  <Check size={11} />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto">
              {userNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center">
                  <Bell size={20} className="text-[#D4D4D8]" />
                  <p className="text-sm font-medium text-[#09090B]">All caught up</p>
                  <p className="text-xs text-[#71717A] max-w-[200px] leading-relaxed">
                    Approval requests and system notifications will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#F5F5F5]">
                  {userNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[#FAFAFA] ${
                        !n.read ? 'border-l-2 border-primary bg-primary/5' : 'border-l-2 border-transparent'
                      }`}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`h-6 w-6 rounded-md border flex items-center justify-center ${getNotifIconBg(n.type)}`}>
                          {getNotifIcon(n.type)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <p className={`text-xs leading-snug truncate ${!n.read ? 'font-medium text-[#09090B]' : 'text-[#52525B]'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-[#A1A1AA] flex-shrink-0 mt-px">
                            {getRelativeTime(n.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#71717A] line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!n.read && (
                        <div className="self-center flex-shrink-0">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {userNotifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-[#F5F5F5]">
                <p className="text-[10px] text-[#A1A1AA] text-center">
                  {userNotifications.length} total · {unreadCount} unread
                </p>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
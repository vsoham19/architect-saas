'use client';

import React from 'react';
import { useDBStore } from '../../../store/dbStore';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { 
  Settings as SettingsIcon, ShieldAlert, RefreshCcw, 
  Database, Sun, Users, Shield, Loader2, Check
} from 'lucide-react';

export default function SettingsPage() {
  const { currentRole, currentUser, allUsers, updateUserRole } = useAuthStore();
  const db = useDBStore();
  const [updatingUserId, setUpdatingUserId] = React.useState<string | null>(null);
  const [successUserId, setSuccessUserId] = React.useState<string | null>(null);

  const handleResetSandbox = () => {
    if (confirm("Reset the entire ERP sandbox back to default relational mock seed data?")) {
      localStorage.removeItem('erp_db_state');
      localStorage.removeItem('auth_user_id');
      window.location.reload();
    }
  };

  const handleRoleChange = async (userId: string, newRole: any) => {
    setUpdatingUserId(userId);
    const success = await updateUserRole(userId, newRole);
    setUpdatingUserId(null);
    if (success) {
      setSuccessUserId(userId);
      setTimeout(() => {
        setSuccessUserId(null);
      }, 2000);
    } else {
      alert("Failed to update user role.");
    }
  };

  return (
    <div className="space-y-8 select-none font-sans pb-12">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 font-mono uppercase">
          <SettingsIcon className="text-slate-500" />
          System Settings & Control
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure workspace settings and manage system users.
        </p>
      </div>

      {/* Admin Section: User Directory & Access Control */}
      {currentRole === 'admin' ? (
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
              <Shield size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-mono">User Directory & Access Control</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage system roles for all registered users. Changes are saved and applied instantly.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="p-3.5 font-bold">User</th>
                  <th className="p-3.5 font-bold">Email</th>
                  <th className="p-3.5 font-bold">System Role</th>
                  <th className="p-3.5 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {allUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3.5 flex items-center gap-2.5">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="h-7 w-7 rounded-full object-cover border border-slate-100" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-550">
                          {user.name[0]}
                        </div>
                      )}
                      <div>
                        <span className="block font-bold text-slate-900">{user.name}</span>
                        {currentUser?.id === user.id && (
                          <span className="inline-block text-[8px] bg-slate-900 text-white font-mono uppercase px-1 py-0.2 rounded-sm mt-0.5">You</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">{user.email}</td>
                    <td className="p-3.5">
                      {currentUser?.id === user.id ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-slate-850 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg w-max select-none font-mono">
                            {user.role.toUpperCase()}
                          </span>
                          <span className="text-[9px] text-amber-650 font-mono font-bold uppercase">(Cannot modify own role)</span>
                        </div>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                          disabled={updatingUserId === user.id}
                          className="text-xs font-bold bg-[#f1f5f9] border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-slate-700 disabled:opacity-55"
                        >
                          <option value="admin">ADMIN</option>
                          <option value="principal">PRINCIPAL</option>
                          <option value="senior">SENIOR</option>
                          <option value="junior">JUNIOR</option>
                        </select>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {updatingUserId === user.id ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 font-bold uppercase">
                          <Loader2 size={10} className="animate-spin text-slate-500" />
                          Saving
                        </span>
                      ) : successUserId === user.id ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 font-bold uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 animate-pulse">
                          <Check size={10} />
                          Saved
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-300 font-bold uppercase">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <ShieldAlert size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Access Restricted</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                User role management and directory access are strictly limited to Administrator accounts.
              </p>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-400 font-bold uppercase border border-slate-200 bg-white px-2.5 py-1 rounded">
            Role: {currentRole?.toUpperCase()}
          </div>
        </div>
      )}

      {/* Grid: Preferences + Diagnostic counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Layout Preferences */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
          <h3 className="text-sm font-black uppercase font-mono tracking-wider text-slate-800">Theme & Interface Settings</h3>

          <div className="space-y-4 text-xs font-semibold">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-850">Color Mode</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">Custom architectural light styling.</span>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
                <Sun size={14} className="text-blue-600 animate-spin-slow" />
                <span>CAD Light (Forced)</span>
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <span className="block text-xs font-bold text-slate-850">Sandbox Reset Key</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">Re-seed mock database from scratch.</span>
              </div>

              <button
                onClick={handleResetSandbox}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-xs font-bold text-rose-700 cursor-pointer transition-colors shadow-xs"
              >
                <RefreshCcw size={13} />
                <span>Reset Sandbox</span>
              </button>
            </div>
          </div>
        </div>

        {/* Database Diagnostic counts */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
          <h3 className="text-sm font-black uppercase font-mono tracking-wider text-slate-800">Sandbox Diagnostics HUD</h3>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-[9px] uppercase text-slate-400 font-mono">Projects Count</span>
                <span className="block mt-0.5 font-bold text-slate-800">{db.projects.length}</span>
              </div>
              <Database size={16} className="text-indigo-600" />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-[9px] uppercase text-slate-400 font-mono">Tasks Count</span>
                <span className="block mt-0.5 font-bold text-slate-800">{db.tasks.length}</span>
              </div>
              <Database size={16} className="text-emerald-600" />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-[9px] uppercase text-slate-400 font-mono">Audit Logs</span>
                <span className="block mt-0.5 font-bold text-slate-800">{db.auditLogs.length}</span>
              </div>
              <Database size={16} className="text-purple-600" />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-[9px] uppercase text-slate-400 font-mono">Notifications</span>
                <span className="block mt-0.5 font-bold text-slate-800">{db.notifications.length}</span>
              </div>
              <Database size={16} className="text-rose-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

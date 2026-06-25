'use client';

import React from 'react';
import { useDBStore } from '../../../store/dbStore';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { 
  Settings as SettingsIcon, ShieldAlert, RefreshCcw, 
  Database, Sun, Users, Shield, Loader2, Check, ChevronDown
} from 'lucide-react';
import CustomSelect from '../../../components/CustomSelect';

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
      <div className="pb-6 border-b border-border">
        <h1 className="text-2xl font-extrabold flex items-center gap-2 text-foreground">
          <SettingsIcon className="text-muted-foreground" />
          System Settings & Control
        </h1>
        <p className="text-muted-foreground text-xs mt-1">
          Configure workspace settings and manage system users.
        </p>
      </div>

      {/* Admin Section: User Directory & Access Control */}
      {currentRole === 'admin' ? (
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-foreground">
              <Shield size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">User Directory & Access Control</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage system roles for all registered users. Changes are saved and applied instantly.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-secondary/40 border-b border-border text-muted-foreground font-mono uppercase text-[10px]">
                  <th className="p-3.5 font-bold">User</th>
                  <th className="p-3.5 font-bold">Email</th>
                  <th className="p-3.5 font-bold">System Role</th>
                  <th className="p-3.5 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-semibold text-foreground">
                {allUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="p-3.5 flex items-center gap-2.5">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="h-7 w-7 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {user.name[0]}
                        </div>
                      )}
                      <div>
                        <span className="block font-bold text-foreground">{user.name}</span>
                        {currentUser?.id === user.id && (
                          <span className="inline-block text-[8px] bg-primary text-primary-foreground font-mono uppercase px-1 py-0.2 rounded-sm mt-0.5">You</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-muted-foreground font-mono text-[11px]">{user.email}</td>
                    <td className="p-3.5">
                      {currentUser?.id === user.id ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-foreground bg-muted border border-border px-2.5 py-1 rounded-lg w-max select-none font-mono">
                            {user.role.toUpperCase()}
                          </span>
                          <span className="text-[9px] text-amber-400 font-mono font-bold uppercase">(Cannot modify own role)</span>
                        </div>
                      ) : (
                        <CustomSelect
                          value={user.role}
                          onChange={(value) => handleRoleChange(user.id, value as any)}
                          disabled={updatingUserId === user.id}
                          options={[
                            { value: 'admin', label: 'Admin' },
                            { value: 'principal', label: 'Principal' },
                            { value: 'senior', label: 'Senior Lead' },
                            { value: 'junior', label: 'Junior Architect' },
                          ]}
                          className="w-36"
                        />
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {updatingUserId === user.id ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground font-bold uppercase">
                          <Loader2 size={10} className="animate-spin text-muted-foreground" />
                          Saving
                        </span>
                      ) : successUserId === user.id ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-sans text-emerald-700 font-bold uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 animate-pulse">
                          <Check size={10} />
                          Saved
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-muted-foreground/30 font-bold uppercase">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-border bg-secondary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700">
              <ShieldAlert size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">Access Restricted</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                User role management and directory access are strictly limited to Administrator accounts.
              </p>
            </div>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground font-bold uppercase border border-border bg-secondary px-2.5 py-1 rounded">
            Role: {currentRole?.toUpperCase()}
          </div>
        </div>
      )}

      {/* Grid: Preferences + Diagnostic counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Layout Preferences */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
          <h3 className="text-sm font-extrabold text-foreground">Theme & Interface Settings</h3>

          <div className="space-y-4 text-xs font-semibold">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-foreground">Color Mode</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Custom architectural theme styling.</span>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                <Sun size={14} className="text-primary animate-spin-slow" />
                <span>Glassmorphic Dark (Forced)</span>
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <span className="block text-xs font-bold text-foreground">Sandbox Reset Key</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">Re-seed mock database from scratch.</span>
              </div>

              <button
                onClick={handleResetSandbox}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 text-xs font-bold text-destructive cursor-pointer transition-colors shadow-xs"
              >
                <RefreshCcw size={13} />
                <span>Reset Sandbox</span>
              </button>
            </div>
          </div>
        </div>

        {/* Database Diagnostic counts */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
          <h3 className="text-sm font-extrabold text-foreground">Sandbox Diagnostics HUD</h3>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-foreground">
            <div className="p-3 bg-secondary border border-border rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-[9px] uppercase text-muted-foreground font-mono">Projects Count</span>
                <span className="block mt-0.5 font-bold text-foreground">{db.projects.length}</span>
              </div>
              <Database size={16} className="text-primary" />
            </div>

            <div className="p-3 bg-secondary border border-border rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-[9px] uppercase text-muted-foreground font-mono">Tasks Count</span>
                <span className="block mt-0.5 font-bold text-foreground">{db.tasks.length}</span>
              </div>
              <Database size={16} className="text-emerald-600" />
            </div>

            <div className="p-3 bg-secondary border border-border rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-[9px] uppercase text-muted-foreground font-mono">Audit Logs</span>
                <span className="block mt-0.5 font-bold text-foreground">{db.auditLogs.length}</span>
              </div>
              <Database size={16} className="text-primary" />
            </div>

            <div className="p-3 bg-secondary border border-border rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-[9px] uppercase text-muted-foreground font-mono">Notifications</span>
                <span className="block mt-0.5 font-bold text-foreground">{db.notifications.length}</span>
              </div>
              <Database size={16} className="text-destructive" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

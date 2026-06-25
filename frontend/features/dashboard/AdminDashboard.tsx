'use client';

import React from 'react';
import { useDBStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import {
  Wrench, Users, FolderKanban, ShieldCheck, Database,
  RefreshCcw, Clock, ArrowDownWideNarrow, Search
} from 'lucide-react';

export default function AdminDashboard() {
  const {
    projects, tasks, documents, auditLogs, activityLogs,
    notifications, teamMembers, teams, initializeDB
  } = useDBStore();

  const handleResetSandbox = () => {
    if (confirm("Reset the entire ERP sandbox back to default relational mock seed data?")) {
      localStorage.removeItem('erp_db_state');
      localStorage.removeItem('auth_user_id');
      window.location.reload();
    }
  };

  const statItems = [
    { label: 'Projects', count: projects.length, icon: FolderKanban, color: 'text-primary border-primary/20 bg-primary/5', span: 'col-span-1' },
    { label: 'Tasks', count: tasks.length, icon: ArrowDownWideNarrow, color: 'text-emerald-600 border-emerald-500/20 bg-emerald-500/5', span: 'col-span-1' },
    { label: 'Teams', count: teams.length, icon: Users, color: 'text-teal-600 border-teal-500/20 bg-teal-500/5', span: 'col-span-1' },
    { label: 'Documents', count: documents.length, icon: Database, color: 'text-amber-600 border-amber-500/20 bg-amber-500/5', span: 'col-span-1' },
    { label: 'Notifications', count: notifications.length, icon: Clock, color: 'text-destructive border-destructive/20 bg-destructive/5', span: 'col-span-1' },
    { label: 'Audit Logs', count: auditLogs.length, icon: ShieldCheck, color: '', span: 'col-span-2 sm:col-span-1 lg:col-span-2' }
  ];

  return (
    <div className="space-y-8 select-none font-sans pb-12">
      {/* Header */}
      <div className="pb-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold font-mono text-primary uppercase tracking-widest block mb-1">System Diagnostics</span>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <Wrench className="text-muted-foreground" size={22} />
              System Administration Console
            </h1>
          </div>
          <div>
            <button
              onClick={handleResetSandbox}
              aria-label="Reset sandbox state"
              title="Reset Sandbox Key"
              className="inline-flex items-center justify-center p-2 rounded-xl border border-border/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-all duration-150 cursor-pointer shadow-sm active:scale-95"
            >
              <RefreshCcw size={14} className="motion-reduce:animate-none" />
            </button>
          </div>
        </div>
        <p className="text-muted-foreground text-xs mt-1">
          Diagnostics, data payloads, append-only logs, and sandbox reset keys.
        </p>
      </div>

      {/* Grid of database stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {statItems.map((stat) => {
          const Icon = stat.icon;
          const isAuditLogs = stat.label === 'Audit Logs';
          return (
            <div
              key={stat.label}
              className={`p-4 rounded-xl border flex flex-col justify-between h-28 shadow-md shadow-black/40 transition-all duration-200 ${stat.span} ${isAuditLogs
                  ? 'border-primary/50 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent shadow-lg shadow-primary/10'
                  : stat.color
                }`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-xs font-semibold ${isAuditLogs ? 'text-primary' : 'text-muted-foreground'}`}>
                  {stat.label}
                </span>
                <Icon size={16} className={isAuditLogs ? 'text-primary' : 'text-muted-foreground'} />
              </div>
              <div>
                <h4 className={`font-black mt-2 ${isAuditLogs ? 'text-3xl text-primary' : 'text-2xl'}`}>{stat.count}</h4>
                {isAuditLogs && (
                  <span className="text-[8.5px] font-bold text-muted-foreground/60 block mt-0.5 uppercase tracking-wide">
                    Verifiable Activity Trail
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Audit Trail Section */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-lg shadow-black/50">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-extrabold text-foreground">
              Append-Only Audit Logs Database
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Read-only system activity ledger showing actions and detailed database payloads.
            </p>
          </div>
          <span className="text-[9px] uppercase font-bold tracking-wider px-3 py-1 rounded bg-secondary border border-border text-muted-foreground font-mono">
            Immutable History
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-foreground">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-3 px-4 font-mono uppercase tracking-wider text-[10px]">User</th>
                <th className="py-3 px-4 font-mono uppercase tracking-wider text-[10px]">Action</th>
                <th className="py-3 px-4 font-mono uppercase tracking-wider text-[10px]">Target Entity</th>
                <th className="py-3 px-4 font-mono uppercase tracking-wider text-[10px]">Entity ID</th>
                <th className="py-3 px-4 font-mono uppercase tracking-wider text-[10px]">Timestamp</th>
                <th className="py-3 px-4 text-right font-mono uppercase tracking-wider text-[10px]">Details Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs font-mono">
                    No activity logs recorded in this sandbox yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const user = useAuthStore.getState().allUsers.find(u => u.id === log.user_id);
                  return (
                    <tr key={log.id} className="border-b border-border/40">
                      <td className="py-3.5 px-4 font-bold text-foreground">{user?.name || log.user_id}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-secondary border border-border text-muted-foreground">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 uppercase text-muted-foreground text-[10px] font-mono">{log.entity_type}</td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-muted-foreground">{log.entity_id}</td>
                      <td className="py-3.5 px-4 text-muted-foreground font-medium">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right relative">
                        <details className="inline-block text-left cursor-pointer">
                          <summary className="text-[10px] text-primary hover:underline font-bold px-2 py-1 inline-block active:scale-95 transition-transform">Inspect JSON</summary>
                          <pre className="absolute right-0 mt-2 p-4 rounded-xl border border-border bg-popover text-popover-foreground text-[10px] font-mono shadow-xl z-20 max-w-sm max-h-48 overflow-y-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

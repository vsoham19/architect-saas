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
    { label: 'Projects', count: projects.length, icon: FolderKanban, color: 'text-indigo-700 border-indigo-200 bg-indigo-50' },
    { label: 'Tasks', count: tasks.length, icon: ArrowDownWideNarrow, color: 'text-emerald-700 border-emerald-250 bg-emerald-50' },
    { label: 'Teams', count: teams.length, icon: Users, color: 'text-purple-700 border-purple-200 bg-purple-50' },
    { label: 'Documents', count: documents.length, icon: Database, color: 'text-amber-700 border-amber-250 bg-amber-50' },
    { label: 'Notifications', count: notifications.length, icon: Clock, color: 'text-rose-700 border-rose-250 bg-rose-50' },
    { label: 'Audit Logs', count: auditLogs.length, icon: ShieldCheck, color: 'text-blue-700 border-blue-200 bg-blue-50' }
  ];

  return (
    <div className="space-y-8 select-none font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-[#0f172a] font-mono uppercase">
            <Wrench className="text-slate-500" />
            SYSTEM ADMINISTRATION CONSOLE
          </h1>
          <p className="text-slate-500 text-sm">
            Diagnostics, data payloads, append-only logs, and sandbox reset keys.
          </p>
        </div>
        <button
          onClick={handleResetSandbox}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-md cursor-pointer text-xs uppercase tracking-wider"
        >
          <RefreshCcw size={14} />
          Reset Sandbox State
        </button>
      </div>

      {/* Grid of database stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statItems.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`p-4 rounded-xl border flex flex-col justify-between h-28 ${stat.color}`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-85">{stat.label}</span>
                <Icon size={16} />
              </div>
              <h4 className="text-2xl font-black mt-2">{stat.count}</h4>
            </div>
          );
        })}
      </div>

      {/* Audit Trail Section */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider font-mono">
              Append-Only Audit Logs Database
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Read-only system activity ledger showing actions and detailed database payloads.
            </p>
          </div>
          <span className="text-[9px] uppercase font-bold tracking-wider px-3 py-1 rounded bg-slate-100 border border-slate-200 text-slate-650">
            Immutable History
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="py-3 px-4 font-mono uppercase tracking-wider text-[10px]">User</th>
                <th className="py-3 px-4 font-mono uppercase tracking-wider text-[10px]">Action</th>
                <th className="py-3 px-4 font-mono uppercase tracking-wider text-[10px]">Target Entity</th>
                <th className="py-3 px-4 font-mono uppercase tracking-wider text-[10px]">Entity ID</th>
                <th className="py-3 px-4 font-mono uppercase tracking-wider text-[10px]">Timestamp</th>
                <th className="py-3 px-4 text-right font-mono uppercase tracking-wider text-[10px]">Details Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {auditLogs.map((log) => {
                const user = useAuthStore.getState().allUsers.find(u => u.id === log.user_id);
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{user?.name || log.user_id}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 border border-slate-200 text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 uppercase text-slate-500 text-[10px] font-mono">{log.entity_type}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{log.entity_id}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <details className="inline-block text-left cursor-pointer">
                        <summary className="text-[10px] text-blue-600 hover:underline font-bold">Inspect JSON</summary>
                        <pre className="absolute right-6 mt-2 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-[10px] font-mono shadow-xl z-20 max-w-sm max-h-48 overflow-y-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useDBStore } from '../../../store/dbStore';
import { useAuthStore } from '../../../store/authStore';
import { ShieldCheck, Calendar, Search, FileCode, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuditTrailPage() {
  const { currentRole } = useAuthStore();
  const { auditLogs } = useDBStore();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  // Route protection inside page
  if (currentRole !== 'principal' && currentRole !== 'admin') {
    return (
      <div className="py-20 text-center text-xs font-semibold text-slate-500">
        <ShieldCheck className="mx-auto text-rose-500 mb-2" size={32} />
        Access Denied: You must have Principal or Admin credentials to view the Audit Trail.
      </div>
    );
  }

  // Filter actions
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(search.toLowerCase()) ||
                          log.entity_type.toLowerCase().includes(search.toLowerCase());
    const matchesAction = filterAction === 'all' ? true : log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(auditLogs.map(l => l.action)));

  return (
    <div className="space-y-8 select-none font-sans pb-12">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono uppercase">Immutable Audit Trail</h1>
        <p className="text-slate-500 text-sm mt-1">
          System-wide transaction ledger tracking document approvals, project creations, and drawing locks.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit entity types..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent"
          />
        </div>

        {/* Action Filter */}
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
        >
          <option value="all">All Actions</option>
          {uniqueActions.map(act => (
            <option key={act} value={act}>{act}</option>
          ))}
        </select>
      </div>

      {/* Ledger Board */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider font-mono">Append-Only Database Records</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Immutable records from the Supabase transactional tables.</p>
          </div>
          <span className="text-[9px] uppercase font-bold tracking-wider px-3 py-1 rounded bg-slate-100 border border-slate-200 text-slate-650">
            Verified Schema
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 text-slate-450">
                <th className="py-3.5 px-4 font-mono uppercase tracking-wider text-[10px]">Operator</th>
                <th className="py-3.5 px-4 font-mono uppercase tracking-wider text-[10px]">Action Hook</th>
                <th className="py-3.5 px-4 font-mono uppercase tracking-wider text-[10px]">Entity type</th>
                <th className="py-3.5 px-4 font-mono uppercase tracking-wider text-[10px]">Record ID</th>
                <th className="py-3.5 px-4 font-mono uppercase tracking-wider text-[10px]">Date & Time</th>
                <th className="py-3.5 px-4 text-right font-mono uppercase tracking-wider text-[10px]">Data Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    No matching logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const operator = useAuthStore.getState().allUsers.find(u => u.id === log.user_id);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{operator?.name || log.user_id}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded font-mono text-[9px] bg-slate-100 border border-slate-200 text-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 uppercase text-slate-550 text-[10px] font-mono">{log.entity_type}</td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">{log.entity_id}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <details className="inline-block text-left cursor-pointer">
                          <summary className="text-[10px] text-blue-650 hover:underline font-bold">Inspect JSON</summary>
                          <pre className="absolute right-6 mt-2 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-850 text-[10px] font-mono shadow-xl z-20 max-w-sm max-h-48 overflow-y-auto">
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

'use client';

import React, { useState } from 'react';
import { useDBStore } from '../../../store/dbStore';
import { useAuthStore } from '../../../store/authStore';
import { ShieldCheck, Calendar, Search, FileCode, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import CustomSelect from '../../../components/CustomSelect';

export default function AuditTrailPage() {
  const { currentRole } = useAuthStore();
  const { auditLogs } = useDBStore();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [visibleCount, setVisibleCount] = useState(5);

  // Route protection inside page
  if (currentRole !== 'principal' && currentRole !== 'admin') {
    return (
      <div className="py-20 text-center text-xs font-semibold text-muted-foreground">
        <ShieldCheck className="mx-auto text-destructive mb-2" size={32} />
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
      <div className="pb-6 border-b border-border">
        <h1 className="text-2xl font-extrabold text-foreground">Immutable Audit Trail</h1>
        <p className="text-muted-foreground text-xs mt-1">
          System-wide transaction ledger tracking document approvals, project creations, and drawing locks.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-2xl border border-border bg-card shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(5); }}
            placeholder="Search audit entity types..."
            className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Action Filter */}
        <CustomSelect
          value={filterAction}
          onChange={(value) => { setFilterAction(value); setVisibleCount(5); }}
          options={[
            { value: 'all', label: 'All Actions' },
            ...uniqueActions.map(act => ({ 
              value: act, 
              label: act.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
            }))
          ]}
          className="w-full sm:w-48"
        />
      </div>

      {/* Ledger Board */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-black text-foreground uppercase tracking-wider font-mono">Append-Only Database Records</h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Immutable records from the Supabase transactional tables.</p>
          </div>
          <span className="text-[9px] uppercase font-bold tracking-wider px-3 py-1 rounded bg-secondary border border-border text-muted-foreground">
            Verified Schema
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-foreground">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-3.5 px-4 font-mono uppercase tracking-wider text-[10px]">Operator</th>
                <th className="py-3.5 px-4 font-mono uppercase tracking-wider text-[10px]">Action Hook</th>
                <th className="py-3.5 px-4 font-mono uppercase tracking-wider text-[10px]">Entity type</th>
                <th className="py-3.5 px-4 font-mono uppercase tracking-wider text-[10px]">Record ID</th>
                <th className="py-3.5 px-4 font-mono uppercase tracking-wider text-[10px]">Date & Time</th>
                <th className="py-3.5 px-4 text-right font-mono uppercase tracking-wider text-[10px]">Data Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs">
                    No matching logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, visibleCount).map((log) => {
                  const operator = useAuthStore.getState().allUsers.find(u => u.id === log.user_id);
                  return (
                    <tr key={log.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground">{operator?.name || log.user_id}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded font-mono text-[9px] bg-secondary border border-border text-muted-foreground">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 uppercase text-muted-foreground text-[10px] font-mono">{log.entity_type}</td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-muted-foreground">{log.entity_id}</td>
                      <td className="py-3.5 px-4 text-muted-foreground font-medium">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right relative">
                        <details className="inline-block text-left cursor-pointer">
                          <summary className="text-[10px] text-primary hover:underline font-bold px-2 py-1 inline-block">Inspect JSON</summary>
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

        {filteredLogs.length > visibleCount && (
          <div className="mt-6 flex justify-center border-t border-border/40 pt-4">
            <button
              onClick={() => setVisibleCount(prev => prev + 5)}
              className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold hover:text-primary transition-all text-xs cursor-pointer shadow-sm uppercase tracking-wider"
            >
              Load More Logs (+5)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useDBStore } from '../../../store/dbStore';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { 
  Settings as SettingsIcon, ShieldAlert, Sparkles, RefreshCcw, 
  Database, Moon, Sun, Laptop, ArrowRightLeft, Users, Send 
} from 'lucide-react';

export default function SettingsPage() {
  const { currentRole, currentUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const db = useDBStore();

  const handleResetSandbox = () => {
    if (confirm("Reset the entire ERP sandbox back to default relational mock seed data?")) {
      localStorage.removeItem('erp_db_state');
      localStorage.removeItem('auth_user_id');
      window.location.reload();
    }
  };

  // Workflow Simulation triggers
  const simulateJuniorUpload = () => {
    // Simulate Liam Chen (Junior, u-5) uploading a new HVAC blueprint revision (doc-1)
    db.uploadDocumentVersion({
      projectId: '11111111-1111-1111-1111-111111111111',
      documentName: 'Helix Auditorium Floor Plan.dwg',
      description: 'Main auditorium layout seating configurations.',
      changelog: 'Adjusted HVAC secondary ducts loop routing per structural feedback.',
      fileUrl: '/drawings/helix_auditorium_v3.jpg',
      fileSize: 15200000,
      uploadedBy: '00000000-0000-0000-0000-000000000005' // Liam
    });
    alert("Simulation complete: Liam Chen uploaded Auditorium Plan version 3. Seniors and Principals notified!");
  };

  const simulateSeniorProposal = () => {
    // Find v1.0.0 (vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvv01) and simulate Elena (Senior, u-3) creating a review with 2 proposed changes
    db.addReview({
      versionId: 'vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvv01',
      reviewerId: '00000000-0000-0000-0000-000000000003', // Elena
      comments: 'Duct clearings around fire corridors look narrow. Need to shift cable trays 100mm south.',
      proposedChanges: [
        { description: 'Shift duct cable tray loop 100mm south of fire corridor 2B grid joint.', x: 62.5, y: 55.4 }
      ]
    });
    alert("Simulation complete: Elena Rostova submitted a review on Auditorium Plan v1.0.0 with 1 proposed change. Uploader and Principal notified!");
  };

  const simulateClientRequest = () => {
    // Add activity log and project notification about a client-led project change
    db.addActivityLog({
      project_id: '11111111-1111-1111-1111-111111111111',
      user_id: '00000000-0000-0000-0000-000000000006', // Admin/System
      action: 'client_update',
      details: 'Client requested Helix auditorium seating configuration revisions to increase capacity by 50.'
    });

    db.addNotification({
      user_id: '00000000-0000-0000-0000-000000000001', // Principal
      sender_id: null,
      type: 'project_update',
      title: 'Client request: Helix Project scope change',
      message: 'The client requests Helix auditorium seating capacity expansion. Review Floor plans.',
      metadata: { project_id: '11111111-1111-1111-1111-111111111111' }
    });

    alert("Simulation complete: Client request logged. Principal notified!");
  };

  return (
    <div className="space-y-8 select-none font-sans pb-12">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900 font-mono uppercase">
          <SettingsIcon className="text-slate-500" />
          Settings & Workflows Simulator
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure interface options and test collaborative document loops via mock triggers.
        </p>
      </div>

      {/* Simulator console */}
      <div className="p-6 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-blue-700 uppercase tracking-wider font-mono">Collaboration Sandbox Simulator</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate background actions from other team members to validate notification cascades and activity grids.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Action 1 */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between h-40 shadow-xs">
            <div>
              <span className="text-[10px] font-bold text-blue-700 uppercase font-mono bg-blue-50 px-2 py-0.5 border border-blue-100 rounded">Junior Upload</span>
              <p className="text-xs font-black text-slate-800 mt-2">Liam Chen uploads HVAC Rev 3</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Pushes a drawing to Helix project. Triggers notifications to Principal Sarah and Senior David.
              </p>
            </div>
            <button
              onClick={simulateJuniorUpload}
              className="mt-3 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
              <Send size={10} />
              Trigger Event
            </button>
          </div>

          {/* Action 2 */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between h-40 shadow-xs">
            <div>
              <span className="text-[10px] font-bold text-blue-700 uppercase font-mono bg-blue-50 px-2 py-0.5 border border-blue-100 rounded">Senior Review</span>
              <p className="text-xs font-black text-slate-800 mt-2">Elena reviews Floor Plan v1.1.0</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Elena requests a change on the CAD layout. Alerts uploader Alex and Principal Sarah.
              </p>
            </div>
            <button
              onClick={simulateSeniorProposal}
              className="mt-3 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
              <Send size={10} />
              Trigger Event
            </button>
          </div>

          {/* Action 3 */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between h-40 shadow-xs">
            <div>
              <span className="text-[10px] font-bold text-blue-700 uppercase font-mono bg-blue-50 px-2 py-0.5 border border-blue-100 rounded">Client Request</span>
              <p className="text-xs font-black text-slate-800 mt-2">Client requests seating adjustments</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Appends structural requests to logs. Fires priority notifications to Principal.
              </p>
            </div>
            <button
              onClick={simulateClientRequest}
              className="mt-3 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
              <Send size={10} />
              Trigger Event
            </button>
          </div>
        </div>
      </div>

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

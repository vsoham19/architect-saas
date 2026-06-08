'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDBStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { 
  Plus, Search, ChevronRight, CheckCircle2, Clock, 
  MapPin, Sliders, Info, Eye, Layers
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function PrincipalDashboard() {
  const { currentUser } = useAuthStore();
  const { projects, tasks, teamMembers, documents, activityLogs, createProject, teams } = useDBStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [teamName, setTeamName] = useState('');

  // Greetings logic
  const firstName = currentUser?.name.split(' ')[0] || 'Sarah';
  
  // Documents pending principal approval (status = pending_review)
  const pendingApprovals = documents.filter(d => d.status === 'pending_review');
  const filteredApprovals = pendingApprovals.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Workload calculations: count how many active tasks (status != completed) each junior has
  const juniorUsers = teamMembers.filter(m => m.role === 'junior');
  const uniqueJuniors = Array.from(new Set(juniorUsers.map(j => j.user_id)));

  const workloadData = uniqueJuniors.map(jid => {
    const allUsers = useAuthStore.getState().allUsers;
    const juniorObj = allUsers.find(u => u.id === jid);
    
    const juniorTasks = tasks.filter(t => t.assigned_junior_id === jid && t.status !== 'completed');
    const taskCount = juniorTasks.length;
    
    let status: 'Underloaded' | 'Balanced' | 'Overloaded' = 'Balanced';
    let colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (taskCount === 0) {
      status = 'Underloaded';
      colorClass = 'text-slate-600 bg-slate-50 border-slate-200';
    } else if (taskCount >= 3) {
      status = 'Overloaded';
      colorClass = 'text-rose-700 bg-rose-50 border-rose-200';
    } else {
      status = 'Balanced';
      colorClass = 'text-blue-700 bg-blue-50 border-blue-200';
    }

    return {
      id: jid,
      name: juniorObj?.name || 'Junior User',
      email: juniorObj?.email || '',
      avatar: juniorObj?.avatar_url,
      tasksCount: taskCount,
      status,
      colorClass
    };
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !teamName) return;

    const users = useAuthStore.getState().allUsers;
    const principalUser = users.find(u => u.role === 'principal') || currentUser;
    const seniorUser = users.find(u => u.role === 'senior');
    const juniorUser = users.find(u => u.role === 'junior');

    const assignedUsers: { userId: string; role: any }[] = [];
    if (principalUser) assignedUsers.push({ userId: principalUser.id, role: 'principal' });
    if (seniorUser) assignedUsers.push({ userId: seniorUser.id, role: 'senior' });
    if (juniorUser) assignedUsers.push({ userId: juniorUser.id, role: 'junior' });

    createProject({
      name: projectName,
      description: projectDesc,
      status: 'ongoing',
      createdBy: currentUser?.id || principalUser?.id || '00000000-0000-0000-0000-000000000001',
      teamName,
      assignedUsers
    });

    setProjectName('');
    setProjectDesc('');
    setTeamName('');
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-8 select-none font-sans pb-12">
      {/* 1. Header HUD Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0f172a] font-mono uppercase">
            GOOD MORNING, <span className="text-[#1d4ed8] font-sans normal-case font-black">{firstName}.</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium font-sans">
            Ready to manage today&apos;s blueprints and review the active architectural pipelines?
          </p>
        </div>

        {/* Wide Rounded Capsule Search Bar */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search drawings or review logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm placeholder:text-slate-400"
            />
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Principal Approval Queue */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider font-mono">
                PRINCIPAL APPROVAL QUEUE
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Blueprint sets requiring design check and structural sign-off.
              </p>
            </div>
            <span className="text-[10px] font-bold font-mono uppercase border border-slate-200 px-2 py-0.5 rounded text-slate-455">
              {filteredApprovals.length} PENDING
            </span>
          </div>

          <div className="space-y-4">
            {filteredApprovals.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-white/40">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500/80 mb-3" />
                <p className="text-xs font-bold text-slate-700">No drawings awaiting approvals.</p>
                <p className="text-[10px] text-slate-400 mt-1">All design reviews are fully synchronized.</p>
              </div>
            ) : (
              filteredApprovals.map((doc, idx) => {
                const proj = projects.find((p) => p.id === doc.project_id);
                const docVer = useDBStore.getState().documentVersions.find(v => v.id === doc.current_version_id);
                
                // Get project members
                const team = teams.find((t) => t.project_id === doc.project_id);
                const projUsers = team
                  ? teamMembers.filter((tm) => tm.team_id === team.id)
                  : [];
                const allUsers = useAuthStore.getState().allUsers;

                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-350 hover:shadow-md transition-all relative overflow-hidden group"
                  >
                    {/* CAD Coordinate Ticks Decor */}
                    <span className="absolute top-1 left-2 text-[8px] font-mono text-slate-250 select-none pointer-events-none group-hover:text-slate-350">
                      SEC-A // 00{idx + 1}
                    </span>

                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[9px] font-bold font-mono tracking-wider text-blue-700 bg-blue-50 border border-blue-150 px-2 py-0.5 rounded">
                          {proj?.name}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                          REV {docVer?.version_number || 'v1.0'}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">
                        {doc.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 pr-4">
                        {doc.description}
                      </p>
                    </div>

                    {/* Team Stacked Avatar Rings & Status Pill */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 flex-shrink-0">
                      {/* Avatar Rings */}
                      <div className="flex -space-x-2.5 overflow-hidden">
                        {projUsers.map((pu, uIdx) => {
                          const userObj = allUsers.find(u => u.id === pu.user_id);
                          return (
                            <div 
                              key={pu.user_id} 
                              className="relative inline-block h-7 w-7 rounded-full ring-2 ring-white bg-slate-200 flex-shrink-0"
                              title={`${userObj?.name} (${pu.role})`}
                            >
                              {userObj?.avatar_url ? (
                                <img
                                  className="h-full w-full rounded-full object-cover"
                                  src={userObj.avatar_url}
                                  alt={userObj.name}
                                />
                              ) : (
                                <div className="h-full w-full rounded-full bg-slate-700 text-white text-[9px] font-bold flex items-center justify-center">
                                  {userObj?.name[0]}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Status badge pill */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                        Pending Approval
                      </span>

                      {/* Action trigger */}
                      <Link
                        href={`/dashboard/workspace/${doc.id}?version=${doc.current_version_id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Junior Workload Balance */}
        <div className="lg:col-span-4 space-y-6">
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider font-mono">
              JUNIOR WORKLOAD BALANCE
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Employee active tasks capacities mapped in CAD segmented pills.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
            {workloadData.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-mono">
                No junior members in database.
              </div>
            ) : (
              workloadData.map((worker) => {
                const totalSegments = 3; // Segmented workload capsule bar limit
                const activeCount = Math.min(worker.tasksCount, totalSegments);
                
                return (
                  <div key={worker.id} className="space-y-3 pb-5 border-b border-slate-100 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {worker.avatar ? (
                          <img
                            src={worker.avatar}
                            alt={worker.name}
                            className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                            {worker.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-black text-slate-800">{worker.name}</p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-mono">
                            Junior Architect
                          </p>
                        </div>
                      </div>

                      <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${worker.colorClass}`}>
                        {worker.status}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                        <span>Load Index</span>
                        <span className="font-mono">{worker.tasksCount} Active Tasks</span>
                      </div>

                      {/* Custom Segmented Pill Progress Bar */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {Array.from({ length: totalSegments }).map((_, segmentIdx) => {
                          const isFilled = segmentIdx < activeCount;
                          let segmentColor = 'bg-slate-100 border-slate-200';
                          
                          if (isFilled) {
                            if (worker.status === 'Overloaded') {
                              segmentColor = 'bg-rose-500 border-rose-600 shadow-sm shadow-rose-200';
                            } else if (worker.status === 'Underloaded') {
                              segmentColor = 'bg-slate-400 border-slate-500';
                            } else {
                              segmentColor = 'bg-blue-600 border-blue-700 shadow-sm shadow-blue-200';
                            }
                          }

                          return (
                            <div 
                              key={segmentIdx} 
                              className={`h-2.5 rounded-full border transition-all duration-350 ${segmentColor}`}
                              title={`Task Segment ${segmentIdx + 1}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <Link
              href="/dashboard/teams"
              className="flex items-center justify-center gap-1.5 text-xs text-center font-bold text-slate-600 hover:text-slate-900 pt-4 border-t border-slate-150 cursor-pointer"
            >
              <span>Manage Studios & Roster</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-slate-200 bg-white shadow-2xl z-10">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-mono mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Helix Cultural Center"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">Description</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Summarize the project goals and specs..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Helix Core Design Team"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

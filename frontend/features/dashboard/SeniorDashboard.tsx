'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDBStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { 
  Plus, Search, ChevronRight, CheckCircle2, Clock, 
  MapPin, Sliders, Info, Eye, Layers, FileClock, CheckSquare, Users, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SeniorDashboard() {
  const { currentUser } = useAuthStore();
  const { projects, tasks, documents, activityLogs, teamMembers, teams } = useDBStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Find teams this senior is part of
  const seniorTeams = teamMembers.filter(m => m.user_id === currentUser?.id).map(m => m.team_id);
  // Find project IDs connected to these teams
  const myProjectIds = projects
    .filter(p => useDBStore.getState().teams.some(t => t.project_id === p.id && seniorTeams.includes(t.id)))
    .map(p => p.id);

  // Filter projects, documents and tasks
  const myProjects = projects.filter(p => myProjectIds.includes(p.id));
  const docsUnderReview = documents.filter(d => myProjectIds.includes(d.project_id) && d.status !== 'approved');
  const filteredDocs = docsUnderReview.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const supervisedTasks = tasks.filter(t => t.assigned_senior_id === currentUser?.id && t.assigned_junior_id !== null);
  const reviewTasksCount = supervisedTasks.filter(t => t.status === 'review').length;

  const firstName = currentUser?.name.split(' ')[0] || 'David';

  return (
    <div className="space-y-8 select-none font-sans pb-12">
      {/* 1. Header HUD Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono mb-1">
            Senior Desk
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Good morning, <span className="text-primary font-sans font-black">{firstName}.</span>
          </h1>
          <p className="text-muted-foreground text-xs mt-1 font-medium font-sans">
            Lead workspace: Collaborate with the Principal, review junior drafts, and verify task lists.
          </p>
        </div>

        {/* Wide Rounded Capsule Search Bar */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search active drawings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Project Drawings Requiring Review */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                Project Drawings Requiring Review
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Propose blueprint changes and tag corresponding tasks before principal sign-off.
              </p>
            </div>
            <span className="text-[10px] font-bold font-mono uppercase border border-border px-2 py-0.5 rounded text-muted-foreground">
              {filteredDocs.length} PENDING
            </span>
          </div>

          <div className="space-y-4">
            {filteredDocs.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-secondary/10">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500/80 mb-3" />
                <p className="text-xs font-bold text-foreground">No drawings pending review.</p>
                <p className="text-[10px] text-muted-foreground mt-1">All blueprints are up to date.</p>
              </div>
            ) : (
              filteredDocs.map((doc, idx) => {
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
                    className="p-5 rounded-2xl border border-border bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/10 transition-all relative overflow-hidden group"
                  >
                    <span className="absolute top-1 left-2 text-[8px] font-mono text-muted-foreground/30 select-none pointer-events-none group-hover:text-muted-foreground/50">
                      DWG-REV // 00{idx + 1}
                    </span>

                    <Link
                      href={`/dashboard/workspace/${doc.id}?version=${doc.current_version_id}`}
                      className="space-y-2 flex-1 min-w-0 block group/link"
                    >
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[9px] font-bold font-mono tracking-wider text-accent-foreground bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                          {proj?.name}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded">
                          REV {docVer?.version_number || 'v1.0'}
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                          doc.status === 'changes_proposed'
                            ? 'text-destructive bg-destructive/10 border-destructive/20'
                            : 'text-accent-foreground bg-primary/10 border-primary/20'
                        }`}>
                          {doc.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-black text-foreground tracking-tight group-hover/link:text-primary transition-colors">
                        {doc.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 pr-4">
                        {doc.description}
                      </p>
                    </Link>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 flex-shrink-0">
                      {/* Avatar Rings */}
                      <div className="flex -space-x-2.5 overflow-hidden">
                        {projUsers.map((pu) => {
                          const userObj = allUsers.find(u => u.id === pu.user_id);
                          return (
                            <div 
                              key={pu.user_id} 
                              className="relative inline-block h-7 w-7 rounded-full ring-2 ring-background bg-secondary flex-shrink-0"
                              title={`${userObj?.name} (${pu.role})`}
                            >
                              {userObj?.avatar_url ? (
                                <img
                                  className="h-full w-full rounded-full object-cover"
                                  src={userObj.avatar_url}
                                  alt={userObj.name}
                                />
                              ) : (
                                <div className="h-full w-full rounded-full bg-secondary border border-border text-muted-foreground text-[9px] font-bold flex items-center justify-center">
                                  {userObj?.name[0]}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Action trigger */}
                      <Link
                        href={`/dashboard/workspace/${doc.id}?version=${doc.current_version_id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-bold text-xs uppercase tracking-wide"
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

        {/* Right Column: Supervised Tasks & Details */}
        <div className="lg:col-span-4 space-y-6">
          <div className="pb-3 border-b border-border">
            <h2 className="text-base font-extrabold text-foreground">
              Supervised Junior Tasks
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              Verify drafts, sign-off status, or consult junior members.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
            {supervisedTasks.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-xs font-mono">
                No junior tasks supervised.
              </div>
            ) : (
              supervisedTasks.slice(0, 4).map((task) => {
                const junior = useAuthStore.getState().allUsers.find(u => u.id === task.assigned_junior_id);
                return (
                  <Link
                    key={task.id}
                    href="/dashboard/tasks"
                    className="p-4 rounded-xl border border-border bg-secondary flex flex-col justify-between h-28 hover:border-white/10 transition-all cursor-pointer group/task"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-bold text-foreground line-clamp-1 flex-1 group-hover/task:text-primary transition-colors">{task.title}</h4>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                        task.status === 'review'
                          ? 'text-accent-foreground bg-primary/10 border-primary/20'
                          : 'text-muted-foreground bg-secondary border-border'
                      }`}>
                        {task.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        {junior?.avatar_url ? (
                          <img
                            src={junior.avatar_url}
                            alt={junior.name}
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                            J
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground font-semibold">{junior?.name}</span>
                      </div>

                      <span className="text-[9px] text-muted-foreground font-medium">
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}

            <Link
              href="/dashboard/tasks"
              className="flex items-center justify-center gap-1.5 text-xs text-center font-bold text-muted-foreground hover:text-foreground pt-4 border-t border-border cursor-pointer"
            >
              <span>View Kanban Board</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

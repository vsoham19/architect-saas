'use client';

import React, { useState } from 'react';
import { useDBStore } from '../../../store/dbStore';
import { useAuthStore } from '../../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import CustomSelect from '../../../components/CustomSelect';

export default function AuditTrailPage() {
  const router = useRouter();
  const { currentRole, allUsers } = useAuthStore();
  const { activityLogs, projects, auditLogs } = useDBStore();

  const [activeTab, setActiveTab] = useState<'people' | 'projects'>('people');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  // Route protection inside page
  if (currentRole !== 'principal' && currentRole !== 'admin') {
    return (
      <div className="py-20 text-center text-xs font-semibold text-muted-foreground">
        <span className="material-symbols-outlined text-4xl text-error mb-2">shield_lock</span>
        <p>Access Denied: You must have Principal or Admin credentials to view the Audit Trail.</p>
      </div>
    );
  }

  // Get dynamic initials for avatars
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getActionStyles = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('upload') || act.includes('version')) {
      return {
        icon: 'cloud_upload',
        bg: 'bg-blue-500/10 border-blue-500/25 text-blue-600',
        badge: 'bg-blue-500/10 text-blue-700 border-blue-200/50'
      };
    }
    if (act.includes('approve') || act.includes('complete') || act.includes('sign')) {
      return {
        icon: 'check_circle',
        bg: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600',
        badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-200/50'
      };
    }
    if (act.includes('reject') || act.includes('block') || act.includes('fail')) {
      return {
        icon: 'error',
        bg: 'bg-rose-500/10 border-rose-500/25 text-rose-600',
        badge: 'bg-rose-500/10 text-rose-700 border-rose-200/50'
      };
    }
    if (act.includes('comment') || act.includes('chat')) {
      return {
        icon: 'chat',
        bg: 'bg-sky-500/10 border-sky-500/25 text-sky-600',
        badge: 'bg-sky-500/10 text-sky-700 border-sky-200/50'
      };
    }
    if (act.includes('create') || act.includes('add')) {
      return {
        icon: 'add_box',
        bg: 'bg-teal-500/10 border-teal-500/25 text-teal-600',
        badge: 'bg-teal-500/10 text-teal-700 border-teal-200/50'
      };
    }
    return {
      icon: 'history',
      bg: 'bg-amber-500/10 border-amber-500/25 text-amber-600',
      badge: 'bg-amber-500/10 text-amber-700 border-amber-200/50'
    };
  };

  const toggleLogExpand = (id: string) => {
    setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getRelativeTime = (isoString: string) => {
    return new Date(isoString).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  };

  // Compile combined logs for People-Driven Tab
  const getPeopleLogs = () => {
    const combined = [
      ...activityLogs.map(l => ({
        id: l.id,
        user_id: l.user_id,
        project_id: l.project_id,
        action: l.action,
        description: l.details,
        created_at: l.created_at,
        source: 'activity'
      })),
      ...auditLogs.map(l => {
        // Convert audit details to readable string if possible
        const user = allUsers.find(u => u.id === l.user_id);
        const name = user ? user.name : 'System';
        let desc = `${name} completed ${l.action.replace(/_/g, ' ')}`;
        if (l.details && (l.details as any).document_name) {
          desc = `${name} ${l.action.replace(/_/g, ' ')} for ${(l.details as any).document_name}`;
        }
        return {
          id: l.id,
          user_id: l.user_id,
          project_id: null,
          action: l.action,
          description: desc,
          created_at: l.created_at,
          source: 'audit'
        };
      })
    ];

    // Filter by user
    const filtered = selectedUserId === 'all'
      ? combined
      : combined.filter(l => l.user_id === selectedUserId);

    // Filter by search query
    let searched = filtered;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      searched = filtered.filter(l => {
        const user = allUsers.find(u => u.id === l.user_id);
        const userName = user ? user.name.toLowerCase() : '';
        const action = l.action.toLowerCase();
        const desc = l.description.toLowerCase();
        return userName.includes(q) || action.includes(q) || desc.includes(q);
      });
    }

    // Sort chronologically
    return searched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  // Compile logs for Project-Driven Tab
  const getProjectLogs = () => {
    // Only activities are linked directly to projects
    const filtered = selectedProjectId === 'all'
      ? activityLogs
      : activityLogs.filter(l => l.project_id === selectedProjectId);

    // Filter by search query
    let searched = filtered;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      searched = filtered.filter(l => {
        const user = allUsers.find(u => u.id === l.user_id);
        const userName = user ? user.name.toLowerCase() : '';
        const proj = projects.find(p => p.id === l.project_id);
        const projName = proj ? proj.name.toLowerCase() : '';
        const action = l.action.toLowerCase();
        const details = l.details?.toLowerCase() || '';
        return userName.includes(q) || projName.includes(q) || action.includes(q) || details.includes(q);
      });
    }

    return searched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const peopleLogs = getPeopleLogs();
  const projectLogs = getProjectLogs();

  return (
    <div className="space-y-8 select-none font-sans pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b border-outline-variant/30">
        <div>
          <h3 className="font-headline text-headline-lg font-bold text-on-surface">Audit Trail</h3>
          <p className="text-on-surface-variant font-sans text-xs mt-1">
            System-wide chronological ledger divided by operator activity and project progress timelines
          </p>
        </div>

        {/* Tab Selection Switcher */}
        <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/45">
          <button
            onClick={() => {
              setActiveTab('people');
              setSearchQuery('');
            }}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'people'
                ? 'bg-surface-container-lowest text-primary shadow-xs border border-outline-variant/30'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-xs">person</span>
            People-Driven
          </button>
          <button
            onClick={() => {
              setActiveTab('projects');
              setSearchQuery('');
            }}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'projects'
                ? 'bg-surface-container-lowest text-primary shadow-xs border border-outline-variant/30'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-xs">folder</span>
            Project-Driven
          </button>
        </div>
      </div>

      {/* Main Timeline Card Panel */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-soft space-y-6">
        
        {/* Tab-specific Toolbar / Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-outline-variant/35 shrink-0">
          <div>
            <h4 className="font-headline text-sm font-bold text-on-surface uppercase tracking-wider">
              {activeTab === 'people' ? 'Personnel Transaction Timelines' : 'Project Milestones Timeline'}
            </h4>
            <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
              {activeTab === 'people' 
                ? 'Chronological list of edits, uploads, and decisions grouped by staff member.'
                : 'Development progress updates, status changes, and task completions per project mandate.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Real-time Search Box */}
            <div className="relative flex items-center bg-surface-container-low border border-outline-variant rounded-xl px-3 py-1.5 shadow-xs w-64">
              <span className="material-symbols-outlined text-xs text-on-surface-variant/70 mr-1.5 select-none">search</span>
              <input
                type="text"
                placeholder="Search operator, actions, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-[11px] font-medium placeholder:text-muted-foreground/50 focus:ring-0 focus:outline-none w-full text-foreground p-0 font-sans"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-on-surface-variant hover:text-on-surface ml-1 cursor-pointer flex items-center">
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>

            {activeTab === 'people' ? (
              <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant rounded-xl p-1 shadow-xs shrink-0 w-52">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant/80 px-2 select-none">Member:</span>
                <CustomSelect
                  value={selectedUserId}
                  onChange={setSelectedUserId}
                  options={[
                    { value: 'all', label: 'All Staff' },
                    ...allUsers.filter(u => u.role !== 'admin').map(u => ({ value: u.id, label: u.name }))
                  ]}
                  className="text-primary font-bold text-[11px] bg-transparent border-0 p-0 focus:ring-0 w-full"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant rounded-xl p-1 shadow-xs shrink-0 w-52">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant/80 px-2 select-none">Project:</span>
                <CustomSelect
                  value={selectedProjectId}
                  onChange={setSelectedProjectId}
                  options={[
                    { value: 'all', label: 'All Projects' },
                    ...projects.map(p => ({ value: p.id, label: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name }))
                  ]}
                  className="text-primary font-bold text-[11px] bg-transparent border-0 p-0 focus:ring-0 w-full font-sans"
                />
              </div>
            )}
          </div>
        </div>

        {/* Tab content panel */}
        <div className="relative">
          <AnimatePresence mode="wait">
            
            {/* Tab 1: People-Driven List */}
            {activeTab === 'people' && (
              <motion.div
                key="people-timeline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {peopleLogs.length === 0 ? (
                  <div className="py-16 text-center text-on-surface-variant/60 text-xs italic font-medium">
                    No transactions registered for the selected criteria.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-outline-variant/35 ml-5 pl-8 space-y-4 py-2">
                    {peopleLogs.map((log) => {
                      const user = allUsers.find(u => u.id === log.user_id);
                      const proj = projects.find(p => p.id === log.project_id);
                      const styles = getActionStyles(log.action);
                      const isExpanded = !!expandedLogs[log.id];

                      return (
                        <div key={log.id} className="relative group select-none transition-all duration-200">
                          
                          {/* Timeline node icon */}
                          <div className={`absolute -left-[49px] top-2 border-2 w-8 h-8 rounded-full flex items-center justify-center shadow-xs z-10 transition-transform group-hover:scale-110 bg-white ${styles.bg}`}>
                            <span className="material-symbols-outlined text-sm font-semibold">{styles.icon}</span>
                          </div>

                          {/* Card body */}
                          <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-4 shadow-xs hover:shadow-md hover:border-primary/20 transition-all">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant/20">
                              <div className="flex items-center gap-2">
                                {user?.avatar_url ? (
                                  <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover border border-outline-variant" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center font-bold text-[8px] text-primary">
                                    {user ? getInitials(user.name) : '?'}
                                  </div>
                                )}
                                <span className="font-extrabold text-[11px] text-on-surface">{user?.name || 'System Operator'}</span>
                                <span className="text-[10px] text-on-surface-variant font-medium">
                                  {getRelativeTime(log.created_at)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {proj && (
                                  <button
                                    onClick={() => router.push(`/dashboard/projects/${proj.id}`)}
                                    className="px-2 py-0.5 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/25 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                                  >
                                    {proj.name}
                                  </button>
                                )}
                                <span className={`px-2 py-0.5 border rounded-md text-[9px] font-extrabold uppercase tracking-wider font-mono ${styles.badge}`}>
                                  {log.action.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 flex justify-between items-start gap-4">
                              <p className="text-xs text-on-surface-variant/90 font-medium font-sans leading-relaxed max-w-2xl">
                                {log.description}
                              </p>
                              <button
                                onClick={() => toggleLogExpand(log.id)}
                                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm font-bold">
                                  {isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                                </span>
                              </button>
                            </div>

                            {/* Expandable JSON details */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-3 pt-3 border-t border-outline-variant/30 space-y-2">
                                    <h5 className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/80">Log Details JSON</h5>
                                    <pre className="text-[9px] font-mono p-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-muted-foreground/90 overflow-x-auto leading-relaxed max-h-40">
                                      {JSON.stringify({
                                        id: log.id,
                                        user_id: log.user_id,
                                        project_id: log.project_id || 'N/A',
                                        action: log.action,
                                        source: log.source,
                                        timestamp: log.created_at
                                      }, null, 2)}
                                    </pre>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Tab 2: Project-Driven List */}
            {activeTab === 'projects' && (
              <motion.div
                key="projects-timeline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {projectLogs.length === 0 ? (
                  <div className="py-16 text-center text-on-surface-variant/60 text-xs italic font-medium">
                    No milestone logs or drawing uploads recorded for this project.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-outline-variant/35 ml-5 pl-8 space-y-4 py-2">
                    {projectLogs.map((log) => {
                      const user = allUsers.find(u => u.id === log.user_id);
                      const proj = projects.find(p => p.id === log.project_id);
                      const styles = getActionStyles(log.action);
                      const isExpanded = !!expandedLogs[log.id];

                      return (
                        <div key={log.id} className="relative group select-none transition-all duration-200">
                          
                          {/* Operator avatar timeline node */}
                          <div className="absolute -left-[50px] top-1.5 border-2 border-outline-variant/50 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-xs z-10 transition-transform group-hover:scale-110">
                            {user?.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-surface-container-high flex items-center justify-center font-bold text-[9px] text-on-surface">
                                {user ? getInitials(user.name) : '?'}
                              </div>
                            )}
                          </div>

                          {/* Card body */}
                          <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-4 shadow-xs hover:shadow-md hover:border-primary/20 transition-all">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant/20">
                              <div className="flex items-center gap-2">
                                {proj ? (
                                  <button
                                    onClick={() => router.push(`/dashboard/projects/${proj.id}`)}
                                    className="font-extrabold text-[11px] text-on-surface hover:text-primary hover:underline transition-all cursor-pointer"
                                  >
                                    {proj.name}
                                  </button>
                                ) : (
                                  <span className="font-extrabold text-[11px] text-on-surface">Unknown Workstream</span>
                                )}
                                <span className="text-[10px] text-on-surface-variant font-medium">
                                  {getRelativeTime(log.created_at)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground font-semibold">Operator: {user?.name || 'System'}</span>
                                <span className={`px-2 py-0.5 border rounded-md text-[9px] font-extrabold uppercase tracking-wider font-mono ${styles.badge}`}>
                                  {log.action.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 flex justify-between items-start gap-4">
                              <p className="text-xs text-on-surface-variant/90 font-medium font-sans leading-relaxed max-w-2xl">
                                {log.details}
                              </p>
                              <button
                                onClick={() => toggleLogExpand(log.id)}
                                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm font-bold">
                                  {isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                                </span>
                              </button>
                            </div>

                            {/* Expandable JSON details */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-3 pt-3 border-t border-outline-variant/30 space-y-2">
                                    <h5 className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/80">Log Details JSON</h5>
                                    <pre className="text-[9px] font-mono p-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-muted-foreground/90 overflow-x-auto leading-relaxed max-h-40">
                                      {JSON.stringify({
                                        id: log.id,
                                        user_id: log.user_id,
                                        project_id: log.project_id,
                                        action: log.action,
                                        timestamp: log.created_at
                                      }, null, 2)}
                                    </pre>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDBStore } from '../../../store/dbStore';
import { useAuthStore } from '../../../store/authStore';
import { 
  FolderKanban, Plus, Clock, Search, ChevronRight, 
  CheckCircle2, Folder, Calendar 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectsPage() {
  const { currentRole, currentUser } = useAuthStore();
  const { projects, tasks, teamMembers, createProject } = useDBStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed' | 'archived'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [teamName, setTeamName] = useState('');

  // Filters
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'upcoming': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'completed': return 'text-blue-700 bg-blue-50 border-blue-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 select-none font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono uppercase">Projects Ledger</h1>
          <p className="text-slate-500 text-sm">
            Access blueprints, drawings, document workflows, and task listings per architecture contract.
          </p>
        </div>

        {(currentRole === 'principal' || currentRole === 'admin') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Project</span>
          </button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none text-xs font-semibold text-slate-700"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto border border-slate-200">
          {(['all', 'upcoming', 'ongoing', 'completed', 'archived'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProjects.length === 0 ? (
          <div className="col-span-2 py-20 text-center text-slate-500 text-xs border border-dashed border-border rounded-2xl">
            <Folder size={32} className="mx-auto text-slate-600 mb-2 opacity-50" />
            No projects found matching the filter.
          </div>
        ) : (
          filteredProjects.map((p, idx) => {
            const projTasks = tasks.filter(t => t.project_id === p.id);
            const completedTasks = projTasks.filter(t => t.status === 'completed').length;
            const percent = projTasks.length > 0 ? Math.round((completedTasks / projTasks.length) * 100) : 0;

            // Find team members
            const team = useDBStore.getState().teams.find(t => t.project_id === p.id);
            const members = team 
              ? teamMembers.filter(tm => tm.team_id === team.id)
              : [];

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-6 rounded-2xl border border-border bg-card flex flex-col justify-between h-56 hover:shadow-lg transition-all"
              >
                <div>
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <span className={`inline-block text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded border mb-2 ${getStatusColor(p.status)}`}>
                        {p.status}
                      </span>
                      <h3 className="text-md font-extrabold text-foreground leading-tight hover:text-primary transition-colors">
                        <Link href={`/dashboard/projects/${p.id}`}>
                          {p.name}
                        </Link>
                      </h3>
                    </div>
                    <Link
                      href={`/dashboard/projects/${p.id}`}
                      className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between gap-4">
                  {/* Team Avatars */}
                  <div className="flex -space-x-2 overflow-hidden">
                    {members.slice(0, 4).map((m) => {
                      const user = useAuthStore.getState().allUsers.find(u => u.id === m.user_id);
                      return user?.avatar_url ? (
                        <img
                          key={m.id}
                          className="inline-block h-6 w-6 rounded-full ring-2 ring-card object-cover"
                          src={user.avatar_url}
                          alt={user.name}
                          title={user.name}
                        />
                      ) : (
                        <div
                          key={m.id}
                          title={user?.name}
                          className="inline-block h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-black text-white ring-2 ring-card"
                        >
                          {user?.name[0]}
                        </div>
                      );
                    })}
                    {members.length > 4 && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[9px] font-black text-white ring-2 ring-card">
                        +{members.length - 4}
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1 max-w-[200px] space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                      <span>Tasks Progress</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl z-10">
            <h3 className="text-md font-bold text-foreground mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4 text-xs font-semibold text-foreground">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. The Helix Cultural Center"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Description</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Summarize the project goals and specs..."
                  rows={3}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Helix Core Design Team"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 shadow-md cursor-pointer"
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

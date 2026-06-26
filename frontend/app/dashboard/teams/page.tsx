'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDBStore } from '../../../store/dbStore';
import { useAuthStore } from '../../../store/authStore';
import CustomSelect from '../../../components/CustomSelect';
import { 
  Users, Plus, Award, Shield, Hammer, Wrench, Mail, 
  Trash2, Briefcase, ChevronRight, Activity, BarChart3, AlertCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function TeamsPage() {
  const { currentRole, allUsers } = useAuthStore();
  const { teams, teamMembers, projects, tasks, assignTeamMembers } = useDBStore();

  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // 1. Calculations
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'principal': return Award;
      case 'senior': return Shield;
      case 'junior': return Hammer;
      default: return Wrench;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'principal': return 'text-amber-700 bg-amber-50 border-amber-200/60';
      case 'senior': return 'text-teal-700 bg-teal-50 border-teal-200/60';
      case 'junior': return 'text-emerald-700 bg-emerald-50 border-emerald-200/60';
      default: return 'text-muted-foreground bg-secondary border-border';
    }
  };

  // Workload calculator per member
  const getMemberWorkload = (userId: string) => {
    const userTasks = tasks.filter(t => (t.assigned_junior_id === userId || t.assigned_senior_id === userId) && t.status !== 'completed');
    const taskCount = userTasks.length;

    let rating: 'Underloaded' | 'Balanced' | 'Overloaded' = 'Balanced';
    let color = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    if (taskCount === 0) {
      rating = 'Underloaded';
      color = 'bg-secondary text-muted-foreground border-border';
    } else if (taskCount >= 3) {
      rating = 'Overloaded';
      color = 'text-rose-700 bg-rose-50 border-rose-200/60';
    } else {
      rating = 'Balanced';
      color = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    }

    return { taskCount, rating, color };
  };

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) return;

    const newTeamId = `t-${Date.now()}`;
    const newTeam = {
      id: newTeamId,
      name: newTeamName,
      project_id: selectedProjectId || null,
      created_at: new Date().toISOString(),
    };

    useDBStore.setState((state) => ({
      teams: [...state.teams, newTeam]
    }));

    setNewTeamName('');
    setSelectedProjectId('');
    setShowCreateTeamModal(false);
  };

  return (
    <div className="space-y-8 select-none font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-mono uppercase">Studio Teams & Workloads</h1>
          <p className="text-muted-foreground text-xs mt-1">
            Monitor workloads, task balance, and crew assignments across projects.
          </p>
        </div>

        {(currentRole === 'principal' || currentRole === 'admin') && (
          <button
            onClick={() => setShowCreateTeamModal(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Team</span>
          </button>
        )}
      </div>

      {/* Grid: Workloads Overview + Teams List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Overall workload indicators */}
        <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-foreground">Personnel Resource Allocations</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Task count distributions for active members.
            </p>
          </div>

          <div className="space-y-5">
            {allUsers.filter(u => u.role !== 'admin').map((u) => {
              const RoleIcon = getRoleIcon(u.role);
              const { taskCount, rating, color } = getMemberWorkload(u.id);

              return (
                <div key={u.id} className="p-3 border border-border/50 bg-secondary/15 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border border-white/5" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">{u.name[0]}</div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{u.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.25 rounded text-[8px] font-bold border uppercase ${getRoleColor(u.role)}`}>
                            <RoleIcon size={8} />
                            {u.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
                      {rating}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                      <span>Tasks in review / in progress</span>
                      <span className="text-foreground">{taskCount} tasks</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          rating === 'Overloaded' ? 'bg-rose-500' : rating === 'Underloaded' ? 'bg-muted' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(taskCount * 33.3, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Studio Teams Grid */}
        <div className="lg:col-span-2 space-y-6">
          {teams.map((t) => {
            const proj = projects.find(p => p.id === t.project_id);
            const members = teamMembers.filter(tm => tm.team_id === t.id);

            return (
              <div key={t.id} className="p-6 rounded-2xl border border-border bg-card space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">{t.name}</h3>
                    {proj ? (
                      <Link 
                        href={`/dashboard/projects/${proj.id}`}
                        className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        Project: {proj.name}
                        <ChevronRight size={12} />
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground block mt-1">Unassigned project</span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-xl border border-border">
                    {members.length} Members
                  </span>
                </div>

                {/* Team Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {members.map((m) => {
                    const user = allUsers.find(u => u.id === m.user_id);
                    const RoleIcon = getRoleIcon(m.role);
                    return (
                      <div key={m.id} className="p-3 border border-border/50 bg-secondary/15 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                              {user?.name[0]}
                            </div>
                          )}
                          <div>
                            <h4 className="text-xs font-bold text-foreground">{user?.name}</h4>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.25 rounded text-[8px] font-bold border uppercase ${getRoleColor(m.role)}`}>
                                <RoleIcon size={8} />
                                {m.role}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md" onClick={() => setShowCreateTeamModal(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl z-10">
            <h3 className="text-md font-bold text-foreground mb-4">Create Studio Team</h3>
            <form onSubmit={handleCreateTeamSubmit} className="space-y-4 text-xs font-semibold text-foreground">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Helix Core Design Team"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Link to Project</label>
                <CustomSelect
                  value={selectedProjectId}
                  onChange={setSelectedProjectId}
                  options={[
                    { value: '', label: '-- Leave Unassigned --' },
                    ...projects.filter(p => p.status === 'ongoing').map(p => ({ value: p.id, label: p.name }))
                  ]}
                  placeholder="-- Leave Unassigned --"
                  className="w-full"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 shadow-md cursor-pointer"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

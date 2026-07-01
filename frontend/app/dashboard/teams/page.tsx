'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDBStore } from '../../../store/dbStore';
import { useAuthStore } from '../../../store/authStore';
import CustomSelect from '../../../components/CustomSelect';
import { motion } from 'framer-motion';

export default function TeamsPage() {
  const { currentRole, allUsers, currentUser } = useAuthStore();
  const { teams, teamMembers, projects, tasks } = useDBStore();

  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const getRoleTitle = (role: string) => {
    switch (role) {
      case 'principal': return 'Principal Architect';
      case 'senior': return 'Senior Lead';
      case 'junior': return 'Junior Architect';
      case 'admin': return 'System Admin';
      default: return 'Architect';
    }
  };

  // Workload calculator per member
  const getMemberWorkload = (userId: string) => {
    const userTasks = tasks.filter(
      t => (t.assigned_junior_id === userId || t.assigned_senior_id === userId) && t.status !== 'completed'
    );
    const taskCount = userTasks.length;

    let rating: 'Available' | 'Optimal' | 'At Capacity' | 'Overloaded' = 'Optimal';
    let badgeColor = 'bg-primary-container/10 text-primary border-primary-container/20';
    let balancePercent = 55;

    if (taskCount === 0) {
      rating = 'Available';
      badgeColor = 'bg-primary-container/10 text-primary border-primary-container/20';
      balancePercent = 15;
    } else if (taskCount >= 3) {
      rating = 'Overloaded';
      badgeColor = 'bg-error-container/15 text-error border-error/25';
      balancePercent = 95;
    } else if (taskCount === 2) {
      rating = 'At Capacity';
      badgeColor = 'bg-secondary-fixed/30 text-on-secondary-fixed-variant border-secondary-fixed/40';
      balancePercent = 75;
    } else {
      rating = 'Optimal';
      badgeColor = 'bg-primary-container/10 text-primary border-primary-container/20';
      balancePercent = 55;
    }

    return {
      taskCount,
      rating,
      badgeColor,
      balancePercent,
      weeklyHours: taskCount * 12 + 10
    };
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

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getTeamBannerImage = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('helix')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmjS13b89r1vRmeFce7caonrlL9_U-_cJTjtVblfndqHJRNhUCdOLZbd15c7V6n6SFj-S888BsPYTvYjkRy62EV401aUkbcM7geV9X0g-Tj4iWHtPMF8k3SGyMRcYhKwwrOPdMqiLliw3s3DGLt4DkpJOCJ7EeAxFpfnyBprbn0ysLphrkUFYSrS-g7pafEbq9Bbkl_hqtkt3mOdevqOs-RDn0Wyk_l1RZ3L1c57GOLV_Q-wgyBYhkkeiudewlhuFmO5gK1frEG60z';
    }
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbE-sc8dR-pcu93l4E91xMlwQ9dLamssDkhlvWF5I59fQ6TNJad9MgAa2K9KrpArAsY2H9Kn5lW1KQWrnumNnmjmm4f6J1vYv8u2tiN-8eUSJDPPUGOi5xXw3ERk0ulNOu0bYqR2cYvOyCGAXK8cB3AL1brlVBzOeGTkPIscZ31K-PF0_Io-LBivX7kZdMLLPFCgBPiSoxB-afpFH0JRR1VG2a4oYEdrGic9rXgMK1tySKjd833aAbGp5PEcyIj0ec3HjmC4tFQU_s';
  };

  return (
    <div className="space-y-8 select-none font-sans pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b border-outline-variant/30">
        <div>
          <h3 className="font-headline text-headline-lg font-bold text-on-surface">Team Workloads</h3>
          <p className="text-on-surface-variant font-sans text-xs mt-1">
            Monitoring weekly load, balance status, and roster allocations across અમદાવાદ project crews
          </p>
        </div>

        {(currentRole === 'principal' || currentRole === 'admin') && (
          <button
            onClick={() => setShowCreateTeamModal(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm active:scale-95 duration-150 transition-all border border-primary/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm font-bold">group_add</span>
            <span>Create Team</span>
          </button>
        )}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Personnel Workload Indicators */}
        <section className="col-span-12 lg:col-span-5 space-y-4">
          <div className="px-2">
            <h4 className="font-headline text-headline-sm font-bold text-on-surface">Resource Allocations</h4>
            <p className="text-on-surface-variant text-[11px]">Task loads and availability balances for active personnel</p>
          </div>

          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
            {allUsers.filter(u => u.role !== 'admin').map((user) => {
              const { taskCount, rating, badgeColor, balancePercent, weeklyHours } = getMemberWorkload(user.id);
              return (
                <div
                  key={user.id}
                  className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-soft flex items-center gap-3"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-outline-variant/35 shadow-xs" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center font-bold text-xs">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <div>
                    <h4 className="font-sans text-xs font-bold text-on-surface">{user.name}</h4>
                    <p className="font-sans text-[9px] text-on-surface-variant/80 uppercase font-extrabold tracking-wider mt-0.5">
                      {getRoleTitle(user.role)}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Empty personnel row */}
            <div className="flex items-center justify-between p-4 bg-surface-container-low border border-dashed border-outline-variant rounded-2xl">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-outline text-lg">group_add</span>
                <span className="font-sans text-xs text-on-surface-variant italic font-medium">Assign more staff...</span>
              </div>
              <button 
                onClick={() => setShowCreateTeamModal(true)}
                className="text-primary font-bold text-[10px] uppercase hover:underline"
              >
                Assemble Crew
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Project Teams Bento list */}
        <section className="col-span-12 lg:col-span-7 space-y-4">
          <div className="px-2">
            <h4 className="font-headline text-headline-sm font-bold text-on-surface">Project Teams</h4>
            <p className="text-on-surface-variant text-[11px]">Studio division squads and technical certifications</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {teams.map((t) => {
              const proj = projects.find(p => p.id === t.project_id);
              const members = teamMembers.filter(tm => tm.team_id === t.id);

              return (
                <motion.div
                  key={t.id}
                  whileHover={{ scale: 1.03, y: -4 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                  className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden group shadow-soft flex flex-col relative cursor-pointer"
                >
                  {/* Banner header visual */}
                  <div className="h-28 relative bg-surface-container-high shrink-0 overflow-hidden">
                    <img 
                      className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-700" 
                      src={getTeamBannerImage(t.name)} 
                      alt=""
                    />
                    <div className="absolute top-4 left-4 bg-primary text-primary-foreground font-bold text-[9px] px-3 py-1 rounded-full uppercase tracking-wider">
                      {proj ? proj.status : 'Planning'}
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-headline text-sm font-bold text-on-surface mb-1 truncate leading-snug">
                        {t.name}
                      </h4>
                      <p className="text-on-surface-variant font-sans text-xs line-clamp-2 leading-relaxed min-h-[36px]">
                        {proj ? proj.description : 'Technical drafting taskforce for architectural designs.'}
                      </p>
                    </div>

                    <div className="space-y-4 mt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {members.slice(0, 4).map((m) => {
                            const user = allUsers.find(u => u.id === m.user_id);
                            return user?.avatar_url ? (
                              <img
                                key={m.id}
                                className="w-8 h-8 rounded-full border-2 border-surface-container-lowest object-cover"
                                src={user.avatar_url}
                                alt={user.name}
                              />
                            ) : (
                              <div
                                key={m.id}
                                className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-secondary-container text-on-secondary-container flex items-center justify-center text-[10px] font-bold"
                              >
                                {user ? getInitials(user.name) : '?'}
                              </div>
                            );
                          })}
                          {members.length > 4 && (
                            <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-surface-container-highest text-on-surface flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                              +{members.length - 4}
                            </div>
                          )}
                        </div>
                        <span className="font-sans text-[10px] text-on-surface-variant font-bold">
                          {members.length} Members
                        </span>
                      </div>

                      {/* Design Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-3.5 border-t border-outline-variant/65">
                        <span className="bg-surface-container-low text-on-surface-variant border border-outline-variant/35 px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wide">
                          BIM Level 3
                        </span>
                        <span className="bg-surface-container-low text-on-surface-variant border border-outline-variant/35 px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wide">
                          LEED Gold
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed overlay on hover */}
                  <div className="absolute inset-0 bg-surface-container-lowest/98 p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex flex-col justify-between border border-primary/20 rounded-2xl overflow-hidden pointer-events-none">
                    <div className="space-y-3">
                      <h4 className="font-headline text-[10px] font-bold text-primary uppercase tracking-wider">
                        Roster Allocation details
                      </h4>
                      <p className="text-[9px] text-on-surface-variant font-medium">
                        Active design team crew allocated to this project workspace:
                      </p>
                      
                      <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
                        {members.map((m) => {
                          const user = allUsers.find(u => u.id === m.user_id);
                          return (
                            <div key={m.id} className="flex items-center gap-2 text-[10px]">
                              {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-[8px]">
                                  {user ? getInitials(user.name) : '?'}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-on-surface text-[10px]">{user?.name}</span>
                                <span className="text-[7.5px] text-primary bg-primary/10 border border-primary/20 uppercase font-extrabold ml-1.5 px-1 py-0.25 rounded font-mono">
                                  {m.role}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-outline-variant/40 flex justify-between items-center text-[10px] font-bold text-on-surface-variant">
                      <span>Total Personnel</span>
                      <span className="text-primary font-mono text-xs">{members.length} Specialists</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

      </div>

      {/* Create Team Modal Dialog */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-xs" onClick={() => setShowCreateTeamModal(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl z-10 animate-in zoom-in-95 duration-150">
            <h3 className="font-headline text-md font-bold text-on-surface mb-4">Create Studio Team</h3>
            <form onSubmit={handleCreateTeamSubmit} className="space-y-4 text-xs font-semibold text-on-surface">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wide mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Helix Core Design Team"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-primary focus:outline-none text-on-surface placeholder:text-muted-foreground/40"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wide mb-1">Link to Project</label>
                <CustomSelect
                  value={selectedProjectId}
                  onChange={setSelectedProjectId}
                  options={[
                    { value: '', label: '-- Leave Unassigned --' },
                    ...projects.filter(p => p.status === 'ongoing').map(p => ({ value: p.id, label: p.name }))
                  ]}
                  placeholder="-- Leave Unassigned --"
                  className="w-full text-on-surface bg-surface-container-low"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-outline-variant/40 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="px-4 py-2 border border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 shadow-md active:scale-95 duration-150 transition-all border border-primary/20 cursor-pointer"
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

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDBStore } from '../../../store/dbStore';
import { useAuthStore } from '../../../store/authStore';
import CustomSelect from '../../../components/CustomSelect';
import { motion } from 'framer-motion';

export default function ProjectsPage() {
  const router = useRouter();
  const { currentRole, currentUser, allUsers } = useAuthStore();
  const { projects, tasks, teamMembers, documents, createProject } = useDBStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed' | 'archived'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [teamName, setTeamName] = useState('');
  const [projectZone, setProjectZone] = useState('R1');
  const [plotArea, setPlotArea] = useState('10000');

  // Trigger modal creation via query parameters (safe route)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('create') === 'true') {
        setShowCreateModal(true);
        // Clean URL parameter
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

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

    const users = allUsers;
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
      assignedUsers,
      zone: projectZone,
      plotArea: Number(plotArea) || 10000
    });

    setProjectName('');
    setProjectDesc('');
    setTeamName('');
    setProjectZone('R1');
    setPlotArea('10000');
    setShowCreateModal(false);
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getProjectImage = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('shilp')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuClNaWGi6CWfAAy70p4OELQz48mLhi-iv0C6bngi1dRsWCgdVUnT6J36mRaMgstCe0JVuDt3qDbgSIAUuDTCn1kiUWcw2qZglUIb-y06aOXrpi1IPqEUyXgvCNA6JYSDiTAPP2-TSSwgQGRmM-164pOKd4Qhf4loROuuvAKTJSzjHNn8u0l2-zS42vESakT29ZEbZ-hbIiEr2UgJ5xEXwLTe7SuqD_vBRbCnZLS_VimayCICkUtpbluirwZWkBKR41EcjVxXnxympAC';
    }
    if (n.includes('helix')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuBc16evOfY_moIAAFPH_ELNuE7pnIA9YHsM9uaeM8LjjeU7zsprdJDhlBZejl1xCc_2Nenf8KhRKmJ175n5-_3uzskDolWMBIKao_2GCdRfAD1tCQ5k2Poo5abDzUKRjcBzKzBqdw9agSv7ekcXxqqVLyAXjpJ2Zct8mQybBTFJpuy2sZoaSLZTW71olnOxa7pe1i6s6PwYaXhy_OKNU_wf_UyeNJ8U3vvLLwaIbtI9ZX0og-xY2tHxCane7r7PfOJxDt-KZJ091A8m';
    }
    if (n.includes('zenith')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8YAffZo5AWcJNZgyKDGlk8HHftyq9DQMP_jwKI5q86edkKszhj2aFReevwr_aVg1-TtkthPSgGPpETSORfULsAdnxU5EfNUFpbZSH6GoPsPDeQt1aKMjAjsbNXuoBThbPEsgHcijYwY7uDEwYcIQUUoUY3boDO13Inorc3yxL6y4rUeEX0FWV0LtURanKqYHIaHU197QLnMTgNicgX58UCjhE8iYlSWyOv-fP2-ibPf8Gp8T-eDPwm8VigcnSmgnolfr0j_rYxg0s';
    }
    if (n.includes('apex')) {
      return 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMlr7SIft5agf-tsopLIIRpEJ9QBQ85gAK3GGYTvI1pNI6B8tFzMwoFnAAthpNK0HbozyCnQH9UAVF8qAQTZZ_2tPsaL8WKP84OWur8RY8rAT19OT4MxsVbZYmLD10QTyj7_bzmZr9YFC9L5ivBQsCBz9vAEp9ex1E3IOIPCqx6grfT17pM2NypgF6_zbQ-cd3GORDf6mD4eaiTLlqwbxaBUBdraGThBRzYi8ZqyDqbj2FznxP6UEOBWWUsZYQlBPTpPIHx5KOp__V';
    }
    return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500';
  };

  return (
    <div className="space-y-8 select-none font-sans relative pb-16">
      
      {/* Upper Header and Filter controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b border-outline-variant/30">
        <div>
          <h3 className="font-headline text-headline-lg font-bold text-on-surface">Projects Ledger</h3>
          <p className="text-on-surface-variant font-sans text-xs mt-1">
            Reviewing {filteredProjects.length} active architectural mandates
          </p>
        </div>

        {/* Filters and Search Bar Row */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          
          {/* Search */}
          <div className="relative max-w-xs w-full group">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/80 group-focus-within:text-primary transition-colors text-lg">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project ledger..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-10 pr-4 py-2 focus:ring-1 focus:ring-primary focus:outline-none text-xs font-semibold text-on-surface placeholder:text-muted-foreground/50 shadow-xs"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/45">
            {(['all', 'upcoming', 'ongoing', 'completed', 'archived'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-surface-container-lowest text-primary shadow-xs border border-outline-variant/30'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground text-xs border border-dashed border-outline-variant rounded-2xl bg-surface-container-low/20">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">folder_open</span>
            <p>No project mandates matched the search ledger.</p>
          </div>
        ) : (
          filteredProjects.map((p, idx) => {
            const projTasks = tasks.filter(t => t.project_id === p.id);
            const completedTasks = projTasks.filter(t => t.status === 'completed').length;
            const percent = projTasks.length > 0 ? Math.round((completedTasks / projTasks.length) * 100) : 0;

            const team = useDBStore.getState().teams.find(t => t.project_id === p.id);
            const members = team ? teamMembers.filter(tm => tm.team_id === team.id) : [];

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.03, y: -4 }}
                className="group bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-soft hover:shadow-lg hover:border-primary/50 transition-all duration-300 flex flex-col h-full relative cursor-pointer"
                onClick={() => router.push(`/dashboard/projects/${p.id}`)}
              >
                <div className="relative h-44 w-full overflow-hidden shrink-0">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    src={getProjectImage(p.name)}
                    alt=""
                  />
                  <div className="absolute top-4 right-4 px-3 py-1 bg-primary/90 text-primary-foreground backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-wider">
                    {p.status}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-headline text-md font-bold text-on-surface group-hover:text-primary transition-colors leading-tight truncate pr-2">
                        {p.name}
                      </h4>
                      <button className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer shrink-0" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                      </button>
                    </div>
                    <p className="text-on-surface-variant font-sans text-xs line-clamp-2 leading-relaxed min-h-[36px]">
                      {p.description}
                    </p>
                  </div>

                  <div className="mt-6 space-y-4 shrink-0">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                          Tasks Progress
                        </span>
                        <span className="text-[10px] font-bold text-primary">{percent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3.5 border-t border-outline-variant/60">
                      <div className="flex -space-x-2">
                        {members.slice(0, 4).map((m) => {
                          const user = allUsers.find(u => u.id === m.user_id);
                          return user?.avatar_url ? (
                            <img
                              key={m.id}
                              className="w-7 h-7 rounded-full border-2 border-surface-container-lowest object-cover"
                              src={user.avatar_url}
                              alt={user.name}
                              title={user.name}
                            />
                          ) : (
                            <div
                              key={m.id}
                              title={user?.name}
                              className="w-7 h-7 rounded-full border-2 border-surface-container-lowest bg-secondary-container text-on-secondary-container flex items-center justify-center text-[10px] font-bold"
                            >
                              {user ? getInitials(user.name) : '?'}
                            </div>
                          );
                        })}
                        {members.length > 4 && (
                          <div className="w-7 h-7 rounded-full border-2 border-surface-container-lowest bg-surface-container-highest text-on-surface flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                            +{members.length - 4}
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/dashboard/projects/${p.id}`}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider flex items-center gap-0.5"
                      >
                        <span>Open Vault</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Detailed overlay on hover */}
                <div className="absolute inset-0 bg-surface-container-lowest/98 p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex flex-col justify-between border border-primary/20 rounded-2xl overflow-hidden pointer-events-none">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-wider">
                        Project Specifications
                      </span>
                      <h4 className="font-headline text-sm font-bold text-on-surface mt-2 truncate">
                        {p.name}
                      </h4>
                    </div>

                    {/* Technical specifications grid */}
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div className="bg-surface-container-low/60 p-2.5 rounded-xl border border-outline-variant/35">
                        <span className="text-on-surface-variant/80 font-bold block uppercase text-[8px] tracking-wide">Built-up Area</span>
                        <span className="text-on-surface font-extrabold text-xs block mt-0.5">
                          {p.plot_area ? `${p.plot_area.toLocaleString()} sq ft` : 
                           p.name.includes('Helix') ? '85,000 sq ft' :
                           p.name.includes('Zenith') ? '120,000 sq ft' :
                           p.name.includes('Apex') ? '32,000 sq ft' :
                           p.name.includes('Shilp') ? '50,000 sq ft' : '45,000 sq ft'}
                        </span>
                      </div>
                      
                      <div className="bg-surface-container-low/60 p-2.5 rounded-xl border border-outline-variant/35">
                        <span className="text-on-surface-variant/80 font-bold block uppercase text-[8px] tracking-wide">Drawing Vault</span>
                        <span className="text-on-surface font-extrabold text-xs block mt-0.5">
                          {documents.filter(d => d.project_id === p.id).length} Blueprints
                        </span>
                      </div>

                      <div className="bg-surface-container-low/60 p-2.5 rounded-xl border border-outline-variant/35">
                        <span className="text-on-surface-variant/80 font-bold block uppercase text-[8px] tracking-wide">Team Size</span>
                        <span className="text-on-surface font-extrabold text-xs block mt-0.5">
                          {members.length} Specialists
                        </span>
                      </div>

                      <div className="bg-surface-container-low/60 p-2.5 rounded-xl border border-outline-variant/35">
                        <span className="text-on-surface-variant/80 font-bold block uppercase text-[8px] tracking-wide">Task Backlog</span>
                        <span className="text-on-surface font-extrabold text-xs block mt-0.5">
                          {projTasks.length} Mandates
                        </span>
                      </div>
                    </div>

                    {/* Active tasks breakdown */}
                    <div className="space-y-1.5">
                      <span className="text-on-surface-variant/80 font-bold uppercase text-[8px] tracking-wide block">Tasks Breakdown</span>
                      <div className="flex gap-1 text-[9px] font-bold">
                        <span className="px-2 py-0.5 bg-primary-container/10 border border-primary-container/20 text-primary rounded-md">
                          {projTasks.filter(t => t.status === 'completed').length} Done
                        </span>
                        <span className="px-2 py-0.5 bg-tertiary-container/15 border border-tertiary-container/25 text-on-tertiary-container rounded-md">
                          {projTasks.filter(t => t.status === 'review').length} Review
                        </span>
                        <span className="px-2 py-0.5 bg-error-container/15 border border-error/25 text-error rounded-md">
                          {projTasks.filter(t => t.status === 'blocked').length} Blocked
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-outline-variant/40 flex justify-between items-center text-[10px] font-bold">
                    <span className="text-on-surface-variant">Click to open Vault Workspace</span>
                    <span className="text-primary uppercase tracking-wider flex items-center gap-0.5">
                      <span>Open</span>
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}

        {/* Kickstart Card in Bento Grid */}
        {(currentRole === 'principal' || currentRole === 'admin') && (
          <div
            onClick={() => setShowCreateModal(true)}
            className="group bg-surface-container-low border-2 border-dashed border-outline-variant rounded-2xl flex flex-col items-center justify-center p-6 hover:border-primary hover:bg-surface-container-high transition-all duration-300 cursor-pointer min-h-[350px]"
          >
            <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-xs">
              <span className="material-symbols-outlined text-2xl font-semibold">add</span>
            </div>
            <p className="font-headline font-bold text-md text-on-surface text-center">Kickstart New Project</p>
            <p className="text-on-surface-variant text-center font-sans text-xs mt-2 max-w-[200px] leading-relaxed">
              Define the scope, invite your team, and begin the architectural journey.
            </p>
          </div>
        )}
      </div>

      {/* Floating Statistics HUD */}
      <div className="fixed right-8 bottom-8 w-80 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-lg p-5 z-40 hidden xl:block animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-[10px] font-bold text-on-surface uppercase tracking-widest font-mono">Global Statistics</h5>
          <span className="material-symbols-outlined text-primary text-lg">analytics</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
            <p className="text-[9px] text-on-surface-variant font-medium">Active Hours</p>
            <p className="text-md font-bold text-primary font-headline">1,248h</p>
          </div>
          <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
            <p className="text-[9px] text-on-surface-variant font-medium">Avg. Progress</p>
            <p className="text-md font-bold text-primary font-headline">54%</p>
          </div>
        </div>
        <div className="mt-4 p-3 border border-outline-variant rounded-lg bg-surface text-xs text-on-surface-variant">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-destructive"></span>
            <p className="text-[10px] font-bold text-on-surface">3 Critical Tasks Due</p>
          </div>
          <p className="text-[10px] leading-relaxed">Helix project safety audit and Apex foundational permit approvals.</p>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-xs" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl z-10 animate-in zoom-in-95 duration-150">
            <h3 className="font-headline text-md font-bold text-on-surface mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4 text-xs font-semibold text-on-surface">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wide mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. The Helix Cultural Center"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-primary focus:outline-none text-on-surface placeholder:text-muted-foreground/40"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wide mb-1">Description</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Summarize the project goals and specs..."
                  rows={3}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-primary focus:outline-none text-on-surface placeholder:text-muted-foreground/40"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wide mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Helix Core Design Team"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-primary focus:outline-none text-on-surface placeholder:text-muted-foreground/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wide mb-1">Ahmedabad Zone</label>
                  <CustomSelect
                    value={projectZone}
                    onChange={setProjectZone}
                    options={[
                      { value: 'R1', label: 'R1 (Limit 1.8)' },
                      { value: 'R2', label: 'R2 (Limit 1.2)' },
                      { value: 'Commercial', label: 'Commercial (Limit 2.7)' },
                      { value: 'TOZ', label: 'TOZ (Limit 4.0)' },
                    ]}
                    className="w-full text-on-surface font-semibold bg-surface-container-low"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wide mb-1">Plot Area (sq ft)</label>
                  <input
                    type="number"
                    required
                    value={plotArea}
                    onChange={(e) => setPlotArea(e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-full bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-muted-foreground/40 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-outline-variant/40 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 shadow-md transition-all active:scale-95 cursor-pointer border border-primary/20"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

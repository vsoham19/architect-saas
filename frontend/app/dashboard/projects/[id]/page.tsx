'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDBStore } from '../../../../store/dbStore';
import { useAuthStore } from '../../../../store/authStore';
import { 
  FolderKanban, FileText, CheckSquare, Users, History as HistoryIcon,
  Plus, Upload, Edit, Clock, Settings, ArrowUpRight, CheckCircle2, ChevronRight, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { currentUser, currentRole } = useAuthStore();
  const { 
    projects, teams, teamMembers, tasks, documents, 
    documentVersions, activityLogs, updateProjectStatus, 
    createTask, uploadDocumentVersion, assignTeamMembers
  } = useDBStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'tasks' | 'team' | 'history'>('overview');

  // Modal / Form States
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // New Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskJunior, setTaskJunior] = useState('');
  const [taskSenior, setTaskSenior] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // New Drawing Form
  const [docName, setDocName] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [changelog, setChangelog] = useState('');

  // Find Project
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    return (
      <div className="py-20 text-center text-xs font-semibold text-slate-500">
        <AlertCircle className="mx-auto text-rose-500 mb-2" size={32} />
        Project not found.
      </div>
    );
  }

  // Find Team
  const team = teams.find(t => t.project_id === projectId);
  const projectMembers = team ? teamMembers.filter(m => m.team_id === team.id) : [];

  // Project Lists
  const projectTasks = tasks.filter(t => t.project_id === projectId);
  const projectDocs = documents.filter(d => d.project_id === projectId);
  const projectActivities = activityLogs
    .filter(act => act.project_id === projectId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Task progress calculations
  const totalTasks = projectTasks.length;
  const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Handle Task Submit
  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDueDate) return;

    createTask({
      projectId,
      title: taskTitle,
      description: taskDesc,
      assignedJuniorId: taskJunior || null,
      assignedSeniorId: taskSenior || null,
      dueDate: new Date(taskDueDate).toISOString(),
      creatorId: currentUser?.id || '00000000-0000-0000-0000-000000000001'
    });

    setTaskTitle('');
    setTaskDesc('');
    setTaskJunior('');
    setTaskSenior('');
    setTaskDueDate('');
    setShowTaskModal(false);
  };

  // Handle Doc Submit
  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName) return;

    uploadDocumentVersion({
      projectId,
      documentName: docName,
      description: docDesc,
      changelog: changelog || 'Initial draft upload',
      fileUrl: `/drawings/${docName.toLowerCase().replace(/\s+/g, '_')}_v1.jpg`,
      fileSize: Math.floor(Math.random() * 15000000) + 5000000,
      uploadedBy: currentUser?.id || '00000000-0000-0000-0000-000000000001'
    });

    setDocName('');
    setDocDesc('');
    setChangelog('');
    setShowDocModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'text-emerald-400 bg-emerald-500/5 border-emerald-500/15';
      case 'upcoming': return 'text-amber-400 bg-amber-400/5 border-amber-400/15';
      case 'completed': return 'text-indigo-400 bg-indigo-500/5 border-indigo-500/15';
      default: return 'text-slate-400 bg-slate-500/5 border-slate-500/15';
    }
  };

  const getDocStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-emerald-400 bg-emerald-500/5 border-emerald-500/15';
      case 'changes_proposed': return 'text-rose-400 bg-rose-500/5 border-rose-500/15';
      default: return 'text-amber-400 bg-amber-400/5 border-amber-400/15';
    }
  };

  // List of all mock users to assign
  const allUsersList = useAuthStore.getState().allUsers;

  return (
    <div className="space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold font-mono uppercase px-2.5 py-0.5 rounded-full border ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">
              Created {new Date(project.created_at).toLocaleDateString()}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-2">{project.name}</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">{project.description}</p>
        </div>

        {/* Status Actions */}
        {(currentRole === 'principal' || currentRole === 'admin') && (
          <div className="flex items-center gap-3">
            <select
              value={project.status}
              onChange={(e) => updateProjectStatus(projectId, e.target.value as any, currentUser?.id || '00000000-0000-0000-0000-000000000001')}
              className="text-xs font-bold bg-secondary border border-border rounded-xl px-3 py-2 focus:outline-none cursor-pointer text-foreground"
            >
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-border/80 overflow-x-auto gap-2">
        {[
          { id: 'overview', name: 'Overview', icon: FolderKanban },
          { id: 'documents', name: 'Drawing Vault', icon: FileText },
          { id: 'tasks', name: 'Task Board', icon: CheckSquare },
          { id: 'team', name: 'Crews & Workloads', icon: Users },
          { id: 'history', name: 'Activity History', icon: HistoryIcon }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3.5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Panel */}
              <div className="p-6 rounded-2xl border border-border bg-card">
                <h3 className="text-sm font-extrabold text-foreground mb-4">Milestone Tracker</h3>
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground mb-2">
                  <span>Task Egress Progress</span>
                  <span>{progressPercent}% ({completedTasks}/{totalTasks} tasks completed)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-secondary overflow-hidden mb-6">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-secondary/30 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Drawings</p>
                    <p className="text-lg font-black text-foreground mt-1">{projectDocs.length}</p>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Team Size</p>
                    <p className="text-lg font-black text-foreground mt-1">{projectMembers.length}</p>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Pending Reviews</p>
                    <p className="text-lg font-black text-amber-500 mt-1">
                      {projectDocs.filter(d => d.status !== 'approved').length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Project details list */}
              <div className="p-6 rounded-2xl border border-border bg-card space-y-4 text-xs font-semibold text-foreground">
                <h3 className="text-sm font-extrabold mb-2">Specifications & Brief</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] uppercase text-muted-foreground">Architectural Design Phase</span>
                    <span className="block mt-1 font-bold text-foreground">Parametric Facade Subdivision & HVAC grid alignment</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-muted-foreground">Safety Certification Target</span>
                    <span className="block mt-1 font-bold text-indigo-400">LEED Gold & Local fire code Part 4</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Team Roster Panel */}
            <div className="p-6 rounded-2xl border border-border bg-card">
              <h3 className="text-sm font-extrabold text-foreground mb-4">Assigned Team</h3>
              <div className="space-y-4">
                {projectMembers.map((m) => {
                  const user = allUsersList.find(u => u.id === m.user_id);
                  return (
                    <div key={m.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {user?.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                            {user?.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-foreground">{user?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-secondary border border-border text-slate-400">
                        {m.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Drawings Vault */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-extrabold text-foreground">Blueprints & Specifications</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click on drawing files to open the collaborative workspace and review version branches.
                </p>
              </div>
              <button
                onClick={() => setShowDocModal(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 font-bold transition-all text-xs cursor-pointer text-foreground"
              >
                <Upload size={14} />
                Upload New Drawing
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectDocs.map((doc) => {
                const docVer = documentVersions.find(v => v.id === doc.current_version_id);
                return (
                  <div
                    key={doc.id}
                    className="p-5 rounded-2xl border border-border bg-card flex flex-col justify-between h-48 hover:shadow-lg transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${getDocStatusColor(doc.status)}`}>
                          {doc.status.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold font-mono">{docVer?.version_number || 'v1.0.0'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground mt-3 leading-tight">{doc.name}</h4>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{doc.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[9px] text-slate-500 font-medium">
                        Size: {docVer ? (docVer.file_size / 1024 / 1024).toFixed(1) : '10'} MB
                      </span>
                      <Link
                        href={`/dashboard/workspace/${doc.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                      >
                        Enter Workspace
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Tasks Board */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-extrabold text-foreground">Project Tasks Listing</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Breakdown of individual technical tasks.
                </p>
              </div>

              {(currentRole === 'principal' || currentRole === 'senior' || currentRole === 'admin') && (
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95 shadow-md text-xs cursor-pointer"
                >
                  <Plus size={14} />
                  Add Task
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-left text-xs font-semibold text-foreground">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-3.5 px-5">Task Details</th>
                    <th className="py-3.5 px-5">Assignee (Junior)</th>
                    <th className="py-3.5 px-5">Supervisor (Senior)</th>
                    <th className="py-3.5 px-5">Due Date</th>
                    <th className="py-3.5 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {projectTasks.map((task) => {
                    const junior = allUsersList.find(u => u.id === task.assigned_junior_id);
                    const senior = allUsersList.find(u => u.id === task.assigned_senior_id);
                    return (
                      <tr key={task.id} className="hover:bg-secondary/15 transition-colors">
                        <td className="py-4 px-5">
                          <p className="font-bold text-foreground">{task.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 max-w-sm">{task.description}</p>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            {junior?.avatar_url && (
                              <img src={junior.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                            )}
                            <span>{junior?.name || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5">{senior?.name || 'Unassigned'}</td>
                        <td className="py-4 px-5 text-slate-500">{new Date(task.due_date).toLocaleDateString()}</td>
                        <td className="py-4 px-5">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] border uppercase ${
                            task.status === 'completed'
                              ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/15'
                              : task.status === 'review'
                              ? 'text-amber-400 bg-amber-400/5 border-amber-400/15'
                              : task.status === 'blocked'
                              ? 'text-rose-400 bg-rose-500/5 border-rose-500/15'
                              : 'text-slate-400 bg-slate-500/5 border-slate-500/15'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Team */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-extrabold text-foreground">Crew Roster</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Principal can adjust assigned personnel and review individual workloads.
                </p>
              </div>

              {(currentRole === 'principal' || currentRole === 'admin') && (
                <button
                  onClick={() => setShowTeamModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 font-bold transition-all text-xs cursor-pointer text-foreground"
                >
                  <Edit size={14} />
                  Adjust Crew Assignments
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectMembers.map((m) => {
                const user = allUsersList.find(u => u.id === m.user_id);
                // Count active tasks for this member in this project
                const activeProjTasks = projectTasks.filter(
                  t => (t.assigned_junior_id === m.user_id || t.assigned_senior_id === m.user_id) && t.status !== 'completed'
                ).length;

                return (
                  <div key={m.id} className="p-5 rounded-2xl border border-border bg-card flex flex-col justify-between h-40">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {user?.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-black text-white">
                            {user?.name[0]}
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-foreground">{user?.name}</h4>
                          <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-secondary border border-border text-slate-400">
                        {m.role}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                      <span>Active Project Tasks</span>
                      <span className="text-foreground">{activeProjTasks} Tasks</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 5: History */}
        {activeTab === 'history' && (
          <div className="p-6 rounded-2xl border border-border bg-card">
            <h3 className="text-md font-extrabold text-foreground mb-6">Project Activity History</h3>

            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {projectActivities.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No activity logs recorded.
                </div>
              ) : (
                projectActivities.map((act) => {
                  const author = allUsersList.find(u => u.id === act.user_id);
                  return (
                    <div key={act.id} className="flex gap-4 relative">
                      <div className="h-4 w-4 rounded-full border-4 border-card bg-primary z-10 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {author?.name || 'User'}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          {act.details}
                        </p>
                        <span className="text-[9px] font-mono text-slate-500 mt-2 block flex items-center gap-1">
                          <Clock size={8} />
                          {new Date(act.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTaskModal(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl z-10">
            <h3 className="text-md font-bold text-foreground mb-4">Add Project Task</h3>
            <form onSubmit={handleTaskSubmit} className="space-y-4 text-xs font-semibold text-foreground">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Subdivide facade parametric divisions"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Description</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Outline task deliverables, resources, codes..."
                  rows={3}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Assign Junior</label>
                  <select
                    value={taskJunior}
                    onChange={(e) => setTaskJunior(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:outline-none text-foreground"
                  >
                    <option value="">-- Choose Junior --</option>
                    {allUsersList.filter(u => u.role === 'junior').map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Assign Supervisor (Senior)</label>
                  <select
                    value={taskSenior}
                    onChange={(e) => setTaskSenior(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:outline-none text-foreground"
                  >
                    <option value="">-- Choose Senior --</option>
                    {allUsersList.filter(u => u.role === 'senior').map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 shadow-md cursor-pointer"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawing Upload Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDocModal(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl z-10">
            <h3 className="text-md font-bold text-foreground mb-4">Upload Design Drawing</h3>
            <form onSubmit={handleDocSubmit} className="space-y-4 text-xs font-semibold text-foreground">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Drawing Filename</label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Auditorium Section Grid.pdf"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Description</label>
                <textarea
                  value={docDesc}
                  onChange={(e) => setDocDesc(e.target.value)}
                  placeholder="Describe structural sections, dimensions, standards..."
                  rows={2}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Revision Changelog</label>
                <input
                  type="text"
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  placeholder="e.g. Adjusted anchor dimensions at grid H-9"
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 shadow-md cursor-pointer"
                >
                  Upload Drawing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Crew Assignments Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTeamModal(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl z-10">
            <h3 className="text-md font-bold text-foreground mb-2">Adjust Crew Assignments</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Specify which team members are allocated to the {team?.name || 'project team'}.
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {allUsersList.filter(u => u.role !== 'admin').map((u) => {
                const isAssigned = projectMembers.some(pm => pm.user_id === u.id);
                
                const handleToggleUser = () => {
                  if (!team) return;
                  let updatedMems: { userId: string; role: any }[] = [];
                  
                  if (isAssigned) {
                    // Remove
                    updatedMems = projectMembers
                      .filter(pm => pm.user_id !== u.id)
                      .map(pm => ({ userId: pm.user_id, role: pm.role }));
                  } else {
                    // Add
                    updatedMems = [
                      ...projectMembers.map(pm => ({ userId: pm.user_id, role: pm.role })),
                      { userId: u.id, role: u.role }
                    ];
                  }
                  
                  assignTeamMembers(team.id, updatedMems);
                };

                return (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-xl border border-border/60 bg-secondary/20 hover:bg-secondary/40">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">
                          {u.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-foreground">{u.name}</p>
                        <span className="text-[9px] uppercase font-mono text-slate-500">{u.role}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleToggleUser}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border ${
                        isAssigned 
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' 
                          : 'bg-primary text-primary-foreground border-transparent hover:bg-primary/95'
                      }`}
                    >
                      {isAssigned ? 'Deallocate' : 'Allocate'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-4">
              <button
                onClick={() => setShowTeamModal(false)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 shadow-md cursor-pointer text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

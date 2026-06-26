'use client';

import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useDBStore } from '../../../../store/dbStore';
import { useAuthStore } from '../../../../store/authStore';
import CustomSelect from '../../../../components/CustomSelect';
import { 
  FolderKanban, FileText, CheckSquare, Users, History as HistoryIcon,
  Plus, Upload, Edit, Clock, Settings, ArrowUpRight, CheckCircle2, ChevronRight, AlertCircle, ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  const { currentUser, currentRole } = useAuthStore();
  const { 
    projects, teams, teamMembers, tasks, documents, 
    documentVersions, activityLogs, updateProjectStatus, 
    createTask, uploadDocumentVersion, assignTeamMembers
  } = useDBStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'tasks' | 'team' | 'history'>('overview');

  React.useEffect(() => {
    const tabParam = searchParams.get('tab');
    const openUploadParam = searchParams.get('openUpload');
    const taskIdParam = searchParams.get('taskId');

    if (tabParam === 'documents') {
      setActiveTab('documents');
    }
    if (openUploadParam === 'true') {
      setShowDocModal(true);
      if (taskIdParam) {
        const task = tasks.find(t => t.id === taskIdParam);
        if (task) {
          setDocName(`${task.title} Drawing.dwg`);
          setDocDesc(`Deliverable drawing for task: ${task.title}`);
        }
      }
    }
  }, [searchParams, tasks]);

  // Modal / Form States
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [visibleLogsCount, setVisibleLogsCount] = useState(10);

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
  const [builtUpArea, setBuiltUpArea] = useState('0');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Find Project
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    return (
      <div className="py-20 text-center text-xs font-semibold text-muted-foreground">
        <AlertCircle className="mx-auto text-destructive mb-2" size={32} />
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
  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName) return;

    if (!selectedFile) {
      alert("Please select a blueprint file first.");
      return;
    }

    const taskIdParam = searchParams.get('taskId');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const result = await uploadDocumentVersion({
          projectId,
          documentName: docName,
          description: docDesc,
          changelog: changelog || 'Initial draft upload',
          fileUrl: base64,
          fileSize: selectedFile.size,
          uploadedBy: currentUser?.id || '00000000-0000-0000-0000-000000000001',
          builtUpArea: Number(builtUpArea) || 0
        });

        if (result && result.ver && taskIdParam) {
          // 1. Link new drawing version to the task
          await useDBStore.getState().updateTaskFields(taskIdParam, {
            attached_version_id: result.ver.id,
            status: 'review'
          });

          // 2. Notify the senior supervisor and principal
          const task = tasks.find(t => t.id === taskIdParam);
          const projMembers = teamMembers.filter(tm => tm.team_id === `team-${projectId}`);
          projMembers.forEach(m => {
            if (m.user_id !== currentUser?.id && (m.role === 'senior' || m.role === 'principal')) {
              useDBStore.getState().addNotification({
                user_id: m.user_id,
                sender_id: currentUser?.id || null,
                type: 'approval_required',
                title: 'Task Drawing uploaded in Vault',
                message: `A new version of drawing for task "${task?.title || 'Task'}" has been uploaded to the Vault by ${currentUser?.name || 'Junior'}. Comment: "${changelog || 'No comments'}"`,
                metadata: { project_id: projectId, task_id: taskIdParam, document_id: result.doc.id, version_id: result.ver.id }
              });
            }
          });

          // Trigger activity log in DB store
          useDBStore.getState().addActivityLog({
            project_id: projectId,
            user_id: currentUser?.id || '',
            action: 'task_upload',
            details: `Uploaded deliverable drawing in vault for task "${task?.title || 'Task'}": "${changelog || 'No comment'}"`
          });

          alert("Drawing uploaded to Vault and task submitted for review successfully!");
        } else {
          alert("Drawing uploaded to Vault successfully!");
        }
      } catch (err) {
        console.error("Upload failed", err);
        alert("Failed to upload drawing.");
      }

      setDocName('');
      setDocDesc('');
      setChangelog('');
      setBuiltUpArea('0');
      setSelectedFile(null);
      setShowDocModal(false);

      // Clean up query parameters from the URL
      router.replace(`/dashboard/projects/${projectId}?tab=documents`);
    };
    reader.onerror = () => {
      alert("Failed to read selection file.");
    };
    reader.readAsDataURL(selectedFile);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'text-emerald-700 bg-emerald-50 border-emerald-200/60';
      case 'upcoming': return 'text-amber-700 bg-amber-50 border-amber-200/60';
      case 'completed': return 'text-teal-700 bg-teal-50 border-teal-200/60';
      default: return 'text-muted-foreground bg-secondary border-border';
    }
  };

  const getDocStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-emerald-700 bg-emerald-50 border-emerald-200/60';
      case 'changes_proposed': return 'text-rose-700 bg-rose-50 border-rose-200/60';
      default: return 'text-amber-700 bg-amber-50 border-amber-200/60';
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
          <h1 className="text-2xl font-extrabold text-foreground mt-2">{project.name}</h1>
          <p className="text-muted-foreground text-xs mt-1 max-w-2xl">{project.description}</p>
        </div>

        {/* Status Actions */}
        {(currentRole === 'principal' || currentRole === 'admin') && (
          <div className="flex items-center gap-3">
            <CustomSelect
              value={project.status}
              onChange={(val) => updateProjectStatus(projectId, val as any, currentUser?.id || '00000000-0000-0000-0000-000000000001')}
              options={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'ongoing', label: 'Ongoing' },
                { value: 'completed', label: 'Completed' },
                { value: 'archived', label: 'Archived' }
              ]}
              className="w-32 text-xs font-bold"
            />
            <button
              type="button"
              onClick={async () => {
                // Delete immediately on click without confirmation
                await useDBStore.getState().deleteProject(projectId, currentUser?.id || '');
                router.push('/dashboard/projects');
              }}
              className="px-4 py-2 border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Delete Project
            </button>
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
                  <div className="p-3 bg-secondary/40 border border-border/40 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Drawings</p>
                    <p className="text-lg font-black text-foreground mt-1">{projectDocs.length}</p>
                  </div>
                  <div className="p-3 bg-secondary/40 border border-border/40 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Team Size</p>
                    <p className="text-lg font-black text-foreground mt-1">{projectMembers.length}</p>
                  </div>
                  <div className="p-3 bg-secondary/40 border border-border/40 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Pending Reviews</p>
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
                    <span className="block mt-1 font-bold text-primary">LEED Gold & Local fire code Part 4</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-muted-foreground">Ahmedabad Zone & FSI Limit</span>
                    <span className="block mt-1 font-bold text-foreground">
                      {project.zone || 'R1'} (Limit: {project.zone === 'R2' ? '1.2' : project.zone === 'Commercial' ? '2.7' : project.zone === 'TOZ' ? '4.0' : '1.8'})
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-muted-foreground">Plot Area (sq ft)</span>
                    <span className="block mt-1 font-bold text-foreground">
                      {project.plot_area?.toLocaleString() || '10,000'} sq ft
                    </span>
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
                          <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {user?.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-foreground">{user?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
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
                        <span className="text-[10px] text-muted-foreground font-bold font-mono">{docVer?.version_number || 'v1.0.0'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground mt-3 leading-tight hover:text-primary transition-colors">
                        <Link href={`/dashboard/workspace/${doc.id}`}>
                          {doc.name}
                        </Link>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{doc.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground font-medium">
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
                        <td className="py-4 px-5 text-muted-foreground">{new Date(task.due_date).toLocaleDateString()}</td>
                        <td className="py-4 px-5">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] border uppercase ${
                            task.status === 'completed'
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
                              : task.status === 'review'
                              ? 'text-amber-700 bg-amber-50 border-amber-200/60'
                              : task.status === 'blocked'
                              ? 'text-rose-700 bg-rose-50 border-rose-200/60'
                              : 'text-muted-foreground bg-secondary border-border'
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
                          <div className="h-10 w-10 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-black text-muted-foreground">
                            {user?.name[0]}
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-foreground">{user?.name}</h4>
                          <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
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
                <div className="py-12 text-center text-muted-foreground text-xs">
                  No activity logs recorded.
                </div>
              ) : (
                <>
                  {projectActivities.slice(0, visibleLogsCount).map((act) => {
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
                          <span className="text-[9px] font-mono text-muted-foreground/50 mt-2 block flex items-center gap-1">
                            <Clock size={8} />
                            {new Date(act.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {projectActivities.length > visibleLogsCount && (
                    <div className="pt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisibleLogsCount(prev => prev + 10)}
                        className="px-4 py-2 border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                      >
                        <ChevronDown size={14} className="text-muted-foreground" />
                        Load More Activities
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md" onClick={() => setShowTaskModal(false)} />
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
                  <CustomSelect
                    value={taskJunior}
                    onChange={setTaskJunior}
                    options={allUsersList.filter(u => u.role === 'junior').map(u => ({ value: u.id, label: u.name }))}
                    placeholder="-- Choose Junior --"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Assign Supervisor (Senior)</label>
                  <CustomSelect
                    value={taskSenior}
                    onChange={setTaskSenior}
                    options={allUsersList.filter(u => u.role === 'senior').map(u => ({ value: u.id, label: u.name }))}
                    placeholder="-- Choose Senior --"
                    className="w-full"
                  />
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
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md" onClick={() => setShowDocModal(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl z-10">
            <h3 className="text-md font-bold text-foreground mb-4">Upload Design Drawing</h3>
            <form onSubmit={handleDocSubmit} className="space-y-4 text-xs font-semibold text-foreground">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Select Blueprint File</label>
                <div className="border border-dashed border-border rounded-xl p-4 text-center hover:bg-secondary/35 transition-colors cursor-pointer relative bg-secondary/10">
                  <input
                    type="file"
                    accept="image/*,.dwg"
                    required={!docName}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        setDocName(file.name);
                        if (!docDesc) {
                          setDocDesc(`Deliverable drawing for ${file.name}`);
                        }
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="mx-auto text-muted-foreground mb-1.5" size={16} />
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    {docName ? `Selected: ${docName}` : 'Click to choose drawing blueprint image'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Drawing Filename</label>
                  <input
                    type="text"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Auditorium Section Grid.dwg"
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Built-up Area (sq ft)</label>
                  <input
                    type="number"
                    required
                    value={builtUpArea}
                    onChange={(e) => setBuiltUpArea(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                  />
                </div>
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
                <label className="block text-[11px] text-muted-foreground mb-1">Revision Changelog / Comments (for Reviewers)</label>
                <textarea
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  placeholder="e.g. Liam: Relocated fire doors. Senior and principal, please review!"
                  rows={2}
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
                  Upload Drawing & Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Crew Assignments Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md" onClick={() => setShowTeamModal(false)} />
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
                        <div className="h-7 w-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {u.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-foreground">{u.name}</p>
                        <span className="text-[9px] uppercase font-mono text-muted-foreground">{u.role}</span>
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

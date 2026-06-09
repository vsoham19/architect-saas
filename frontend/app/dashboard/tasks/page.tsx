'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDBStore } from '../../../store/dbStore';
import { useAuthStore } from '../../../store/authStore';
import { 
  Plus, Search, ListFilter, KanbanSquare, Table, 
  MessageSquare, Calendar, ChevronRight, X, Clock, AlertCircle, PlusCircle, Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskStatus } from '../../../types';
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hn = window.location.hostname;
    if (hn === 'localhost' || hn === '127.0.0.1' || hn === '[::1]' || hn.startsWith('192.168.') || hn.startsWith('10.') || hn.startsWith('172.')) {
      return 'http://localhost:5000';
    }
  }
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return rawApiUrl.replace(/\/$/, '');
};
const API_URL = getApiUrl();
export default function TaskBoardPage() {
  const { currentRole, currentUser } = useAuthStore();
  const { tasks, projects, documents, documentVersions, createTask, updateTaskStatus, deleteTask } = useDBStore();

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [projectFilter, setProjectFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Selected Task for Drawer
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentsFeed, setCommentsFeed] = useState<Record<string, { id: string; user: string; text: string; date: string }[]>>({
    'tk-1': [
      { id: 'c-1', user: 'David Miller', text: 'Checked loading joints. Subdivisions need to align with facade beams.', date: '2026-06-03T10:15:00Z' }
    ],
    'tk-2': [
      { id: 'c-2', user: 'Liam Chen', text: 'Submitted HVAC route sections. Secondary ducts aligned to concrete slab core.', date: '2026-06-04T09:15:00Z' }
    ]
  });

  // Task Creation Form Drawer
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProjId, setTaskProjId] = useState('');
  const [taskJunior, setTaskJunior] = useState('');
  const [taskSenior, setTaskSenior] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // 1. Filtering
  const filteredTasks = tasks.filter(t => {
    const matchesProject = projectFilter === 'all' ? true : t.project_id === projectFilter;
    const matchesAssignee = assigneeFilter === 'all' ? true : t.assigned_junior_id === assigneeFilter;
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.description.toLowerCase().includes(search.toLowerCase());
    return matchesProject && matchesAssignee && matchesSearch;
  });

  // Kanban Columns
  const columns: { id: TaskStatus; label: string; color: string; border: string }[] = [
    { id: 'pending', label: 'Pending Drafts', color: 'bg-slate-50 text-slate-600', border: 'border-slate-200' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
    { id: 'review', label: 'Under Review', color: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
    { id: 'completed', label: 'Completed', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
    { id: 'blocked', label: 'Blocked', color: 'bg-rose-50 text-rose-700', border: 'border-rose-200' }
  ];

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskProjId || !taskDueDate) return;

    createTask({
      projectId: taskProjId,
      title: taskTitle,
      description: taskDesc,
      assignedJuniorId: taskJunior || null,
      assignedSeniorId: taskSenior || null,
      dueDate: new Date(taskDueDate).toISOString(),
      creatorId: currentUser?.id || '00000000-0000-0000-0000-000000000001'
    });

    setTaskTitle('');
    setTaskDesc('');
    setTaskProjId('');
    setTaskJunior('');
    setTaskSenior('');
    setTaskDueDate('');
    setShowCreateDrawer(false);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newCommentText.trim()) return;

    const newComment = {
      id: `comm-${Date.now()}`,
      user: currentUser?.name || 'User',
      text: newCommentText.trim(),
      date: new Date().toISOString()
    };

    setCommentsFeed(prev => ({
      ...prev,
      [selectedTask.id]: [...(prev[selectedTask.id] || []), newComment]
    }));

    // Trigger activity log in DB store
    useDBStore.getState().addActivityLog({
      project_id: selectedTask.project_id,
      user_id: currentUser?.id || '',
      action: 'task_comment',
      details: `Commented on task "${selectedTask.title}": "${newComment.text}"`
    });

    setNewCommentText('');
  };

    const getRelativeTime = (isoString: string) => {
    return new Date(isoString).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  };

  const allUsersList = useAuthStore.getState().allUsers;

  return (
    <div className="space-y-8 select-none relative min-h-screen pb-20 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono uppercase">Task Board</h1>
          <p className="text-slate-500 text-sm">
            Coordinate structural details, drafts, egress calculations, and supervisor sign-offs.
          </p>
        </div>

        {(currentRole === 'principal' || currentRole === 'senior' || currentRole === 'admin') && (
          <button
            onClick={() => setShowCreateDrawer(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {/* Filters & View Switcher */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Left: View Mode Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto border border-slate-200">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <KanbanSquare size={14} />
            Kanban Grid
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Table size={14} />
            Table View
          </button>
        </div>

        {/* Right: Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Junior Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Juniors</option>
            {allUsersList.filter(u => u.role === 'junior').map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Grid View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="space-y-4">
                {/* Column Title */}
                <div className={`p-3 rounded-xl border ${col.border} ${col.color} flex justify-between items-center`}>
                  <span className="text-xs font-extrabold uppercase tracking-wider">{col.label}</span>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-card shadow-sm border border-border/40">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Card List */}
                <div className="space-y-3 min-h-[300px]">
                  {colTasks.map((task) => {
                    const proj = projects.find(p => p.id === task.project_id);
                    const junior = allUsersList.find(u => u.id === task.assigned_junior_id);
                    const commentsCount = commentsFeed[task.id]?.length || 0;
                    
                    return (
                      <motion.div
                        key={task.id}
                        layoutId={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="p-4 rounded-xl border border-border bg-card hover:shadow-md cursor-pointer transition-all hover:scale-[1.01]"
                      >
                        <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded">
                          {proj?.name.split(' ')[0]}
                        </span>
                        
                        <h4 className="text-xs font-bold text-foreground mt-2 line-clamp-2 leading-relaxed">
                          {task.title}
                        </h4>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40 text-[9px] font-semibold text-slate-500">
                          {/* Assignee Avatar */}
                          <div className="flex items-center gap-1.5">
                            {junior?.avatar_url ? (
                              <img src={junior.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                            ) : (
                              <div className="h-5 w-5 rounded-full bg-slate-800 flex items-center justify-center font-black text-white">
                                {junior ? junior.name[0] : 'U'}
                              </div>
                            )}
                            <span className="text-slate-400 truncate max-w-[70px]">{junior?.name || 'Unassigned'}</span>
                          </div>

                          {/* Upload button for junior */}
                          {currentRole === 'junior' && task.assigned_junior_id === currentUser?.id && (
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                id={`upload-${task.id}`}
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const formData = new FormData();
                                  formData.append('file', file);
                                  try {
                                    const res = await fetch(`${API_URL}/api/tasks/${task.id}/upload`, {
                                      method: 'POST',
                                      body: formData,
                                    });
                                    const data = await res.json();
                                    if (res.ok && data.attached_version_id) {
                                      // Update task with attached version and set status to review
                                      useDBStore.getState().updateTaskFields(task.id, {
                                        attached_version_id: data.attached_version_id,
                                        status: 'review',
                                      });
                                    }
                                  } catch (err) {
                                    console.error('Upload failed', err);
                                  }
                                }}
                              />
                              <label htmlFor={`upload-${task.id}`} className="cursor-pointer text-xs text-blue-600 hover:underline">
                                Upload Image
                              </label>
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex items-center gap-2">
                            {commentsCount > 0 && (
                              <span className="flex items-center gap-0.5" title="Comments">
                                <MessageSquare size={10} />
                                {commentsCount}
                              </span>
                            )}
                            <span className="flex items-center gap-0.5" title="Due Date">
                              <Calendar size={10} />
                              {new Date(task.due_date).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-xs font-semibold text-foreground">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-3.5 px-5">Task Details</th>
                <th className="py-3.5 px-5">Project Name</th>
                <th className="py-3.5 px-5">Assignee (Junior)</th>
                <th className="py-3.5 px-5">Supervisor (Senior)</th>
                <th className="py-3.5 px-5">Due Date</th>
                <th className="py-3.5 px-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTasks.map((task) => {
                const proj = projects.find(p => p.id === task.project_id);
                const junior = allUsersList.find(u => u.id === task.assigned_junior_id);
                const senior = allUsersList.find(u => u.id === task.assigned_senior_id);
                return (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-5">
                      <p className="font-bold text-slate-800">{task.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-sm">{task.description}</p>
                    </td>
                    <td className="py-4 px-5 text-blue-600 font-bold">{proj?.name}</td>
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
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : task.status === 'review'
                          ? 'text-amber-700 bg-amber-50 border-amber-200'
                          : task.status === 'blocked'
                          ? 'text-rose-700 bg-rose-50 border-rose-200'
                          : 'text-slate-650 bg-slate-100 border-slate-200'
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
      )}

      {/* Task Details Drawer */}
      <AnimatePresence>
        {selectedTask && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="fixed inset-0 bg-black/60 z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-card border-l border-border shadow-2xl z-50 flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-6 border-b border-border flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/5 px-2.5 py-0.5 border border-indigo-500/15 rounded">
                    {projects.find(p => p.id === selectedTask.project_id)?.name}
                  </span>
                  <h3 className="text-sm font-bold text-foreground mt-3 leading-relaxed">
                    {selectedTask.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable details */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-semibold text-foreground">
                {/* Status + Assignees */}
                <div className="grid grid-cols-2 gap-4 border-b border-border/60 pb-6">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 mb-1">Task Status</label>
                    <select
                      value={selectedTask.status}
                      onChange={(e) => {
                        updateTaskStatus(selectedTask.id, e.target.value as any, currentUser?.id || '00000000-0000-0000-0000-000000000001');
                        // Update current drawer task status representation
                        setSelectedTask({ ...selectedTask, status: e.target.value as any });
                      }}
                      className="bg-secondary border border-border rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer text-foreground"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Submit for Review</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 mb-1">Due Date</label>
                    <span className="inline-flex items-center gap-1.5 text-foreground py-1">
                      <Calendar size={14} className="text-slate-400" />
                      {new Date(selectedTask.due_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-border/60 pb-6">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 mb-1">Assigned Junior</label>
                    <span className="block text-foreground mt-0.5">
                      {allUsersList.find(u => u.id === selectedTask.assigned_junior_id)?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-500 mb-1">Supervisor (Senior)</label>
                    <span className="block text-foreground mt-0.5">
                      {allUsersList.find(u => u.id === selectedTask.assigned_senior_id)?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 mb-1">Description</label>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line mt-1">
                    {selectedTask.description}
                  </p>
                </div>

                {/* Deliverable Section */}
                <div className="space-y-3">
                  <label className="block text-[10px] uppercase text-slate-500 font-extrabold tracking-wider">Deliverable Drawing</label>
                  
                  {selectedTask.attached_version_id ? (() => {
                    const attachedVersion = documentVersions.find(v => v.id === selectedTask.attached_version_id);
                    const attachedDoc = documents.find(d => d.id === attachedVersion?.document_id);
                    
                    const tag = useDBStore.getState().approvalTaskTags.find(t => t.task_id === selectedTask.id);
                    const appRecord = useDBStore.getState().documentApprovals.find(a => a.id === tag?.approval_id);
                    const oldVersionId = appRecord?.document_version_id;
                    const oldVer = documentVersions.find(v => v.id === oldVersionId);
                    
                    return (
                      <div className="p-4 rounded-2xl border border-border bg-slate-50/50 space-y-3 text-xs">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-extrabold text-slate-800 uppercase block tracking-wider text-[10px]">
                              {attachedDoc?.name || 'Attached Drawing'}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 inline-block font-mono">
                              REV: {attachedVersion?.version_number} // {attachedVersion ? (attachedVersion.file_size / 1024 / 1024).toFixed(1) : '0'} MB
                            </span>
                          </div>
                          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border text-amber-700 bg-amber-50 border-amber-200">
                            {attachedVersion?.status || 'pending'}
                          </span>
                        </div>

                        {attachedVersion?.changelog && (
                          <p className="text-[10px] text-slate-500 italic bg-white p-2 rounded-lg border border-border/40">
                            Changelog: {attachedVersion.changelog}
                          </p>
                        )}

                        <div className="flex gap-2 pt-1">
                          {attachedDoc && attachedVersion && (
                            <Link
                              href={`/dashboard/workspace/${attachedDoc.id}?version=${attachedVersion.id}`}
                              className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-center text-[10px] uppercase tracking-wider transition-all border border-indigo-200/50"
                            >
                              Open Workspace
                            </Link>
                          )}
                          {attachedDoc && attachedVersion && oldVer && (
                            <Link
                              href={`/dashboard/workspace/${attachedDoc.id}?version=${attachedVersion.id}&compare=${oldVer.id}`}
                              className="flex-1 py-2 bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-xl text-center text-[10px] uppercase tracking-wider transition-all shadow-sm"
                            >
                              Compare Slider (vs {oldVer.version_number})
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })() : (
                    <p className="text-slate-450 italic text-[11px]">No deliverable drawings uploaded yet.</p>
                  )}

                  {/* Redirect link to Design Vault for upload */}
                  {(currentUser?.id === selectedTask.assigned_junior_id || currentUser?.id === selectedTask.assigned_senior_id) && (
                    <div className="pt-2">
                      <Link
                        href={`/dashboard/projects/${selectedTask.project_id}?tab=documents&openUpload=true&taskId=${selectedTask.id}`}
                        className="w-full py-2 border-2 border-dashed border-indigo-250 bg-indigo-50/10 text-indigo-650 hover:bg-indigo-50/30 font-bold rounded-xl text-center text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        + Upload Deliverable in Design Vault
                      </Link>
                    </div>
                  )}
                </div>

                {/* Comments Header */}
                <div className="border-t border-border pt-6 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <MessageSquare size={14} />
                    Comments & Activity ({commentsFeed[selectedTask.id]?.length || 0})
                  </h4>

                  {/* Comment List */}
                  <div className="space-y-4 max-h-48 overflow-y-auto pr-1">
                    {(!commentsFeed[selectedTask.id] || commentsFeed[selectedTask.id].length === 0) ? (
                      <p className="text-slate-500 text-xs italic text-center py-4">No comments posted yet.</p>
                    ) : (
                      commentsFeed[selectedTask.id].map((c) => (
                        <div key={c.id} className="p-3 bg-secondary/35 rounded-xl space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-foreground">{c.user}</span>
                            <span className="text-[9px] text-slate-500">{getRelativeTime(c.date)}</span>
                          </div>
                          <p className="text-muted-foreground text-xs leading-relaxed">{c.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Input */}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Type your response here..."
                      className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/95 transition-all text-xs cursor-pointer"
                    >
                      Post
                    </button>
                  </form>
                </div>
              </div>

              {/* Bottom deletion/actions */}
              {(currentRole === 'principal' || currentRole === 'admin') && (
                <div className="p-6 border-t border-border bg-secondary/30 flex justify-end">
                  <button
                    onClick={() => {
                      if (confirm("Delete this task permanently?")) {
                        deleteTask(selectedTask.id, currentUser?.id || '00000000-0000-0000-0000-000000000001');
                        setSelectedTask(null);
                      }
                    }}
                    className="px-4 py-2 border border-rose-500/30 bg-rose-500/5 text-rose-400 font-bold rounded-xl hover:bg-rose-500/10 transition-all text-xs cursor-pointer"
                  >
                    Delete Task
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Task Creation Drawer Modal */}
      {showCreateDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateDrawer(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-border bg-card shadow-2xl z-10">
            <h3 className="text-md font-bold text-foreground mb-4">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4 text-xs font-semibold text-foreground">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Select Project</label>
                <select
                  required
                  value={taskProjId}
                  onChange={(e) => setTaskProjId(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:outline-none text-foreground cursor-pointer"
                >
                  <option value="">-- Choose Project --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

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
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:outline-none text-foreground cursor-pointer"
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
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:outline-none text-foreground cursor-pointer"
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
                  onClick={() => setShowCreateDrawer(false)}
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
    </div>
  );
}

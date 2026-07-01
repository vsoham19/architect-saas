'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDBStore } from '../../../store/dbStore';
import { useAuthStore } from '../../../store/authStore';
import CustomSelect from '../../../components/CustomSelect';
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
  const { currentRole, currentUser, allUsers } = useAuthStore();
  const { tasks, projects, documents, documentVersions, createTask, updateTaskStatus, deleteTask } = useDBStore();

  const [projectFilter, setProjectFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [activeDragTaskId, setActiveDragTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<TaskStatus | null>(null);

  const handleDropTask = (taskId: string, newStatus: TaskStatus) => {
    updateTaskStatus(taskId, newStatus, currentUser?.id || '00000000-0000-0000-0000-000000000001');
  };

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

  // Filtering
  const filteredTasks = tasks.filter(t => {
    const matchesProject = projectFilter === 'all' ? true : t.project_id === projectFilter;
    const matchesAssignee = assigneeFilter === 'all' ? true : t.assigned_junior_id === assigneeFilter;
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.description.toLowerCase().includes(search.toLowerCase());
    return matchesProject && matchesAssignee && matchesSearch;
  });

  // Kanban Columns matching screenshots
  const columns: { id: TaskStatus; label: string; color: string; bullet: string; bg: string }[] = [
    { id: 'pending', label: 'Pending Drafts', color: 'text-on-surface-variant', bullet: 'bg-outline-variant', bg: 'bg-surface-container-low/40' },
    { id: 'in_progress', label: 'In Progress', color: 'text-primary', bullet: 'bg-primary', bg: 'bg-surface-container-low/45' },
    { id: 'review', label: 'Under Review', color: 'text-tertiary-container', bullet: 'bg-tertiary-container', bg: 'bg-surface-container-low/45' },
    { id: 'completed', label: 'Completed', color: 'text-primary-container', bullet: 'bg-primary-container', bg: 'bg-surface-container-low/40' },
    { id: 'blocked', label: 'Blocked', color: 'text-error', bullet: 'bg-error', bg: 'bg-error-container/10' }
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

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Maps project names to exact screenshot color badges
  const getProjectBadgeClass = (projName?: string) => {
    if (!projName) return 'bg-secondary-container/60 text-on-secondary-container';
    const name = projName.toLowerCase();
    if (name.includes('zenith')) {
      return 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]';
    }
    if (name.includes('helix')) {
      return 'bg-[#dbe6e3] text-[#346b5d] border-[#cadbd7]';
    }
    return 'bg-secondary-container/60 text-on-secondary-container border-outline-variant/35';
  };

  return (
    <div className="space-y-8 select-none relative min-h-screen pb-16 font-sans">
      
      {/* Header and Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-4 border-b border-outline-variant/30">
        <div>
          <h3 className="font-headline text-headline-lg font-bold text-on-surface">Structural Coordination</h3>
          <p className="text-on-surface-variant font-sans text-xs mt-1">
            Zenith & Helix Project Workstreams
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          
          {/* Project Filter */}
          <CustomSelect
            value={projectFilter}
            onChange={setProjectFilter}
            options={[
              { value: 'all', label: 'Project: All Projects' },
              ...projects.map(p => ({ value: p.id, label: `Project: ${p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name}` }))
            ]}
            variant="green"
            className="w-44 font-sans font-bold text-xs"
          />

          {/* Junior Filter */}
          <CustomSelect
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            options={[
              { value: 'all', label: 'Team: All Juniors' },
              ...allUsers.filter(u => u.role === 'junior').map(u => ({ value: u.id, label: `Team: ${u.name}` }))
            ]}
            variant="green"
            className="w-44 font-sans font-bold text-xs"
          />

          {/* Add Task Button */}
          {(currentRole === 'principal' || currentRole === 'senior' || currentRole === 'admin') && (
            <button
              onClick={() => setShowCreateDrawer(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95 px-4.5 py-2.25 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm active:scale-95 duration-150 transition-all border border-primary/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] font-bold">add_task</span>
              <span>Create Task</span>
            </button>
          )}

        </div>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 items-start">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="space-y-4">
              
              {/* Column Title Card */}
              <div className="flex items-center justify-between px-1.5 py-1 shrink-0">
                <h3 className={`font-sans text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-2 ${col.color}`}>
                  <span className={`w-2 h-2 rounded-full ${col.bullet}`} />
                  <span>{col.label}</span>
                  <span className={`ml-1 px-1.5 py-0.25 text-[9px] font-bold rounded-md font-mono ${
                    col.id === 'in_progress' ? 'bg-primary text-primary-foreground' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {colTasks.length}
                  </span>
                </h3>
              </div>

              {/* Column Drop Area */}
              <div
                onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
                onDragEnter={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOverColumnId(col.id); }}
                onDragLeave={() => { if (dragOverColumnId === col.id) setDragOverColumnId(null); }}
                onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData('text/plain') || activeDragTaskId;
                  if (taskId) {
                    handleDropTask(taskId, col.id);
                  }
                  setDragOverColumnId(null);
                }}
                className={`space-y-3 min-h-[500px] p-2 rounded-2xl border transition-all duration-200 ${col.bg} ${
                  dragOverColumnId === col.id
                    ? 'border-dashed border-primary/50 bg-primary/5 shadow-xs'
                    : 'border-transparent'
                }`}
              >
                {colTasks.map((task) => {
                  const proj = projects.find(p => p.id === task.project_id);
                  const junior = allUsers.find(u => u.id === task.assigned_junior_id);
                  const commentsCount = commentsFeed[task.id]?.length || 0;

                  return (
                    <motion.div
                      key={task.id}
                      layoutId={task.id}
                      onClick={() => setSelectedTask(task)}
                      draggable={true}
                      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                        e.dataTransfer.setData('text/plain', task.id);
                        setActiveDragTaskId(task.id);
                      }}
                      onDragEnd={() => {
                        setActiveDragTaskId(null);
                      }}
                      className={`p-4 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0px_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0px_4px_16px_rgba(0,0,0,0.05)] hover:border-primary/55 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] flex flex-col gap-3 relative select-none ${
                        activeDragTaskId === task.id ? 'opacity-35 border-dashed border-primary/30' : ''
                      }`}
                    >
                      {/* Card Header row */}
                      <div className="flex justify-between items-center shrink-0">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider border truncate max-w-[100px] ${getProjectBadgeClass(proj?.name)}`}>
                          {proj?.name.includes('Helix') ? 'THE HELIX' : proj?.name.split(' ')[0]}
                        </span>
                        
                        {/* Comments count in header row to match Under Review design in screenshots */}
                        <div className="flex items-center gap-1.5 text-on-surface-variant text-[10px]">
                          {commentsCount > 0 && (
                            <span className="flex items-center gap-0.5" title="Comments count">
                              <span className="material-symbols-outlined text-xs text-on-surface-variant">chat_bubble</span>
                              <span className="font-semibold">{commentsCount}</span>
                            </span>
                          )}
                          <button className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer shrink-0">
                            <span className="material-symbols-outlined text-base">more_horiz</span>
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="font-sans text-xs font-bold text-on-surface leading-snug">
                        {task.title}
                      </h4>

                      {/* Progress Bar for In Progress Tasks */}
                      {task.status === 'in_progress' && (
                        <div className="relative h-1.5 w-full bg-surface-container rounded-full mt-0.5 overflow-hidden">
                          <div className="absolute top-0 left-0 h-full bg-primary w-2/3 rounded-full" />
                        </div>
                      )}

                      {/* Card Footer */}
                      <div className="flex items-center justify-between mt-2 pt-2.5 border-t border-outline-variant/40 shrink-0 text-[10px] text-on-surface-variant">
                        <div className="flex items-center gap-1.5">
                          {junior?.avatar_url ? (
                            <img src={junior.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover border border-outline-variant/30" />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center font-bold text-[8px]">
                              {junior ? getInitials(junior.name) : 'U'}
                            </div>
                          )}
                          <span className="font-semibold truncate max-w-[65px]">{junior?.name || 'Unassigned'}</span>
                        </div>

                        {/* Status Label or Due Date */}
                        <div className="flex items-center gap-2 font-medium">
                          {task.status === 'review' ? (
                            <span className="px-2 py-0.5 bg-[#e6f4f1] text-[#00685d] text-[9px] font-bold rounded">
                              Awaiting Principal
                            </span>
                          ) : (
                            <span className={`px-1.5 py-0.25 rounded-md ${new Date(task.due_date) < new Date() ? 'text-error bg-error-container/20 font-bold' : 'text-on-surface-variant bg-surface-container-high'}`} title="Due date">
                              {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
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

      {/* Task Details Drawer */}
      <AnimatePresence>
        {selectedTask && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="fixed inset-0 bg-on-surface/30 backdrop-blur-xs z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-surface-container-lowest border-l border-outline-variant shadow-2xl z-50 flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-6 border-b border-outline-variant/40 flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-4">
                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 border border-primary/20 rounded uppercase tracking-wider">
                    {projects.find(p => p.id === selectedTask.project_id)?.name}
                  </span>
                  <h3 className="font-headline text-md font-bold text-on-surface mt-3 leading-snug">
                    {selectedTask.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              {/* Scrollable details */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-semibold text-on-surface">
                
                {/* Status + Assignees Row */}
                <div className="grid grid-cols-2 gap-4 border-b border-outline-variant/45 pb-6">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5">Task Status</label>
                    <CustomSelect
                      value={selectedTask.status}
                      onChange={(val) => {
                        updateTaskStatus(selectedTask.id, val as any, currentUser?.id || '00000000-0000-0000-0000-000000000001');
                        setSelectedTask({ ...selectedTask, status: val as any });
                      }}
                      options={[
                        { value: 'pending', label: 'Pending' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'review', label: 'Submit for Review' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'blocked', label: 'Blocked' }
                      ]}
                      className="w-44 bg-surface-container-low"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5">Due Date</label>
                    <span className="inline-flex items-center gap-1.5 text-on-surface py-1 font-bold">
                      <span className="material-symbols-outlined text-base text-on-surface-variant">calendar_today</span>
                      {new Date(selectedTask.due_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-outline-variant/45 pb-6">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5">Assigned Junior</label>
                    <span className="block text-on-surface font-bold text-xs mt-0.5">
                      {allUsers.find(u => u.id === selectedTask.assigned_junior_id)?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5">Supervisor (Senior)</label>
                    <span className="block text-on-surface font-bold text-xs mt-0.5">
                      {allUsers.find(u => u.id === selectedTask.assigned_senior_id)?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[9px] uppercase font-bold text-on-surface-variant mb-1.5">Description</label>
                  <p className="text-on-surface-variant leading-relaxed whitespace-pre-line mt-1 font-normal font-sans">
                    {selectedTask.description}
                  </p>
                </div>

                {/* Deliverable Section */}
                <div className="space-y-3">
                  <label className="block text-[9px] uppercase font-bold text-on-surface-variant tracking-wider">Deliverable Drawing</label>
                  
                  {selectedTask.attached_version_id ? (() => {
                    const attachedVersion = documentVersions.find(v => v.id === selectedTask.attached_version_id);
                    const attachedDoc = documents.find(d => d.id === attachedVersion?.document_id);
                    
                    const tag = useDBStore.getState().approvalTaskTags.find(t => t.task_id === selectedTask.id);
                    const appRecord = useDBStore.getState().documentApprovals.find(a => a.id === tag?.approval_id);
                    const oldVersionId = appRecord?.document_version_id;
                    const oldVer = documentVersions.find(v => v.id === oldVersionId);
                    
                    return (
                      <div className="p-4 rounded-2xl border border-outline-variant bg-surface-container-low/40 space-y-3 text-xs">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-on-surface uppercase block tracking-wide text-[10px]">
                              {attachedDoc?.name || 'Attached Drawing'}
                            </span>
                            <span className="text-[9px] text-on-surface-variant mt-0.5 inline-block font-mono">
                              REV: {attachedVersion?.version_number} // {attachedVersion ? (attachedVersion.file_size / 1024 / 1024).toFixed(1) : '0'} MB
                            </span>
                          </div>
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                            attachedVersion?.status === 'approved'
                              ? 'text-primary-container bg-primary-container/10 border-primary-container/20'
                              : attachedVersion?.status === 'rejected'
                              ? 'text-error bg-error-container/15 border-error/25'
                              : 'text-tertiary-container bg-tertiary-container/10 border-tertiary-container/20'
                          }`}>
                            {attachedVersion?.status || 'pending'}
                          </span>
                        </div>

                        {attachedVersion?.changelog && (
                          <p className="text-[10px] text-on-surface-variant font-sans font-normal italic bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/35">
                            Changelog: {attachedVersion.changelog}
                          </p>
                        )}

                        <div className="flex gap-2 pt-1">
                          {attachedDoc && attachedVersion && (
                            <Link
                              href={`/dashboard/workspace/${attachedDoc.id}?version=${attachedVersion.id}`}
                              className="flex-1 py-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low font-bold rounded-xl text-center text-[9px] uppercase tracking-wider transition-all"
                            >
                              Open Workspace
                            </Link>
                          )}
                          {attachedDoc && attachedVersion && oldVer && (
                            <Link
                              href={`/dashboard/workspace/${attachedDoc.id}?version=${attachedVersion.id}&compare=${oldVer.id}`}
                              className="flex-1 py-2 bg-primary text-primary-foreground hover:bg-primary/95 font-bold rounded-xl text-center text-[9px] uppercase tracking-wider transition-all shadow-sm border border-primary/20"
                            >
                              Compare Slider (vs {oldVer.version_number})
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })() : (
                    <p className="text-on-surface-variant font-sans font-normal italic text-[11px] opacity-60">No drawings uploaded for task verification.</p>
                  )}

                  {/* Redirect link to Design Vault for upload */}
                  {(currentUser?.id === selectedTask.assigned_junior_id || currentUser?.id === selectedTask.assigned_senior_id) && (
                    <div className="pt-2">
                      <Link
                        href={`/dashboard/projects/${selectedTask.project_id}?tab=documents&openUpload=true&taskId=${selectedTask.id}`}
                        className="w-full py-2.5 border-2 border-dashed border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 font-bold rounded-xl text-center text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        + Upload Deliverable in Design Vault
                      </Link>
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="border-t border-outline-variant/40 pt-6 space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">chat</span>
                    Comments & Activity ({commentsFeed[selectedTask.id]?.length || 0})
                  </h4>

                  {/* Comment List */}
                  <div className="space-y-4 max-h-48 overflow-y-auto pr-1">
                    {(!commentsFeed[selectedTask.id] || commentsFeed[selectedTask.id].length === 0) ? (
                      <p className="text-on-surface-variant font-sans font-normal text-xs italic text-center py-4">No comments posted yet.</p>
                    ) : (
                      commentsFeed[selectedTask.id].map((c) => (
                        <div key={c.id} className="p-3 bg-surface-container-low/60 rounded-xl space-y-1 font-sans">
                          <div className="flex justify-between items-center font-bold text-xs">
                            <span className="text-on-surface">{c.user}</span>
                            <span className="text-[9px] text-on-surface-variant/70 font-normal font-sans">{getRelativeTime(c.date)}</span>
                          </div>
                          <p className="text-on-surface-variant text-xs leading-relaxed font-normal">{c.text}</p>
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
                      className="flex-1 bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/95 transition-all text-[10px] uppercase tracking-wider cursor-pointer active:scale-95"
                    >
                      Post
                    </button>
                  </form>
                </div>
              </div>

              {/* Bottom deletion/actions */}
              {(currentRole === 'principal' || currentRole === 'admin') && (
                <div className="p-6 border-t border-outline-variant/40 bg-surface-container-low/40 flex justify-end">
                  <button
                    onClick={() => {
                      if (confirm("Delete this task permanently?")) {
                        deleteTask(selectedTask.id, currentUser?.id || '00000000-0000-0000-0000-000000000001');
                        setSelectedTask(null);
                      }
                    }}
                    className="px-4 py-2 border border-error/35 bg-error-container/10 text-error hover:bg-error-container/20 font-bold rounded-xl transition-all text-[10px] uppercase tracking-wider cursor-pointer"
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
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-xs" onClick={() => setShowCreateDrawer(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl z-10 animate-in zoom-in-95 duration-150">
            <h3 className="font-headline text-md font-bold text-on-surface mb-4">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4 text-xs font-semibold text-on-surface">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wide mb-1">Select Project</label>
                <CustomSelect
                  value={taskProjId}
                  onChange={setTaskProjId}
                  options={projects.map(p => ({ value: p.id, label: p.name }))}
                  placeholder="-- Choose Project --"
                  className="w-full text-on-surface bg-surface-container-low"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wide mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Subdivide facade parametric divisions"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-primary focus:outline-none text-on-surface placeholder:text-muted-foreground/40"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wide mb-1">Description</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Outline task deliverables, resources, codes..."
                  rows={3}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-primary focus:outline-none text-on-surface placeholder:text-muted-foreground/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wide mb-1">Assign Junior</label>
                  <CustomSelect
                    value={taskJunior}
                    onChange={setTaskJunior}
                    options={allUsers.filter(u => u.role === 'junior').map(u => ({ value: u.id, label: u.name }))}
                    placeholder="-- Choose Junior --"
                    className="w-full text-on-surface bg-surface-container-low"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wide mb-1">Assign Supervisor (Senior)</label>
                  <CustomSelect
                    value={taskSenior}
                    onChange={setTaskSenior}
                    options={allUsers.filter(u => u.role === 'senior').map(u => ({ value: u.id, label: u.name }))}
                    placeholder="-- Choose Senior --"
                    className="w-full text-on-surface bg-surface-container-low"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wide mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-primary focus:outline-none text-on-surface placeholder:text-muted-foreground/40"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-outline-variant/40 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateDrawer(false)}
                  className="px-4 py-2 border border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/95 shadow-md active:scale-95 duration-150 transition-all border border-primary/20 cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

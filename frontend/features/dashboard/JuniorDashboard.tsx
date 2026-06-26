'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useDBStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import {
  ClipboardList, AlertTriangle, CheckSquare, Sparkles, Upload,
  Clock, ArrowUpRight, CheckCircle2, Search, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import CustomSelect from '../../components/CustomSelect';

export default function JuniorDashboard() {
  const { currentUser } = useAuthStore();
  const { tasks, projects, uploadDocumentVersion } = useDBStore();

  // Upload Form State
  const [projectId, setProjectId] = useState('');
  const [docName, setDocName] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [changelog, setChangelog] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculations
  const myTasks = tasks.filter(t => t.assigned_junior_id === currentUser?.id);
  const filteredTasks = myTasks.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingTasksCount = myTasks.filter(t => t.status !== 'completed').length;
  const completedTasksCount = myTasks.filter(t => t.status === 'completed').length;

  const now = new Date();
  const overdueTasks = myTasks.filter(t => t.status !== 'completed' && new Date(t.due_date) < now);
  const overdueCount = overdueTasks.length;
  const blockedTasks = myTasks.filter(t => t.status === 'blocked');

  const handleStatusChange = (taskId: string, status: any) => {
    useDBStore.getState().updateTaskStatus(taskId, status, currentUser?.id || '');
  };

  const handleFileSelect = (file: File) => {
    const allowed = ['.dwg', '.png', '.jpg', '.jpeg', '.pdf'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      alert('Only DWG, PNG, JPG, PDF files are accepted.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      alert('File exceeds 30MB limit.');
      return;
    }
    setSelectedFile(file);
    if (!docName) setDocName(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !docName) return;

    setIsUploading(true);

    const performUpload = (fileUrl: string, fileSize: number) => {
      uploadDocumentVersion({
        projectId,
        documentName: docName,
        description: docDesc,
        changelog: changelog || 'Initial deliverable draft',
        fileUrl,
        fileSize,
        uploadedBy: currentUser?.id || '00000000-0000-0000-0000-000000000004'
      }).then(() => {
        setIsUploading(false);
        setUploadSuccess(true);
        setDocName('');
        setDocDesc('');
        setChangelog('');
        setProjectId('');
        setSelectedFile(null);
        setTimeout(() => setUploadSuccess(false), 4000);
      }).catch(err => {
        console.error("Upload failed", err);
        alert("Failed to save deliverable drawing.");
        setIsUploading(false);
      });
    };

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        performUpload(base64, selectedFile.size);
      };
      reader.onerror = () => {
        alert("Failed to read file.");
        setIsUploading(false);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      const mockBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      performUpload(mockBase64, 1000);
    }
  };

  // Find ongoing projects this junior is team member of
  const myTeams = useDBStore.getState().teamMembers.filter(tm => tm.user_id === currentUser?.id).map(tm => tm.team_id);
  const myProjects = projects.filter(p =>
    useDBStore.getState().teams.some(t => t.project_id === p.id && myTeams.includes(t.id))
  );

  const firstName = currentUser?.name.split(' ')[0] || 'Alex';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const getTaskProgress = (status: string) => {
    switch (status) {
      case 'pending': return 23;
      case 'in_progress': return 78;
      case 'review': return 90;
      case 'completed': return 100;
      case 'blocked': return 10;
      default: return 0;
    }
  };

  return (
    <div className="space-y-8 select-none font-sans pb-12">

      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono mb-1">
            Junior Desk
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Good morning, <span className="text-primary">{firstName}.</span>
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Track assigned drafts, respond to structural changes, and upload deliverables.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search assigned tasks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all text-foreground placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* 2. Alert Banner */}
      {(overdueCount > 0 || blockedTasks.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive"
        >
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-extrabold">Attention Required</h4>
            <p className="text-[11px] mt-0.5 leading-relaxed text-destructive/80">
              You have {overdueCount} overdue task(s) and {blockedTasks.length} blocked task(s). Review your schedule or consult your senior lead.
            </p>
          </div>
        </motion.div>
      )}

      {/* 3. Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left: Tasks */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-sm font-extrabold text-foreground">
                My Assigned Tasks
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Individual assignments with status selectors.
              </p>
            </div>
            <span className="text-[9px] font-bold font-mono uppercase border border-border px-2 py-0.5 rounded bg-secondary text-muted-foreground">
              {filteredTasks.length} total
            </span>
          </div>

          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-border/40 rounded-2xl bg-secondary/10">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500/60 mb-3" />
                <p className="text-xs font-semibold text-foreground">No tasks currently assigned.</p>
                <p className="text-[10px] text-muted-foreground mt-1">Enjoy a clear drafting board!</p>
              </div>
            ) : (
              filteredTasks.map((task, idx) => {
                const proj = projects.find(p => p.id === task.project_id);
                const isOverdue = task.status !== 'completed' && new Date(task.due_date) < now;
                const progress = getTaskProgress(task.status);

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-5 rounded-2xl border bg-card flex flex-col gap-3 transition-all relative overflow-hidden ${isOverdue ? 'border-destructive/30' : 'border-border hover:border-white/10'
                      }`}
                  >
                    {/* Overdue left accent */}
                    {isOverdue && (
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-2xl bg-destructive/60" />
                    )}

                    {/* Top Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-bold font-mono tracking-wider text-muted-foreground/60">
                          TSK // 00{idx + 1}
                        </span>
                        {proj && (
                          <Link 
                            href={`/dashboard/projects/${proj.id}`}
                            className="text-[9px] font-bold font-mono text-accent-foreground bg-primary/10 border border-primary/20 hover:border-primary/45 hover:bg-primary/20 px-2 py-0.5 rounded cursor-pointer transition-all"
                          >
                            {proj.name}
                          </Link>
                        )}
                        {isOverdue && (
                          <span className="text-[9px] font-mono font-bold text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded">
                            OVERDUE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Progress bar */}
                        <div className="flex items-center gap-2">
                          <div className="w-24 sm:w-32 bg-secondary h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[10px] font-bold font-mono text-muted-foreground">{progress}%</span>
                        </div>

                        {/* Status select */}
                        <CustomSelect
                          value={task.status}
                          onChange={(value) => handleStatusChange(task.id, value)}
                          variant="badge"
                          options={[
                            { value: 'pending', label: 'Pending' },
                            { value: 'in_progress', label: 'In Progress' },
                            { value: 'review', label: 'Submit for Review' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'blocked', label: 'Blocked' }
                          ]}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <Link
                      href="/dashboard/tasks"
                      className="space-y-1 block group/task cursor-pointer"
                    >
                      <h4 className="text-sm font-semibold text-foreground tracking-tight group-hover/task:text-primary transition-colors">
                        {task.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{task.description}</p>
                    </Link>

                    {/* Bottom Row */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/60 mt-1">
                      <span>Due: {formatDate(task.due_date)}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${task.status === 'completed' ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
                          : task.status === 'blocked' ? 'text-destructive bg-destructive/10 border-destructive/20'
                            : 'text-muted-foreground bg-secondary border-border'
                        }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Upload Pipeline */}
        <div className="lg:col-span-4 space-y-5">
          <div className="pb-3 border-b border-border">
            <h2 className="text-sm font-extrabold text-foreground">
              Deliverables Pipeline
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Submit drafts for Senior and Principal inspection.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-card">
            <form onSubmit={handleUploadSubmit} className="space-y-4">

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".dwg,.png,.jpg,.jpeg,.pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />

              {/* Drag & Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 ${isDragOver
                    ? 'border-primary/60 bg-primary/5'
                    : selectedFile
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-border/50 bg-secondary/30 hover:border-primary/30 hover:bg-secondary/50'
                  }`}
              >
                {selectedFile ? (
                  <>
                    <CheckCircle2 size={20} className="text-emerald-400" />
                    <span className="text-xs font-bold text-foreground">{selectedFile.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB · Click to change
                    </span>
                  </>
                ) : (
                  <>
                    <Upload size={20} className={isDragOver ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-xs font-bold text-foreground">
                      {isDragOver ? 'Drop to attach' : 'Drag & drop or click to browse'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">DWG, PNG, JPG, PDF · max 30MB</span>
                  </>
                )}
              </div>

              {/* Select Project */}
              <div>
                <label className="block text-[9px] text-muted-foreground uppercase tracking-widest font-mono mb-1.5">
                  Select Project
                </label>
                <CustomSelect
                  value={projectId}
                  onChange={(value) => setProjectId(value)}
                  options={[
                    { value: '', label: '-- Select Project --' },
                    ...myProjects.map((p) => ({ value: p.id, label: p.name }))
                  ]}
                  className="w-full"
                />
              </div>

              {/* Drawing File Name */}
              <div>
                <label className="block text-[9px] text-muted-foreground uppercase tracking-widest font-mono mb-1.5">
                  Drawing File Name
                </label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Lobby_Wall_Layout.dwg"
                  className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[9px] text-muted-foreground uppercase tracking-widest font-mono mb-1.5">
                  Description
                </label>
                <textarea
                  value={docDesc}
                  onChange={(e) => setDocDesc(e.target.value)}
                  placeholder="Describe structural scales, sections, standard levels…"
                  rows={2}
                  className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground/50 resize-none"
                />
              </div>

              {/* Changelog */}
              <div>
                <label className="block text-[9px] text-muted-foreground uppercase tracking-widest font-mono mb-1.5">
                  Changelog Notes
                </label>
                <input
                  type="text"
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  placeholder="e.g. Adjusted steel columns alignment"
                  className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Success state */}
              {uploadSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200/50 text-emerald-700">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span className="text-xs font-semibold">Drawing submitted successfully!</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider text-[10px] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {isUploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload size={13} />
                    Submit Draft
                  </>
                )}
              </button>

              {!selectedFile && (
                <p className="text-[9px] text-muted-foreground/40 text-center font-mono">
                  Attach a file above to enable submit.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
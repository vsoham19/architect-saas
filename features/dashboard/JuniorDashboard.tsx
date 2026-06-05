'use client';

import React, { useState } from 'react';
import { useDBStore } from '../../store/dbStore';
import { useAuthStore } from '../../store/authStore';
import { 
  ClipboardList, AlertTriangle, CheckSquare, Sparkles, Upload, 
  Clock, ArrowUpRight, CheckCircle2, Search, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

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

  // 1. Calculations
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

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !docName) return;

    setIsUploading(true);

    setTimeout(() => {
      uploadDocumentVersion({
        projectId,
        documentName: docName,
        description: docDesc,
        changelog: changelog || 'Initial deliverable draft',
        fileUrl: `/drawings/${docName.toLowerCase().replace(/\s+/g, '_')}_rev.jpg`,
        fileSize: Math.floor(Math.random() * 20000000) + 5000000, 
        uploadedBy: currentUser?.id || 'u-4'
      });

      setIsUploading(false);
      setUploadSuccess(true);
      setDocName('');
      setDocDesc('');
      setChangelog('');
      setProjectId('');

      setTimeout(() => setUploadSuccess(false), 4000);
    }, 1200);
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
      {/* 1. Header HUD Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0f172a] font-mono uppercase">
            GOOD MORNING, <span className="text-[#1d4ed8] font-sans normal-case font-black">{firstName}.</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium font-sans">
            Junior desk: Track your assigned drafts, respond to structural changes, and upload deliverables.
          </p>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search your assigned tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* 2. Warnings & Alerts */}
      {(overdueCount > 0 || blockedTasks.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 flex items-start gap-3 shadow-sm"
        >
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-rose-600" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono">Attention Required</h4>
            <p className="text-[11px] text-rose-600/90 mt-1 leading-relaxed">
              You have {overdueCount} overdue task(s) and {blockedTasks.length} blocked task(s). Please review your schedule or consult your senior architect lead.
            </p>
          </div>
        </motion.div>
      )}

      {/* 3. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Tasks List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider font-mono">
                MY ASSIGNED TASKS
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Individual task assignments with status selectors.
              </p>
            </div>
            <span className="text-[10px] font-bold font-mono uppercase border border-slate-200 px-2 py-0.5 rounded text-slate-450">
              {filteredTasks.length} TOTAL
            </span>
          </div>

          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-white/40">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500/80 mb-3" />
                <p className="text-xs font-bold text-slate-700">No tasks currently assigned.</p>
                <p className="text-[10px] text-slate-400 mt-1">Enjoy a clear drafting board!</p>
              </div>
            ) : (
              filteredTasks.map((task, idx) => {
                const proj = projects.find(p => p.id === task.project_id);
                const isOverdue = task.status !== 'completed' && new Date(task.due_date) < now;
                const progress = getTaskProgress(task.status);

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-6 rounded-2xl border bg-white shadow-xs flex flex-col gap-3 transition-all relative overflow-hidden group ${
                      isOverdue ? 'border-rose-300' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Row: Task ID, Project, Progress, Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono tracking-wider text-slate-400 select-none">
                          TSK // 00{idx + 1}
                        </span>
                        <span className="text-[9px] font-bold font-mono tracking-wider text-[#1d4ed8] bg-blue-50/50 border border-blue-150 px-2 py-0.5 rounded">
                          {proj?.name}
                        </span>
                        {isOverdue && (
                          <span className="text-[9px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            OVERDUE
                          </span>
                        )}
                      </div>

                      {/* Progress and Status */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-28 sm:w-36 bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-800 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[10px] font-bold font-mono text-slate-500">{progress}%</span>
                        </div>

                        {/* Styled Status Select Dropdown to match Mockup Pill */}
                        <div className="relative">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className={`text-[10px] font-bold rounded-lg px-2.5 py-1 cursor-pointer outline-none border-none text-white appearance-none text-center ${
                              task.status === 'in_progress' ? 'bg-[#0f766e]' :
                              task.status === 'pending' ? 'bg-[#a25a48]' :
                              task.status === 'blocked' ? 'bg-[#dc2626]' :
                              task.status === 'completed' ? 'bg-[#1e3a8a]' :
                              task.status === 'review' ? 'bg-[#475569]' :
                              'bg-slate-500'
                            }`}
                          >
                            <option value="pending" className="bg-white text-slate-900">Pending</option>
                            <option value="in_progress" className="bg-white text-slate-900">In Progress</option>
                            <option value="review" className="bg-white text-slate-900">Submit for Review</option>
                            <option value="completed" className="bg-white text-slate-900">Completed</option>
                            <option value="blocked" className="bg-white text-slate-900">Blocked</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Middle Content */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                        {task.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed pr-2">
                        {task.description}
                      </p>
                    </div>

                    {/* Bottom Row */}
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-1">
                      <span>Due: {formatDate(task.due_date)}</span>
                      <span>Due: {formatDate(task.due_date)}</span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
 
        {/* Right Column: Upload Deliverables Pipeline */}
        <div className="lg:col-span-4 space-y-6">
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-wider font-mono">
              DELIVERABLES PIPELINE
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Submit drafts directly for Senior and Principal inspection.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              
              {/* Drag and Drop File Upload Box */}
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="text-slate-400" size={20} />
                <span className="text-xs font-bold text-slate-700">Drag and drop file upload</span>
                <span className="text-[10px] text-slate-400">Drag dwg to drop here</span>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">SELECT PROJECT</label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none cursor-pointer text-slate-700"
                >
                  <option value="">-- Select Project --</option>
                  {myProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">DRAWING FILE NAME</label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Lobby_Wall_Layout.dwg"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none text-slate-750"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">DESCRIPTION</label>
                <textarea
                  value={docDesc}
                  onChange={(e) => setDocDesc(e.target.value)}
                  placeholder="Describe structural scales, sections, standard levels..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none text-slate-750"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">CHANGELOG NOTES</label>
                <input
                  type="text"
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  placeholder="e.g. Adjusted steel columns alignment"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none text-slate-750"
                />
              </div>

              {uploadSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Drawing submitted successfully!</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider text-[10px]"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading Drawing...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Submit Draft Review</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDBStore } from '../../../../store/dbStore';
import { useAuthStore } from '../../../../store/authStore';
import { 
  FileText, Check, ShieldCheck, AlertCircle, Clock, ChevronDown, 
  MessageSquare, PlusCircle, Tag, Layers, HelpCircle, AlertTriangle, Eye, EyeOff, ArrowLeft, X, ArrowLeftRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentVersion, ProposedChange, Task } from '../../../../types';

export default function DocumentWorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const docId = params.id as string;
  const versionQueryId = searchParams.get('version');

  const { currentUser, currentRole, allUsers: allUsersList } = useAuthStore();
  const { 
    documents, documentVersions, documentReviews, tasks, 
    addReview, approveDocument, projects 
  } = useDBStore();

  // Document state
  const doc = documents.find(d => d.id === docId);
  const docVersions = documentVersions.filter(v => v.document_id === docId);

  // Active Version selection
  const [activeVersion, setActiveVersion] = useState<DocumentVersion | null>(null);

  // Initialize selected version from query param or default to current
  useEffect(() => {
    if (docVersions.length > 0) {
      if (versionQueryId) {
        const found = docVersions.find(v => v.id === versionQueryId);
        if (found) {
          setActiveVersion(found);
          return;
        }
      }
      // Default to document's current version or the latest uploaded
      const current = docVersions.find(v => v.id === doc?.current_version_id);
      setActiveVersion(current || docVersions[docVersions.length - 1]);
    }
  }, [docId, versionQueryId, doc, docVersions.length]);

  // Review states
  const reviews = activeVersion 
    ? documentReviews.filter(r => r.document_version_id === activeVersion.id)
    : [];

  const allProposedChanges = reviews.flatMap(r => r.proposed_changes);

  // Find approval data for this version if it exists
  const approval = activeVersion 
    ? useDBStore.getState().documentApprovals.find(a => a.document_version_id === activeVersion.id)
    : null;
  const approverUser = approval 
    ? useAuthStore.getState().allUsers.find(u => u.id === approval.approver_id)
    : null;

  // Interactive CAD coordinates comments
  const canvasRef = useRef<HTMLDivElement>(null);
  const [showAddChangeForm, setShowAddChangeForm] = useState(false);
  const [clickCoords, setClickCoords] = useState<{ x: number; y: number } | null>(null);
  const [newChangeDesc, setNewChangeDesc] = useState('');
  const [selectedChangePin, setSelectedChangePin] = useState<ProposedChange | null>(null);

  // Approval Panel States
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showTagModal, setShowTagModal] = useState(false);
  const [taggedTasksList, setTaggedTasksList] = useState<string[]>([]);
  const [confirmNoTasks, setConfirmNoTasks] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Submit Review state
  const [reviewComments, setReviewComments] = useState('');
  const [reviewChangesList, setReviewChangesList] = useState<{ description: string; x: number; y: number }[]>([]);

  // Visual Revision Comparison Slider States
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareVersion, setCompareVersion] = useState<DocumentVersion | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50); // percentage, 0-100
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // Blueprint CAD layers visibility
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    structural: true,
    hvac: true,
    fire: true,
    electrical: true
  });

  if (!doc) {
    return (
      <div className="py-20 text-center text-xs font-semibold text-slate-500">
        <AlertCircle className="mx-auto text-rose-500 mb-2" size={32} />
        Document workspace not found.
      </div>
    );
  }

  const proj = projects.find(p => p.id === doc.project_id);
  const projTasks = tasks.filter(t => t.project_id === doc.project_id);
  // Juniors in project
  const projectJuniors = useDBStore.getState().teamMembers
    .filter(tm => tm.team_id === useDBStore.getState().teams.find(t => t.project_id === doc.project_id)?.id && tm.role === 'junior');

  // Hover crosshairs state
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    // Offset left by 32px (w-8) for left ruler, and top by 24px (h-6) for top ruler
    const x = ((e.clientX - rect.left - 32) / (rect.width - 32)) * 100;
    const y = ((e.clientY - rect.top - 24) / (rect.height - 24)) * 100;

    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      setHoverCoords({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    } else {
      setHoverCoords(null);
    }
  };

  const handleSliderMove = (clientX: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left - 32) / (rect.width - 32)) * 100;
    const clampedX = Math.max(0, Math.min(100, x));
    setSliderPosition(clampedX);
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSlider) {
      handleSliderMove(e.clientX);
    } else {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left - 32) / (rect.width - 32)) * 100;
      const y = ((e.clientY - rect.top - 24) / (rect.height - 24)) * 100;

      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        setHoverCoords({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
      } else {
        setHoverCoords(null);
      }
    }
  };

  // Helper to render CAD layers up to selected version number
  const renderCadLayers = (versionNum: string) => {
    const isV1_0 = versionNum === 'v1.0.0';
    const isV1_1 = versionNum === 'v1.1.0';
    
    // Layers are shown if both they exist in this version AND their layer toggle is enabled
    const showStructural = visibleLayers.structural;
    const showHvac = !isV1_0 && visibleLayers.hvac;
    const showFireExit = !isV1_0 && !isV1_1 && visibleLayers.fire;
    const showElectrical = !isV1_0 && visibleLayers.electrical; // Available from v1.1.0 onwards
    
    return (
      <svg className="absolute inset-0 w-full h-full p-8 opacity-65 pointer-events-none" viewBox="0 0 800 450">
        {/* Structural Base Layer (Walls & Columns) */}
        {showStructural && (
          <g>
            <rect x="50" y="50" width="700" height="350" fill="none" stroke="#2563eb" strokeWidth="1.5" />
            <circle cx="200" cy="150" r="10" fill="none" stroke="#2563eb" strokeWidth="1" />
            <circle cx="400" cy="150" r="10" fill="none" stroke="#2563eb" strokeWidth="1" />
            <circle cx="600" cy="150" r="10" fill="none" stroke="#2563eb" strokeWidth="1" />
            <circle cx="200" cy="300" r="10" fill="none" stroke="#2563eb" strokeWidth="1" />
            <circle cx="400" cy="300" r="10" fill="none" stroke="#2563eb" strokeWidth="1" />
            <circle cx="600" cy="300" r="10" fill="none" stroke="#2563eb" strokeWidth="1" />
          </g>
        )}
        
        {/* HVAC Duct Layers */}
        {showHvac && (
          <path d="M50 150 L750 150 M50 300 L750 300 M400 50 L400 400" fill="none" stroke="#059669" strokeWidth="1" strokeDasharray="3,3" />
        )}
        
        {/* Fire exit layers */}
        {showFireExit && (
          <g>
            <rect x="680" y="260" width="60" height="130" fill="none" stroke="#e11d48" strokeWidth="1.2" />
            <line x1="680" y1="290" x2="740" y2="290" stroke="#e11d48" strokeWidth="0.8" />
            <line x1="680" y1="320" x2="740" y2="320" stroke="#e11d48" strokeWidth="0.8" />
            <line x1="680" y1="350" x2="740" y2="350" stroke="#e11d48" strokeWidth="0.8" />
            <line x1="680" y1="380" x2="740" y2="380" stroke="#e11d48" strokeWidth="0.8" />
          </g>
        )}

        {/* Electrical Circuits & Outlets */}
        {showElectrical && (
          <g opacity="0.85">
            {/* Electrical Power Panel */}
            <rect x="60" y="60" width="12" height="24" fill="none" stroke="#d97706" strokeWidth="1.2" />
            <line x1="60" y1="60" x2="72" y2="84" stroke="#d97706" strokeWidth="0.8" />
            <line x1="72" y1="60" x2="60" y2="84" stroke="#d97706" strokeWidth="0.8" />
            <text x="76" y="74" fill="#d97706" fontSize="6" fontFamily="monospace" fontWeight="bold">PANEL-E1</text>

            {/* Outlets (Amber circles with prongs) */}
            <g stroke="#d97706" strokeWidth="1" fill="none">
              {/* Outlet 1 */}
              <circle cx="150" cy="50" r="4" />
              <line x1="150" y1="46" x2="150" y2="40" />
              <line x1="148" y1="40" x2="152" y2="40" />
              {/* Outlet 2 */}
              <circle cx="350" cy="50" r="4" />
              <line x1="350" y1="46" x2="350" y2="40" />
              <line x1="348" y1="40" x2="352" y2="40" />
              {/* Outlet 3 */}
              <circle cx="550" cy="50" r="4" />
              <line x1="550" y1="46" x2="550" y2="40" />
              <line x1="548" y1="40" x2="552" y2="40" />
              {/* Outlet 4 */}
              <circle cx="150" cy="400" r="4" />
              <line x1="150" y1="404" x2="150" y2="410" />
              <line x1="148" y1="410" x2="152" y2="410" />
              {/* Outlet 5 */}
              <circle cx="550" cy="400" r="4" />
              <line x1="550" y1="404" x2="550" y2="410" />
              <line x1="548" y1="410" x2="552" y2="410" />
            </g>

            {/* Ceiling Light Fixtures (amber boxes with crosses) */}
            <g stroke="#f59e0b" strokeWidth="1.2" fill="none">
              {/* Light 1 */}
              <rect x="294" y="244" width="12" height="12" />
              <line x1="294" y1="244" x2="306" y2="256" />
              <line x1="306" y1="244" x2="294" y2="256" />
              {/* Light 2 */}
              <rect x="494" y="244" width="12" height="12" />
              <line x1="494" y1="244" x2="506" y2="256" />
              <line x1="506" y1="244" x2="494" y2="256" />
            </g>

            {/* Wiring pathways (dotted curves) */}
            <path d="M72 72 Q150 100 150 54" fill="none" stroke="#d97706" strokeWidth="0.8" strokeDasharray="2,3" />
            <path d="M150 54 Q250 80 300 244" fill="none" stroke="#d97706" strokeWidth="0.8" strokeDasharray="2,3" />
            <path d="M300 244 Q350 150 350 54" fill="none" stroke="#d97706" strokeWidth="0.8" strokeDasharray="2,3" />
            <path d="M350 54 Q450 80 500 244" fill="none" stroke="#d97706" strokeWidth="0.8" strokeDasharray="2,3" />
            <path d="M500 244 Q550 150 550 54" fill="none" stroke="#d97706" strokeWidth="0.8" strokeDasharray="2,3" />
            <path d="M150 400 Q300 350 300 256" fill="none" stroke="#d97706" strokeWidth="0.8" strokeDasharray="2,3" />
            <path d="M550 400 Q500 350 500 256" fill="none" stroke="#d97706" strokeWidth="0.8" strokeDasharray="2,3" />
          </g>
        )}
      </svg>
    );
  };

  // Handle double click or click on CAD canvas to drop comment
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || (currentRole !== 'principal' && currentRole !== 'senior')) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - 32) / (rect.width - 32)) * 100;
    const y = ((e.clientY - rect.top - 24) / (rect.height - 24)) * 100;

    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      setClickCoords({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
      setShowAddChangeForm(true);
      setSelectedChangePin(null);
    }
  };

  const handleProposeChangeLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clickCoords || !newChangeDesc.trim()) return;

    setReviewChangesList(prev => [
      ...prev,
      { description: newChangeDesc.trim(), x: clickCoords.x, y: clickCoords.y }
    ]);

    setNewChangeDesc('');
    setShowAddChangeForm(false);
    setClickCoords(null);
  };

  const handleSubmitReviewPackage = () => {
    if (!activeVersion) return;
    if (!reviewComments.trim() && reviewChangesList.length === 0) {
      alert("Please add review comments or propose visual changes first.");
      return;
    }

    addReview({
      versionId: activeVersion.id,
      reviewerId: currentUser?.id || '',
      comments: reviewComments.trim() || 'Reviewed draft drawing. Indicated changes directly on the CAD sheet.',
      proposedChanges: reviewChangesList
    });

    setReviewComments('');
    setReviewChangesList([]);
    alert("Review submitted successfully! Document status updated.");
  };

  // Flagship Approval Trigger
  const handleApproveClick = () => {
    if (!activeVersion) return;

    // Strict validation check
    if (taggedTasksList.length === 0 && !confirmNoTasks) {
      setErrorMsg("Approval Blocked: You must either select affected junior tasks or confirm 'No tasks affected' to proceed.");
      return;
    }

    setErrorMsg('');
    approveDocument({
      versionId: activeVersion.id,
      approverId: currentUser?.id || '',
      notes: approvalNotes || 'Drawing layout meets engineering standards and project requirements. Approved for drafting final specs.',
      taggedTaskIds: taggedTasksList,
      confirmNoTasks
    });

    setShowSuccessModal(true);
    setApprovalNotes('');
    setTaggedTasksList([]);
    setConfirmNoTasks(false);
  };

  // Lock logic
  const isApprovalButtonLocked = taggedTasksList.length === 0 && !confirmNoTasks;

  return (
    <div className="space-y-6 select-none pb-20">
      {/* Header breadcrumb & back */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${doc.project_id}`}
            className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft size={14} />
            Back to Project
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">{doc.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Project: {proj?.name}</p>
          </div>
        </div>

        {/* Visual Compare toggle & selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Version Branch:</span>
            <select
              value={activeVersion?.id || ''}
              onChange={(e) => {
                const selected = docVersions.find(v => v.id === e.target.value);
                if (selected) {
                  setActiveVersion(selected);
                  setIsCompareMode(false);
                }
              }}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer text-slate-700"
            >
              {docVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version_number} ({v.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* Toggle comparison */}
          {isCompareMode ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Compare with:</span>
              <select
                value={compareVersion?.id || ''}
                onChange={(e) => {
                  const selected = docVersions.find(v => v.id === e.target.value);
                  if (selected) setCompareVersion(selected);
                }}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer text-slate-700"
              >
                {docVersions.filter(v => v.id !== activeVersion?.id).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.version_number}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsCompareMode(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              >
                Exit Compare
              </button>
            </div>
          ) : (
            docVersions.length > 1 && (
              <button
                onClick={() => {
                  setIsCompareMode(true);
                  const diffVer = docVersions.find(v => v.id !== activeVersion?.id);
                  if (diffVer) setCompareVersion(diffVer);
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer shadow-xs"
              >
                Visual Compare
              </button>
            )
          )}
        </div>
      </div>

      {/* Grid: Canvas + Sidebar Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* CAD Canvas Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-secondary/40 p-3 rounded-2xl border border-border">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Layers size={14} className="text-primary" />
              <span>Interactive Draft Blueprint Canvas</span>
            </div>
            {(currentRole === 'principal' || currentRole === 'senior') && (
              <div className="text-[10px] text-slate-500 font-bold">
                * Click anywhere on drawing sheet to place a change proposal pin.
              </div>
            )}
          </div>

          {/* Canvas Sheet */}
          <div
            ref={canvasRef}
            className="relative aspect-video w-full border border-border bg-slate-100 rounded-2xl overflow-hidden shadow-inner border-draft"
          >
            {/* Top Ruler */}
            <div className="absolute top-0 left-8 right-0 h-6 border-b border-border bg-secondary/80 flex justify-between px-4 pointer-events-none text-[7px] font-mono font-bold text-muted-foreground select-none z-10">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="flex flex-col justify-end items-center h-full">
                  <span>{(i * 10).toFixed(0)}m</span>
                  <div className="w-[0.5px] h-1 bg-muted-foreground/40" />
                </div>
              ))}
            </div>

            {/* Left Ruler */}
            <div className="absolute top-6 left-0 bottom-0 w-8 border-r border-border bg-secondary/80 flex flex-col justify-between py-4 pointer-events-none text-[7px] font-mono font-bold text-muted-foreground select-none z-10">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="flex justify-end items-center w-full pr-1">
                  <span>{(i * 10).toFixed(0)}m</span>
                  <div className="h-[0.5px] w-1 bg-muted-foreground/40 ml-0.5" />
                </div>
              ))}
            </div>

            {/* Floating CAD Layer Manager */}
            <div className="absolute top-10 left-12 bg-white/90 backdrop-blur-xs border border-slate-200 rounded-xl p-2.5 z-20 shadow-md w-36 select-none font-mono text-[8px] space-y-1.5">
              <div className="flex items-center gap-1 pb-1 mb-1 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider">
                <Layers size={9} className="text-blue-600" />
                <span>CAD Layers</span>
              </div>
              <div className="space-y-0.5">
                {[
                  { key: 'structural', label: '1. STRUCTURAL', color: 'bg-blue-600' },
                  { key: 'hvac', label: '2. HVAC DUCTS', color: 'bg-emerald-600' },
                  { key: 'fire', label: '3. FIRE ESCAPE', color: 'bg-rose-600' },
                  { key: 'electrical', label: '4. ELECTRICAL', color: 'bg-amber-600' },
                ].map((layer) => {
                  const isActive = visibleLayers[layer.key];
                  return (
                    <button
                      key={layer.key}
                      onClick={() => setVisibleLayers(prev => ({ ...prev, [layer.key]: !prev[layer.key] }))}
                      className="flex items-center justify-between w-full text-left py-0.5 px-1 hover:bg-slate-100 rounded transition-colors text-slate-600 hover:text-slate-800 cursor-pointer"
                    >
                      <span className="flex items-center gap-1 truncate font-semibold">
                        <span className={`w-1.5 h-1.5 rounded-full ${layer.color}`} />
                        {layer.label}
                      </span>
                      {isActive ? (
                        <Eye size={10} className="text-slate-500" />
                      ) : (
                        <EyeOff size={10} className="text-slate-355" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inner Drawing Canvas area where clicks/mouse events are tracked */}
            <div
              onClick={isCompareMode ? undefined : handleCanvasClick}
              onPointerMove={handleContainerPointerMove}
              onPointerUp={() => setIsDraggingSlider(false)}
              onPointerLeave={() => {
                setIsDraggingSlider(false);
                setHoverCoords(null);
              }}
              className="absolute top-6 left-8 right-0 bottom-0 overflow-hidden cursor-crosshair bg-slate-50"
            >
              {/* Technical Grid background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(29,78,216,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(29,78,216,0.06)_1px,transparent_1px)] bg-[size:15px_15px] opacity-70" />
              
              {isCompareMode ? (
                <>
                  {/* Underlay Drawing: Active Version (revealed on the right) */}
                  {renderCadLayers(activeVersion?.version_number || 'v1.1.0')}

                  {/* Overlay Drawing: Compare Version (visible on the left, clipped by sliderPosition) */}
                  <div 
                    className="absolute inset-0 pointer-events-none overflow-hidden"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                  >
                    {renderCadLayers(compareVersion?.version_number || 'v1.0.0')}
                  </div>

                  {/* Slider drag overlay elements */}
                  <div 
                    className="absolute top-0 bottom-0 w-[1.5px] bg-blue-600 z-30 pointer-events-none"
                    style={{ left: `${sliderPosition}%` }}
                  />
                  <div
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingSlider(true);
                    }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md border-2 border-white flex items-center justify-center cursor-ew-resize z-30 select-none"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <ArrowLeftRight size={11} className="select-none pointer-events-none" />
                  </div>
                </>
              ) : (
                /* Standard Single Drawing View */
                renderCadLayers(activeVersion?.version_number || 'v1.1.0')
              )}

              {/* Cursor Technical Crosshairs HUD */}
              {hoverCoords && (
                <>
                  <div className="absolute left-0 right-0 bg-primary/20 pointer-events-none" style={{ top: `${hoverCoords.y}%`, height: '0.5px' }} />
                  <div className="absolute top-0 bottom-0 bg-primary/20 pointer-events-none" style={{ left: `${hoverCoords.x}%`, width: '0.5px' }} />
                  <div 
                    className="absolute p-1 bg-white/95 border border-slate-350 text-slate-800 rounded text-[8px] font-mono pointer-events-none z-20 shadow-md"
                    style={{ left: `${hoverCoords.x + 2}%`, top: `${hoverCoords.y + 2}%` }}
                  >
                    X:{(hoverCoords.x * 0.5).toFixed(1)}m Y:{(hoverCoords.y * 0.3).toFixed(1)}m
                  </div>
                </>
              )}

              {/* Digital Stamp Approval Overlay (Animate stamp drop if approved) */}
              {activeVersion?.status === 'approved' && (
                <motion.div
                  initial={{ scale: 1.8, opacity: 0, rotate: -35 }}
                  animate={{ scale: 1, opacity: 0.8, rotate: -8 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 90, delay: 0.2 }}
                  className="absolute top-12 right-12 border-4 border-double border-rose-600 text-rose-600 rounded-xl p-3 select-none pointer-events-none z-20 font-mono text-center flex flex-col items-center justify-center uppercase tracking-wider bg-white/50 backdrop-blur-3xs"
                  style={{ transformOrigin: 'center' }}
                >
                  <div className="text-[7px] font-extrabold tracking-widest border-b border-rose-600 pb-0.5 mb-1 px-2 w-full">
                    AURA STUDIOS // DESIGN REVIEW
                  </div>
                  <div className="text-sm font-black tracking-tight leading-none my-0.5">
                    APPROVED
                  </div>
                  <div className="text-[7px] font-bold leading-normal mt-0.5">
                    BY: {approverUser?.name || 'Sarah Jenkins'}
                  </div>
                  <div className="text-[7px] font-bold leading-normal">
                    DATE: {approval ? new Date(approval.approved_at).toLocaleDateString() : new Date().toLocaleDateString()}
                  </div>
                  <div className="text-[6px] tracking-widest mt-1.5 border-t border-rose-600 pt-0.5 w-full text-center font-bold">
                    IMMUTABLE WORKFLOW LOCK
                  </div>
                </motion.div>
              )}

              {/* Existing Change Pins (Approved/Committed Reviews) */}
              {allProposedChanges.map((pin) => (
                <motion.button
                  key={pin.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChangePin(pin);
                    setShowAddChangeForm(false);
                  }}
                  className={`absolute h-5 w-5 rounded-full border border-slate-950 shadow-md flex items-center justify-center text-[9px] font-black text-white cursor-pointer z-10 ${
                    pin.resolved ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                  style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -50%)' }}
                  title={pin.description}
                >
                  !
                </motion.button>
              ))}

              {/* Local Draft Change Pins (Currently Proposing) */}
              {reviewChangesList.map((pin, idx) => (
                <motion.div
                  key={idx}
                  className="absolute h-5 w-5 rounded-full bg-amber-600 border border-slate-950 shadow-md flex items-center justify-center text-[9px] font-black text-white z-10"
                  style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -50%)' }}
                  title={pin.description}
                >
                  ?
                </motion.div>
              ))}

              {/* Active click coordinate prompt drop-circle */}
              {clickCoords && (
                <div
                  className="absolute h-4 w-4 rounded-full border-2 border-white bg-indigo-600 animate-ping pointer-events-none"
                  style={{ left: `${clickCoords.x}%`, top: `${clickCoords.y}%`, transform: 'translate(-50%, -50%)' }}
                />
              )}

              {/* CAD Title Block component overlay at bottom-right corner */}
              <div className="absolute bottom-4 right-4 bg-white border border-border/80 text-[7px] font-mono text-slate-700 select-none pointer-events-none z-10 w-44 shadow-sm">
                <div className="grid grid-cols-2 border-b border-border/80">
                  <div className="p-1 border-r border-border/80 font-black truncate">AURA STUDIOS</div>
                  <div className="p-1 truncate">SHEET: {doc.name.split('.')[0]}</div>
                </div>
                <div className="grid grid-cols-3">
                  <div className="p-1 border-r border-border/80">SCALE: 1:100</div>
                  <div className="p-1 border-r border-border/80 font-bold text-primary">REV: {activeVersion?.version_number}</div>
                  <div className="p-1 text-[6px] uppercase font-bold truncate">APP: JENKINS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form to submit a proposed change at coordinates */}
          {showAddChangeForm && clickCoords && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-border bg-card shadow-lg"
            >
              <h4 className="text-xs font-bold text-foreground mb-3">Propose Revision at grid X: {clickCoords.x}%, Y: {clickCoords.y}%</h4>
              <form onSubmit={handleProposeChangeLocal} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newChangeDesc}
                  onChange={(e) => setNewChangeDesc(e.target.value)}
                  placeholder="Describe change required (e.g. increase concrete rebar column sizing by 100mm)"
                  className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowAddChangeForm(false);
                    setClickCoords(null);
                  }}
                  className="px-3 py-2 border border-border text-muted-foreground rounded-xl text-xs hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/95 text-xs cursor-pointer"
                >
                  Drop Pin
                </button>
              </form>
            </motion.div>
          )}

          {/* Selected Pin Details Display */}
          {selectedChangePin && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-border bg-card flex justify-between items-start"
            >
              <div>
                <span className="text-[9px] uppercase font-bold text-rose-400 m-1 bg-rose-500/5 px-2 py-0.5 border border-rose-500/15 rounded inline-block">
                  Change requested
                </span>
                <p className="text-xs text-foreground font-bold mt-2">{selectedChangePin.description}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Proposed by {useAuthStore.getState().allUsers.find(u => u.id === selectedChangePin.proposed_by)?.name} on {new Date(selectedChangePin.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedChangePin(null)}
                className="p-1 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </div>

        {/* Sidebar Review / Approval Panels */}
        <div className="space-y-6">
          {/* VERSION HISTORY SUMMARY */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Version History</h3>
            <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
              {docVersions.map((v) => (
                <div key={v.id} className="flex justify-between items-start p-2 rounded-xl bg-secondary/25 border border-border/50">
                  <div>
                    <span className="text-xs font-black text-foreground">{v.version_number}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{v.changelog}</p>
                    <span className="text-[8px] text-slate-500 block mt-1">
                      Uploaded by {useAuthStore.getState().allUsers.find(u => u.id === v.uploaded_by)?.name}
                    </span>
                  </div>
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.25 rounded border ${
                    v.status === 'approved' 
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                      : 'text-amber-700 bg-amber-50 border-amber-200'
                  }`}>
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIVE REVIEWS & COMMITTED CHANGES LIST */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Reviews & Annotations</h3>
            
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {reviews.length === 0 ? (
                <p className="text-slate-500 text-xs italic text-center py-4">No reviews submitted on this version.</p>
              ) : (
                reviews.map((r) => {
                  const reviewer = useAuthStore.getState().allUsers.find(u => u.id === r.reviewer_id);
                  return (
                    <div key={r.id} className="p-3 bg-secondary/35 rounded-xl border border-border/50 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-foreground">{reviewer?.name}</span>
                        <span className="text-[9px] text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">{r.comments}</p>
                      
                      {r.proposed_changes.length > 0 && (
                        <div className="pt-2 border-t border-border/40 space-y-1">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Annotations Drop Pins:</p>
                          {r.proposed_changes.map((pc) => (
                            <div key={pc.id} className="text-[10px] text-rose-400 flex items-start gap-1">
                              <span>•</span>
                              <span className="leading-tight">{pc.description} (X:{pc.x}%, Y:{pc.y}%)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Senior/Principal submit review package form */}
            {(currentRole === 'principal' || currentRole === 'senior') && (
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-[10px] uppercase font-bold text-slate-400">Submit New Review Package</p>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Type general review comments..."
                  rows={2}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />

                {reviewChangesList.length > 0 && (
                  <div className="space-y-1.5 bg-secondary/20 p-2 rounded-xl border border-border/40">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Staged Canvas Comments ({reviewChangesList.length}):</p>
                    {reviewChangesList.map((c, idx) => (
                      <div key={idx} className="text-[10px] text-slate-400 flex justify-between gap-2">
                        <span className="truncate flex-1">• {c.description}</span>
                        <span className="text-slate-500 font-mono text-[9px]">({c.x}%, {c.y}%)</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleSubmitReviewPackage}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-xs cursor-pointer"
                >
                  Submit Review Pack
                </button>
              </div>
            )}
          </div>

          {/* MANDATORY APPROVAL PANEL (Principal Only) */}
          {(currentRole === 'principal' || currentRole === 'admin') && doc.status !== 'approved' && (
            <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Principal Sign-Off Panel</h3>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
                  Awaiting Signature
                </span>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold flex items-start gap-1.5">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-3 text-xs font-semibold text-foreground">
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 mb-1">Approval Signature Notes</label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Enter approval details (e.g., column G-8 verified for loads)..."
                    rows={2}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>

                {/* Task Tagging Buttons */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="block text-[10px] uppercase text-slate-500">Affected Junior Tasks</span>
                    <button
                      type="button"
                      onClick={() => setShowTagModal(true)}
                      className="text-[10px] font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Tag size={10} />
                      Select Tasks ({taggedTasksList.length})
                    </button>
                  </div>

                  {taggedTasksList.length > 0 ? (
                    <div className="p-2.5 border border-border/50 bg-secondary/15 rounded-xl space-y-1">
                      {taggedTasksList.map((tid) => {
                        const t = projTasks.find(task => task.id === tid);
                        return (
                          <div key={tid} className="flex justify-between text-[10px] text-slate-400">
                            <span className="truncate max-w-[170px]">• {t?.title}</span>
                            <span className="text-[8px] uppercase text-indigo-400 font-bold font-mono">
                              ({allUsersList.find(u => u.id === t?.assigned_junior_id)?.name.split(' ')[0]})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="confirmNoTasks"
                        checked={confirmNoTasks}
                        onChange={(e) => {
                          setConfirmNoTasks(e.target.checked);
                          if (e.target.checked) setTaggedTasksList([]);
                        }}
                        className="h-3.5 w-3.5 rounded border-border cursor-pointer focus:ring-primary text-foreground"
                      />
                      <label htmlFor="confirmNoTasks" className="text-[11px] text-muted-foreground select-none cursor-pointer">
                        I explicitly confirm: No junior tasks are affected by this revision.
                      </label>
                    </div>
                  )}
                </div>

                {/* Approve Button */}
                <button
                  onClick={handleApproveClick}
                  disabled={isApprovalButtonLocked}
                  className={`w-full py-2.5 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer border ${
                    isApprovalButtonLocked
                      ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-750 border-transparent shadow-md'
                  }`}
                >
                  <ShieldCheck size={14} />
                  Approve and Lock Drawing Version
                </button>

                {isApprovalButtonLocked && (
                  <p className="text-[9px] text-amber-600 text-center leading-relaxed font-semibold">
                    * The approve action remains disabled until you either select affected junior tasks or confirm bypass.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Read only Approved block if drawing is approved */}
          {doc.status === 'approved' && (
            <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <ShieldCheck size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Version Locked</span>
              </div>
              <p className="text-[11px] text-emerald-600 leading-relaxed font-semibold">
                This drawing version has been formally approved and locked by Principal Sarah. Revision logs and notification tasks have been distributed.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Task Tagging Selector Modal with SVG Interactive Dependency Graph */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowTagModal(false)} />
          <div className="relative w-full max-w-2xl p-6 rounded-2xl border border-slate-200 bg-white shadow-2xl z-10">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-mono mb-2">Tag Affected Tasks Graph</h3>
            <p className="text-[11px] text-slate-500 mb-4 font-semibold">
              Establish live links between this pending blueprint revision and active junior task dependencies. Clicking a task node tags it.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center relative min-h-[260px] border border-slate-150 rounded-xl p-4 bg-slate-50/30 overflow-hidden border-draft">
              {/* Left Side: Revision Source Node */}
              <div className="md:col-span-4 flex flex-col items-center justify-center z-10">
                <div className="p-4 rounded-xl border border-blue-200 bg-white shadow-xs text-center w-full space-y-2 select-none">
                  <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest block font-mono">Pending Revision</span>
                  <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto text-blue-700 font-mono font-black text-xs shadow-xs animate-pulse-slow">
                    {activeVersion?.version_number || 'v1.1'}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-700 line-clamp-1">{doc.name}</h4>
                    <p className="text-[8px] text-slate-400 font-mono mt-0.5">PENDING APPROVAL</p>
                  </div>
                </div>
              </div>

              {/* Middle SVG Connectors */}
              <div className="hidden md:block md:col-span-3 h-64 relative z-0">
                {/* SVG canvas to draw connecting wires */}
                <svg className="w-full h-full" viewBox="0 0 80 256" preserveAspectRatio="none">
                  {projTasks.filter(t => t.status !== 'completed').map((t, idx, arr) => {
                    const isTagged = taggedTasksList.includes(t.id);
                    const total = arr.length;
                    const startY = 128; // Center of 256px height
                    const targetY = total > 1 
                      ? 24 + (idx * (208 / (total - 1))) 
                      : 128;
                    
                    return (
                      <g key={t.id}>
                        {/* Connecting Path */}
                        <path
                          d={`M 0,${startY} C 35,${startY} 45,${targetY} 80,${targetY}`}
                          fill="none"
                          stroke={isTagged ? '#2563eb' : '#cbd5e1'}
                          strokeWidth={isTagged ? 1.8 : 0.8}
                          className={isTagged ? 'animate-dash-flow' : ''}
                          style={{
                            transition: 'stroke 0.25s, stroke-width 0.25s',
                          }}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Right Side: Candidate Task Nodes */}
              <div className="md:col-span-5 space-y-2.5 z-10 max-h-64 overflow-y-auto pr-1">
                {projTasks.filter(t => t.status !== 'completed').length === 0 ? (
                  <p className="text-slate-400 text-xs italic text-center py-8">No active project tasks available to tag.</p>
                ) : (
                  projTasks.filter(t => t.status !== 'completed').map((t) => {
                    const isTagged = taggedTasksList.includes(t.id);
                    const junior = allUsersList.find(u => u.id === t.assigned_junior_id);
                    
                    const handleToggleTag = () => {
                      setConfirmNoTasks(false);
                      if (isTagged) {
                        setTaggedTasksList(prev => prev.filter(id => id !== t.id));
                      } else {
                        setTaggedTasksList(prev => [...prev, t.id]);
                      }
                    };

                    return (
                      <div
                        key={t.id}
                        onClick={handleToggleTag}
                        className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none flex flex-col space-y-1 ${
                          isTagged 
                            ? 'border-blue-600 bg-blue-50/20 shadow-xs ring-1 ring-blue-500/30' 
                            : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-350'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <p className="font-extrabold text-slate-800 text-[10px] leading-tight truncate">{t.title}</p>
                          <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                            isTagged ? 'bg-blue-600 border-blue-700 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isTagged && <Check size={8} />}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-semibold font-mono uppercase">
                          <span>Assignee: {junior?.name.split(' ')[0] || 'Unassigned'}</span>
                          <span className="text-[7px] font-bold text-slate-500 px-1 bg-slate-100 border border-slate-200 rounded">
                            {t.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-4">
              <button
                onClick={() => setShowTagModal(false)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-750 shadow-md cursor-pointer text-xs uppercase tracking-wider"
              >
                Apply Tags & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm p-6 rounded-2xl border border-slate-200 bg-white shadow-2xl z-10 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center mx-auto text-emerald-700">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h3 className="text-md font-bold text-slate-800">Drawing Version Approved</h3>
              <p className="text-xs text-slate-450 mt-2 leading-relaxed">
                The drawing has been approved, locked, and appended to the immutable system audit trail. Affected juniors and same-level peers have been notified.
              </p>
            </div>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.refresh();
              }}
              className="w-full py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-750 transition-all text-xs cursor-pointer shadow-md"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

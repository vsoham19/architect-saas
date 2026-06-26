'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDBStore, mapVersion } from '../../../../store/dbStore';
import { useAuthStore } from '../../../../store/authStore';
import {
  FileText, Check, ShieldCheck, AlertCircle, Clock, ChevronDown,
  MessageSquare, PlusCircle, Tag, Layers, HelpCircle, AlertTriangle, Eye, EyeOff, ArrowLeft, X, ArrowLeftRight,
  Sparkles, RefreshCcw, Paintbrush, Square, Circle, Eraser, Trash2, Undo2, Save, Upload
} from 'lucide-react';

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
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentVersion, ProposedChange, Task } from '../../../../types';
import CustomSelect from '../../../../components/CustomSelect';

const getSandboxMockElements = (versionId: string) => {
  if (versionId === 'vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvv01') {
    return [
      { id: 'el-1', element_type: 'wall', label: 'Main Auditorium Enclosure Wall', confidence_score: 0.98 },
      { id: 'el-2', element_type: 'column', label: 'Load-bearing Column at Grid A1', confidence_score: 0.95 },
      { id: 'el-3', element_type: 'column', label: 'Load-bearing Column at Grid A2', confidence_score: 0.95 },
      { id: 'el-4', element_type: 'column', label: 'Load-bearing Column at Grid B1', confidence_score: 0.92 },
      { id: 'el-5', element_type: 'column', label: 'Load-bearing Column at Grid B2', confidence_score: 0.92 },
      { id: 'el-6', element_type: 'room', label: 'Auditorium Seating Area (800 seats)', confidence_score: 0.99 },
      { id: 'el-7', element_type: 'room', label: 'Stage / Performance space', confidence_score: 0.97 },
      { id: 'el-8', element_type: 'door', label: 'Main Entrance Egress Double Doors', confidence_score: 0.94 },
      { id: 'el-9', element_type: 'door', label: 'Stage Exit Door Left', confidence_score: 0.90 },
      { id: 'el-10', element_type: 'staircase', label: 'Egress Stairwell A - Lobby Connection', confidence_score: 0.93 },
    ];
  } else if (versionId === 'vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvv02') {
    return [
      { id: 'el-21', element_type: 'curtain_wall', label: 'Parametric Outer Glass Facade Panel', confidence_score: 0.96 },
      { id: 'el-22', element_type: 'column', label: 'Curved Truss Column interface node', confidence_score: 0.91 },
      { id: 'el-23', element_type: 'window', label: 'Parametric Double-glazed Windows', confidence_score: 0.94 },
      { id: 'el-24', element_type: 'room', label: 'Inner Foyer Gallery', confidence_score: 0.90 },
      { id: 'el-25', element_type: 'hvac_duct', label: 'Exhaust trunk line at Gallery ceiling', confidence_score: 0.89 },
      { id: 'el-26', element_type: 'electrical_trace', label: 'Solar facade conduit routing', confidence_score: 0.85 },
      { id: 'el-27', element_type: 'structural_beam', label: 'Cantilevered structural glass support rib', confidence_score: 0.92 },
    ];
  }
  return [];
};

const getSandboxMockDiff = (docId: string) => {
  if (docId === 'dddddddd-dddd-dddd-dddd-dddddddddd01') {
    return {
      document_id: docId,
      from_version: null,
      to_version: 'v1.0.0',
      elements_added: [],
      elements_removed: [],
      elements_modified: [],
      suggested_affected_tasks: [],
      parsed_summary: 'This is the initial upload of the Helix Auditorium seating layouts and structural plans. The AI model has verified the basic geometry coordinates.',
      model_used: 'gemini-1.5-flash'
    };
  } else if (docId === 'dddddddd-dddd-dddd-dddd-dddddddddd02') {
    return {
      document_id: docId,
      from_version: 'v1.0.0',
      to_version: 'v2.0.0',
      elements_added: ['HVAC trunk line at Foyer Level 2', 'Fire egress emergency signage markers'],
      elements_removed: ['Temporary structural bracing joints'],
      elements_modified: ['Parametric glass panel wind tolerances changed from 12mm to 15mm'],
      suggested_affected_tasks: [
        {
          task_id: '99999999-9999-9999-9999-999999999001',
          confidence: 0.94,
          reason: 'Wind load tolerance updates require resizing the panels in the parametric 3D model.'
        },
        {
          task_id: '99999999-9999-9999-9999-999999999002',
          confidence: 0.88,
          reason: 'Fire exit route signage additions affect the final evacuation exit timing reports.'
        }
      ],
      parsed_summary: 'Adjusted parametric facade wind tolerances to accommodate updated local structural guidelines. Integrated mechanical ductwork layout plans and fire exit routes within the gallery area.',
      model_used: 'gemini-1.5-flash'
    };
  }
  return null;
};

export default function DocumentWorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const docId = params.id as string;
  const versionQueryId = searchParams.get('version');
  const compareQueryId = searchParams.get('compare');

  useEffect(() => {
    console.log("[Workspace] Using API URL:", getApiUrl());
  }, []);

  const { currentUser, currentRole, allUsers: allUsersList } = useAuthStore();
  const {
    documents, documentVersions, documentReviews, tasks,
    addReview, approveDocument, projects, backtrackDocumentApproval
  } = useDBStore();

  const doc = documents.find(d => d.id === docId);
  const docVersions = documentVersions.filter(v => v.document_id === docId);

  const [activeVersion, setActiveVersion] = useState<DocumentVersion | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [showAddChangeForm, setShowAddChangeForm] = useState(false);
  const [clickCoords, setClickCoords] = useState<{ x: number; y: number } | null>(null);
  const [newChangeDesc, setNewChangeDesc] = useState('');
  const [selectedChangePin, setSelectedChangePin] = useState<any | null>(null);

  const [canvasPins, setCanvasPins] = useState<any[]>([]);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [drawingElements, setDrawingElements] = useState<any[]>([]);
  const [elementsLoading, setElementsLoading] = useState(false);
  const [diffLog, setDiffLog] = useState<any>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [aiStatuses, setAiStatuses] = useState<Record<string, 'processing' | 'complete' | 'unavailable'>>({});

  const [approvalNotes, setApprovalNotes] = useState('');
  const [showTagModal, setShowTagModal] = useState(false);
  const [taggedTasksList, setTaggedTasksList] = useState<string[]>([]);
  const [confirmNoTasks, setConfirmNoTasks] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [reviewComments, setReviewComments] = useState('');
  const [reviewChangesList, setReviewChangesList] = useState<{ description: string; x: number; y: number }[]>([]);

  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareVersion, setCompareVersion] = useState<DocumentVersion | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    structural: true, hvac: true, fire: true, electrical: true
  });
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(true);

  const [drawingMode, setDrawingMode] = useState<'pin' | 'draw'>('pin');
  const [brushTool, setBrushTool] = useState<'pencil' | 'rectangle' | 'circle' | 'eraser'>('pencil');
  const [brushColor, setBrushColor] = useState<string>('#e11d48');
  const [brushWidth, setBrushWidth] = useState<number>(5);
  const [strokes, setStrokes] = useState<any[]>([]);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStartPoint, setDrawStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentStroke, setCurrentStroke] = useState<any | null>(null);

  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadTypeConfirm, setUploadTypeConfirm] = useState<{ file: File; base64: string } | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  // Guard: prevents the version-selection useEffect from overriding a manually uploaded/selected version
  const manualVersionSet = useRef(false);
  // Incremented after each upload to force img elements to reload (cache-bust)
  const [imageKey, setImageKey] = useState(0);

  const [isEditingFsi, setIsEditingFsi] = useState(false);
  const [tempBuiltUpArea, setTempBuiltUpArea] = useState('');
  const [tempPlotArea, setTempPlotArea] = useState('');

  // Resolve a file_url to a fully-qualified src with optional cache-busting
  const resolveImageSrc = (fileUrl: string | undefined | null, bustCache = false): string => {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('data:')) {
      return fileUrl; // base64 doesn't need cache-busting and will fail if query params are appended
    }
    if (fileUrl.startsWith('http')) {
      return bustCache ? `${fileUrl}?t=${imageKey}` : fileUrl;
    }
    const cleanUrl = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
    const base = `${getApiUrl()}${cleanUrl}`;
    return bustCache ? `${base}?t=${imageKey}` : base;
  };

  const drawAllStrokes = (ctx: CanvasRenderingContext2D, strokeList: any[]) => {
    ctx.clearRect(0, 0, 800, 450);
    strokeList.forEach((stroke) => {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (stroke.tool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; }
      else { ctx.globalCompositeOperation = 'source-over'; }
      if (stroke.tool === 'pencil' || stroke.tool === 'eraser') {
        if (stroke.points?.length > 0) {
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          ctx.stroke();
        }
      } else if (stroke.tool === 'rectangle') {
        const p1 = stroke.points[0]; const p2 = stroke.points[1];
        if (p1 && p2) ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      } else if (stroke.tool === 'circle') {
        const p1 = stroke.points[0]; const p2 = stroke.points[1];
        if (p1 && p2) {
          const rx = (p2.x - p1.x) / 2; const ry = (p2.y - p1.y) / 2;
          ctx.beginPath();
          ctx.ellipse(p1.x + rx, p1.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }
    });
    ctx.globalCompositeOperation = 'source-over';
  };

  const handleDrawingPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawingMode !== 'draw' || !drawingCanvasRef.current) return;
    setIsDrawing(true);
    const rect = drawingCanvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 450;
    setDrawStartPoint({ x, y });
    setCurrentStroke({ tool: brushTool, color: brushColor, width: brushWidth, points: [{ x, y }] });
  };

  const handleDrawingPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingCanvasRef.current || !currentStroke || !drawStartPoint) return;
    const ctx = drawingCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const rect = drawingCanvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    const y = ((e.clientY - rect.top) / rect.height) * 450;
    if (brushTool === 'pencil' || brushTool === 'eraser') {
      const upd = { ...currentStroke, points: [...currentStroke.points, { x, y }] };
      setCurrentStroke(upd);
      drawAllStrokes(ctx, [...strokes, upd]);
    } else if (brushTool === 'rectangle' || brushTool === 'circle') {
      const upd = { ...currentStroke, points: [drawStartPoint, { x, y }] };
      setCurrentStroke(upd);
      drawAllStrokes(ctx, [...strokes, upd]);
    }
  };

  const handleDrawingPointerUp = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    setStrokes(prev => [...prev, currentStroke]);
    setUndoStack([]);
    setCurrentStroke(null);
    setDrawStartPoint(null);
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    setUndoStack(prev => [...prev, strokes[strokes.length - 1]]);
    setStrokes(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setStrokes(prev => [...prev, last]);
  };

  const handleClear = () => {
    if (window.confirm("Clear all sketches on this canvas?")) { setStrokes([]); setUndoStack([]); }
  };

  const handleSaveSketches = async () => {
    if (!activeVersion) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/documents/versions/${activeVersion.id}/drawing-data`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawing_data: { strokes } })
      });
      const resJson = await res.json();
      if (resJson.success || resJson.status === 'success') {
        activeVersion.drawing_data = { strokes };
        useDBStore.setState((state) => ({
          documentVersions: state.documentVersions.map(v => v.id === activeVersion.id ? { ...v, drawing_data: { strokes } } : v)
        }));
        alert("Sketches saved successfully!");
      }
    } catch (e) { console.error("Failed to save sketches:", e); alert("Failed to save drawing sketches."); }
  };

  useEffect(() => {
    if (activeVersion) {
      const saved = activeVersion.drawing_data?.strokes || [];
      setStrokes(saved); setUndoStack([]);
      setTimeout(() => {
        if (drawingCanvasRef.current) {
          const ctx = drawingCanvasRef.current.getContext('2d');
          if (ctx) drawAllStrokes(ctx, saved);
        }
      }, 100);
    } else { setStrokes([]); setUndoStack([]); }
  }, [activeVersion]);

  useEffect(() => {
    if (drawingCanvasRef.current) {
      const ctx = drawingCanvasRef.current.getContext('2d');
      if (ctx) drawAllStrokes(ctx, strokes);
    }
  }, [strokes, drawingMode]);

  const uploadDrawingFile = async (file: File, base64: string, isCurrent: boolean) => {
    if (!doc) return;
    setImageUploading(true);
    try {
      const payload: any = {
        document_id: doc.id,
        filename: file.name,
        base64Data: base64,
        changelog: (isCurrent && activeVersion) ? `Updated image background of ${activeVersion.version_number}` : `Created new version: ${file.name}`,
        created_by: currentUser?.id
      };
      if (isCurrent && activeVersion) payload.version_id = activeVersion.id;
      const res = await fetch(`${getApiUrl()}/api/documents/upload-drawing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resJson = await res.json();
      if (resJson.success || resJson.status === 'success') {
        const mappedVer = mapVersion(resJson.data);
        // Set guard BEFORE updating store to prevent useEffect from overriding our new version
        manualVersionSet.current = true;
        setImageKey(k => k + 1); // bust image cache so new upload is shown immediately
        setAiStatuses((prev) => ({ ...prev, [mappedVer.id]: 'processing' }));
        if (isCurrent && activeVersion) {
          // Update the store version AND set as active
          useDBStore.setState((state) => ({ documentVersions: state.documentVersions.map(v => v.id === mappedVer.id ? mappedVer : v) }));
          setActiveVersion(mappedVer);
        } else {
          // New version: add to store, update document current_version_id, set as active
          useDBStore.setState((state) => ({
            documentVersions: [...state.documentVersions, mappedVer],
            documents: state.documents.map(d => d.id === doc.id ? { ...d, current_version_id: mappedVer.id } : d)
          }));
          setActiveVersion(mappedVer);
        }
        // Reset guard after a tick (after React batches the state updates)
        setTimeout(() => { manualVersionSet.current = false; }, 100);
        fetchAiData(mappedVer.id);
        fetchDiffLog();
      } else {
        alert(`Upload failed: ${resJson.message || 'unknown error'}`);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload error.");
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) { alert("File exceeds 30MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (!activeVersion) {
        // Upload immediately if there is no active version
        uploadDrawingFile(file, base64, false);
      } else {
        setUploadTypeConfirm({ file, base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUploadConfirmed = async (isCurrentVersion: boolean) => {
    if (!uploadTypeConfirm) return;
    const { file, base64 } = uploadTypeConfirm;
    setUploadTypeConfirm(null);
    await uploadDrawingFile(file, base64, isCurrentVersion);
  };

  useEffect(() => {
    // Skip if a manual upload/selection just set the active version
    if (manualVersionSet.current) return;
    if (docVersions.length > 0) {
      if (versionQueryId) {
        const found = docVersions.find(v => v.id === versionQueryId);
        if (found) {
          setActiveVersion(found);
          if (compareQueryId) {
            const compFound = docVersions.find(v => v.id === compareQueryId);
            if (compFound) { setCompareVersion(compFound); setIsCompareMode(true); }
          }
          return;
        }
      }
      const current = docVersions.find(v => v.id === doc?.current_version_id);
      setActiveVersion(current || docVersions[docVersions.length - 1]);
    }
  }, [docId, versionQueryId, compareQueryId, doc?.current_version_id, docVersions.length]);

  useEffect(() => {
    if (activeVersion) {
      fetch(`${getApiUrl()}/api/canvas/pins/${activeVersion.id}`)
        .then(res => res.json())
        .then(res => { if (res.success || res.status === 'success') setCanvasPins(res.data || []); })
        .catch(err => console.error("Error fetching pins:", err));
    }
  }, [activeVersion]);

  const fetchAiData = async (versionId: string) => {
    setElementsLoading(true);
    if (useAuthStore.getState().isSandboxMode) {
      setTimeout(() => {
        setDrawingElements(getSandboxMockElements(versionId));
        setElementsLoading(false);
      }, 400);
      return;
    }
    try {
      const res = await fetch(`${getApiUrl()}/api/ai/drawing-elements/${versionId}`);
      const data = await res.json();
      if (data.success || data.status === 'success') {
        setDrawingElements(data.data || []);
        if (data.is_processing) {
          setAiStatuses((prev) => ({ ...prev, [versionId]: 'processing' }));
        } else if (data.data && data.data.length > 0) {
          setAiStatuses((prev) => ({ ...prev, [versionId]: 'complete' }));
        }
      }
    } catch (err) { console.error("Error fetching AI elements:", err); }
    finally { setElementsLoading(false); }
  };

  const triggerAiAnalysis = async (versionId: string) => {
    if (!versionId || useAuthStore.getState().isSandboxMode) return;
    setAiStatuses((prev) => ({ ...prev, [versionId]: 'processing' }));
    setDrawingElements([]);
    setDiffLog(null);
    try {
      const res = await fetch(`${getApiUrl()}/api/ai/trigger/${versionId}`, { method: 'POST' });
      const data = await res.json();
      if (data.is_processing) {
        setAiStatuses((prev) => ({ ...prev, [versionId]: 'processing' }));
      }
    } catch (err) { console.error("Error triggering AI analysis:", err); }
  };

  const fetchDiffLog = async () => {
    setDiffLoading(true);
    if (useAuthStore.getState().isSandboxMode) {
      setTimeout(() => {
        setDiffLog(getSandboxMockDiff(docId));
        setDiffLoading(false);
      }, 400);
      return;
    }
    try {
      const res = await fetch(`${getApiUrl()}/api/ai/diff/${docId}`);
      const data = await res.json();
      if (data.success || data.status === 'success') setDiffLog(data.data);
    } catch (err) { console.error("Error fetching diff:", err); }
    finally { setDiffLoading(false); }
  };

  useEffect(() => { if (activeVersion) { fetchAiData(activeVersion.id); fetchDiffLog(); } }, [activeVersion]);

  useEffect(() => {
    if (activeVersion && aiStatuses[activeVersion.id] === 'complete') {
      fetchAiData(activeVersion.id);
      fetchDiffLog();
    }
  }, [activeVersion?.id, aiStatuses[activeVersion?.id || '']]);

  useEffect(() => {
    if (useAuthStore.getState().isSandboxMode) {
      const sandboxStatuses: Record<string, 'complete'> = {};
      docVersions.forEach(v => {
        sandboxStatuses[v.id] = 'complete';
      });
      setAiStatuses(prev => ({ ...prev, ...sandboxStatuses }));
      return;
    }

    // Only poll the active version, and only if it's in processing state
    // Use a ref so the interval closure always reads latest status
    const pollActiveVersion = async () => {
      if (!activeVersion) return;
      const currentStatus = aiStatuses[activeVersion.id];
      if (currentStatus === 'complete' || currentStatus === 'unavailable') return;

      try {
        const res = await fetch(`${getApiUrl()}/api/ai/drawing-elements/${activeVersion.id}`);
        const json = await res.json();
        if (json.success || json.status === 'success') {
          const elements = json.data || [];
          if (elements.length > 0) {
            setDrawingElements(elements);
            setAiStatuses((prev) => ({ ...prev, [activeVersion.id]: 'complete' }));
            fetchDiffLog();
          } else if (json.is_processing) {
            setAiStatuses((prev) => ({ ...prev, [activeVersion.id]: 'processing' }));
          } else {
            const timePassed = activeVersion.created_at ? Date.now() - new Date(activeVersion.created_at).getTime() : 999999;
            if (timePassed > 120000) {
              setAiStatuses((prev) => ({ ...prev, [activeVersion.id]: 'unavailable' }));
            }
          }
        }
      } catch (e) { console.error("Polling error:", e); }
    };

    // Poll every 30 seconds (not 5s) to avoid quota exhaustion
    const interval = setInterval(pollActiveVersion, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVersion?.id]);

  const reviews = activeVersion ? documentReviews.filter(r => r.document_version_id === activeVersion.id) : [];
  const approval = activeVersion ? useDBStore.getState().documentApprovals.find(a => a.document_version_id === activeVersion.id) : null;
  const approverUser = approval ? useAuthStore.getState().allUsers.find(u => u.id === approval.approver_id) : null;

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertCircle className="text-destructive" size={24} />
        </div>
        <p className="text-sm font-semibold text-muted-foreground font-mono">Document workspace not found.</p>
      </div>
    );
  }

  const proj = projects.find(p => p.id === doc.project_id);
  const projTasks = tasks.filter(t => t.project_id === doc.project_id);

  useEffect(() => {
    if (activeVersion) {
      setTempBuiltUpArea(activeVersion.built_up_area?.toString() || '0');
    }
  }, [activeVersion?.id, activeVersion?.built_up_area]);

  useEffect(() => {
    if (proj) {
      setTempPlotArea(proj.plot_area?.toString() || '10000');
    }
  }, [proj?.id, proj?.plot_area]);

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSlider) {
      const wrapper = document.getElementById('drawing-content-wrapper');
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      setSliderPosition(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    } else {
      const wrapper = document.getElementById('drawing-content-wrapper');
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        setHoverCoords({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
      } else { setHoverCoords(null); }
    }
  };

  const renderCadLayers = (versionNum: string) => {
    const isV1_0 = versionNum === 'v1.0.0';
    const isV1_1 = versionNum === 'v1.1.0';
    const showStructural = visibleLayers.structural;
    const showHvac = !isV1_0 && visibleLayers.hvac;
    const showFireExit = !isV1_0 && !isV1_1 && visibleLayers.fire;
    const showElectrical = !isV1_0 && visibleLayers.electrical;
    return (
      <svg className="absolute inset-0 w-full h-full opacity-65 pointer-events-none" viewBox="0 0 800 450">
        {showStructural && (
          <g>
            <rect x="50" y="50" width="700" height="350" fill="none" stroke="#2563eb" strokeWidth="1.5" />
            {[200, 400, 600].map(cx => [150, 300].map(cy => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="10" fill="none" stroke="#2563eb" strokeWidth="1" />
            )))}
          </g>
        )}
        {showHvac && <path d="M50 150 L750 150 M50 300 L750 300 M400 50 L400 400" fill="none" stroke="#059669" strokeWidth="1" strokeDasharray="3,3" />}
        {showFireExit && (
          <g>
            <rect x="680" y="260" width="60" height="130" fill="none" stroke="#e11d48" strokeWidth="1.2" />
            {[290, 320, 350, 380].map(y => <line key={y} x1="680" y1={y} x2="740" y2={y} stroke="#e11d48" strokeWidth="0.8" />)}
          </g>
        )}
        {showElectrical && (
          <g opacity="0.85">
            <rect x="60" y="60" width="12" height="24" fill="none" stroke="#d97706" strokeWidth="1.2" />
            <line x1="60" y1="60" x2="72" y2="84" stroke="#d97706" strokeWidth="0.8" />
            <line x1="72" y1="60" x2="60" y2="84" stroke="#d97706" strokeWidth="0.8" />
            <text x="76" y="74" fill="#d97706" fontSize="6" fontFamily="monospace" fontWeight="bold">PANEL-E1</text>
            <g stroke="#d97706" strokeWidth="1" fill="none">
              {[150, 350, 550].map(cx => (
                <g key={cx}><circle cx={cx} cy={50} r="4" /><line x1={cx} y1="46" x2={cx} y2="40" /><line x1={cx - 2} y1="40" x2={cx + 2} y2="40" /></g>
              ))}
              {[150, 550].map(cx => (
                <g key={`b-${cx}`}><circle cx={cx} cy={400} r="4" /><line x1={cx} y1="404" x2={cx} y2="410" /><line x1={cx - 2} y1="410" x2={cx + 2} y2="410" /></g>
              ))}
            </g>
            <g stroke="#f59e0b" strokeWidth="1.2" fill="none">
              <rect x="294" y="244" width="12" height="12" /><line x1="294" y1="244" x2="306" y2="256" /><line x1="306" y1="244" x2="294" y2="256" />
              <rect x="494" y="244" width="12" height="12" /><line x1="494" y1="244" x2="506" y2="256" /><line x1="506" y1="244" x2="494" y2="256" />
            </g>
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

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingMode !== 'pin') return;
    const wrapper = document.getElementById('drawing-content-wrapper');
    if (!wrapper || (currentRole !== 'principal' && currentRole !== 'senior')) return;
    const rect = wrapper.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      setClickCoords({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
      setShowAddChangeForm(true); setSelectedChangePin(null);
    }
  };

  const handleProposeChangeLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clickCoords || !newChangeDesc.trim() || !activeVersion) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/canvas/pins`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: doc.id, version_id: activeVersion.id, x_percent: clickCoords.x, y_percent: clickCoords.y, note: newChangeDesc.trim(), pin_type: 'review_comment', created_by: currentUser?.id })
      });
      const resJson = await res.json();
      if (resJson.success || resJson.status === 'success') setCanvasPins((prev) => [...prev, resJson.data]);
    } catch (err) { console.error("Failed to save pin:", err); }
    setNewChangeDesc(''); setShowAddChangeForm(false); setClickCoords(null);
  };

  const handleResolvePin = async (pinId: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/canvas/pins/${pinId}/resolve`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolved_by: currentUser?.id })
      });
      const resJson = await res.json();
      if (resJson.success || resJson.status === 'success') {
        setCanvasPins((prev) => prev.map(p => p.id === pinId ? resJson.data : p));
        setSelectedChangePin((prev: any) => prev?.id === pinId ? resJson.data : prev);
      }
    } catch (err) { console.error("Failed to resolve pin:", err); }
  };

  const handleSubmitReviewPackage = () => {
    if (!activeVersion) return;
    if (!reviewComments.trim() && reviewChangesList.length === 0) { alert("Add review comments or canvas changes first."); return; }
    addReview({ versionId: activeVersion.id, reviewerId: currentUser?.id || '', comments: reviewComments.trim() || 'Reviewed draft drawing.', proposedChanges: reviewChangesList });
    setReviewComments(''); setReviewChangesList([]);
    alert("Review submitted successfully!");
  };

  const handleApproveClick = () => {
    if (!activeVersion) return;
    if (taggedTasksList.length === 0 && !confirmNoTasks) {
      setErrorMsg("Select affected tasks or confirm no tasks are affected to proceed.");
      return;
    }
    setErrorMsg('');
    approveDocument({ versionId: activeVersion.id, approverId: currentUser?.id || '', notes: approvalNotes || 'Drawing approved for final drafting.', taggedTaskIds: taggedTasksList, confirmNoTasks });
    setShowSuccessModal(true); setApprovalNotes(''); setTaggedTasksList([]); setConfirmNoTasks(false);
  };

  const activeVersionUploadedBySenior = activeVersion ? allUsersList.find(u => u.id === activeVersion.uploaded_by)?.role === 'senior' : false;
  const isValidatedBySenior = reviews.some(r => {
    const reviewer = allUsersList.find(u => u.id === r.reviewer_id);
    return reviewer?.role === 'senior' && r.proposed_changes.length === 0;
  }) || activeVersionUploadedBySenior;

  // Ahmedabad FSI Zone Limit Calculations
  const ZONE_LIMITS: Record<string, number> = {
    'R1': 1.8,
    'R2': 1.2,
    'Commercial': 2.7,
    'TOZ': 4.0,
  };
  const zoneName = proj?.zone || 'R1';
  const fsiLimit = ZONE_LIMITS[zoneName] || 1.8;
  const plotArea = proj?.plot_area || 10000;
  const builtUpArea = activeVersion?.built_up_area || 0;
  const liveBuiltUp = isEditingFsi ? (Number(tempBuiltUpArea) || 0) : builtUpArea;
  const livePlotArea = isEditingFsi ? (Number(tempPlotArea) || 0) : plotArea;
  const computedFsi = livePlotArea > 0 ? Number((liveBuiltUp / livePlotArea).toFixed(2)) : 0;
  const fsiExceeded = computedFsi > fsiLimit;

  const isApprovalButtonLocked = (taggedTasksList.length === 0 && !confirmNoTasks) || !isValidatedBySenior || fsiExceeded;

  return (
    <div className="space-y-5 select-none pb-20">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/projects/${doc.project_id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-white/10 transition-all duration-150 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft size={13} />
            Back
          </Link>
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight">{doc.name}</h1>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5 uppercase tracking-wider">
              {proj?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Version Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono hidden sm:block">Rev</span>
            <CustomSelect
              value={activeVersion?.id || ''}
              onChange={(value) => {
                const selected = docVersions.find(v => v.id === value);
                if (selected) { setActiveVersion(selected); setIsCompareMode(false); }
              }}
              options={docVersions.map((v) => ({
                value: v.id,
                label: `${v.version_number} · ${v.status.toUpperCase()}`
              }))}
              className="w-44"
            />
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Compare toggle */}
          {isCompareMode ? (
            <div className="flex items-center gap-2">
              <CustomSelect
                value={compareVersion?.id || ''}
                onChange={(value) => {
                  const s = docVersions.find(v => v.id === value);
                  if (s) setCompareVersion(s);
                }}
                options={docVersions.filter(v => v.id !== activeVersion?.id).map((v) => ({
                  value: v.id,
                  label: v.version_number
                }))}
                className="w-28"
              />
              <button
                onClick={() => setIsCompareMode(false)}
                className="px-3 py-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
              >
                Exit
              </button>
            </div>
          ) : (
            docVersions.length > 1 && (
              <button
                onClick={() => { setIsCompareMode(true); const d = docVersions.find(v => v.id !== activeVersion?.id); if (d) setCompareVersion(d); }}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 text-accent-foreground text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-150"
              >
                <ArrowLeftRight size={11} />
                Compare
              </button>
            )
          )}

          <div className="h-5 w-px bg-border" />

          {/* AI Panel */}
          <button
            onClick={() => {
              setIsAiPanelOpen(true);
              // Auto-trigger analysis if no elements loaded yet and not already processing
              if (activeVersion && drawingElements.length === 0 && aiStatuses[activeVersion.id] !== 'processing') {
                triggerAiAnalysis(activeVersion.id);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-all duration-150"
          >
            <Sparkles size={11} className="animate-pulse-slow" />
            AI Analysis
          </button>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Left: CAD Canvas ── */}
        <div className="lg:col-span-2 space-y-3">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-border bg-card">
            {/* Mode Pills */}
            <div className="flex items-center bg-secondary p-1 rounded-xl gap-1">
              {[
                { id: 'pin', label: 'Pin', icon: PlusCircle },
                { id: 'draw', label: 'Draw', icon: Paintbrush },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setDrawingMode(m.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${drawingMode === m.id
                    ? 'bg-card border border-border text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <m.icon size={13} />
                  {m.label}
                </button>
              ))}
            </div>

            {/* Draw Controls */}
            {drawingMode === 'draw' && (
              <div className="flex items-center gap-3 flex-wrap">
                {/* Tools */}
                <div className="flex items-center gap-1">
                  {[
                    { id: 'pencil', icon: Paintbrush },
                    { id: 'rectangle', icon: Square },
                    { id: 'circle', icon: Circle },
                    { id: 'eraser', icon: Eraser },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setBrushTool(t.id as any)}
                      className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${brushTool === t.id
                        ? 'bg-accent border border-primary/30 text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                        }`}
                      title={t.id}
                    >
                      <t.icon size={13} />
                    </button>
                  ))}
                </div>

                {/* Colors */}
                {brushTool !== 'eraser' && (
                  <div className="flex items-center gap-1.5">
                    {[
                      { hex: '#e11d48' }, { hex: '#5e6ad2' }, { hex: '#16a34a' }, { hex: '#d97706' }, { hex: '#0f0f11' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setBrushColor(c.hex)}
                        className={`h-4 w-4 rounded-full border transition-all cursor-pointer ${brushColor === c.hex ? 'ring-2 ring-primary ring-offset-1 ring-offset-card scale-110' : 'border-border'
                          }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                )}

                {/* Size */}
                <select
                  value={brushWidth}
                  onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                  className="text-xs font-mono bg-secondary border border-border rounded-lg px-2 py-1 focus:outline-none cursor-pointer text-foreground"
                >
                  {[2, 5, 8, 12, 18].map(sz => <option key={sz} value={sz} className="bg-card">{sz}px</option>)}
                </select>

                {/* Undo / Redo / Clear / Save */}
                <div className="flex items-center gap-1">
                  <button onClick={handleUndo} disabled={strokes.length === 0} title="Undo"
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer text-xs transition-colors">
                    <Undo2 size={11} /> Undo
                  </button>
                  {undoStack.length > 0 && (
                    <button onClick={handleRedo} className="px-2 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors">
                      Redo
                    </button>
                  )}
                  <button onClick={handleClear} disabled={strokes.length === 0} title="Clear"
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 disabled:opacity-30 cursor-pointer text-xs transition-colors">
                    <Trash2 size={11} />
                  </button>
                  <button onClick={handleSaveSketches}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer shadow-sm transition-all">
                    <Save size={11} /> Save
                  </button>
                </div>
              </div>
            )}

            {/* Upload */}
            <div>
              <input type="file" ref={fileInputRef} accept="image/png, image/jpeg, image/jpg, .dwg" onChange={handleImageFileSelected} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 text-xs font-semibold cursor-pointer transition-all"
              >
                <Upload size={12} />
                {imageUploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>

          {/* Canvas Sheet */}
          <div
            ref={canvasRef}
            className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border bg-white border-draft"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
          >
            {/* Top Ruler */}
            <div className="absolute top-0 left-8 right-0 h-6 border-b border-border bg-card/80 flex justify-between px-4 pointer-events-none text-[7px] font-mono text-muted-foreground select-none z-10">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="flex flex-col justify-end items-center h-full">
                  <span>{(i * 10).toFixed(0)}m</span>
                  <div className="w-px h-1 bg-muted-foreground/30" />
                </div>
              ))}
            </div>

            {/* Left Ruler */}
            <div className="absolute top-6 left-0 bottom-0 w-8 border-r border-border bg-card/80 flex flex-col justify-between py-4 pointer-events-none text-[7px] font-mono text-muted-foreground select-none z-10">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="flex justify-end items-center w-full pr-1">
                  <span>{(i * 10).toFixed(0)}m</span>
                  <div className="h-px w-1 bg-muted-foreground/30 ml-0.5" />
                </div>
              ))}
            </div>



            {/* Interactive Canvas Area */}
            <div
              onClick={isCompareMode ? undefined : handleCanvasClick}
              onPointerMove={handleContainerPointerMove}
              onPointerUp={() => setIsDraggingSlider(false)}
              onPointerLeave={() => { setIsDraggingSlider(false); setHoverCoords(null); }}
              className="absolute top-6 left-8 right-0 bottom-0 overflow-hidden cursor-crosshair bg-white"
            >
              {/* Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(13,148,136,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(13,148,136,0.05)_1px,transparent_1px)] bg-[size:15px_15px] opacity-70" />

              <div className="absolute inset-0 p-8">
                <div className="w-full h-full relative" id="drawing-content-wrapper">
                  {(() => {
                    const isDwgFile = (url: string | undefined | null) => {
                      if (!url) return false;
                      const u = url.toLowerCase();
                      return u.includes('.dwg') || u.startsWith('data:application/dwg') || u.startsWith('data:application/octet-stream') || u.startsWith('data:image/vnd.dwg');
                    };

                    const isActiveDwg = isDwgFile(activeVersion?.file_url);
                    const isCompareDwg = isDwgFile(compareVersion?.file_url);

                    return isCompareMode ? (
                      <>
                        {activeVersion?.file_url && (
                          isActiveDwg ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-teal-500/[0.03] border border-teal-500/10 rounded-2xl p-6 text-center select-none font-mono z-10">
                              <div className="h-16 w-16 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-3">
                                <Layers className="text-teal-500 animate-pulse" size={32} />
                              </div>
                              <p className="text-sm font-bold text-foreground">DWG CAD File Loaded ({activeVersion.version_number})</p>
                              <p className="text-[10px] text-muted-foreground mt-1 max-w-sm leading-relaxed">
                                Visual rendering is not supported natively in-browser. All elements, annotations, and FSI compliance tags are fully active.
                              </p>
                            </div>
                          ) : (
                            <img key={`active-${activeVersion.id}-${imageKey}`} src={resolveImageSrc(activeVersion.file_url, true)} alt="Drawing" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                          )
                        )}
                        {renderCadLayers(activeVersion?.version_number || 'v1.1.0')}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                          {compareVersion?.file_url && (
                            isCompareDwg ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-sky-500/[0.03] border border-sky-500/10 rounded-2xl p-6 text-center select-none font-mono z-10">
                                <div className="h-16 w-16 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3">
                                  <Layers className="text-sky-500 animate-pulse" size={32} />
                                </div>
                                <p className="text-sm font-bold text-foreground">DWG CAD File Loaded ({compareVersion.version_number})</p>
                                <p className="text-[10px] text-muted-foreground mt-1 max-w-sm leading-relaxed">
                                  Visual rendering is not supported natively in-browser. All elements, annotations, and FSI compliance tags are fully active.
                                </p>
                              </div>
                            ) : (
                              <img key={`compare-${compareVersion.id}`} src={resolveImageSrc(compareVersion.file_url)} alt="Compare" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                            )
                          )}
                          {renderCadLayers(compareVersion?.version_number || 'v1.0.0')}
                        </div>
                        <div className="absolute top-0 bottom-0 w-px bg-primary z-30 pointer-events-none" style={{ left: `${sliderPosition}%` }} />
                        <div
                          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingSlider(true); }}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 w-7 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg border border-primary/20 flex items-center justify-center cursor-ew-resize z-40 select-none"
                          style={{ left: `${sliderPosition}%` }}
                        >
                          <ArrowLeftRight size={11} className="select-none pointer-events-none" />
                        </div>
                      </>
                    ) : (
                      <>
                        {activeVersion?.file_url && (
                          isActiveDwg ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-teal-500/[0.03] border border-teal-500/10 rounded-2xl p-6 text-center select-none font-mono z-10">
                              <div className="h-16 w-16 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-3">
                                <Layers className="text-teal-500 animate-pulse" size={32} />
                              </div>
                              <p className="text-sm font-bold text-foreground">DWG CAD File Loaded ({activeVersion.version_number})</p>
                              <p className="text-[10px] text-muted-foreground mt-1 max-w-sm leading-relaxed">
                                Visual rendering is not supported natively in-browser. All elements, annotations, and FSI compliance tags are fully active.
                              </p>
                            </div>
                          ) : (
                            <img key={`active-${activeVersion.id}-${imageKey}`} src={resolveImageSrc(activeVersion.file_url, true)} alt="Drawing" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                          )
                        )}
                        {renderCadLayers(activeVersion?.version_number || 'v1.1.0')}
                      </>
                    );
                  })()}

                  {/* Drawing Canvas */}
                  <canvas
                    ref={drawingCanvasRef} width={800} height={450}
                    onPointerDown={handleDrawingPointerDown}
                    onPointerMove={handleDrawingPointerMove}
                    onPointerUp={handleDrawingPointerUp}
                    className={`absolute inset-0 w-full h-full z-20 select-none touch-none ${drawingMode === 'draw' ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
                  />

                  {/* Pins */}
                  {canvasPins.map((pin) => (
                    <motion.button
                      key={pin.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedChangePin(pin); setShowAddChangeForm(false); }}
                      className={`absolute h-5 w-5 rounded-full border border-black/20 shadow-lg flex items-center justify-center text-[9px] font-black text-white cursor-pointer z-30 transition-all ${pin.resolved ? 'bg-emerald-500 hover:bg-emerald-400 opacity-50' : 'bg-destructive hover:bg-destructive/80'
                        }`}
                      style={{ left: `${pin.x_percent}%`, top: `${pin.y_percent}%`, transform: 'translate(-50%, -50%)' }}
                      title={pin.note}
                    >
                      {pin.resolved ? '✓' : '!'}
                    </motion.button>
                  ))}

                  {/* Click drop circle */}
                  {clickCoords && (
                    <div
                      className="absolute h-4 w-4 rounded-full border-2 border-white bg-primary animate-ping pointer-events-none z-30"
                      style={{ left: `${clickCoords.x}%`, top: `${clickCoords.y}%`, transform: 'translate(-50%, -50%)' }}
                    />
                  )}

                  {/* CAD Title Block */}
                  <div className="absolute bottom-3 right-3 border border-border text-[7px] font-mono select-none pointer-events-none z-20 w-40"
                    style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}>
                    <div className="grid grid-cols-2 border-b border-border/80">
                      <div className="p-1 border-r border-border/80 font-bold text-foreground/75 truncate">AURA STUDIOS</div>
                      <div className="p-1 text-foreground/60 truncate">{doc.name.split('.')[0]}</div>
                    </div>
                    <div className="grid grid-cols-3">
                      <div className="p-1 border-r border-border/80 text-foreground/50">1:100</div>
                      <div className="p-1 border-r border-border/80 font-bold text-primary">{activeVersion?.version_number}</div>
                      <div className="p-1 text-[6px] uppercase font-bold text-foreground/50 truncate">JENKINS</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Empty State */}
              {!activeVersion?.file_url && strokes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center p-8 z-20">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-md border border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-4 cursor-pointer hover:border-primary/40 hover:bg-primary/[0.03] transition-all group text-center bg-card/40 backdrop-blur-xs"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/15 transition-colors">
                      <Upload size={22} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">Upload Blueprint</h5>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                        Drop a PNG or JPG floor plan. Triggers AI element detection automatically.
                      </p>
                    </div>
                    <span className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs cursor-pointer shadow-sm transition-all">
                      Choose file
                    </span>
                  </div>
                </div>
              )}

              {/* Crosshairs */}
              {hoverCoords && (
                <>
                  <div className="absolute left-0 right-0 pointer-events-none" style={{ top: `${hoverCoords.y}%`, height: '0.5px', background: 'rgba(13, 148, 136, 0.3)' }} />
                  <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${hoverCoords.x}%`, width: '0.5px', background: 'rgba(13, 148, 136, 0.3)' }} />
                  <div
                    className="absolute pointer-events-none z-30 px-1.5 py-0.5 rounded text-[8px] font-mono border border-border text-foreground shadow-sm"
                    style={{ left: `${hoverCoords.x + 2}%`, top: `${hoverCoords.y + 2}%`, backgroundColor: 'var(--card)' }}
                  >
                    {(hoverCoords.x * 0.5).toFixed(1)}m · {(hoverCoords.y * 0.3).toFixed(1)}m
                  </div>
                </>
              )}

              {/* Approval Stamp */}
              {activeVersion?.status === 'approved' && (
                <motion.div
                  initial={{ scale: 1.8, opacity: 0, rotate: -35 }}
                  animate={{ scale: 1, opacity: 0.85, rotate: -8 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 90, delay: 0.2 }}
                  className="absolute top-10 right-10 border-4 border-double border-destructive text-destructive rounded-xl p-3 pointer-events-none z-30 font-mono text-center uppercase tracking-wider"
                  style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                >
                  <div className="text-[6px] font-bold tracking-widest border-b border-destructive/50 pb-0.5 mb-1 px-2">AURA STUDIOS // DESIGN REVIEW</div>
                  <div className="text-sm font-black tracking-tight leading-none">APPROVED</div>
                  <div className="text-[6px] font-bold mt-1">BY: {approverUser?.name || 'Sarah Jenkins'}</div>
                  <div className="text-[6px] font-bold">{approval ? new Date(approval.approved_at).toLocaleDateString() : new Date().toLocaleDateString()}</div>
                  <div className="text-[5px] tracking-widest mt-1.5 border-t border-destructive/50 pt-0.5">IMMUTABLE WORKFLOW LOCK</div>
                </motion.div>
              )}
            </div>
            {/* CAD Layer Manager */}
            {isLayersPanelOpen ? (
              <div
                onClick={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                className="absolute top-8 left-10 z-30 w-44 rounded-2xl border border-border/80 font-sans text-xs shadow-lg bg-card/95 backdrop-blur-md"
              >
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60">
                  <div className="flex items-center gap-1.5 select-none font-bold">
                    <Layers size={13} className="text-primary" />
                    <span className="text-[10px] font-extrabold text-foreground uppercase tracking-wider">Layers</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLayersPanelOpen(false);
                    }}
                    title="Hide Layers Panel"
                    className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                  >
                    <EyeOff size={12} />
                  </button>
                </div>
                <div className="p-2 space-y-1">
                  {[
                    { key: 'structural', label: 'Structural', color: 'bg-blue-500' },
                    { key: 'hvac', label: 'HVAC', color: 'bg-emerald-500' },
                    { key: 'fire', label: 'Fire Exit', color: 'bg-rose-500' },
                    { key: 'electrical', label: 'Electrical', color: 'bg-amber-500' },
                  ].map((layer) => (
                    <button
                      key={layer.key}
                      onClick={() => setVisibleLayers(prev => ({ ...prev, [layer.key]: !prev[layer.key] }))}
                      className={`flex items-center justify-between w-full px-2.5 py-2 rounded-xl transition-all cursor-pointer border text-xs font-semibold ${
                        visibleLayers[layer.key]
                          ? 'text-primary bg-primary/5 border-primary/20 hover:bg-primary/10 shadow-xs'
                          : 'text-muted-foreground/70 hover:bg-secondary hover:text-foreground border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2 select-none">
                        <span className={`w-2 h-2 rounded-full ${visibleLayers[layer.key] ? layer.color : 'bg-muted-foreground/20'}`} />
                        {layer.label}
                      </span>
                      {visibleLayers[layer.key] ? <Eye size={12} className="text-primary" /> : <EyeOff size={12} className="opacity-40" />}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLayersPanelOpen(true);
                }}
                onPointerMove={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                title="Show Layers Panel"
                className="absolute top-8 left-10 z-30 p-2 rounded-xl border border-border bg-card/95 backdrop-blur-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors shadow-sm"
              >
                <Layers size={12} className="text-primary" />
              </button>
            )}
          </div>

          {/* Upload confirm modal */}
          {uploadTypeConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-white/60 backdrop-blur-md" onClick={() => setUploadTypeConfirm(null)} />
              <div className="relative w-full max-w-sm rounded-2xl border border-border z-50 overflow-hidden bg-card/95 backdrop-blur-md shadow-2xl">
                <div className="p-6 text-center space-y-4">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
                    <Upload size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Upload Options</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      How should <span className="text-foreground font-semibold">{uploadTypeConfirm.file.name}</span> be applied?
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <button onClick={() => handleImageUploadConfirmed(true)} className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs cursor-pointer transition-all shadow-sm">
                      Replace current version background
                    </button>
                    <button onClick={() => handleImageUploadConfirmed(false)} className="w-full py-2.5 bg-secondary hover:bg-muted text-foreground font-bold rounded-xl text-xs cursor-pointer border border-border transition-all">
                      Create new version (increment rev)
                    </button>
                    <button onClick={() => setUploadTypeConfirm(null)} className="w-full py-2 text-muted-foreground hover:text-foreground transition-colors text-xs cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pin form */}
          {showAddChangeForm && clickCoords && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-primary/20 bg-card"
              style={{ boxShadow: '0 0 0 1px rgba(13, 148, 136, 0.1)' }}
            >
              <p className="text-[10px] font-mono font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                Propose revision · X:{clickCoords.x}% Y:{clickCoords.y}%
              </p>
              <form onSubmit={handleProposeChangeLocal} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newChangeDesc}
                  onChange={(e) => setNewChangeDesc(e.target.value)}
                  placeholder="Describe required change…"
                  className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50"
                />
                <button type="button" onClick={() => { setShowAddChangeForm(false); setClickCoords(null); }}
                  className="px-3 py-2 border border-border rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs cursor-pointer hover:bg-primary/90 transition-all">
                  Drop Pin
                </button>
              </form>
            </motion.div>
          )}

          {/* Selected Pin */}
          {selectedChangePin && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-border bg-card flex justify-between items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded border mb-2 ${selectedChangePin.resolved
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
                  : 'text-rose-700 bg-rose-50 border-rose-200/60'
                  }`}>
                  {selectedChangePin.resolved ? 'Resolved' : 'Change requested'}
                </span>
                <p className="text-xs text-foreground font-semibold">{selectedChangePin.note || selectedChangePin.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {allUsersList.find(u => u.id === (selectedChangePin.created_by || selectedChangePin.proposed_by))?.name || 'Architect'} · {new Date(selectedChangePin.created_at).toLocaleDateString()}
                </p>
                {!selectedChangePin.resolved && (currentRole === 'principal' || currentRole === 'senior') && (
                  <button onClick={() => handleResolvePin(selectedChangePin.id)}
                    className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold cursor-pointer transition-colors uppercase tracking-wider">
                    Resolve Pin
                  </button>
                )}
              </div>
              <button onClick={() => setSelectedChangePin(null)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors flex-shrink-0">
                <X size={13} />
              </button>
            </motion.div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-4">

          {/* FSI Status indicator */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground font-mono">FSI Index Status</h3>
                {isEditingFsi ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={async () => {
                        if (activeVersion && proj) {
                          try {
                            await useDBStore.getState().updateVersionBuiltUpArea(activeVersion.id, Number(tempBuiltUpArea) || 0);
                            await useDBStore.getState().updateProjectDetails(proj.id, proj.zone || 'R1', Number(tempPlotArea) || 0);
                            setIsEditingFsi(false);
                          } catch (err) {
                            console.error(err);
                            alert("Failed to save changes.");
                          }
                        }
                      }}
                      className="text-[8px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-bold hover:bg-primary/95 cursor-pointer uppercase transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingFsi(false);
                        setTempBuiltUpArea(activeVersion?.built_up_area?.toString() || '0');
                        setTempPlotArea(proj?.plot_area?.toString() || '10000');
                      }}
                      className="text-[8px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground hover:text-foreground font-bold cursor-pointer uppercase transition-colors border border-border"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingFsi(true)}
                    className="text-[8px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground hover:text-foreground font-bold cursor-pointer uppercase transition-colors border border-border"
                  >
                    Edit
                  </button>
                )}
              </div>
              <span className={`text-[8px] font-bold px-2 py-0.5 rounded font-mono ${fsiExceeded ? 'text-destructive bg-destructive/10 border border-destructive/20 animate-pulse' : 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20'}`}>
                {fsiExceeded ? 'EXCEEDED' : 'COMPLIANT'}
              </span>
            </div>
            <div className="p-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-2.5 bg-secondary/20 border border-border/40 rounded-xl">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">FSI Index</p>
                  <p className={`text-base font-black mt-1 ${fsiExceeded ? 'text-destructive' : 'text-emerald-500'}`}>
                    {computedFsi.toFixed(2)}
                  </p>
                </div>
                <div className="p-2.5 bg-secondary/20 border border-border/40 rounded-xl">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Zone Limit ({zoneName})</p>
                  <p className="text-base font-black text-foreground mt-1">
                    {fsiLimit.toFixed(1)}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-[10px] font-semibold text-muted-foreground">
                <div className="flex justify-between items-center h-6">
                  <span>Built-up Area:</span>
                  {isEditingFsi ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={tempBuiltUpArea}
                        onChange={(e) => setTempBuiltUpArea(e.target.value)}
                        className="w-20 px-2 py-1 bg-secondary text-foreground text-right border border-border rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        placeholder="Built-up"
                      />
                      <span className="text-[9px] text-muted-foreground/60">sq ft</span>
                    </div>
                  ) : (
                    <span className="text-foreground">{builtUpArea.toLocaleString()} sq ft</span>
                  )}
                </div>
                <div className="flex justify-between items-center h-6">
                  <span>Plot Area:</span>
                  {isEditingFsi ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={tempPlotArea}
                        onChange={(e) => setTempPlotArea(e.target.value)}
                        className="w-20 px-2 py-1 bg-secondary text-foreground text-right border border-border rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        placeholder="Plot"
                      />
                      <span className="text-[9px] text-muted-foreground/60">sq ft</span>
                    </div>
                  ) : (
                    <span className="text-foreground">{plotArea.toLocaleString()} sq ft</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Version History */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground font-mono">Version History</h3>
            </div>
            <div className="p-3 space-y-2 max-h-44 overflow-y-auto">
              {docVersions.map((v) => (
                <div key={v.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors ${activeVersion?.id === v.id ? 'border-primary/30 bg-accent' : 'border-border/50 bg-secondary/20 hover:bg-secondary/40'
                  }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground">{v.version_number}</span>
                      <span className={`text-[8px] font-bold uppercase px-1.5 rounded border ${
                        v.status === 'approved' 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60' 
                          : 'text-amber-700 bg-amber-50 border-amber-200/60'
                        }`}>{v.status}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{v.changelog}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                        aiStatuses[v.id] === 'complete' 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
                          : aiStatuses[v.id] === 'unavailable' 
                          ? 'text-muted-foreground/40 bg-secondary border-border'
                          : 'text-primary bg-primary/10 border-primary/20 animate-pulse'
                        }`}>
                        {aiStatuses[v.id] === 'complete' && <Check size={7} />}
                        AI: {aiStatuses[v.id] === 'complete' ? 'Ready' : aiStatuses[v.id] === 'unavailable' ? 'N/A' : 'Processing…'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews & Annotations */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground font-mono">Reviews & Annotations</h3>
            </div>
            <div className="p-3">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {reviews.length === 0 ? (
                  <div className="py-8 flex flex-col items-center gap-2 text-center">
                    <MessageSquare size={18} className="text-muted-foreground/30" />
                    <p className="text-[10px] text-muted-foreground/50">No reviews on this version.</p>
                  </div>
                ) : (
                  reviews.map((r) => {
                    const reviewer = useAuthStore.getState().allUsers.find(u => u.id === r.reviewer_id);
                    return (
                      <div key={r.id} className="p-3 bg-secondary/30 rounded-xl border border-border/40 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-foreground">{reviewer?.name}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{r.comments}</p>
                        {r.proposed_changes.length > 0 && (
                          <div className="pt-1.5 border-t border-border/30 space-y-0.5">
                            <p className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-wider">Pins ({r.proposed_changes.length})</p>
                            {r.proposed_changes.map((pc) => (
                              <div key={pc.id} className="text-[10px] text-destructive/70 flex items-start gap-1">
                                <span className="mt-0.5">·</span>
                                <span>{pc.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Submit Review */}
              {(currentRole === 'principal' || currentRole === 'senior') && (
                <div className="mt-3 pt-3 border-t border-border space-y-2.5">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest font-mono">New Review Package</p>
                  <textarea
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="General review comments…"
                    rows={2}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 resize-none"
                  />
                  {reviewChangesList.length > 0 && (
                    <div className="p-2.5 bg-secondary/20 rounded-xl border border-border/40 space-y-1">
                      <p className="text-[8px] font-bold text-muted-foreground/60 uppercase">Staged ({reviewChangesList.length})</p>
                      {reviewChangesList.map((c, idx) => (
                        <div key={idx} className="text-[10px] text-muted-foreground flex justify-between gap-2">
                          <span className="truncate">· {c.description}</span>
                          <span className="font-mono text-[9px] text-muted-foreground/50 flex-shrink-0">({c.x}%, {c.y}%)</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={handleSubmitReviewPackage}
                    className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs cursor-pointer transition-all shadow-sm">
                    Submit Review
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Principal Approval Panel */}
          {(currentRole === 'principal' || currentRole === 'admin') && doc.status !== 'approved' && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
                <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground font-mono">Sign-Off Panel</h3>
                <span className="text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded animate-pulse font-mono">
                  AWAITING
                </span>
              </div>

              <div className="p-4 space-y-4">
                {fsiExceeded && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive">
                    <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold leading-none uppercase">FSI Limit Breached</p>
                      <p className="text-[10px] leading-relaxed">
                        The current version's calculated FSI index ({computedFsi.toFixed(2)}) exceeds the zone limit of {fsiLimit.toFixed(1)} for Zone {zoneName}. Manual approval is disabled.
                      </p>
                    </div>
                  </div>
                )}

                {!isValidatedBySenior && (
                  <div className="flex items-start gap-2 p-3 rounded-xl text-amber-700 bg-amber-50 border border-amber-200/60">
                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed">A Senior must submit an approved review first.</p>
                  </div>
                )}

                {errorMsg && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/15 text-destructive">
                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed">{errorMsg}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Signature Notes</label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Approval notes…"
                    rows={2}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/50 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Affected Tasks</label>
                    <button onClick={() => setShowTagModal(true)}
                      className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer">
                      <Tag size={9} />
                      Select ({taggedTasksList.length})
                    </button>
                  </div>

                  {taggedTasksList.length > 0 ? (
                    <div className="p-2.5 rounded-xl border border-border/40 bg-secondary/20 space-y-1">
                      {taggedTasksList.map((tid) => {
                        const t = projTasks.find(task => task.id === tid);
                        return (
                          <div key={tid} className="flex justify-between text-[10px] text-muted-foreground">
                            <span className="truncate max-w-[150px]">· {t?.title}</span>
                            <span className="text-[8px] text-primary font-mono">
                              ({allUsersList.find(u => u.id === t?.assigned_junior_id)?.name.split(' ')[0]})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={confirmNoTasks} onChange={(e) => { setConfirmNoTasks(e.target.checked); if (e.target.checked) setTaggedTasksList([]); }}
                        className="h-3.5 w-3.5 rounded border-border cursor-pointer accent-primary" />
                      <span className="text-[11px] text-muted-foreground leading-snug">No junior tasks are affected by this revision.</span>
                    </label>
                  )}
                </div>

                <button
                  onClick={handleApproveClick}
                  disabled={isApprovalButtonLocked}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${isApprovalButtonLocked
                    ? 'bg-secondary text-muted-foreground/40 border border-border cursor-not-allowed'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
                    }`}
                >
                  <ShieldCheck size={13} />
                  Approve & Lock Version
                </button>

                {isApprovalButtonLocked && (
                  <p className="text-[9px] text-muted-foreground/50 text-center leading-relaxed font-mono">
                    {fsiExceeded 
                      ? 'Approval disabled due to FSI limit breach.' 
                      : 'Select tasks or confirm bypass to unlock.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Approved / Locked State */}
          {doc.status === 'approved' && (
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Version Locked</span>
              </div>
              <p className="text-[11px] text-emerald-700/85 leading-relaxed">
                Formally approved and locked. Revision logs and task notifications distributed.
              </p>
              {(currentRole === 'principal' || currentRole === 'admin') && (
                <button
                  onClick={async () => {
                    if (activeVersion) {
                      await backtrackDocumentApproval(doc.id, activeVersion.id, currentUser?.id || '');
                      alert("Approval backtracked.");
                    }
                  }}
                  className="w-full py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold rounded-xl text-xs cursor-pointer border border-destructive/20 transition-all uppercase tracking-wider"
                >
                  Undo Approval
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Task Tag Modal ── */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md" onClick={() => setShowTagModal(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-border overflow-hidden z-10 bg-card/95 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-xs font-bold text-foreground font-mono uppercase tracking-widest">Tag Affected Tasks</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Link this revision to active junior task dependencies.</p>
              </div>
              <button onClick={() => setShowTagModal(false)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center relative min-h-[260px] border border-border/40 rounded-xl p-4 bg-secondary/10 overflow-hidden border-draft">
                {/* Source Node */}
                <div className="md:col-span-4 flex flex-col items-center justify-center z-10">
                  <div className="p-4 rounded-xl border border-primary/20 bg-card text-center w-full space-y-2">
                    <span className="text-[8px] font-bold text-primary uppercase tracking-widest block font-mono">Pending Rev</span>
                    <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary font-mono font-bold text-xs animate-pulse-slow">
                      {activeVersion?.version_number || 'v1.1'}
                    </div>
                    <h4 className="text-[11px] font-bold text-foreground line-clamp-1">{doc.name}</h4>
                  </div>
                </div>

                {/* SVG connectors */}
                <div className="hidden md:block md:col-span-3 h-64 relative z-0">
                  <svg className="w-full h-full" viewBox="0 0 80 256" preserveAspectRatio="none">
                    {projTasks.filter(t => t.status !== 'completed').map((t, idx, arr) => {
                      const isTagged = taggedTasksList.includes(t.id);
                      const total = arr.length;
                      const targetY = total > 1 ? 24 + (idx * (208 / (total - 1))) : 128;
                      return (
                        <path key={t.id}
                          d={`M 0,128 C 35,128 45,${targetY} 80,${targetY}`}
                          fill="none"
                          stroke={isTagged ? '#0D9488' : 'rgba(13, 148, 136, 0.08)'}
                          strokeWidth={isTagged ? 1.5 : 0.8}
                          className={isTagged ? 'animate-dash-flow' : ''}
                          style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* Task nodes */}
                <div className="md:col-span-5 space-y-2 z-10 max-h-60 overflow-y-auto pr-1">
                  {projTasks.filter(t => t.status !== 'completed').length === 0 ? (
                    <p className="text-muted-foreground text-xs text-center py-8">No active tasks.</p>
                  ) : (
                    projTasks.filter(t => t.status !== 'completed').map((t) => {
                      const isTagged = taggedTasksList.includes(t.id);
                      const junior = allUsersList.find(u => u.id === t.assigned_junior_id);
                      return (
                        <div key={t.id} onClick={() => { setConfirmNoTasks(false); setTaggedTasksList(prev => isTagged ? prev.filter(id => id !== t.id) : [...prev, t.id]); }}
                          className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-2 ${isTagged ? 'border-primary/30 bg-accent' : 'border-border/40 bg-secondary/20 hover:border-border hover:bg-secondary/40'
                            }`}>
                          <div className={`mt-0.5 h-3.5 w-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isTagged ? 'bg-primary border-primary' : 'border-border'
                            }`}>
                            {isTagged && <Check size={8} className="text-primary-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{t.title}</p>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[9px] text-muted-foreground font-mono">{junior?.name.split(' ')[0] || 'Unassigned'}</span>
                              <span className="text-[7px] font-bold uppercase text-muted-foreground/50 px-1 bg-secondary rounded border border-border/40">{t.status}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end px-5 py-4 border-t border-border">
              <button onClick={() => setShowTagModal(false)}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-xs cursor-pointer shadow-sm transition-all uppercase tracking-wider">
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Modal ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-md" />
          <div className="relative w-full max-w-sm rounded-2xl border border-border z-10 overflow-hidden bg-card/95 backdrop-blur-md shadow-2xl">
            <div className="p-6 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-200/50 flex items-center justify-center mx-auto text-emerald-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Version Approved</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Locked and appended to the immutable audit trail. Affected team members have been notified.
                </p>
              </div>
              <button
                onClick={() => { setShowSuccessModal(false); router.refresh(); }}
                className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs cursor-pointer shadow-sm transition-all"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Analysis Drawer ── */}
      <AnimatePresence>
        {isAiPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAiPanelOpen(false)}
              className="fixed inset-0 bg-white/60 backdrop-blur-md z-40"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[380px] border-l border-border z-50 overflow-y-auto flex flex-col bg-card/98 backdrop-blur-md shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Sparkles size={15} className="text-primary animate-pulse-slow" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground font-mono uppercase tracking-widest">AI Analysis</h3>
                    <p className="text-sm text-muted-foreground">{activeVersion?.version_number}</p>
                  </div>
                </div>
                <button onClick={() => setIsAiPanelOpen(false)}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Elements */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground font-mono">Detected Elements</h4>
                  {elementsLoading ? (
                    <div className="space-y-2">
                      {[3, 2, 4].map((w, i) => (
                        <div key={i} className={`h-5 bg-secondary/60 rounded-lg animate-pulse`} style={{ width: `${w * 25}%` }} />
                      ))}
                    </div>
                  ) : aiStatuses[activeVersion?.id || ''] === 'processing' ? (
                    <div className="flex flex-col items-center gap-3 py-10 border border-primary/20 rounded-xl bg-primary/5">
                      <Sparkles size={24} className="text-primary animate-pulse" />
                      <div className="text-center space-y-1">
                        <p className="text-base font-bold text-foreground">AI is analyzing drawing...</p>
                        <p className="text-sm text-muted-foreground mt-1">Extracting structural layouts and coordinates</p>
                      </div>
                      <div className="w-2/3 h-1 bg-secondary rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                        />
                      </div>
                    </div>
                  ) : drawingElements.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-8 border border-border/40 rounded-xl bg-secondary/10">
                      <HelpCircle size={22} className="text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground/50">No elements detected yet.</p>
                      <button onClick={() => activeVersion && triggerAiAnalysis(activeVersion.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold cursor-pointer transition-colors">
                        <Sparkles size={12} /> Analyze Now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(drawingElements.reduce((acc, el) => { acc[el.element_type] = (acc[el.element_type] || 0) + 1; return acc; }, {} as Record<string, number>))
                          .map(([type, count]) => (
                            <span key={type} className="text-xs font-mono font-bold bg-secondary border border-border/60 px-2 py-0.5 rounded text-muted-foreground uppercase">
                              {type.replace('_', ' ')} ({count as number})
                            </span>
                          ))}
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1 border border-border/40 rounded-xl p-2.5 bg-secondary/10">
                        {drawingElements.map((el) => (
                          <div key={el.id} className="flex justify-between items-center text-sm text-muted-foreground">
                            <span className="truncate pr-4">· {el.label}</span>
                            <span className="font-mono text-primary font-bold flex-shrink-0 text-sm">{(el.confidence_score * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Diff Log */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground font-mono">Version Delta</h4>
                  {diffLoading ? (
                    <div className="h-20 bg-secondary/40 rounded-xl animate-pulse" />
                  ) : aiStatuses[activeVersion?.id || ''] === 'processing' ? (
                    <div className="h-20 border border-border/40 rounded-xl flex items-center justify-center bg-secondary/5">
                      <p className="text-sm text-muted-foreground font-mono animate-pulse">Calculating deltas...</p>
                    </div>
                  ) : !diffLog ? (
                    <p className="text-muted-foreground/40 text-sm text-center py-4">No diff generated.</p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      {diffLog.elements_added?.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs uppercase font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded inline-block font-mono">Added</span>
                          <div className="pl-1 space-y-0.5">
                            {diffLog.elements_added.map((item: string, i: number) => <div key={i} className="text-sm text-muted-foreground font-medium">· {item}</div>)}
                          </div>
                        </div>
                      )}
                      {diffLog.elements_removed?.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs uppercase font-bold text-destructive bg-destructive/5 border border-destructive/15 px-2 py-0.5 rounded inline-block font-mono">Removed</span>
                          <div className="pl-1 space-y-0.5">
                            {diffLog.elements_removed.map((item: string, i: number) => <div key={i} className="text-sm text-muted-foreground font-medium">· {item}</div>)}
                          </div>
                        </div>
                      )}
                      {diffLog.elements_modified?.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded inline-block font-mono">Modified</span>
                          <div className="pl-1 space-y-0.5">
                            {diffLog.elements_modified.map((item: string, i: number) => <div key={i} className="text-sm text-muted-foreground font-medium">· {item}</div>)}
                          </div>
                        </div>
                      )}
                      {diffLog.parsed_summary && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-sm font-bold text-muted-foreground/60 uppercase font-mono mb-1">Summary</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{diffLog.parsed_summary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Affected Tasks */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground font-mono">Possibly Affected Tasks</h4>
                    <span className="text-xs text-muted-foreground/40 font-mono">AI suggestions — not confirmed</span>
                  </div>
                  {diffLoading ? (
                    <div className="space-y-2">
                      <div className="h-12 bg-secondary/40 rounded-xl animate-pulse" />
                      <div className="h-12 bg-secondary/40 rounded-xl animate-pulse" />
                    </div>
                  ) : !diffLog?.suggested_affected_tasks?.length ? (
                    <p className="text-muted-foreground/40 text-sm text-center py-4">No affected tasks identified.</p>
                  ) : (
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {diffLog.suggested_affected_tasks.map((task: any, idx: number) => {
                        const resolvedTask = projTasks.find(t => t.id === task.task_id);
                        return (
                          <div key={idx} className="p-3 rounded-xl border border-border/40 bg-secondary/20 hover:bg-secondary/30 transition-colors space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-sm font-semibold text-foreground truncate flex-1">{resolvedTask?.title || `Task ${task.task_id.slice(0, 8)}`}</p>
                              <span className="text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded flex-shrink-0">
                                {(task.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-tight">{task.reason}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
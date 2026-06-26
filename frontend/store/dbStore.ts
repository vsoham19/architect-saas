import { create } from 'zustand';
import {
  Project, Team, TeamMember, Task, Document, DocumentVersion,
  DocumentReview, DocumentApproval, ApprovalTaskTag, Notification,
  AuditLog, ActivityLog, ProjectStatus, TaskStatus, DocumentStatus,
  ProposedChange, UserRole, VersionStatus
} from '../types';
import { useAuthStore } from './authStore';

interface DBState {
  projects: Project[];
  teams: Team[];
  teamMembers: TeamMember[];
  tasks: Task[];
  documents: Document[];
  documentVersions: DocumentVersion[];
  documentReviews: DocumentReview[];
  documentApprovals: DocumentApproval[];
  approvalTaskTags: ApprovalTaskTag[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  activityLogs: ActivityLog[];
  isInitialized: boolean;

  // Actions
  initializeDB: () => Promise<void>;

  // Projects
  createProject: (params: {
    name: string;
    description: string;
    status: ProjectStatus;
    createdBy: string;
    teamName: string;
    assignedUsers: { userId: string; role: UserRole }[];
    zone: string;
    plotArea: number;
  }) => Promise<Project>;
  updateProjectStatus: (projectId: string, status: ProjectStatus, userId: string) => Promise<void>;

  // Teams
  assignTeamMembers: (teamId: string, members: { userId: string; role: UserRole }[]) => Promise<void>;

  // Tasks
  createTask: (params: {
    projectId: string;
    title: string;
    description: string;
    assignedJuniorId: string | null;
    assignedSeniorId: string | null;
    dueDate: string;
    creatorId: string;
  }) => Promise<Task>;
  updateTaskStatus: (taskId: string, status: TaskStatus, userId: string) => Promise<void>;
  deleteTask: (taskId: string, userId: string) => Promise<void>;

  // Documents
  uploadDocumentVersion: (params: {
    projectId: string;
    documentName: string;
    description: string;
    changelog: string;
    fileUrl: string;
    fileSize: number;
    uploadedBy: string;
    builtUpArea?: number;
  }) => Promise<{ doc: Document; ver: DocumentVersion }>;

  addReview: (params: {
    versionId: string;
    reviewerId: string;
    comments: string;
    proposedChanges: { description: string; x: number; y: number }[];
  }) => Promise<DocumentReview>;

  approveDocument: (params: {
    versionId: string;
    approverId: string;
    notes: string;
    taggedTaskIds: string[];
    confirmNoTasks: boolean;
  }) => Promise<DocumentApproval>;

  // Newly added workflow actions
  updateTaskFields: (taskId: string, fields: Partial<Task>) => Promise<void>;
  backtrackApproval: (taskId: string, userId: string) => Promise<void>;
  deleteProject: (projectId: string, userId: string) => Promise<void>;
  backtrackDocumentApproval: (documentId: string, versionId: string, userId: string) => Promise<void>;
  updateProjectDetails: (projectId: string, zone: string, plotArea: number) => Promise<void>;
  updateVersionBuiltUpArea: (versionId: string, builtUpArea: number) => Promise<void>;

  // Notifications
  addNotification: (params: Omit<Notification, 'id' | 'created_at' | 'read'>) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;

  // Logs
  addAuditLog: (params: Omit<AuditLog, 'id' | 'created_at'>) => Promise<void>;
  addActivityLog: (params: Omit<ActivityLog, 'id' | 'created_at'>) => Promise<void>;
}

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


const fetchJSON = async (url: string, options?: RequestInit) => {
  if (typeof window !== 'undefined' && useAuthStore.getState().isSandboxMode) {
    return null;
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${url}`);
  }
  const body = await res.json();
  return body.data;
};

// Client-side UUID generator to avoid dependency import issues
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const getInitialSandboxState = () => {
  const projects: Project[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'The Helix Cultural Center',
      description: 'A 50,000 sq ft performing arts center featuring a parametric spiral facade, an 800-seat main auditorium, and sustainable rooftop gardens. Targeting LEED Gold certification.',
      status: 'ongoing',
      created_by: '00000000-0000-0000-0000-000000000001',
      zone: 'R1',
      plot_area: 30000,
      created_at: new Date('2026-02-10').toISOString(),
      updated_at: new Date('2026-02-10').toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Zenith Mixed-Use Towers',
      description: 'Twin 30-story residential and commercial towers featuring sky-bridges, passive cooling architectural louvers, and integrated transit connection.',
      status: 'ongoing',
      created_by: '00000000-0000-0000-0000-000000000001',
      zone: 'TOZ',
      plot_area: 20000,
      created_at: new Date('2026-03-01').toISOString(),
      updated_at: new Date('2026-03-01').toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Apex Waterfront Villa',
      description: 'Luxury net-zero residential project built over a cliff edge. Features cantilevered concrete slabs, smart home energy grids, and custom water harvesting.',
      status: 'upcoming',
      created_by: '00000000-0000-0000-0000-000000000001',
      zone: 'R2',
      plot_area: 10000,
      created_at: new Date('2026-05-15').toISOString(),
      updated_at: new Date('2026-05-15').toISOString(),
    }
  ];

  const teams: Team[] = projects.map(p => ({
    id: `team-${p.id}`,
    name: `${p.name} Team`,
    project_id: p.id,
    created_at: p.created_at
  }));

  const teamMembers: TeamMember[] = [
    // Helix
    {
      id: 'tm-helix-1',
      team_id: 'team-11111111-1111-1111-1111-111111111111',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'principal',
      created_at: new Date('2026-02-10').toISOString(),
    },
    {
      id: 'tm-helix-2',
      team_id: 'team-11111111-1111-1111-1111-111111111111',
      user_id: '00000000-0000-0000-0000-000000000002',
      role: 'senior',
      created_at: new Date('2026-02-10').toISOString(),
    },
    {
      id: 'tm-helix-3',
      team_id: 'team-11111111-1111-1111-1111-111111111111',
      user_id: '00000000-0000-0000-0000-000000000004',
      role: 'junior',
      created_at: new Date('2026-02-10').toISOString(),
    },
    {
      id: 'tm-helix-4',
      team_id: 'team-11111111-1111-1111-1111-111111111111',
      user_id: '00000000-0000-0000-0000-000000000005',
      role: 'junior',
      created_at: new Date('2026-02-10').toISOString(),
    },
    // Zenith
    {
      id: 'tm-zenith-1',
      team_id: 'team-22222222-2222-2222-2222-222222222222',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'principal',
      created_at: new Date('2026-03-01').toISOString(),
    },
    {
      id: 'tm-zenith-2',
      team_id: 'team-22222222-2222-2222-2222-222222222222',
      user_id: '00000000-0000-0000-0000-000000000003',
      role: 'senior',
      created_at: new Date('2026-03-01').toISOString(),
    },
    {
      id: 'tm-zenith-3',
      team_id: 'team-22222222-2222-2222-2222-222222222222',
      user_id: '00000000-0000-0000-0000-000000000004',
      role: 'junior',
      created_at: new Date('2026-03-01').toISOString(),
    }
  ];

  const tasks: Task[] = [
    {
      id: '99999999-9999-9999-9999-999999999001',
      project_id: '11111111-1111-1111-1111-111111111111',
      assigned_junior_id: '00000000-0000-0000-0000-000000000004',
      assigned_senior_id: '00000000-0000-0000-0000-000000000002',
      title: 'Model parametric facade spiral subdivisions',
      description: 'Generate the subdivisions of the outer glass spiral facade structure. Ensure panels match manufacturing dimensions and check structural loading joints.',
      status: 'in_progress',
      due_date: '2026-06-15',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '99999999-9999-9999-9999-999999999002',
      project_id: '11111111-1111-1111-1111-111111111111',
      assigned_junior_id: '00000000-0000-0000-0000-000000000004',
      assigned_senior_id: '00000000-0000-0000-0000-000000000002',
      title: 'Prepare final fire exit calculations report',
      description: 'Calculate egress timings for the auditorium lobby under peak occupancy. Report exit width ratios in accordance with municipal code Part 4.',
      status: 'pending',
      due_date: '2026-06-25',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '99999999-9999-9999-9999-999999999003',
      project_id: '22222222-2222-2222-2222-222222222222',
      assigned_junior_id: '00000000-0000-0000-0000-000000000004',
      assigned_senior_id: '00000000-0000-0000-0000-000000000003',
      title: 'Model sky-bridge support strut links',
      description: 'Detail the high-tensile steel connection nodes at Level 15 skybridge interface. Requires FEA stress plots.',
      status: 'in_progress',
      due_date: '2026-06-12',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const documents: Document[] = [
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddd01',
      project_id: '11111111-1111-1111-1111-111111111111',
      name: 'Helix Auditorium Floor Plan.dwg',
      description: 'Initial upload of structural layout and seating lines.',
      status: 'pending_review',
      uploaded_by: '00000000-0000-0000-0000-000000000004',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_version_id: 'vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvv01'
    },
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddd02',
      project_id: '11111111-1111-1111-1111-111111111111',
      name: 'Helix Facade Detail Scheme.pdf',
      description: 'Initial design facade framing details approved by client.',
      status: 'pending_review',
      uploaded_by: '00000000-0000-0000-0000-000000000002',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_version_id: 'vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvv02'
    }
  ];

  const documentVersions: DocumentVersion[] = [
    {
      id: 'vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvv01',
      document_id: 'dddddddd-dddd-dddd-dddd-dddddddddd01',
      version_number: 'v1.0.0',
      file_url: '/drawings/helix_auditorium_v1.jpg',
      file_size: 14205800,
      changelog: 'Initial upload of structural layout and seating lines.',
      uploaded_by: '00000000-0000-0000-0000-000000000004',
      built_up_area: 50000,
      created_at: new Date().toISOString(),
      status: 'pending'
    },
    {
      id: 'vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvv02',
      document_id: 'dddddddd-dddd-dddd-dddd-dddddddddd02',
      version_number: 'v1.0.0',
      file_url: '/drawings/helix_facade_v1.jpg',
      file_size: 8900400,
      changelog: 'Initial design facade framing details approved by client.',
      uploaded_by: '00000000-0000-0000-0000-000000000002',
      built_up_area: 8000,
      created_at: new Date().toISOString(),
      status: 'pending'
    }
  ];

  const documentReviews: DocumentReview[] = [];
  const documentApprovals: DocumentApproval[] = [];
  const approvalTaskTags: ApprovalTaskTag[] = [];
  const notifications: Notification[] = [];
  const auditLogs: AuditLog[] = [];
  const activityLogs: ActivityLog[] = [];

  return {
    projects,
    teams,
    teamMembers,
    tasks,
    documents,
    documentVersions,
    documentReviews,
    documentApprovals,
    approvalTaskTags,
    notifications,
    auditLogs,
    activityLogs
  };
};

// Data mappers between Postgres schemas and state store types
const mapProject = (p: any): Project => ({
  id: p.id,
  name: p.name,
  description: p.description || '',
  status: p.status as ProjectStatus,
  created_by: p.created_by || '',
  zone: p.zone || 'R1',
  plot_area: p.plot_area ? Number(p.plot_area) : 10000,
  created_at: p.created_at,
  updated_at: p.created_at
});

const mapMember = (m: any): TeamMember => ({
  id: m.id,
  team_id: `team-${m.project_id}`,
  user_id: m.user_id,
  role: m.project_role as UserRole,
  created_at: m.assigned_at
});

const mapTask = (t: any): Task => ({
  id: t.id,
  project_id: t.project_id,
  title: t.title,
  description: t.description || '',
  assigned_junior_id: t.assigned_to,
  assigned_senior_id: t.assigned_by,
  due_date: t.due_date,
  status: t.status as TaskStatus,
  created_at: t.created_at,
  updated_at: t.updated_at
});

const mapDocument = (d: any, status: DocumentStatus): Document => ({
  id: d.id,
  project_id: d.project_id,
  name: d.title,
  description: d.description || '',
  status: status,
  uploaded_by: d.created_by || '',
  created_at: d.created_at,
  updated_at: d.created_at,
  current_version_id: d.current_version_id
});

export const mapVersion = (v: any): DocumentVersion => ({
  id: v.id,
  document_id: v.document_id,
  version_number: `v${v.revision_number}.0.0`,
  file_url: v.file_url,
  file_size: v.file_size,
  changelog: v.change_summary || '',
  uploaded_by: v.created_by || '',
  built_up_area: v.built_up_area ? Number(v.built_up_area) : 0,
  created_at: v.created_at,
  status: 'pending', // local calculation
  drawing_data: v.drawing_data
});

const mapReview = (r: any): DocumentReview => {
  let proposedChanges: ProposedChange[] = [];
  try {
    if (r.comment && r.comment.startsWith('[PROPOSALS]:')) {
      const jsonStr = r.comment.replace('[PROPOSALS]:', '');
      proposedChanges = JSON.parse(jsonStr);
    }
  } catch (e) {
    console.error("Failed to parse review proposals", e);
  }

  return {
    id: r.id,
    document_version_id: r.version_id,
    reviewer_id: r.reviewer_id,
    comments: r.comment && r.comment.startsWith('[PROPOSALS]:') ? 'Changes proposed' : (r.comment || ''),
    proposed_changes: proposedChanges,
    created_at: r.reviewed_at
  };
};

const mapApproval = (a: any): DocumentApproval => ({
  id: a.id,
  document_version_id: a.version_id,
  approver_id: a.approved_by,
  approved_at: a.approved_at,
  notes: 'Approved'
});

const mapNotification = (n: any): Notification => ({
  id: n.id,
  user_id: n.recipient_id,
  sender_id: null,
  type: n.type,
  title: n.type === 'approval_required' ? 'Review required' : n.type === 'task_updated' ? 'Task updated' : 'Notification',
  message: n.message,
  read: n.is_read,
  created_at: n.created_at,
  metadata: {
    approval_id: n.approval_id || undefined,
    task_id: n.task_id || undefined
  }
});

const mapAuditLog = (l: any): AuditLog => ({
  id: l.id,
  user_id: l.actor_id,
  action: l.action,
  entity_type: l.entity_type,
  entity_id: l.entity_id || '',
  details: l.payload || {},
  created_at: l.created_at
});

const mapActivityLog = (l: any): ActivityLog => {
  let projectId: string | null = null;
  if (l.entity_type === 'activity' || l.entity_type === 'project') {
    projectId = l.entity_id || null;
  } else if (l.payload && typeof l.payload === 'object' && (l.payload.project_id || l.payload.details?.project_id)) {
    projectId = l.payload.project_id || l.payload.details?.project_id || null;
  } else if (l.entity_type === 'task') {
    const task = useDBStore.getState().tasks.find(t => t.id === l.entity_id);
    if (task) projectId = task.project_id;
  } else if (l.entity_type === 'document') {
    const doc = useDBStore.getState().documents.find(d => d.id === l.entity_id);
    if (doc) projectId = doc.project_id;
  }

  let details = '';
  if (l.payload && typeof l.payload === 'object') {
    if (l.payload.details) {
      details = typeof l.payload.details === 'string' ? l.payload.details : JSON.stringify(l.payload.details);
    } else if (l.action === 'upload_document' && l.payload.name && l.payload.version) {
      details = `Uploaded version ${l.payload.version} of "${l.payload.name}"${l.payload.changelog ? ` (Changelog: ${l.payload.changelog})` : ''}`;
    } else if (l.action === 'review_document' && l.payload.name && l.payload.version) {
      details = `Reviewed "${l.payload.name}" (${l.payload.version}): set status to "${l.payload.status === 'changes_proposed' ? 'Changes Proposed' : 'Approved'}"`;
    } else if (l.action === 'approve_document' && l.payload.name && l.payload.version) {
      details = `Approved document "${l.payload.name}" (${l.payload.version})${l.payload.notes ? `. Notes: ${l.payload.notes}` : ''}`;
    } else if (l.payload.title) {
      details = `Task "${l.payload.title}" status updated to "${l.payload.status || ''}"`;
    } else if (l.payload.name) {
      details = `Project "${l.payload.name}" updated`;
    }
  }

  if (!details) {
    details = `${l.action.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} executed on ${l.entity_type}`;
  }

  return {
    id: l.id,
    project_id: projectId,
    user_id: l.actor_id,
    action: l.action,
    details: details,
    created_at: l.created_at
  };
};

export const useDBStore = create<DBState>((set, get) => ({
  projects: [],
  teams: [],
  teamMembers: [],
  tasks: [],
  documents: [],
  documentVersions: [],
  documentReviews: [],
  documentApprovals: [],
  approvalTaskTags: [],
  notifications: [],
  auditLogs: [],
  activityLogs: [],
  isInitialized: false,

  initializeDB: async () => {
    if (get().isInitialized) return;

    const isSandbox = typeof window !== 'undefined' && (
      useAuthStore.getState().isSandboxMode || 
      localStorage.getItem('use_sandbox_mode') === 'true'
    );

    if (isSandbox) {
      const stored = localStorage.getItem('erp_db_state');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          set({
            ...parsed,
            isInitialized: true
          });
          return;
        } catch (e) {
          console.error("Failed to parse sandbox state, reseeding:", e);
        }
      }
      // Seed initial data
      const seed = getInitialSandboxState();
      set({
        ...seed,
        isInitialized: true
      });
      localStorage.setItem('erp_db_state', JSON.stringify(seed));
      return;
    }

    try {
      // Parallel fetches from REST API
      const [
        dbProjects,
        dbMembers,
        dbTasks,
        dbDocs,
        dbVersions,
        dbReviews,
        dbApprovals,
        dbTags,
        dbNotifs,
        dbAudit
      ] = await Promise.all([
        fetchJSON(`${API_URL}/api/projects`),
        fetchJSON(`${API_URL}/api/projects/members`),
        fetchJSON(`${API_URL}/api/tasks`),
        fetchJSON(`${API_URL}/api/documents`),
        fetchJSON(`${API_URL}/api/documents/versions`),
        fetchJSON(`${API_URL}/api/documents/reviews`),
        fetchJSON(`${API_URL}/api/documents/approvals`),
        fetchJSON(`${API_URL}/api/documents/tags`),
        fetchJSON(`${API_URL}/api/notifications`),
        fetchJSON(`${API_URL}/api/audit-logs`)
      ]);

      const projects: Project[] = (dbProjects || []).map(mapProject);
      const teamMembers: TeamMember[] = (dbMembers || []).map(mapMember);
      const tasks: Task[] = (dbTasks || []).map(mapTask);
      const documentVersions: DocumentVersion[] = (dbVersions || []).map(mapVersion).map((ver: DocumentVersion) => {
        const hasVerApproval = (dbApprovals || []).some((a: any) => a.version_id === ver.id);
        const hasVerRejectedReview = (dbReviews || []).some((r: any) => r.version_id === ver.id && r.status === 'rejected');

        let status: VersionStatus = 'pending';
        if (hasVerApproval) status = 'approved';
        else if (hasVerRejectedReview) status = 'rejected';

        return { ...ver, status };
      });
      const documentReviews: DocumentReview[] = (dbReviews || []).map(mapReview);
      const documentApprovals: DocumentApproval[] = (dbApprovals || []).map(mapApproval);

      // Compute document status based on reviews/approvals
      const documents: Document[] = (dbDocs || []).map((doc: any) => {
        const hasApproval = (dbApprovals || []).some((a: any) => a.document_id === doc.id && a.version_id === doc.current_version_id);
        const hasRejectedReview = (dbReviews || []).some((r: any) => r.document_id === doc.id && r.version_id === doc.current_version_id && r.status === 'rejected');

        let status: DocumentStatus = 'pending_review';
        if (hasApproval) status = 'approved';
        else if (hasRejectedReview) status = 'changes_proposed';

        return mapDocument(doc, status);
      });

      const approvalTaskTags: ApprovalTaskTag[] = (dbTags || []).map((t: any) => ({
        id: t.id,
        approval_id: t.approval_id,
        task_id: t.task_id,
        created_at: t.created_at
      }));

      const notifications: Notification[] = (dbNotifs || []).map(mapNotification);
      const auditLogs: AuditLog[] = (dbAudit || []).map(mapAuditLog);
      const activityLogs: ActivityLog[] = (dbAudit || []).map(mapActivityLog);

      // Generate teams list dynamically from projects to maintain type compatibility
      const teams: Team[] = projects.map(p => ({
        id: `team-${p.id}`,
        name: `${p.name} Team`,
        project_id: p.id,
        created_at: p.created_at
      }));

      set({
        projects,
        teams,
        teamMembers,
        tasks,
        documents,
        documentVersions,
        documentReviews,
        documentApprovals,
        approvalTaskTags,
        notifications,
        auditLogs,
        activityLogs,
        isInitialized: true
      });
    } catch (e) {
      console.error("Failed to initialize database from Backend, falling back to Sandbox state:", e);
      const stored = localStorage.getItem('erp_db_state');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          set({
            ...parsed,
            isInitialized: true
          });
          return;
        } catch (err) {
          console.error("Failed to parse stored sandbox state:", err);
        }
      }
      const seed = getInitialSandboxState();
      set({
        ...seed,
        isInitialized: true
      });
      localStorage.setItem('erp_db_state', JSON.stringify(seed));
    }
  },

  createProject: async (params) => {
    const newProjId = generateUUID();
    const newProject: Project = {
      id: newProjId,
      name: params.name,
      description: params.description,
      status: params.status,
      created_by: params.createdBy,
      zone: params.zone,
      plot_area: params.plotArea,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic UI state update
    const newTeam: Team = {
      id: `team-${newProjId}`,
      name: params.teamName,
      project_id: newProjId,
      created_at: new Date().toISOString(),
    };

    const newMembers: TeamMember[] = params.assignedUsers.map((user, idx) => ({
      id: `tm-${newProjId}-${idx}`,
      team_id: `team-${newProjId}`,
      user_id: user.userId,
      role: user.role,
      created_at: new Date().toISOString(),
    }));

    set((state) => ({
      projects: [newProject, ...state.projects],
      teams: [newTeam, ...state.teams],
      teamMembers: [...state.teamMembers, ...newMembers]
    }));

    // Persist to Backend
    try {
      await fetchJSON(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newProjId,
          name: params.name,
          description: params.description,
          status: params.status,
          created_by: params.createdBy,
          zone: params.zone,
          plot_area: params.plotArea
        })
      });

      await fetchJSON(`${API_URL}/api/projects/members/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: newProjId,
          members: params.assignedUsers
        })
      });

      // Log activity
      get().addAuditLog({
        user_id: params.createdBy,
        action: 'create_project',
        entity_type: 'project',
        entity_id: newProjId,
        details: { name: params.name, team_name: params.teamName }
      });
    } catch (e) {
      console.error("Failed to create project in Backend", e);
    }

    return newProject;
  },

  updateProjectStatus: async (projectId, status, userId) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, status, updated_at: new Date().toISOString() } : p
      )
    }));

    try {
      await fetchJSON(`${API_URL}/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      get().addAuditLog({
        user_id: userId,
        action: 'update_project_status',
        entity_type: 'project',
        entity_id: projectId,
        details: { status }
      });
    } catch (e) {
      console.error("Failed to update project status in Backend", e);
    }
  },

  assignTeamMembers: async (teamId, members) => {
    const projectId = teamId.replace('team-', '');

    set((state) => {
      const filteredMembers = state.teamMembers.filter(m => m.team_id !== teamId);
      const newMembers: TeamMember[] = members.map((user, idx) => ({
        id: `tm-assign-${Date.now()}-${idx}`,
        team_id: teamId,
        user_id: user.userId,
        role: user.role,
        created_at: new Date().toISOString(),
      }));

      return { teamMembers: [...filteredMembers, ...newMembers] };
    });

    try {
      await fetchJSON(`${API_URL}/api/projects/members/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          members
        })
      });
    } catch (e) {
      console.error("Failed to update team members in Backend", e);
    }
  },

  createTask: async (params) => {
    const newTaskId = generateUUID();
    const newTask: Task = {
      id: newTaskId,
      project_id: params.projectId,
      title: params.title,
      description: params.description,
      assigned_junior_id: params.assignedJuniorId,
      assigned_senior_id: params.assignedSeniorId,
      due_date: params.dueDate,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    set((state) => ({
      tasks: [...state.tasks, newTask]
    }));

    try {
      await fetchJSON(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newTaskId,
          project_id: params.projectId,
          assigned_to: params.assignedJuniorId,
          assigned_by: params.assignedSeniorId,
          title: params.title,
          description: params.description,
          status: 'pending',
          due_date: params.dueDate
        })
      });

      if (params.assignedJuniorId) {
        get().addNotification({
          user_id: params.assignedJuniorId,
          sender_id: params.creatorId,
          type: 'task_updated',
          title: 'New task assigned',
          message: `You have been assigned the task: "${params.title}".`,
          metadata: { project_id: params.projectId, task_id: newTaskId }
        });
      }

      if (params.assignedSeniorId) {
        const juniorName = useAuthStore.getState().allUsers.find(u => u.id === params.assignedJuniorId)?.name || 'unassigned junior';
        get().addNotification({
          user_id: params.assignedSeniorId,
          sender_id: params.creatorId,
          type: 'task_updated',
          title: 'Supervising role assigned',
          message: `You have been assigned to supervise the task: "${params.title}" (assigned to ${juniorName}).`,
          metadata: { project_id: params.projectId, task_id: newTaskId }
        });
      }
    } catch (e) {
      console.error("Failed to create task in Backend", e);
    }

    return newTask;
  },

  updateTaskStatus: async (taskId, status, userId) => {
    let taskTitle = '';
    let projectId = '';
    let assignedJunior: string | null = null;
    let assignedSenior: string | null = null;

    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id === taskId) {
          taskTitle = t.title;
          projectId = t.project_id;
          assignedJunior = t.assigned_junior_id;
          assignedSenior = t.assigned_senior_id;
          return { ...t, status, updated_at: new Date().toISOString() };
        }
        return t;
      })
    }));

    try {
      await fetchJSON(`${API_URL}/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      get().addAuditLog({
        user_id: userId,
        action: 'update_task_status',
        entity_type: 'task',
        entity_id: taskId,
        details: {
          title: taskTitle,
          status: status,
          project_id: projectId
        }
      });

      // Handle notification flows
      if (status === 'review' && userId === assignedJunior) {
        if (assignedSenior) {
          get().addNotification({
            user_id: assignedSenior,
            sender_id: userId,
            type: 'task_updated',
            title: 'Task ready for review',
            message: `Junior task "${taskTitle}" has been submitted for review.`,
            metadata: { project_id: projectId, task_id: taskId }
          });
        }
      } else if (userId !== assignedJunior && assignedJunior) {
        get().addNotification({
          user_id: assignedJunior,
          sender_id: userId,
          type: 'task_updated',
          title: 'Task status updated',
          message: `Your task "${taskTitle}" was updated to: ${status}.`,
          metadata: { project_id: projectId, task_id: taskId }
        });
      }
    } catch (e) {
      console.error("Failed to update task status in Backend", e);
    }
  },

  deleteTask: async (taskId, userId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) return;

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId)
    }));

    try {
      await fetchJSON(`${API_URL}/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error("Failed to delete task from Backend", e);
    }
  },

  // New generic field update for tasks (used for image upload)
  updateTaskFields: async (taskId, fields) => {
    // Optimistic UI update
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...fields, updated_at: new Date().toISOString() } : t))
    }));
    try {
      await fetchJSON(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
    } catch (e) {
      console.error('Failed to patch task fields', e);
    }
  },

  // Backtrack approval (principal only)
  backtrackApproval: async (taskId, userId) => {
    // Reset status locally
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status: 'pending', attached_version_id: null, updated_at: new Date().toISOString() } : t))
    }));
    try {
      await fetchJSON(`${API_URL}/api/tasks/${taskId}/backtrack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (e) {
      console.error('Failed to backtrack approval', e);
    }
  },

  uploadDocumentVersion: async (params) => {
    // Check if doc exists
    let doc = get().documents.find(
      (d) => d.project_id === params.projectId && d.name.toLowerCase() === params.documentName.toLowerCase()
    );

    const docId = doc ? doc.id : generateUUID();
    const verId = generateUUID();

    let revisionNumber = 1;
    if (doc) {
      const docVersions = get().documentVersions.filter(v => v.document_id === doc?.id);
      revisionNumber = docVersions.length + 1;
    }

    const versionNumber = `v${revisionNumber}.0.0`;
    const newVersion: DocumentVersion = {
      id: verId,
      document_id: docId,
      version_number: versionNumber,
      file_url: params.fileUrl,
      file_size: params.fileSize,
      changelog: params.changelog,
      uploaded_by: params.uploadedBy,
      built_up_area: params.builtUpArea ?? 0,
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    if (!doc) {
      doc = {
        id: docId,
        project_id: params.projectId,
        name: params.documentName,
        description: params.description,
        status: 'pending_review',
        uploaded_by: params.uploadedBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_version_id: verId
      };

      set((state) => ({
        documents: [...state.documents, doc as Document],
        documentVersions: [...state.documentVersions, newVersion]
      }));
    } else {
      set((state) => ({
        documents: state.documents.map(d =>
          d.id === docId ? { ...d, status: 'pending_review', current_version_id: verId, updated_at: new Date().toISOString() } : d
        ),
        documentVersions: [...state.documentVersions, newVersion]
      }));
    }

    try {
      if (revisionNumber === 1) {
        // Create document
        await fetchJSON(`${API_URL}/api/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: docId,
            project_id: params.projectId,
            title: params.documentName,
            doc_type: params.documentName.toLowerCase().endsWith('.dwg') ? 'dwg' : 'pdf',
            created_by: params.uploadedBy
          })
        });
      }

      // Create version
      await fetchJSON(`${API_URL}/api/documents/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: verId,
          document_id: docId,
          revision_number: revisionNumber,
          file_url: params.fileUrl,
          file_size: params.fileSize,
          change_summary: params.changelog,
          created_by: params.uploadedBy,
          built_up_area: params.builtUpArea ?? 0
        })
      });

      // Update current version
      await fetchJSON(`${API_URL}/api/documents/${docId}/version`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_version_id: verId })
      });

      // Notify project leads
      const members = get().teamMembers.filter(tm => tm.team_id === `team-${params.projectId}`);
      members.forEach(m => {
        if (m.user_id !== params.uploadedBy && (m.role === 'senior' || m.role === 'principal')) {
          get().addNotification({
            user_id: m.user_id,
            sender_id: params.uploadedBy,
            type: 'approval_required',
            title: 'New document for review',
            message: `A new version of "${params.documentName}" (${versionNumber}) has been uploaded.`,
            metadata: { project_id: params.projectId, document_id: docId, version_id: verId }
          });
        }
      });

      // Log upload action in audit logs
      get().addAuditLog({
        user_id: params.uploadedBy,
        action: 'upload_document',
        entity_type: 'document',
        entity_id: docId,
        details: {
          name: params.documentName,
          version: versionNumber,
          changelog: params.changelog,
          project_id: params.projectId
        }
      });
    } catch (e) {
      console.error("Failed to upload document version to Backend", e);
    }

    return { doc, ver: newVersion };
  },

  addReview: async (params) => {
    const reviewId = generateUUID();

    const newProposals: ProposedChange[] = params.proposedChanges.map((pc, idx) => ({
      id: `pc-${Date.now()}-${idx}`,
      description: pc.description,
      x: pc.x,
      y: pc.y,
      resolved: false,
      proposed_by: params.reviewerId,
      created_at: new Date().toISOString()
    }));

    // Serialize proposals into comment column via prefix tag to keep schema lightweight
    const commentPayload = newProposals.length > 0
      ? `[PROPOSALS]:${JSON.stringify(newProposals)}`
      : params.comments;

    const version = get().documentVersions.find(v => v.id === params.versionId);
    const document = get().documents.find(d => d.id === version?.document_id);

    const newReview: DocumentReview = {
      id: reviewId,
      document_version_id: params.versionId,
      reviewer_id: params.reviewerId,
      comments: params.comments,
      proposed_changes: newProposals,
      created_at: new Date().toISOString()
    };

    if (newProposals.length > 0 && document) {
      set((state) => ({
        documents: state.documents.map(d =>
          d.id === document.id ? { ...d, status: 'changes_proposed', updated_at: new Date().toISOString() } : d
        ),
        documentVersions: state.documentVersions.map(v =>
          v.id === params.versionId ? { ...v, status: 'rejected' } : v
        )
      }));
    }

    set((state) => ({
      documentReviews: [newReview, ...state.documentReviews]
    }));

    try {
      if (document) {
        await fetchJSON(`${API_URL}/api/documents/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: reviewId,
            document_id: document.id,
            version_id: params.versionId,
            reviewer_id: params.reviewerId,
            status: newProposals.length > 0 ? 'rejected' : 'approved',
            comment: commentPayload
          })
        });

        // Log document review
        get().addAuditLog({
          user_id: params.reviewerId,
          action: 'review_document',
          entity_type: 'document',
          entity_id: document.id,
          details: {
            name: document.name,
            version: version?.version_number || 'v1.0.0',
            status: newProposals.length > 0 ? 'changes_proposed' : 'approved',
            comments: params.comments,
            project_id: document.project_id
          }
        });

        // Notify uploader
        if (version && version.uploaded_by !== params.reviewerId) {
          get().addNotification({
            user_id: version.uploaded_by,
            sender_id: params.reviewerId,
            type: 'peer_change',
            title: 'Review submitted',
            message: `Your document "${document.name}" was reviewed. ${newProposals.length} changes requested.`,
            metadata: { project_id: document.project_id, document_id: document.id, version_id: params.versionId }
          });
        }
      }
    } catch (e) {
      console.error("Failed to add review in Backend", e);
    }

    return newReview;
  },

  approveDocument: async (params) => {
    const version = get().documentVersions.find(v => v.id === params.versionId);
    if (!version) throw new Error('Document version not found');
    const docId = version.document_id;
    const document = get().documents.find(d => d.id === docId);
    if (!document) throw new Error('Document not found');

    const approvalId = generateUUID();
    const approval: DocumentApproval = {
      id: approvalId,
      document_version_id: params.versionId,
      approver_id: params.approverId,
      approved_at: new Date().toISOString(),
      notes: params.notes
    };

    set((state) => {
      const updatedDocs = state.documents.map(d =>
        d.id === docId ? { ...d, status: 'approved' as DocumentStatus, updated_at: new Date().toISOString() } : d
      );
      const updatedVers = state.documentVersions.map(v =>
        v.id === params.versionId ? { ...v, status: 'approved' as VersionStatus } : v
      );
      const updatedTasks = state.tasks.map(t => {
        if (params.taggedTaskIds.includes(t.id)) {
          return {
            ...t,
            status: 'review' as TaskStatus,
            description: `${t.description}\n\n[REVISION NOTICE]: Drawing approved under version ${version.version_number}. Notes: ${params.notes}`,
            updated_at: new Date().toISOString()
          };
        }
        return t;
      });

      return {
        documents: updatedDocs,
        documentVersions: updatedVers,
        tasks: updatedTasks,
        documentApprovals: [approval, ...state.documentApprovals]
      };
    });

    try {
      // Insert approval
      await fetchJSON(`${API_URL}/api/documents/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: approvalId,
          document_id: docId,
          version_id: params.versionId,
          approved_by: params.approverId,
          tagging_confirmed: params.taggedTaskIds.length > 0,
          no_tasks_affected: params.confirmNoTasks
        })
      });

      // Insert tag joins
      if (params.taggedTaskIds.length > 0) {
        const insertTags = params.taggedTaskIds.map(tid => ({
          approval_id: approvalId,
          task_id: tid,
          tagged_by: params.approverId
        }));
        await fetchJSON(`${API_URL}/api/documents/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(insertTags)
        });

        // Update tasks in DB
        await Promise.all(params.taggedTaskIds.map(tid =>
          fetchJSON(`${API_URL}/api/tasks/${tid}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'review' })
          })
        ));
      }

      // Notify peers
      const teamMems = get().teamMembers.filter(tm => tm.team_id === `team-${document.project_id}`);
      teamMems.forEach(tm => {
        if (tm.user_id !== params.approverId) {
          get().addNotification({
            user_id: tm.user_id,
            sender_id: params.approverId,
            type: 'peer_change',
            title: 'Document Approved',
            message: `"${document.name}" has been approved.`,
            metadata: { project_id: document.project_id }
          });
        }
      });

      // Log document approval action
      get().addAuditLog({
        user_id: params.approverId,
        action: 'approve_document',
        entity_type: 'document',
        entity_id: docId,
        details: {
          name: document.name,
          version: version.version_number,
          notes: params.notes,
          project_id: document.project_id
        }
      });
    } catch (e) {
      console.error("Failed to approve document in Backend", e);
    }

    return approval;
  },

  addNotification: async (params) => {
    const newId = generateUUID();
    const newNotif: Notification = {
      id: newId,
      user_id: params.user_id,
      sender_id: params.sender_id,
      type: params.type,
      title: params.title,
      message: params.message,
      read: false,
      created_at: new Date().toISOString(),
      metadata: params.metadata
    };

    set((state) => ({
      notifications: [newNotif, ...state.notifications]
    }));

    try {
      await fetchJSON(`${API_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          recipient_id: params.user_id,
          type: params.type,
          message: params.message,
          is_read: false,
          approval_id: params.metadata?.approval_id || null,
          task_id: params.metadata?.task_id || null
        })
      });
    } catch (e) {
      console.error("Failed to insert notification into Backend", e);
    }
  },

  markNotificationRead: async (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    }));

    try {
      await fetchJSON(`${API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
    } catch (e) {
      console.error("Failed to mark notification read in Backend", e);
    }
  },

  markAllNotificationsRead: async (userId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.user_id === userId ? { ...n, read: true } : n
      )
    }));

    try {
      await fetchJSON(`${API_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch (e) {
      console.error("Failed to mark all notifications read in Backend", e);
    }
  },

  addAuditLog: async (params) => {
    const newId = generateUUID();
    const newLog: AuditLog = {
      id: newId,
      user_id: params.user_id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      details: params.details,
      created_at: new Date().toISOString()
    };

    set((state) => {
      const mappedActivity = mapActivityLog({
        id: newId,
        actor_id: params.user_id,
        action: params.action,
        entity_type: params.entity_type,
        entity_id: params.entity_id || null,
        payload: params.details,
        created_at: newLog.created_at
      });

      return {
        auditLogs: [newLog, ...state.auditLogs],
        activityLogs: [mappedActivity, ...state.activityLogs]
      };
    });

    try {
      await fetchJSON(`${API_URL}/api/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          actor_id: params.user_id,
          action: params.action,
          entity_type: params.entity_type,
          entity_id: params.entity_id || null,
          payload: params.details
        })
      });
    } catch (e) {
      console.error("Failed to write audit log to Backend", e);
    }
  },

  addActivityLog: async (params) => {
    const newId = generateUUID();
    const newLog: ActivityLog = {
      id: newId,
      project_id: params.project_id,
      user_id: params.user_id,
      action: params.action,
      details: params.details,
      created_at: new Date().toISOString()
    };

    set((state) => {
      const newAudit: AuditLog = {
        id: newId,
        user_id: params.user_id,
        action: params.action,
        entity_type: 'activity',
        entity_id: params.project_id || '',
        details: { details: params.details },
        created_at: newLog.created_at
      };

      return {
        activityLogs: [newLog, ...state.activityLogs],
        auditLogs: [newAudit, ...state.auditLogs]
      };
    });

    try {
      await fetchJSON(`${API_URL}/api/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          actor_id: params.user_id,
          action: params.action,
          entity_type: 'activity',
          entity_id: params.project_id || null,
          payload: { details: params.details }
        })
      });
    } catch (e) {
      console.error("Failed to write activity log to Backend", e);
    }
  },

  deleteProject: async (projectId, userId) => {
    // Revert local UI state
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
      // Clean up team and members
      teams: state.teams.filter((t) => t.project_id !== projectId),
      teamMembers: state.teamMembers.filter((tm) => tm.team_id !== `team-${projectId}`),
      // Clean up tasks
      tasks: state.tasks.filter((t) => t.project_id !== projectId)
    }));

    try {
      await fetchJSON(`${API_URL}/api/projects/${projectId}`, {
        method: 'DELETE'
      });

      get().addAuditLog({
        user_id: userId,
        action: 'delete_project',
        entity_type: 'project',
        entity_id: projectId,
        details: { projectId }
      });
    } catch (e) {
      console.error('Failed to delete project', e);
    }
  },

  backtrackDocumentApproval: async (documentId, versionId, userId) => {
    // Revert status locally
    set((state) => {
      const updatedDocs = state.documents.map(d =>
        d.id === documentId ? { ...d, status: 'pending_review' as DocumentStatus, updated_at: new Date().toISOString() } : d
      );
      const updatedVers = state.documentVersions.map(v =>
        v.id === versionId ? { ...v, status: 'pending' as VersionStatus } : v
      );

      // Revert tagged tasks status back to 'pending'
      const approval = state.documentApprovals.find(a => a.document_version_id === versionId);
      const approvalId = approval?.id;
      const taggedTaskIds = state.approvalTaskTags.filter(t => t.approval_id === approvalId).map(t => t.task_id);

      const updatedTasks = state.tasks.map(t => {
        if (taggedTaskIds.includes(t.id)) {
          return {
            ...t,
            status: 'pending' as TaskStatus,
            updated_at: new Date().toISOString()
          };
        }
        return t;
      });

      return {
        documents: updatedDocs,
        documentVersions: updatedVers,
        tasks: updatedTasks,
        documentApprovals: state.documentApprovals.filter(a => a.document_version_id !== versionId),
        approvalTaskTags: state.approvalTaskTags.filter(t => t.approval_id !== approvalId)
      };
    });

    try {
      await fetchJSON(`${API_URL}/api/documents/approvals/${versionId}/backtrack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      get().addAuditLog({
        user_id: userId,
        action: 'backtrack_approval',
        entity_type: 'document',
        entity_id: documentId,
        details: { versionId }
      });
    } catch (e) {
      console.error('Failed to backtrack document approval', e);
    }
  },

  updateProjectDetails: async (projectId, zone, plotArea) => {
    set((state) => ({
      projects: state.projects.map(p => p.id === projectId ? { ...p, zone, plot_area: plotArea } : p)
    }));
    try {
      await fetchJSON(`${API_URL}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone, plot_area: plotArea })
      });
    } catch (e) {
      console.error('Failed to update project details', e);
    }
  },

  updateVersionBuiltUpArea: async (versionId, builtUpArea) => {
    set((state) => ({
      documentVersions: state.documentVersions.map(v => v.id === versionId ? { ...v, built_up_area: builtUpArea } : v)
    }));
    try {
      await fetchJSON(`${API_URL}/api/documents/versions/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ built_up_area: builtUpArea })
      });
    } catch (e) {
      console.error('Failed to update version built-up area', e);
    }
  }
}));

// Subscribe to dbStore changes to auto-persist sandbox data to localStorage
if (typeof window !== 'undefined') {
  useDBStore.subscribe((state) => {
    if (useAuthStore.getState().isSandboxMode) {
      const sandboxData = {
        projects: state.projects,
        teams: state.teams,
        teamMembers: state.teamMembers,
        tasks: state.tasks,
        documents: state.documents,
        documentVersions: state.documentVersions,
        documentReviews: state.documentReviews,
        documentApprovals: state.documentApprovals,
        approvalTaskTags: state.approvalTaskTags,
        notifications: state.notifications,
        auditLogs: state.auditLogs,
        activityLogs: state.activityLogs
      };
      localStorage.setItem('erp_db_state', JSON.stringify(sandboxData));
    }
  });

  // Subscribe to changes in sandbox mode to re-initialize state
  let prevSandboxMode = useAuthStore.getState().isSandboxMode;
  useAuthStore.subscribe((state) => {
    if (state.isSandboxMode !== prevSandboxMode) {
      prevSandboxMode = state.isSandboxMode;
      useDBStore.setState({ isInitialized: false });
      setTimeout(() => {
        useDBStore.getState().initializeDB();
      }, 0);
    }
  });
}

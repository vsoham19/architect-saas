import { create } from 'zustand';
import {
  Project, Team, TeamMember, Task, Document, DocumentVersion,
  DocumentReview, DocumentApproval, ApprovalTaskTag, Notification,
  AuditLog, ActivityLog, ProjectStatus, TaskStatus, DocumentStatus,
  ProposedChange, UserRole, VersionStatus
} from '../types';

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

  // Notifications
  addNotification: (params: Omit<Notification, 'id' | 'created_at' | 'read'>) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;

  // Logs
  addAuditLog: (params: Omit<AuditLog, 'id' | 'created_at'>) => Promise<void>;
  addActivityLog: (params: Omit<ActivityLog, 'id' | 'created_at'>) => Promise<void>;
}

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_URL = rawApiUrl.replace(/\/$/, '');

const fetchJSON = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${url}`);
  }
  const body = await res.json();
  return body.data;
};

// Client-side UUID generator to avoid dependency import issues
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Data mappers between Postgres schemas and state store types
const mapProject = (p: any): Project => ({
  id: p.id,
  name: p.name,
  description: p.description || '',
  status: p.status as ProjectStatus,
  created_by: p.created_by || '',
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

const mapVersion = (v: any): DocumentVersion => ({
  id: v.id,
  document_id: v.document_id,
  version_number: `v${v.revision_number}.0.0`,
  file_url: v.file_url,
  file_size: v.file_size,
  changelog: v.change_summary || '',
  uploaded_by: v.created_by || '',
  created_at: v.created_at,
  status: 'pending' // local calculation
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

const mapActivityLog = (l: any): ActivityLog => ({
  id: l.id,
  project_id: null,
  user_id: l.actor_id,
  action: l.action,
  details: `${l.action} executed on ${l.entity_type}`,
  created_at: l.created_at
});

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
      const documentVersions: DocumentVersion[] = (dbVersions || []).map(mapVersion);
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
      console.error("Failed to initialize database from Backend", e);
      set({ isInitialized: true });
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
          created_by: params.createdBy
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
          created_by: params.uploadedBy
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

    set((state) => ({
      auditLogs: [newLog, ...state.auditLogs]
    }));

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

    set((state) => ({
      activityLogs: [newLog, ...state.activityLogs]
    }));

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
  }
}));

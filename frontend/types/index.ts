export type UserRole = 'admin' | 'principal' | 'senior' | 'junior';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export type ProjectStatus = 'upcoming' | 'ongoing' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  created_by: string;
  zone?: string | null;
  plot_area?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  project_id: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'blocked';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  assigned_junior_id: string | null;
  assigned_senior_id: string | null;
  due_date: string;
  status: TaskStatus;
  attached_version_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentStatus = 'pending_review' | 'changes_proposed' | 'approved';

export interface Document {
  id: string;
  project_id: string;
  name: string;
  description: string;
  status: DocumentStatus;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  current_version_id?: string | null;
}

export type VersionStatus = 'pending' | 'approved' | 'rejected';

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: string; // e.g. 'v1.0.0'
  file_url: string;
  file_size: number;
  changelog: string;
  uploaded_by: string;
  built_up_area?: number | null;
  created_at: string;
  status: VersionStatus;
  drawing_data?: any;
}

export interface ProposedChange {
  id: string;
  description: string;
  x: number; // percentage coordinate 0-100
  y: number; // percentage coordinate 0-100
  resolved: boolean;
  proposed_by: string;
  created_at: string;
}

export interface DocumentReview {
  id: string;
  document_version_id: string;
  reviewer_id: string;
  comments: string;
  proposed_changes: ProposedChange[];
  created_at: string;
}

export interface DocumentApproval {
  id: string;
  document_version_id: string;
  approver_id: string;
  approved_at: string;
  notes: string;
}

export interface ApprovalTaskTag {
  id: string;
  approval_id: string;
  task_id: string;
  created_at: string;
}

export type NotificationType = 'peer_change' | 'task_updated' | 'approval_required' | 'project_update';

export interface Notification {
  id: string;
  user_id: string;
  sender_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata?: {
    project_id?: string;
    task_id?: string;
    document_id?: string;
    version_id?: string;
    [key: string]: any;
  };
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  project_id: string | null;
  user_id: string;
  action: string;
  details: string;
  created_at: string;
}

export interface MockUserSession {
  user: User | null;
  role: UserRole | null;
}

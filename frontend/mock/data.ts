import { User, Project, Team, TeamMember, Task, Document, DocumentVersion, DocumentReview, DocumentApproval, ApprovalTaskTag, Notification, AuditLog, ActivityLog, ProposedChange } from '../types';

export const mockUsers: User[] = [
  {
    id: 'u-1',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@spatialdesign.com',
    role: 'principal',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 'u-2',
    name: 'David Miller',
    email: 'david.miller@spatialdesign.com',
    role: 'senior',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    created_at: '2026-01-12T09:30:00Z',
  },
  {
    id: 'u-3',
    name: 'Elena Rostova',
    email: 'elena.rostova@spatialdesign.com',
    role: 'senior',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    created_at: '2026-01-15T10:15:00Z',
  },
  {
    id: 'u-7',
    name: 'Marcus Vance',
    email: 'marcus.vance@spatialdesign.com',
    role: 'senior',
    avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
    created_at: '2026-02-10T09:00:00Z',
  },
  {
    id: 'u-8',
    name: 'Sophia Patel',
    email: 'sophia.patel@spatialdesign.com',
    role: 'senior',
    avatar_url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150',
    created_at: '2026-02-12T10:00:00Z',
  },
  {
    id: 'u-4',
    name: 'Alex Rivers',
    email: 'alex.rivers@spatialdesign.com',
    role: 'junior',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    created_at: '2026-02-01T11:00:00Z',
  },
  {
    id: 'u-5',
    name: 'Liam Chen',
    email: 'liam.chen@spatialdesign.com',
    role: 'junior',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    created_at: '2026-02-05T14:20:00Z',
  },
  {
    id: 'u-9',
    name: 'James Kim',
    email: 'james.kim@spatialdesign.com',
    role: 'junior',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    created_at: '2026-02-08T09:00:00Z',
  },
  {
    id: 'u-10',
    name: 'Emily Wong',
    email: 'emily.wong@spatialdesign.com',
    role: 'junior',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    created_at: '2026-02-14T11:00:00Z',
  },
  {
    id: 'u-6',
    name: 'Admin User',
    email: 'admin@spatialdesign.com',
    role: 'admin',
    avatar_url: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?w=150',
    created_at: '2026-01-01T00:00:00Z',
  }
];

export const mockProjects: Project[] = [
  {
    id: 'p-1',
    name: 'The Helix Cultural Center',
    description: 'A 50,000 sq ft performing arts center featuring a parametric spiral facade, an 800-seat main auditorium, and sustainable rooftop gardens. Targeting LEED Gold certification.',
    status: 'ongoing',
    created_by: 'u-1',
    created_at: '2026-02-10T09:00:00Z',
    updated_at: '2026-06-04T12:00:00Z',
  },
  {
    id: 'p-2',
    name: 'Zenith Mixed-Use Towers',
    description: 'Twin 30-story residential and commercial towers featuring sky-bridges, passive cooling architectural louvers, and integrated transit connection.',
    status: 'ongoing',
    created_by: 'u-1',
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-06-03T15:30:00Z',
  },
  {
    id: 'p-3',
    name: 'Apex Waterfront Villa',
    description: 'Luxury net-zero residential project built over a cliff edge. Features cantilevered concrete slabs, smart home energy grids, and custom water harvesting.',
    status: 'upcoming',
    created_by: 'u-1',
    created_at: '2026-05-15T10:00:00Z',
    updated_at: '2026-05-15T10:00:00Z',
  },
  {
    id: 'p-4',
    name: 'Starlight Observatory',
    description: 'Renovation of the historic observatory structure, retrofitting modern high-tech research labs while preserving the historic masonry envelope.',
    status: 'completed',
    created_by: 'u-1',
    created_at: '2025-08-10T08:00:00Z',
    updated_at: '2026-05-20T17:00:00Z',
  }
];

export const mockTeams: Team[] = [
  {
    id: 't-1',
    name: 'Helix Core Design Team',
    project_id: 'p-1',
    created_at: '2026-02-11T09:00:00Z',
  },
  {
    id: 't-2',
    name: 'Zenith Architecture Group',
    project_id: 'p-2',
    created_at: '2026-03-02T10:00:00Z',
  },
  {
    id: 't-3',
    name: 'Apex Design & Build Unit',
    project_id: 'p-3',
    created_at: '2026-05-16T11:00:00Z',
  }
];

export const mockTeamMembers: TeamMember[] = [
  // Helix Core Design Team (p-1)
  { id: 'tm-1', team_id: 't-1', user_id: 'u-1', role: 'principal', created_at: '2026-02-11T09:00:00Z' },
  { id: 'tm-2', team_id: 't-1', user_id: 'u-2', role: 'senior', created_at: '2026-02-11T09:15:00Z' },
  { id: 'tm-11', team_id: 't-1', user_id: 'u-7', role: 'senior', created_at: '2026-02-11T09:40:00Z' },
  { id: 'tm-3', team_id: 't-1', user_id: 'u-4', role: 'junior', created_at: '2026-02-11T09:30:00Z' },
  { id: 'tm-4', team_id: 't-1', user_id: 'u-5', role: 'junior', created_at: '2026-02-11T09:30:00Z' },
  { id: 'tm-12', team_id: 't-1', user_id: 'u-9', role: 'junior', created_at: '2026-02-11T09:45:00Z' },

  // Zenith Architecture Group (p-2)
  { id: 'tm-5', team_id: 't-2', user_id: 'u-1', role: 'principal', created_at: '2026-03-02T10:00:00Z' },
  { id: 'tm-6', team_id: 't-2', user_id: 'u-3', role: 'senior', created_at: '2026-03-02T10:15:00Z' },
  { id: 'tm-13', team_id: 't-2', user_id: 'u-8', role: 'senior', created_at: '2026-03-02T10:40:00Z' },
  { id: 'tm-7', team_id: 't-2', user_id: 'u-4', role: 'junior', created_at: '2026-03-02T10:30:00Z' },
  { id: 'tm-14', team_id: 't-2', user_id: 'u-10', role: 'junior', created_at: '2026-03-02T10:45:00Z' },

  // Apex Design & Build Unit (p-3)
  { id: 'tm-8', team_id: 't-3', user_id: 'u-1', role: 'principal', created_at: '2026-05-16T11:00:00Z' },
  { id: 'tm-9', team_id: 't-3', user_id: 'u-2', role: 'senior', created_at: '2026-05-16T11:15:00Z' },
  { id: 'tm-10', team_id: 't-3', user_id: 'u-5', role: 'junior', created_at: '2026-05-16T11:30:00Z' }
];

export const mockTasks: Task[] = [
  // Helix Cultural Center Tasks (p-1)
  {
    id: 'tk-1',
    project_id: 'p-1',
    title: 'Model parametric facade spiral subdivisions',
    description: 'Generate the subdivisions of the outer glass spiral facade structure. Ensure panels match manufacturing dimensions and check structural loading joints.',
    assigned_junior_id: 'u-4',
    assigned_senior_id: 'u-2',
    due_date: '2026-06-15T18:00:00Z',
    status: 'in_progress',
    created_at: '2026-05-20T09:00:00Z',
    updated_at: '2026-06-03T10:00:00Z',
  },
  {
    id: 'tk-2',
    project_id: 'p-1',
    title: 'Update HVAC routing plan to match structural grids',
    description: 'Re-align the secondary air duct loops through the main auditorium concrete core. Maintain minimum clearances around electrical service trays.',
    assigned_junior_id: 'u-5',
    assigned_senior_id: 'u-2',
    due_date: '2026-06-10T18:00:00Z',
    status: 'review',
    created_at: '2026-05-22T10:00:00Z',
    updated_at: '2026-06-04T09:15:00Z',
  },
  {
    id: 'tk-3',
    project_id: 'p-1',
    title: 'Prepare final fire exit calculations report',
    description: 'Calculate egress timings for the auditorium lobby under peak occupancy. Report exit width ratios in accordance with municipal code Part 4.',
    assigned_junior_id: 'u-4',
    assigned_senior_id: 'u-2',
    due_date: '2026-06-25T18:00:00Z',
    status: 'pending',
    created_at: '2026-05-25T11:00:00Z',
    updated_at: '2026-05-25T11:00:00Z',
  },
  {
    id: 'tk-4',
    project_id: 'p-1',
    title: 'Draft lobby structural foundation details',
    description: 'Create detailed drawing showing reinforce bar sizes, anchor spacings, and connection plates for the entrance lobby cantilever.',
    assigned_junior_id: 'u-5',
    assigned_senior_id: 'u-2',
    due_date: '2026-06-05T18:00:00Z',
    status: 'blocked',
    created_at: '2026-05-18T08:30:00Z',
    updated_at: '2026-06-03T16:00:00Z',
  },

  // Zenith Mixed-Use Towers Tasks (p-2)
  {
    id: 'tk-5',
    project_id: 'p-2',
    title: 'Model sky-bridge support strut links',
    description: 'Detail the high-tensile steel connection nodes at Level 15 skybridge interface. Requires FEA stress plots.',
    assigned_junior_id: 'u-4',
    assigned_senior_id: 'u-3',
    due_date: '2026-06-12T18:00:00Z',
    status: 'in_progress',
    created_at: '2026-05-28T09:00:00Z',
    updated_at: '2026-06-02T11:00:00Z',
  },
  {
    id: 'tk-6',
    project_id: 'p-2',
    title: 'Draft parking floor slopes and drainage lines',
    description: 'Draw 3D slope profiles for basement level 1 and level 2. Position sump pumps and floor drains according to storm specifications.',
    assigned_junior_id: null,
    assigned_senior_id: 'u-3',
    due_date: '2026-06-20T18:00:00Z',
    status: 'pending',
    created_at: '2026-05-30T10:00:00Z',
    updated_at: '2026-05-30T10:00:00Z',
  },
  {
    id: 'tk-7',
    project_id: 'p-1',
    title: 'Calculate electrical lighting load requirements',
    description: 'Determine peak electrical loads for lighting fixture grids in the main lobby and corridors.',
    assigned_junior_id: 'u-9',
    assigned_senior_id: 'u-7',
    due_date: '2026-06-18T18:00:00Z',
    status: 'in_progress',
    created_at: '2026-06-01T09:00:00Z',
    updated_at: '2026-06-03T11:00:00Z',
  },
  {
    id: 'tk-8',
    project_id: 'p-2',
    title: 'Draft Level 10 electrical conduits layout',
    description: 'Position vertical conduit runs and wiring connections on Zenith Tower A level 10 plan.',
    assigned_junior_id: 'u-10',
    assigned_senior_id: 'u-8',
    due_date: '2026-06-22T18:00:00Z',
    status: 'pending',
    created_at: '2026-06-02T10:00:00Z',
    updated_at: '2026-06-02T10:00:00Z',
  },
  {
    id: 'tk-9',
    project_id: 'p-2',
    title: 'Detail service core cabling panels',
    description: 'Provide section details of electrical cabling trays and service connections in the central core.',
    assigned_junior_id: 'u-10',
    assigned_senior_id: 'u-8',
    due_date: '2026-06-29T18:00:00Z',
    status: 'in_progress',
    created_at: '2026-06-03T09:00:00Z',
    updated_at: '2026-06-04T10:00:00Z',
  }
];

export const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    project_id: 'p-1',
    name: 'Helix Auditorium Floor Plan.dwg',
    description: 'Main auditorium seating configuration, structural column placement, acoustic treatments layout, and fire egress pathways.',
    status: 'pending_review',
    uploaded_by: 'u-4',
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-06-04T11:00:00Z',
    current_version_id: 'ver-2',
  },
  {
    id: 'doc-2',
    project_id: 'p-1',
    name: 'Helix Facade Detail Scheme.pdf',
    description: 'Structural connection details, glass pane structural loads, weather seals, and anodized aluminum support frame profiles.',
    status: 'approved',
    uploaded_by: 'u-2',
    created_at: '2026-05-15T09:00:00Z',
    updated_at: '2026-06-01T15:00:00Z',
    current_version_id: 'ver-1',
  },
  {
    id: 'doc-3',
    project_id: 'p-2',
    name: 'Zenith Skybridge Interface Section.dwg',
    description: 'Detailed drawings of high-movement structural joints connecting Zenith Tower A and Tower B at Level 15.',
    status: 'changes_proposed',
    uploaded_by: 'u-4',
    created_at: '2026-05-29T11:00:00Z',
    updated_at: '2026-06-03T14:00:00Z',
    current_version_id: 'ver-3',
  }
];

export const mockDocumentVersions: DocumentVersion[] = [
  // doc-1 (Auditorium Floor Plan)
  {
    id: 'ver-1',
    document_id: 'doc-1',
    version_number: 'v1.0.0',
    file_url: '/drawings/helix_auditorium_v1.jpg',
    file_size: 14205800, // 14.2 MB
    changelog: 'Initial upload of structural layout and seating lines.',
    uploaded_by: 'u-4',
    created_at: '2026-05-20T10:00:00Z',
    status: 'rejected',
  },
  {
    id: 'ver-2',
    document_id: 'doc-1',
    version_number: 'v1.1.0',
    file_url: '/drawings/helix_auditorium_v2.jpg',
    file_size: 14850000, // 14.8 MB
    changelog: 'Revised column thickness at grid line G-8 and added emergency fire stairs exit paths.',
    uploaded_by: 'u-4',
    created_at: '2026-06-04T11:00:00Z',
    status: 'pending',
  },

  // doc-2 (Facade Detail)
  {
    id: 'ver-facade-1',
    document_id: 'doc-2',
    version_number: 'v1.0.0',
    file_url: '/drawings/helix_facade_v1.jpg',
    file_size: 8900400, // 8.9 MB
    changelog: 'Initial design facade framing details approved by client.',
    uploaded_by: 'u-2',
    created_at: '2026-05-15T09:00:00Z',
    status: 'approved',
  },

  // doc-3 (Zenith Skybridge)
  {
    id: 'ver-3',
    document_id: 'doc-3',
    version_number: 'v1.0.0',
    file_url: '/drawings/zenith_skybridge_v1.jpg',
    file_size: 21500300, // 21.5 MB
    changelog: 'Initial engineering schematic for the Level 15 expansion joint.',
    uploaded_by: 'u-4',
    created_at: '2026-05-29T11:00:00Z',
    status: 'rejected',
  }
];

export const mockProposedChanges: ProposedChange[] = [
  {
    id: 'pc-1',
    description: 'Column G-8 width is insufficient for load bearing. Increase to 600mm diameter concrete core.',
    x: 45.5,
    y: 38.2,
    resolved: false,
    proposed_by: 'u-2', // David (Senior)
    created_at: '2026-06-04T11:30:00Z',
  },
  {
    id: 'pc-2',
    description: 'Door width at fire exit corridor 2B does not meet municipal code. Increase exit clearance by 150mm.',
    x: 72.8,
    y: 65.4,
    resolved: false,
    proposed_by: 'u-2', // David (Senior)
    created_at: '2026-06-04T11:45:00Z',
  },
  {
    id: 'pc-3',
    description: 'Expansion joint slide pads need extra teflon buffer layers to reduce wind shear noise.',
    x: 55.0,
    y: 50.0,
    resolved: false,
    proposed_by: 'u-3', // Elena (Senior)
    created_at: '2026-06-03T15:00:00Z',
  }
];

export const mockDocumentReviews: DocumentReview[] = [
  {
    id: 'rev-1',
    document_version_id: 'ver-2',
    reviewer_id: 'u-2',
    comments: 'Reviewed floor plan v1.1.0. Highlighting structural loads and egress routes. Column sizes need correction and exit corridors need widening to pass code checks.',
    proposed_changes: [mockProposedChanges[0], mockProposedChanges[1]],
    created_at: '2026-06-04T11:50:00Z',
  },
  {
    id: 'rev-2',
    document_version_id: 'ver-3',
    reviewer_id: 'u-3',
    comments: 'Wind shear acoustics at level 15 will exceed comfort levels. Teflon buffer joints must be explicitly spec\'d in drafting details.',
    proposed_changes: [mockProposedChanges[2]],
    created_at: '2026-06-03T15:10:00Z',
  }
];

export const mockDocumentApprovals: DocumentApproval[] = [
  {
    id: 'apv-1',
    document_version_id: 'ver-facade-1',
    approver_id: 'u-1',
    approved_at: '2026-05-18T10:00:00Z',
    notes: 'Structural reports and material choices are sound. Facade design matches architectural vision. Approved for drafting final specs.',
  }
];

export const mockApprovalTaskTags: ApprovalTaskTag[] = [
  {
    id: 'att-1',
    approval_id: 'apv-1',
    task_id: 'tk-1', // Parametric facade modelling
    created_at: '2026-05-18T10:00:00Z',
  }
];

export const mockNotifications: Notification[] = [
  // For David (Senior)
  {
    id: 'nt-1',
    user_id: 'u-2',
    sender_id: 'u-4',
    type: 'approval_required',
    title: 'New version uploaded for Helix Auditorium Plan',
    message: 'Alex Rivers uploaded Auditorium Floor Plan v1.1.0 and requested review.',
    read: false,
    metadata: { project_id: 'p-1', document_id: 'doc-1', version_id: 'ver-2' },
    created_at: '2026-06-04T11:02:00Z',
  },
  // For Sarah (Principal)
  {
    id: 'nt-2',
    user_id: 'u-1',
    sender_id: 'u-2',
    type: 'peer_change',
    title: 'Review submitted for Helix Auditorium Plan',
    message: 'David Miller reviewed Auditorium Floor Plan v1.1.0 and proposed 2 changes.',
    read: false,
    metadata: { project_id: 'p-1', document_id: 'doc-1', version_id: 'ver-2' },
    created_at: '2026-06-04T11:52:00Z',
  },
  // For Alex (Junior)
  {
    id: 'nt-3',
    user_id: 'u-4',
    sender_id: 'u-3',
    type: 'task_updated',
    title: 'Task updated: zenith towers sky-bridge modeling',
    message: 'Elena Rostova updated Zenith Towers Skybridge support model task status to In Progress.',
    read: true,
    metadata: { project_id: 'p-2', task_id: 'tk-5' },
    created_at: '2026-06-02T11:05:00Z',
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'al-1',
    user_id: 'u-1',
    action: 'approve_document',
    entity_type: 'document',
    entity_id: 'doc-2',
    details: {
      document_name: 'Helix Facade Detail Scheme.pdf',
      version_number: 'v1.0.0',
      tagged_tasks: ['tk-1'],
      notes: 'Approved for drafting final specs.',
    },
    created_at: '2026-05-18T10:00:00Z',
  },
  {
    id: 'al-2',
    user_id: 'u-4',
    action: 'upload_document_version',
    entity_type: 'document_version',
    entity_id: 'ver-2',
    details: {
      document_name: 'Helix Auditorium Floor Plan.dwg',
      version_number: 'v1.1.0',
      file_size_bytes: 14850000,
    },
    created_at: '2026-06-04T11:00:00Z',
  }
];

export const mockActivityLogs: ActivityLog[] = [
  {
    id: 'act-1',
    project_id: 'p-1',
    user_id: 'u-4',
    action: 'document_upload',
    details: 'Alex Rivers uploaded Auditorium Floor Plan v1.1.0.',
    created_at: '2026-06-04T11:00:00Z',
  },
  {
    id: 'act-2',
    project_id: 'p-1',
    user_id: 'u-2',
    action: 'document_review',
    details: 'David Miller created a review on Auditorium Floor Plan v1.1.0 with proposed changes.',
    created_at: '2026-06-04T11:50:00Z',
  },
  {
    id: 'act-3',
    project_id: 'p-2',
    user_id: 'u-3',
    action: 'task_assign',
    details: 'Elena Rostova assigned task "Model sky-bridge support strut links" to Alex Rivers.',
    created_at: '2026-05-28T09:00:00Z',
  }
];

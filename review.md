# Architect SaaS Platform - Comprehensive System Review

This document provides a detailed technical report of the **Architect SaaS Platform** (Enterprise ERP & Collaborative Workspace for Modern Architecture Firms), analyzing its system architecture, front-to-back database mapping, core feature sets, user persona workflows, and areas of optimization.

---

## 1. Executive Summary

The **Architect SaaS Platform** is a specialized ERP and collaboration tool tailored for modern architectural practices. Its primary focus is streamlining the design review, task allocation, and sign-off verification process between different organizational tiers:
- **Principals** (Design sign-off, high-level resource & project management)
- **Seniors** (Supervising junior architects, proposing changes on drawings)
- **Juniors** (Creating drafts, managing assigned CAD/drafting tasks, submitting deliverables)
- **Administrators** (Audit logging, sandbox management)

---

## 2. Technical Stack Analysis

The platform is designed around a decoupled client-server architecture, communicating via REST API and backed by a PostgreSQL database managed through Supabase.

### Frontend (Next.js Application)
- **Core Framework:** [Next.js](https://nextjs.org/) (Version `16.2.7`) with TypeScript (`^5`) and App Router support.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Version `^4`) with `@tailwindcss/postcss`.
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) (`^5.0.14`) for local auth sessions and synchronous database-to-UI store mappings (`authStore.ts` & `dbStore.ts`).
- **Data Querying:** [TanStack React Query](https://tanstack.com/query/latest) (`^5.101.0`) for caching and remote data state synchronization.
- **Animations:** [Framer Motion](https://www.framer.com/motion/) (`^12.40.0`) for smooth micro-animations, modals transitions, and layout transformations.
- **Icons:** [Lucide React](https://lucide.dev/) (`^1.17.0`) for vector iconography.

### Backend (Node.js REST API)
- **Core Engine:** Node.js Express server running on port `5000` (or production port).
- **Database Client:** Supabase JS Client (`@supabase/supabase-js` `^2.107.0`).
- **Cross-Origin Resource Sharing (CORS):** Preconfigured to support multi-origin routing from Vercel frontends.
- **Environment Management:** `dotenv` configurations mapping to Supabase instances.

### Database Layer (Supabase / PostgreSQL)
- Relational schema implemented in PostgreSQL with custom type enums (`system_role`, `project_status`, `project_role`, `doc_type`, `version_status`, `task_status`, `notification_type`).
- Append-only `audit_log` database tracking every structural modification, project creation, status change, and approval payload in standard JSONB format.

---

## 3. Database Schema Overview

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email UNIQUE
        varchar full_name
        system_role system_role
        varchar avatar_url
        timestamp created_at
    }
    PROJECTS {
        uuid id PK
        varchar name
        text description
        project_status status
        uuid created_by FK
        date start_date
        date end_date
        timestamp created_at
    }
    PROJECT_MEMBERS {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        project_role project_role
        timestamp assigned_at
    }
    DOCUMENTS {
        uuid id PK
        uuid project_id FK
        varchar title
        doc_type doc_type
        uuid current_version_id FK
        uuid created_by FK
        timestamp created_at
    }
    DOC_VERSIONS {
        uuid id PK
        uuid document_id FK
        int revision_number
        varchar file_url
        int file_size
        text change_summary
        uuid created_by FK
        timestamp created_at
    }
    DOC_REVIEWS {
        uuid id PK
        uuid document_id FK
        uuid version_id FK
        uuid reviewer_id FK
        version_status status
        text comment
        timestamp reviewed_at
    }
    DOC_APPROVALS {
        uuid id PK
        uuid document_id FK
        uuid version_id FK
        uuid approved_by FK
        boolean tagging_confirmed
        boolean no_tasks_affected
        timestamp approved_at
    }
    TASKS {
        uuid id PK
        uuid project_id FK
        uuid assigned_to FK
        uuid assigned_by FK
        varchar title
        text description
        task_status status
        date due_date
        timestamp updated_at
        timestamp created_at
    }
    APPROVAL_TASK_TAGS {
        uuid id PK
        uuid approval_id FK
        uuid task_id FK
        uuid tagged_by FK
        timestamp created_at
    }
    NOTIFICATIONS {
        uuid id PK
        uuid recipient_id FK
        notification_type type
        uuid approval_id FK
        uuid task_id FK
        text message
        boolean is_read
        timestamp created_at
    }
    AUDIT_LOG {
        uuid id PK
        uuid actor_id FK
        varchar action
        varchar entity_type
        uuid entity_id
        jsonb payload
        timestamp created_at
    }

    USERS ||--o{ PROJECTS : "creates"
    USERS ||--o{ PROJECT_MEMBERS : "acts_as"
    USERS ||--o{ DOCUMENTS : "creates"
    USERS ||--o{ DOC_VERSIONS : "uploads"
    USERS ||--o{ DOC_REVIEWS : "reviews"
    USERS ||--o{ DOC_APPROVALS : "approves"
    USERS ||--o{ TASKS : "assigned_to/by"
    USERS ||--o{ AUDIT_LOG : "triggers"

    PROJECTS ||--o{ PROJECT_MEMBERS : "has"
    PROJECTS ||--o{ DOCUMENTS : "owns"
    PROJECTS ||--o{ TASKS : "contains"
    
    DOCUMENTS ||--o{ DOC_VERSIONS : "has"
    DOCUMENTS ||--o{ DOC_REVIEWS : "associated_with"
    DOCUMENTS ||--o{ DOC_APPROVALS : "receives"
    
    DOC_VERSIONS ||--o{ DOC_REVIEWS : "receives"
    DOC_VERSIONS ||--o{ DOC_APPROVALS : "receives"
    
    DOC_APPROVALS ||--o{ APPROVAL_TASK_TAGS : "tags"
    TASKS ||--o{ APPROVAL_TASK_TAGS : "tagged_in"
    DOC_APPROVALS ||--o{ NOTIFICATIONS : "triggers"
    TASKS ||--o{ NOTIFICATIONS : "triggers"
```

---

## 4. Key Functional Features & Workflows

### 4.1. The Collaborative CAD/Blueprint Workspace
Located at `/dashboard/workspace/[id]`, this is the core feature of the application, simulating an interactive CAD blueprint drawing board.
- **SVG Layer Toggle System:** Dynamically renders overlays (Structural, HVAC Ducts, Fire Escape, and Electrical circuit traces) on top of drawing blueprints. The layers shown scale automatically depending on the document version number (e.g., HVAC is omitted in `v1.0.0`, Electrical trace appears starting `v1.1.0`).
- **Technical Grid & Crosshair HUD:** Tracking pointer movement on the canvas displays coordinates dynamically relative to scaling dimensions in meters (X and Y coordinates).
- **Coordinate Pin Annotation:** Senior architects and principals can click anywhere on the canvas to drop a pinpoint. They describe required updates (e.g., "enlarge load-bearing column") which are then bundled and submitted as a Review Package.
- **Visual Revision Compare Slider:** Users can activate "Visual Compare" mode, rendering two versions of a blueprint side-by-side using an interactive slider that clips and exposes layers from previous/succeeding versions.
- **Immutable Approval Stamp:** Once approved, the canvas displays an overlay of a digital certification stamp, locking all edit abilities on that document version.

### 4.2. Principal Sign-Off Pipeline
The system implements a strict approval rule for Principals:
- To approve a drawing version, a Principal must either **tag corresponding active tasks** affected by this revision (creating dynamic dependency nodes in a custom SVG graph) or **explicitly confirm a bypass checkbox** declaring no tasks are affected.
- The approval action remains disabled until this condition is satisfied, preventing structural revisions from leaking without task assignments.
- Upon approval, notifications are pushed to all junior assignees linked to tagged tasks, alerting them to check annotations.

### 4.3. Junior Deliverables Pipeline
- Junior architects see a simplified Kanban list detailing their tasks.
- If they hit a bottleneck, they set status to `Blocked`, triggering a dashboard warning. When they submit a task for review (`Review` status), the supervising Senior is notified.
- They have a direct drag-and-drop deliverables form to upload new drawing versions, which automatically resets document status to `pending_review` and flags other project members.

### 4.4. Administration & Diagnostics Console
- Administrators can review the entire immutable system ledger detailing every database transaction.
- Has a flagship **Reset Sandbox State** button, clearing cached localStorage databases and restoring default mock data directly from SQL seeds to facilitate sandbox testing.

---

## 5. REST API Endpoint Mapping

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/health` | Backend status verification |
| **GET** | `/api/users` | Lists all architecture firm staff and roles |
| **POST** | `/api/users` | Creates a new user profile on login |
| **GET** | `/api/projects` | Lists all active and upcoming projects |
| **POST** | `/api/projects` | Creates a new project profile |
| **PATCH** | `/api/projects/:id/status` | Updates project status (ongoing, completed, etc.) |
| **GET** | `/api/projects/members` | Fetches all project membership records |
| **POST** | `/api/projects/members/assign` | Re-assigns team rosters to a specific project |
| **GET** | `/api/tasks` | Fetches all task records |
| **POST** | `/api/tasks` | Creates a task and assigns to junior/senior members |
| **PATCH** | `/api/tasks/:id/status` | Updates task status and notifies supervisors |
| **DELETE**| `/api/tasks/:id` | Deletes a task from the system |
| **GET** | `/api/documents` | Lists all document records |
| **POST** | `/api/documents` | Creates a document entry |
| **GET** | `/api/documents/versions` | Lists all document version files |
| **POST** | `/api/documents/versions` | Registers a new revision version of a drawing |
| **PATCH** | `/api/documents/:id/version` | Updates a document's active current version pointer |
| **GET** | `/api/documents/reviews` | Lists all review comments and coordinate pin nodes |
| **POST** | `/api/documents/reviews` | Creates review records with serialized grid pin coordinate arrays |
| **GET** | `/api/documents/approvals` | Lists document sign-offs |
| **POST** | `/api/documents/approvals` | Creates drawing approvals |
| **GET** | `/api/documents/tags` | Lists task-to-approval dependencies |
| **POST** | `/api/documents/tags` | Registers multiple task tags |
| **GET** | `/api/notifications` | Lists in-app notification logs |
| **GET** | `/api/audit-logs` | Fetches append-only activity trail logs |

---

## 6. Evaluations and Recommendations

### 6.1. Real-time Synchronization (Supabase Subscriptions)
- **Current Setup:** The system pulls data from REST endpoints, relying on page reloads or local Zustand updates to sync state.
- **Recommendation:** Implement **Supabase Real-Time Subscriptions** on tables like `notifications`, `tasks`, and `doc_reviews`. This would allow senior comments and annotations to pop up instantly on a junior architect's viewport without polling.

### 6.2. Document Visual Mapping Customization
- **Current Setup:** The CAD viewport renders mock structural vector groups using SVGs inside `DocumentWorkspacePage`.
- **Recommendation:** Support uploading actual DXF/DWG vector assets by implementing a lightweight client-side parser, or hook the upload pipeline to a cloud worker converting blueprint PDFs to interactive vector paths.

### 6.3. Row Level Security (RLS) Configuration
- **Current Setup:** SQL schema disables RLS (`ALTER TABLE ... DISABLE ROW LEVEL SECURITY`) to allow public sandbox operations.
- **Recommendation:** In production, enable RLS and configure policies so that juniors can only update tasks assigned to them, while seniors/principals can execute approvals and review annotations across the organization.

### 6.4. Refactoring Monolithic Views
- **Current Setup:** `frontend/app/dashboard/workspace/[id]/page.tsx` is `~52KB` containing all visual sliders, modal state machines, layer controls, and SVG drawing code in one place.
- **Recommendation:** Split this page into modular components under `components/workspace/` (e.g., `CadCanvas.tsx`, `RevisionSelector.tsx`, `ApprovalPanel.tsx`, `TaskDependencyGraph.tsx`) to improve maintainability and speed up hot reloading.

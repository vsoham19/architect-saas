# Architect SaaS Platform

> **Enterprise ERP & Collaborative Workspace for Modern Architecture Firms**

A full-stack SaaS platform purpose-built for architectural practices — streamlining design reviews, CAD drawing approvals, task management, and cross-role collaboration between Principals, Seniors, Juniors, and Administrators.

---

## Key Features

| Feature | Description |
|---|---|
| **CAD Blueprint Workspace** | Interactive SVG canvas with layer toggles (Structural, HVAC, Fire Escape, Electrical), coordinate crosshair HUD, and version comparison slider |
| **Coordinate Pin Annotations** | Seniors & Principals drop pinpoints on drawings with required-change descriptions, bundled into a Review Package |
| **Principal Sign-Off Pipeline** | Approval gated behind task dependency tagging or explicit bypass — no structural revisions leak without accountability |
| **Junior Kanban Pipeline** | Task Kanban with `Blocked` escalation alerts and drag-and-drop deliverable uploads that auto-trigger review cycles |
| **In-App Notifications** | Role-aware notifications on approvals, task updates, blocked status, and peer changes |
| **Immutable Audit Ledger** | Append-only JSONB audit log of every structural change, status update, and approval in the system |
| **Admin Sandbox Console** | Reset sandbox state button that clears localStorage and restores seed data for testing |
| **Role-Based Dashboards** | Separate dashboard views for Principals, Seniors, Juniors, and Admins |

---

## Architecture Overview

```
architect-saas/
├── frontend/            # Next.js 16 App Router (TypeScript)
│   ├── app/
│   │   ├── login/       # Login page
│   │   └── dashboard/
│   │       ├── page.tsx         # Role-specific dashboard root
│   │       ├── projects/        # Project listing & management
│   │       ├── tasks/           # Task Kanban board
│   │       ├── workspace/[id]/  # CAD Blueprint Workspace (core feature)
│   │       ├── teams/           # Team roster management
│   │       ├── audit/           # Audit log console (admin)
│   │       └── settings/        # User settings
│   ├── features/dashboard/      # Role-specific dashboard components
│   ├── components/              # Shared UI components
│   ├── store/                   # Zustand stores (authStore, dbStore)
│   └── types/                   # TypeScript type definitions
│
├── backend/             # Node.js Express REST API
│   ├── server.js        # Entry point (port 5000)
│   └── src/
│       ├── routes/      # userRoutes, projectRoutes, taskRoutes,
│       │                #   documentRoutes, notificationRoutes,
│       │                #   auditRoutes, aiRoutes, canvasRoutes
│       └── middleware/  # Error handling
│
├── schema.sql           # Full PostgreSQL schema + seed data
├── migrations.sql       # Database migrations
└── package.json         # npm workspaces root
```

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js `16.2.7` · TypeScript `^5` · App Router |
| Styling | Tailwind CSS `^4` · `@tailwindcss/postcss` |
| State | Zustand `^5` (auth session + DB store sync) |
| Data Fetching | TanStack React Query `^5` |
| Animations | Framer Motion `^12` |
| Icons | Lucide React `^1.17` |

### Backend
| Layer | Technology |
|---|---|
| Server | Node.js · Express `^4` |
| Database Client | Supabase JS `^2.107` |
| AI | Google Generative AI `^0.12` |
| File Uploads | Multer `^2` |
| CORS | Preconfigured for multi-origin (Vercel) |

### Database
| Layer | Technology |
|---|---|
| Engine | PostgreSQL (via Supabase) |
| Schema | UUID PKs · 7 custom ENUM types · JSONB audit payloads |
| ORM | Raw SQL via Supabase JS client |

---

## Database Schema

11 relational tables with custom PostgreSQL enums:

```
system_role:       admin | principal | senior | junior
project_status:    upcoming | ongoing | completed | archived
project_role:      principal | senior | junior
doc_type:          drawing | specification | report | dwg | pdf
version_status:    pending | approved | rejected
task_status:       pending | in_progress | review | completed | blocked
notification_type: peer_change | task_updated | approval_required | project_update
```

**Core tables:** `users` → `projects` → `project_members` → `documents` → `doc_versions` → `doc_reviews` → `doc_approvals` → `approval_task_tags` → `tasks` → `notifications` → `audit_log`

> See [`schema.sql`](./schema.sql) for the full schema with seed data.

---

## User Roles & Workflows

### Principal
- High-level project & resource management
- Signs off on drawing versions via the **Principal Sign-Off Pipeline**
- Must tag affected active tasks (or confirm bypass) before approval is enabled
- Approvals trigger notifications to all tagged junior assignees

### Senior Architect
- Supervises juniors, reviews submitted drafts
- Drops **coordinate pin annotations** on the CAD canvas
- Proposes changes bundled as Review Packages
- Notified when a junior sets a task to `Review`

### Junior Architect
- Creates drawing drafts, manages assigned CAD/drafting tasks
- Kanban board: `pending → in_progress → review → completed`
- Sets `Blocked` status to escalate blockers (triggers a dashboard warning)
- Drag-and-drop deliverable uploads auto-reset document to `pending_review`

### Administrator
- Full read access to the immutable **audit ledger**
- **Reset Sandbox** button to restore mock seed data for testing

---

## Getting Started

### Prerequisites

- Node.js `>=18`
- A [Supabase](https://supabase.com) project with the schema applied

### 1. Clone & Install

```bash
git clone <repo-url>
cd architect-saas
npm install   # installs all workspaces (root, frontend, backend)
```

### 2. Configure the Database

Open the [Supabase SQL Editor](https://app.supabase.com) and run:

```bash
# Paste the full contents of schema.sql — this creates tables and seeds mock data
```

### 3. Configure Environment Variables

**Backend** — create `backend/.env` from the example:

```bash
cp backend/.env.example backend/.env
```

```env
PORT=5000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

**Frontend** — create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 4. Run the Development Servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Login Accounts

The seed data ships with these ready-to-use personas:

| Name | Email | Role |
|---|---|---|
| Sarah Jenkins | `sarah.jenkins@spatialdesign.com` | Principal |
| David Miller | `david.miller@spatialdesign.com` | Senior |
| Elena Rostova | `elena.rostova@spatialdesign.com` | Senior |
| Alex Rivers | `alex.rivers@spatialdesign.com` | Junior |
| Liam Chen | `liam.chen@spatialdesign.com` | Junior |
| Admin User | `admin@spatialdesign.com` | Admin |

> No passwords are required in sandbox mode — just select a persona to log in.

---

## REST API Reference

Base URL: `http://localhost:5000`

### Users
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users` | List all firm staff & roles |
| `POST` | `/api/users` | Create a new user profile |

### Projects
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a new project |
| `PATCH` | `/api/projects/:id/status` | Update project status |
| `GET` | `/api/projects/members` | Fetch project membership records |
| `POST` | `/api/projects/members/assign` | Re-assign team rosters |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks` | Fetch all tasks |
| `POST` | `/api/tasks` | Create & assign a task |
| `PATCH` | `/api/tasks/:id/status` | Update task status |
| `DELETE` | `/api/tasks/:id` | Delete a task |

### Documents & Versioning
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/documents` | List all documents |
| `POST` | `/api/documents` | Create a document entry |
| `GET` | `/api/documents/versions` | List all version files |
| `POST` | `/api/documents/versions` | Register a new revision |
| `PATCH` | `/api/documents/:id/version` | Update active version pointer |
| `GET` | `/api/documents/reviews` | List reviews & pin annotations |
| `POST` | `/api/documents/reviews` | Create review with coordinate pins |
| `GET` | `/api/documents/approvals` | List document sign-offs |
| `POST` | `/api/documents/approvals` | Create a drawing approval |
| `GET` | `/api/documents/tags` | List task-to-approval dependencies |
| `POST` | `/api/documents/tags` | Register task tags on approval |

### System
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | Fetch in-app notification logs |
| `GET` | `/api/audit-logs` | Fetch append-only activity trail |
| `GET` | `/api/health` | Backend health check |

---

## Deployment

**Live Demo URL**: [https://architect-saas.vercel.app/](https://architect-saas.vercel.app/)

### Frontend — Vercel

```bash
cd frontend
npx vercel --prod
```

Set `NEXT_PUBLIC_API_URL` to your deployed backend URL in the Vercel project settings.

### Backend — Render

A `backend/render.yaml` is included. Connect the `backend/` directory to a new Render Web Service and set `SUPABASE_URL` and `SUPABASE_KEY` in environment variables.

---

## Roadmap & Known Improvements

| Area | Status | Recommendation |
|---|---|---|
| **Real-time sync** | Polling | Implement Supabase Realtime Subscriptions on `notifications`, `tasks`, `doc_reviews` |
| **True CAD support** | SVG mocks | Add DXF/DWG parser or cloud PDF-to-vector worker |
| **Row Level Security** | Disabled (sandbox) | Enable RLS policies scoped to each role before production |
| **Workspace refactor** | Monolithic | Split `workspace/[id]/page.tsx` (~52KB) into `CadCanvas`, `RevisionSelector`, `ApprovalPanel`, `TaskDependencyGraph` components |

---

## License

This project is private. All rights reserved.

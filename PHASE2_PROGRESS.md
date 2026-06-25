# Phase 2 Progress & Future Roadmap

This document outlines the milestones completed during **Phase 2** of the Architectural SaaS ERP project and details the required future actions to transition the platform into production.

---

## 🏆 Completed in Phase 2

We focused on building role-based collaboration workflows, migrating to a monorepo setup, resolving Vercel cloud deployment bottlenecks, and creating a fully offline-ready local simulator.

### 1. Advanced RBAC & Role Management
* **Dynamic Role Swapping**: Implemented a patch API (`PATCH /api/users/:id/role`) and frontend actions in `authStore` to allow admins to modify user roles dynamically.
* **Access Control Panels**: Designed a high-fidelity **User Directory & Access Control** panel inside the Settings dashboard (only visible to admins) with real-time save loaders and status badges.
* **Safety Lockout**: Added self-demotion lockout checks to prevent logged-in admins from accidentally demoting themselves and locking themselves out of administrative privileges.

### 2. Connected Drawing Vault Workflows
* **Direct Task Redirection**: Replaced the basic task upload form with a redirect link that opens the **Drawing Vault** tab and pre-populates the upload form with active project and task metadata.
* **Coordinate-Based Annotation Pins**: Allowed reviewers to click directly on uploaded blueprint drawings to place coordinate-based revision markers, specifying comments at precise locations.
* **Automatic Task Promotion**: Tagging task dependencies during a blueprint's approval automatically transitions the status of all tagged junior tasks to `review` and alerts supervisors.

### 3. Vercel Cloud Serverless Deployment
* **Monorepo Workspaces**: Structured root-level `package.json` with npm workspaces to consolidate dependencies and resolve cross-import builds.
* **Zero-Config Routing**: Renamed and configured `vercel.json` routing configurations to export Express `app` functions for serverless invocation.
* **Read-Only Filesystem Fixes**: Routed `multer` uploads to operating-system temp folders (`os.tmpdir()`) to prevent `ENOENT` filesystem crashes on read-only serverless containers, with mock fallback links.
* **Native Build Bindings**: Locked target-native platforms (`lightningcss-linux-x64-gnu` and `@tailwindcss/oxide-linux-x64-gnu`) in `optionalDependencies` to resolve Vercel build failures.

### 4. Virtual Sandbox Mode (Local-First Engine)
* **API Interception**: Intercepted outgoing REST calls in `dbStore` to return `null` immediately when Sandbox Mode is active.
* **Mock Schema Seeding**: Programmed a seed generator mapping `schema.sql` tables (Helix Cultural Center, Zenith Mixed-Use Towers, tasks, and drawings) in the client's browser.
* **LocalStorage Synchronization**: Serialized and persisted all local state mutations (creating projects, tasks, reviews, approvals, comments) to `localStorage` in real-time.
* **Reactive Mode Switching**: Bound state subscriptions to re-initialize stores instantly when toggling the Virtual Sandbox toggle on the login page.

---

## 🔮 Future Actions (Roadmap)

To prepare this platform for enterprise usage, the following implementations are recommended:

### 1. Cloud Storage Integration (Supabase Storage / S3)
* **Current State**: Drawing files are stored in server temp directories (which disappear when serverless containers recycle) or fall back to mock blueprint assets.
* **Action Required**: Integrate **Supabase Storage Buckets** or **AWS S3** so that drawings uploaded by juniors are permanently stored in secure, cloud-based object storage.

### 2. Real-Time WebSockets / Subscriptions
* **Current State**: Users must manually refresh the page or wait for state loads to see newly uploaded drawings or markup notifications.
* **Action Required**: Integrate Supabase PostgreSQL Realtime subscriptions or a Socket.io WebSocket server so notifications and coordinate markup pins sync instantly on the screen as other team members work.

### 3. Enhanced Drawing Viewer & Tools
* **Current State**: Markers are placed at basic X/Y coordinates on a static JPEG/PNG drawing preview.
* **Action Required**: Expand the canvas tool to support:
  * Vector PDF rendering (using `pdfjs-dist`).
  * Pan and zoom controls for large blueprints.
  * Different marker categories (e.g. Red for structural issues, Blue for annotations, Green for approval notes).

### 4. Database Schema Migration pipeline
* **Current State**: SQL schema changes must be manually pasted and run in the Supabase SQL editor.
* **Action Required**: Set up an ORM or migration engine (like Prisma or Knex) to manage schema versions programmatically and automate deployments.

### 5. Automation Testing Suite
* **Current State**: Workflows are verified via manual checklist walkthroughs.
* **Action Required**: Write:
  * **Playwright/Cypress** end-to-end tests verifying the complete junior-to-lead upload-approval flow.
  * **Jest** unit tests checking auth role enforcement boundaries.

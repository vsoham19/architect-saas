-- -------------------------------------------------------------
-- SAAS ERP DATABASE SCHEMA & SEED DATA
-- Copy and paste this script directly into the Supabase SQL Editor
-- -------------------------------------------------------------

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up existing tables and enums (Optional/Safe teardown)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS approval_task_tags CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS doc_approvals CASCADE;
DROP TABLE IF EXISTS doc_reviews CASCADE;
DROP TABLE IF EXISTS doc_versions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS system_role CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS project_role CASCADE;
DROP TYPE IF EXISTS doc_type CASCADE;
DROP TYPE IF EXISTS version_status CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;

-- Create Custom Database Enums
CREATE TYPE system_role AS ENUM ('admin', 'principal', 'senior', 'junior');
CREATE TYPE project_status AS ENUM ('upcoming', 'ongoing', 'completed', 'archived');
CREATE TYPE project_role AS ENUM ('principal', 'senior', 'junior');
CREATE TYPE doc_type AS ENUM ('drawing', 'specification', 'report', 'dwg', 'pdf');
CREATE TYPE version_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'review', 'completed', 'blocked');
CREATE TYPE notification_type AS ENUM ('peer_change', 'task_updated', 'approval_required', 'project_update');

-- 1. Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  system_role system_role NOT NULL DEFAULT 'junior',
  avatar_url VARCHAR(2083),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'ongoing',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Project Members
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_role project_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);

-- 4. Documents Table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  doc_type doc_type NOT NULL DEFAULT 'dwg',
  current_version_id UUID, -- References doc_versions(id). Added as FK constraint below
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Document Versions Table
CREATE TABLE doc_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  revision_number INT NOT NULL,
  file_url VARCHAR(2083) NOT NULL,
  file_size INT NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Apply cyclic foreign key constraint for current_version_id in documents
ALTER TABLE documents 
ADD CONSTRAINT fk_documents_current_version 
FOREIGN KEY (current_version_id) REFERENCES doc_versions(id) ON DELETE SET NULL;

-- 6. Document Reviews Table
CREATE TABLE doc_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES doc_versions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status version_status NOT NULL DEFAULT 'pending',
  comment TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Document Approvals Table
CREATE TABLE doc_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES doc_versions(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  tagging_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  no_tasks_affected BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tasks Table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Approval Task Tags Table
CREATE TABLE approval_task_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_id UUID NOT NULL REFERENCES doc_approvals(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tagged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  approval_id UUID REFERENCES doc_approvals(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Audit Log Table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(255) NOT NULL,
  entity_id UUID,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================
-- SEED DATA PRE-POPULATION
-- =============================================================

-- Seed User Profiles (Static UUIDs for consistency)
INSERT INTO users (id, email, full_name, system_role, avatar_url) VALUES
('00000000-0000-0000-0000-000000000001', 'sarah.jenkins@spatialdesign.com', 'Sarah Jenkins', 'principal', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
('00000000-0000-0000-0000-000000000002', 'david.miller@spatialdesign.com', 'David Miller', 'senior', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
('00000000-0000-0000-0000-000000000003', 'elena.rostova@spatialdesign.com', 'Elena Rostova', 'senior', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'),
('00000000-0000-0000-0000-000000000004', 'alex.rivers@spatialdesign.com', 'Alex Rivers', 'junior', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'),
('00000000-0000-0000-0000-000000000005', 'liam.chen@spatialdesign.com', 'Liam Chen', 'junior', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'),
('00000000-0000-0000-0000-000000000006', 'admin@spatialdesign.com', 'Admin User', 'admin', 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?w=150');

-- Seed Mock Projects
INSERT INTO projects (id, name, description, status, created_by, start_date, end_date) VALUES
('11111111-1111-1111-1111-111111111111', 'The Helix Cultural Center', 'A 50,000 sq ft performing arts center featuring a parametric spiral facade, an 800-seat main auditorium, and sustainable rooftop gardens. Targeting LEED Gold certification.', 'ongoing', '00000000-0000-0000-0000-000000000001', '2026-02-10', '2027-12-31'),
('22222222-2222-2222-2222-222222222222', 'Zenith Mixed-Use Towers', 'Twin 30-story residential and commercial towers featuring sky-bridges, passive cooling architectural louvers, and integrated transit connection.', 'ongoing', '00000000-0000-0000-0000-000000000001', '2026-03-01', '2028-06-30'),
('33333333-3333-3333-3333-333333333333', 'Apex Waterfront Villa', 'Luxury net-zero residential project built over a cliff edge. Features cantilevered concrete slabs, smart home energy grids, and custom water harvesting.', 'upcoming', '00000000-0000-0000-0000-000000000001', '2026-05-15', '2027-08-30');

-- Seed Project Members
INSERT INTO project_members (project_id, user_id, project_role) VALUES
-- Helix Project members
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'principal'),
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 'senior'),
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000004', 'junior'),
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000005', 'junior'),
-- Zenith Project members
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'principal'),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000003', 'senior'),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000004', 'junior');

-- Seed Mock Tasks
INSERT INTO tasks (id, project_id, assigned_to, assigned_by, title, description, status, due_date) VALUES
('99999999-9999-9999-9999-999999999001', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Model parametric facade spiral subdivisions', 'Generate the subdivisions of the outer glass spiral facade structure. Ensure panels match manufacturing dimensions and check structural loading joints.', 'in_progress', '2026-06-15'),
('99999999-9999-9999-9999-999999999002', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Prepare final fire exit calculations report', 'Calculate egress timings for the auditorium lobby under peak occupancy. Report exit width ratios in accordance with municipal code Part 4.', 'pending', '2026-06-25'),
('99999999-9999-9999-9999-999999999003', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Model sky-bridge support strut links', 'Detail the high-tensile steel connection nodes at Level 15 skybridge interface. Requires FEA stress plots.', 'in_progress', '2026-06-12');

-- Seed Mock Documents
INSERT INTO documents (id, project_id, title, doc_type, created_by) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddd01', '11111111-1111-1111-1111-111111111111', 'Helix Auditorium Floor Plan.dwg', 'dwg', '00000000-0000-0000-0000-000000000004'),
('dddddddd-dddd-dddd-dddd-dddddddddd02', '11111111-1111-1111-1111-111111111111', 'Helix Facade Detail Scheme.pdf', 'pdf', '00000000-0000-0000-0000-000000000002');

-- Seed Document Versions
INSERT INTO doc_versions (id, document_id, revision_number, file_url, file_size, change_summary, created_by) VALUES
('vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvv01', 'dddddddd-dddd-dddd-dddd-dddddddddd01', 1, '/drawings/helix_auditorium_v1.jpg', 14205800, 'Initial upload of structural layout and seating lines.', '00000000-0000-0000-0000-000000000004'),
('vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvv02', 'dddddddd-dddd-dddd-dddd-dddddddddd02', 1, '/drawings/helix_facade_v1.jpg', 8900400, 'Initial design facade framing details approved by client.', '00000000-0000-0000-0000-000000000002');

-- Link current version back to documents
UPDATE documents SET current_version_id = 'vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvv01' WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddd01';
UPDATE documents SET current_version_id = 'vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvv02' WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddd02';

-- Disable Row Level Security (RLS) on all tables for public sandbox access
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE doc_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE doc_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE doc_approvals DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE approval_task_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;


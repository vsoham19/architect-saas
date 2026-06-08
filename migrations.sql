-- -------------------------------------------------------------
-- SAAS ERP DATABASE MIGRATIONS - PHASE 2 AI DRAWING ANALYSIS
-- Copy and paste this script directly into the Supabase SQL Editor
-- -------------------------------------------------------------

-- 1. Add columns to existing doc_versions table
ALTER TABLE doc_versions
ADD COLUMN IF NOT EXISTS ai_generated_summary text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS drawing_data jsonb DEFAULT NULL;

-- 2. Create drawing_elements table
CREATE TABLE IF NOT EXISTS drawing_elements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id uuid NOT NULL REFERENCES doc_versions(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  element_type varchar NOT NULL,
  label text,
  confidence_score float CHECK (confidence_score >= 0 AND confidence_score <= 1),
  raw_gemini_output jsonb,
  created_at timestamptz DEFAULT now()
);

-- 3. Create ai_diff_log table
CREATE TABLE IF NOT EXISTS ai_diff_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  from_version_id uuid REFERENCES doc_versions(id) ON DELETE SET NULL,
  to_version_id uuid NOT NULL REFERENCES doc_versions(id) ON DELETE CASCADE,
  elements_added jsonb DEFAULT '[]',
  elements_removed jsonb DEFAULT '[]',
  elements_modified jsonb DEFAULT '[]',
  suggested_affected_tasks jsonb DEFAULT '[]',
  gemini_prompt_sent text,
  gemini_raw_response text,
  parsed_summary text,
  model_used varchar DEFAULT 'gemini-1.5-flash',
  created_at timestamptz DEFAULT now()
);

-- 4. Create canvas_pins table
CREATE TABLE IF NOT EXISTS canvas_pins (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES doc_versions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  x_percent float NOT NULL CHECK (x_percent >= 0 AND x_percent <= 100),
  y_percent float NOT NULL CHECK (y_percent >= 0 AND y_percent <= 100),
  note text NOT NULL,
  pin_type varchar NOT NULL DEFAULT 'review_comment',
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES users(id) DEFAULT NULL,
  resolved_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- 5. Disable Row Level Security (RLS) for public sandbox consistency
-- (To match the rest of the database tables in schema.sql)
ALTER TABLE drawing_elements DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_diff_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_pins DISABLE ROW LEVEL SECURITY;

-- 6. Add attached_version_id column to tasks table for Junior deliverables
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attached_version_id UUID REFERENCES doc_versions(id) ON DELETE SET NULL;

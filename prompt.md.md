# Feature Prompt: AI Drawing Analysis Layer
## Architect SaaS Platform — Phase 2 AI Extension

---

## Context

This is an existing SaaS ERP for architecture firms built on:
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS + Zustand + TanStack Query
- **Backend:** Node.js Express REST API (port 5000)
- **Database:** Supabase (PostgreSQL) with existing RLS policies
- **Existing workspace:** `/dashboard/workspace/[id]` — architects upload drawings manually as image files (PNG, JPG, PDF exports). No canvas drawing is done inside the app.

Do NOT add any in-app drawing or canvas editing tools. Drawings are always uploaded files.

---

## Objective

When an architect uploads a new drawing version, the system must:

1. Send the uploaded drawing image to **Google Gemini 1.5 Flash** (vision model)
2. Extract all identifiable architectural elements from the drawing
3. Compare with the previous version's extracted elements to detect what changed
4. Generate a structured AI summary of those changes
5. Suggest which junior tasks may be affected by the detected changes
6. Store all of this in the database — never discard AI output

---

## Database Changes Required

Add the following tables to the existing Supabase schema. Do NOT modify any existing tables except `doc_versions` where one column is added.

### 1. Add column to existing `doc_versions` table

```sql
ALTER TABLE doc_versions
ADD COLUMN ai_generated_summary text DEFAULT NULL;
```

This stores the final human-readable summary Gemini generates for this version.
It is nullable — if Gemini fails or times out, the upload must NOT be blocked.

---

### 2. New table: `drawing_elements`

Stores every architectural element Gemini detects in a drawing version.
One row per detected element per version.

```sql
CREATE TABLE drawing_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES doc_versions(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  element_type varchar NOT NULL,
  -- e.g. 'wall', 'column', 'room', 'door', 'window',
  --      'staircase', 'dimension_label', 'hvac_duct',
  --      'electrical_trace', 'fire_escape_route', 'annotation'
  label text,
  -- Human-readable label Gemini assigned e.g. "Load-bearing column - Grid A3"
  confidence_score float CHECK (confidence_score >= 0 AND confidence_score <= 1),
  -- Gemini's confidence in this detection (0.0 to 1.0)
  raw_gemini_output jsonb,
  -- Full raw JSON from Gemini for this element, stored for debugging
  created_at timestamptz DEFAULT now()
);
```

---

### 3. New table: `ai_diff_log`

Stores the full AI diff comparison between two consecutive drawing versions.
One row per version-to-version comparison.

```sql
CREATE TABLE ai_diff_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  from_version_id uuid REFERENCES doc_versions(id) ON DELETE SET NULL,
  -- NULL if this is the first version (no previous to compare against)
  to_version_id uuid NOT NULL REFERENCES doc_versions(id) ON DELETE CASCADE,
  elements_added jsonb DEFAULT '[]',
  -- Array of element labels that appear in new version but not in old
  elements_removed jsonb DEFAULT '[]',
  -- Array of element labels that were in old version but not in new
  elements_modified jsonb DEFAULT '[]',
  -- Array of elements that exist in both but appear changed
  suggested_affected_tasks jsonb DEFAULT '[]',
  -- Array of task IDs from the tasks table that AI suggests may be affected
  -- Format: [{ "task_id": "uuid", "reason": "string", "confidence": float }]
  gemini_prompt_sent text,
  -- Full prompt text sent to Gemini — stored for audit and prompt tuning
  gemini_raw_response text,
  -- Raw text response from Gemini before parsing
  parsed_summary text,
  -- Clean human-readable summary extracted from Gemini response
  model_used varchar DEFAULT 'gemini-1.5-flash',
  created_at timestamptz DEFAULT now()
);
```

---

### 4. New table: `canvas_pins`

Persists coordinate pin annotations dropped by seniors and principals on the drawing viewer.
These already exist in the UI but are not being saved to the database.

```sql
CREATE TABLE canvas_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES doc_versions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  x_percent float NOT NULL CHECK (x_percent >= 0 AND x_percent <= 100),
  y_percent float NOT NULL CHECK (y_percent >= 0 AND y_percent <= 100),
  -- Store as percentage of image dimensions, not raw pixels
  -- This makes pins position-stable when the viewer resizes
  note text NOT NULL,
  pin_type varchar NOT NULL DEFAULT 'review_comment',
  -- Allowed values: 'review_comment' | 'approval_note' | 'dimension_ref' | 'conflict_flag'
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES users(id) DEFAULT NULL,
  resolved_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);
```

**RLS policy:** Seniors and principals can INSERT and UPDATE. Juniors can SELECT only on their own project's documents.

---

## Backend Changes Required

### New API Endpoints

Add these routes to the existing Express server. Follow the existing route file structure.

---

#### `POST /api/documents/versions` — MODIFY EXISTING

After the new version record is created and saved, trigger the AI analysis pipeline **asynchronously**. Do NOT await it before responding to the client. The upload response must return immediately. AI runs in the background.

```
Response (immediate): { success: true, version_id: "uuid" }
AI pipeline: runs async after response is sent
```

---

#### `GET /api/ai/drawing-elements/:version_id`

Returns all detected elements for a specific drawing version.

Response:
```json
{
  "version_id": "uuid",
  "elements": [
    {
      "id": "uuid",
      "element_type": "column",
      "label": "Load-bearing column - Grid A3",
      "confidence_score": 0.94
    }
  ]
}
```

---

#### `GET /api/ai/diff/:document_id`

Returns the latest diff log entry for a document (most recent version comparison).

Response:
```json
{
  "document_id": "uuid",
  "from_version": 2,
  "to_version": 3,
  "elements_added": ["Emergency exit door - East Wing"],
  "elements_removed": ["Partition wall - Room 204"],
  "elements_modified": ["HVAC duct routing - Floor 2"],
  "suggested_affected_tasks": [
    {
      "task_id": "uuid",
      "reason": "Task references partition wall in Room 204 which was removed",
      "confidence": 0.81
    }
  ],
  "parsed_summary": "Version 3 removes the Room 204 partition wall and reroutes HVAC ducting on Floor 2. An emergency exit door has been added to the East Wing.",
  "model_used": "gemini-1.5-flash"
}
```

---

#### `POST /api/canvas/pins`

Saves a coordinate pin annotation to the database.

Request body:
```json
{
  "document_id": "uuid",
  "version_id": "uuid",
  "x_percent": 42.5,
  "y_percent": 67.1,
  "note": "Enlarge load-bearing column here",
  "pin_type": "review_comment"
}
```

---

#### `GET /api/canvas/pins/:version_id`

Returns all pins for a specific drawing version.

---

#### `PATCH /api/canvas/pins/:pin_id/resolve`

Marks a pin as resolved. Sets `resolved_by` to current user and `resolved_at` to now.

---

## Gemini Integration — Exact Pipeline

Use the `@google/generative-ai` npm package.

### Step 1: Element Extraction Prompt

When a new version is uploaded, send the drawing image to Gemini with this prompt:

```
You are analyzing an architectural floor plan drawing.

Identify and list every distinct architectural element visible in this drawing.

For each element return a JSON array. Each item must have:
- "element_type": one of [wall, load_bearing_wall, column, room, door, window, staircase, elevator, dimension_label, hvac_duct, electrical_trace, fire_escape_route, annotation, toilet, sink, furniture_outline, parking_space, structural_beam, curtain_wall, ramp, other]
- "label": a specific human-readable description including location if visible (e.g. "Load-bearing column at Grid A3", "Room 204 - Conference Room")
- "confidence": a float between 0.0 and 1.0

Return ONLY a valid JSON array. No explanation, no markdown, no preamble.
Example: [{"element_type":"column","label":"Load-bearing column at Grid B2","confidence":0.95}]
```

Parse the response as JSON. If parsing fails, store the raw response in `gemini_raw_response` and set `ai_generated_summary` to null. Do NOT crash.

---

### Step 2: Diff and Summary Prompt

After extracting elements for the new version, fetch the previous version's elements from `drawing_elements` table. Then send a second Gemini request (text only, no image needed for this step):

```
You are an architectural project assistant.

A drawing has been updated from version {from_version_number} to version {to_version_number}.

Previous version elements:
{JSON.stringify(previousElements)}

New version elements:
{JSON.stringify(newElements)}

Do three things:

1. Identify elements ADDED (in new, not in previous)
2. Identify elements REMOVED (in previous, not in new)
3. Identify elements likely MODIFIED (same type, similar label, but appears changed)

Then write a concise professional summary of what changed (2-4 sentences, plain English, no bullet points).

Return a JSON object with this exact shape:
{
  "elements_added": ["label string", ...],
  "elements_removed": ["label string", ...],
  "elements_modified": ["label string", ...],
  "summary": "Plain English summary here."
}

Return ONLY valid JSON. No markdown, no explanation.
```

---

### Step 3: Task Suggestion Prompt

After the diff is computed, fetch all active tasks for this project from the `tasks` table where `status != 'done'`. Send a third Gemini request:

```
You are reviewing changes to an architectural drawing and checking which active tasks may be affected.

Drawing changes detected:
- Added: {elements_added}
- Removed: {elements_removed}  
- Modified: {elements_modified}

Active tasks on this project:
{tasks.map(t => `ID: ${t.id} | Title: ${t.title} | Description: ${t.description}`).join('\n')}

For each task that is likely affected by these drawing changes, return a JSON array with:
- "task_id": the exact task ID string
- "reason": one sentence explaining why this task is affected
- "confidence": float 0.0 to 1.0

Only include tasks where confidence is above 0.5.
If no tasks are affected return an empty array [].

Return ONLY a valid JSON array. No markdown, no explanation.
```

Store the result in `ai_diff_log.suggested_affected_tasks`.

---

## Frontend Changes Required

### 1. Drawing Workspace — Pin Persistence

**File:** `frontend/app/dashboard/workspace/[id]/page.tsx`

Currently pins are dropped on the canvas and stored only in local state. Change this:

- On pin drop: immediately `POST /api/canvas/pins` with x/y as percentage of image container dimensions
- On workspace load: `GET /api/canvas/pins/:version_id` and render existing pins on the drawing
- Add a resolve button on each pin popover — calls `PATCH /api/canvas/pins/:pin_id/resolve`
- Resolved pins render with reduced opacity (0.4) and a checkmark icon, not hidden

---

### 2. Drawing Workspace — AI Analysis Panel

Add a collapsible right-side panel in the workspace view. This is a NEW panel, do not modify existing layout components.

Panel sections (top to bottom):

**Section A — Elements Detected**
- Heading: "AI Detected Elements"
- Fetched from `GET /api/ai/drawing-elements/:version_id`
- Group by `element_type`, show count per group
- Example: "Columns (4) · Rooms (12) · Doors (8)"
- Show confidence score as a subtle percentage next to each element label
- Loading state: skeleton rows
- Empty state: "No elements detected yet" with a refresh icon

**Section B — Version Changes**
- Heading: "What Changed in This Version"
- Fetched from `GET /api/ai/diff/:document_id`
- Show three subsections: Added (green), Removed (red), Modified (amber)
- Below that, show `parsed_summary` as a paragraph in muted text
- If `from_version_id` is null (first version): show "This is the first version — no previous version to compare."

**Section C — Affected Tasks (AI Suggestions)**
- Heading: "Possibly Affected Tasks"
- Subtitle: "AI suggestions only — not confirmed"
- List suggested tasks from `suggested_affected_tasks`
- Each row: task title + reason text + confidence badge
- This panel is READ ONLY. It does not auto-tag tasks.
- The actual tagging still happens manually in the approval gate as designed.

---

### 3. Version Upload Flow — AI Status Indicator

When a new version is uploaded:
- Show a small status badge on the version entry: "AI Analysis: Processing..."
- Poll `GET /api/ai/drawing-elements/:version_id` every 5 seconds
- When elements appear, update badge to "AI Analysis: Complete"
- If after 60 seconds no elements appear, show "AI Analysis: Unavailable" — do not show an error, Gemini may be rate-limited

---

## Critical Rules — Do Not Violate

1. **Never block a drawing upload waiting for Gemini.** AI runs async. Upload succeeds first, always.
2. **Never auto-tag tasks based on AI suggestions.** The approval gate manual tagging flow is unchanged. AI suggestions are advisory only.
3. **Store raw Gemini responses always.** Even on parse failure, `gemini_raw_response` must be populated.
4. **Pins use percentage coordinates, not pixels.** This ensures they are stable across screen sizes.
5. **Do not refactor the workspace page.** Scope is additive only — add the AI panel and pin persistence. The existing 52KB page is not in scope for refactoring in this phase.
6. **Gemini API key must be in environment variables only.** Never hardcoded, never exposed to frontend.

---

## Environment Variables to Add

```
GEMINI_API_KEY=your_google_ai_studio_key_here
GEMINI_MODEL=gemini-1.5-flash
```

Get the API key from: https://aistudio.google.com/app/apikey

---

## Package to Install

```bash
npm install @google/generative-ai
```

Add to the backend `package.json` only. Not the frontend.

---

## Acceptance Criteria

- [ ] Uploading a new drawing version triggers Gemini element extraction without blocking the upload response
- [ ] Extracted elements are stored in `drawing_elements` table per version
- [ ] A diff is computed and stored in `ai_diff_log` whenever a second or later version exists
- [ ] AI-suggested affected tasks are stored in `ai_diff_log.suggested_affected_tasks`
- [ ] Canvas pins dropped in the workspace are saved to DB and restored on page load
- [ ] Resolved pins show as faded with checkmark, not hidden
- [ ] AI Analysis panel is visible in workspace with correct data from API
- [ ] No drawing upload is ever blocked by Gemini failure
- [ ] Gemini API key is never exposed to the frontend or committed to version control

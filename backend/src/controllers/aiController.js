import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../db/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to resolve physical file path in developer environment
function resolveFilePath(fileUrl) {
  if (!fileUrl) return null;
  if (path.isAbsolute(fileUrl) && fs.existsSync(fileUrl)) {
    return fileUrl;
  }
  
  // Resolve relative to backend folder
  const backendPath = path.resolve(__dirname, '../../', fileUrl.replace(/^\//, ''));
  if (fs.existsSync(backendPath)) {
    return backendPath;
  }

  // Resolve relative to frontend public folder
  const frontendPath = path.resolve(__dirname, '../../../frontend/public', fileUrl.replace(/^\//, ''));
  if (fs.existsSync(frontendPath)) {
    return frontendPath;
  }

  // Resolve inside drawings folder of frontend public
  const drawingsPath = path.resolve(__dirname, '../../../frontend/public/drawings', path.basename(fileUrl));
  if (fs.existsSync(drawingsPath)) {
    return drawingsPath;
  }
  return null;
}

// Get initialized Gemini API Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.gemini_api_key;
  if (!apiKey) {
    console.error("Gemini Error: GEMINI_API_KEY environment variable is not defined.");
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

// Asynchronous Background AI Analysis Pipeline
export const runAiAnalysisPipeline = async (version) => {
  const genAI = getGeminiClient();
  if (!genAI) {
    console.warn("AI Pipeline Aborted: Missing Gemini API Key.");
    return;
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const model = genAI.getGenerativeModel({ model: modelName });
  
  const docId = version.document_id;
  const versionId = version.id;
  const fileUrl = version.file_url;
  
  console.log(`[AI Pipeline] Starting background analysis for version ${version.revision_number} of doc ${docId}`);

  let drawingElements = [];
  let step1Raw = '';

  // --- STEP 1: ELEMENT EXTRACTION (VISION MODEL) ---
  try {
    const resolvedPath = resolveFilePath(fileUrl);
    if (!resolvedPath) {
      throw new Error(`Drawing file not found on server disk: ${fileUrl}`);
    }

    const imageBuffer = fs.readFileSync(resolvedPath);
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: "image/jpeg"
      }
    };

    const step1Prompt = `You are analyzing an architectural floor plan drawing.

Identify and list every distinct architectural element visible in this drawing.

For each element return a JSON array. Each item must have:
- "element_type": one of [wall, load_bearing_wall, column, room, door, window, staircase, elevator, dimension_label, hvac_duct, electrical_trace, fire_escape_route, annotation, toilet, sink, furniture_outline, parking_space, structural_beam, curtain_wall, ramp, other]
- "label": a specific human-readable description including location if visible (e.g. "Load-bearing column at Grid A3", "Room 204 - Conference Room")
- "confidence": a float between 0.0 and 1.0

Return ONLY a valid JSON array. No explanation, no markdown, no preamble.
Example: [{"element_type":"column","label":"Load-bearing column at Grid B2","confidence":0.95}]`;

    const response = await model.generateContent([
      step1Prompt,
      imagePart
    ], {
      generationConfig: { responseMimeType: "application/json" }
    });

    step1Raw = response.response.text();
    const cleanedJson = step1Raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    drawingElements = JSON.parse(cleanedJson);

    if (Array.isArray(drawingElements)) {
      // Insert elements in drawing_elements table
      const insertRows = drawingElements.map(el => ({
        version_id: versionId,
        document_id: docId,
        element_type: el.element_type,
        label: el.label,
        confidence_score: el.confidence || 1.0,
        raw_gemini_output: el
      }));

      if (insertRows.length > 0) {
        const { error } = await supabase.from('drawing_elements').insert(insertRows);
        if (error) throw error;
      }
      console.log(`[AI Pipeline] Successfully stored ${insertRows.length} extracted elements in DB.`);
    } else {
      throw new Error("Gemini response did not evaluate to a valid JSON array.");
    }

  } catch (err) {
    console.error("[AI Pipeline] Step 1 Element Extraction failed:", err.message);
    
    // Create diff log reflecting failure so the UI has trace records
    await supabase.from('ai_diff_log').insert({
      document_id: docId,
      to_version_id: versionId,
      parsed_summary: `AI analysis unavailable - Extraction error: ${err.message}`,
      gemini_raw_response: step1Raw || err.message,
      model_used: modelName
    });
    return; // Stop the pipeline
  }

  // --- STEP 2: DIFF & SUMMARY ---
  let diffData = {
    elements_added: [],
    elements_removed: [],
    elements_modified: [],
    summary: "This is the first version — no previous version to compare."
  };
  let step2Raw = '';
  let step2Prompt = '';
  let fromVersionId = null;

  try {
    // Check if a previous revision exists in DB
    const { data: prevVersions, error: prevVerErr } = await supabase
      .from('doc_versions')
      .select('id, revision_number')
      .eq('document_id', docId)
      .lt('revision_number', version.revision_number)
      .order('revision_number', { ascending: false })
      .limit(1);

    if (prevVerErr) throw prevVerErr;

    if (prevVersions && prevVersions.length > 0) {
      const prevVer = prevVersions[0];
      fromVersionId = prevVer.id;
      
      // Fetch elements from previous version
      const { data: prevElements, error: prevElErr } = await supabase
        .from('drawing_elements')
        .select('element_type, label, confidence_score')
        .eq('version_id', fromVersionId);

      if (prevElErr) throw prevElErr;

      const cleanPrevElements = (prevElements || []).map(e => ({
        element_type: e.element_type,
        label: e.label,
        confidence: e.confidence_score
      }));

      const cleanNewElements = drawingElements.map(e => ({
        element_type: e.element_type,
        label: e.label,
        confidence: e.confidence
      }));

      step2Prompt = `You are an architectural project assistant.

A drawing has been updated from version v${prevVer.revision_number}.0.0 to version v${version.revision_number}.0.0.

Previous version elements:
${JSON.stringify(cleanPrevElements)}

New version elements:
${JSON.stringify(cleanNewElements)}

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

Return ONLY valid JSON. No markdown, no explanation.`;

      const step2Response = await model.generateContent([step2Prompt], {
        generationConfig: { responseMimeType: "application/json" }
      });

      step2Raw = step2Response.response.text();
      const cleanedJson2 = step2Raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      diffData = JSON.parse(cleanedJson2);
      console.log("[AI Pipeline] Successfully generated comparison diff.");
    }

    // Update active version record with summary
    await supabase
      .from('doc_versions')
      .update({ ai_generated_summary: diffData.summary })
      .eq('id', versionId);

  } catch (err) {
    console.error("[AI Pipeline] Step 2 Comparison failed:", err.message);
    diffData.summary = `AI analysis unavailable - Comparison error: ${err.message}`;
    step2Raw = step2Raw || err.message;
  }

  // --- STEP 3: TASK SUGGESTIONS ---
  let taskSuggestions = [];
  let step3Raw = '';
  let step3Prompt = '';

  try {
    // Fetch document details to map its project_id
    const { data: docObj, error: docErr } = await supabase
      .from('documents')
      .select('project_id')
      .eq('id', docId)
      .single();

    if (docErr) throw docErr;

    // Fetch active tasks for the project
    const { data: activeTasks, error: taskErr } = await supabase
      .from('tasks')
      .select('id, title, description')
      .eq('project_id', docObj.project_id)
      .neq('status', 'completed');

    if (taskErr) throw taskErr;

    if (activeTasks && activeTasks.length > 0 && 
        (diffData.elements_added.length > 0 || diffData.elements_removed.length > 0 || diffData.elements_modified.length > 0)) {
      
      step3Prompt = `You are reviewing changes to an architectural drawing and checking which active tasks may be affected.

Drawing changes detected:
- Added: ${JSON.stringify(diffData.elements_added)}
- Removed: ${JSON.stringify(diffData.elements_removed)}  
- Modified: ${JSON.stringify(diffData.elements_modified)}

Active tasks on this project:
${activeTasks.map(t => `ID: ${t.id} | Title: ${t.title} | Description: ${t.description}`).join('\n')}

For each task that is likely affected by these drawing changes, return a JSON array with:
- "task_id": the exact task ID string
- "reason": one sentence explaining why this task is affected
- "confidence": float 0.0 to 1.0

Only include tasks where confidence is above 0.5.
If no tasks are affected return an empty array [].

Return ONLY a valid JSON array. No markdown, no explanation.`;

      const step3Response = await model.generateContent([step3Prompt], {
        generationConfig: { responseMimeType: "application/json" }
      });

      step3Raw = step3Response.response.text();
      const cleanedJson3 = step3Raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      taskSuggestions = JSON.parse(cleanedJson3);
      console.log(`[AI Pipeline] Successfully identified ${taskSuggestions.length} affected tasks.`);
    }

  } catch (err) {
    console.error("[AI Pipeline] Step 3 Task suggestion failed:", err.message);
    step3Raw = step3Raw || err.message;
  }

  // --- WRITE THE FINAL DIFF LOG ---
  try {
    const { error } = await supabase
      .from('ai_diff_log')
      .insert({
        document_id: docId,
        from_version_id: fromVersionId,
        to_version_id: versionId,
        elements_added: diffData.elements_added || [],
        elements_removed: diffData.elements_removed || [],
        elements_modified: diffData.elements_modified || [],
        suggested_affected_tasks: taskSuggestions || [],
        gemini_prompt_sent: step2Prompt || 'Initial version - no comparison prompt sent.',
        gemini_raw_response: step2Raw || 'Initial version - no comparison response.',
        parsed_summary: diffData.summary,
        model_used: modelName
      });

    if (error) throw error;
    console.log("[AI Pipeline] Successfully stored final ai_diff_log entry in Supabase.");
  } catch (err) {
    console.error("[AI Pipeline] Failed to write to ai_diff_log:", err.message);
  }
};

// API: Get elements list for a version
export const getDrawingElements = async (req, res, next) => {
  try {
    const { version_id } = req.params;
    console.log(`[getDrawingElements] Fetching elements for version_id: "${version_id}"`);
    const { data, error } = await supabase
      .from('drawing_elements')
      .select('id, element_type, label, confidence_score')
      .eq('version_id', version_id);

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", success: true, data });
  } catch (err) {
    next(err);
  }
};

// API: Get latest diff comparison for a document
export const getLatestDiff = async (req, res, next) => {
  try {
    const { document_id } = req.params;
    console.log(`[getLatestDiff] Fetching latest diff for document_id: "${document_id}"`);

    
    const { data: diffs, error } = await supabase
      .from('ai_diff_log')
      .select('*')
      .eq('document_id', document_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message || JSON.stringify(error));
    if (!diffs || diffs.length === 0) {
      return res.status(200).json({ status: "success", success: true, data: null });
    }

    const diff = diffs[0];
    
    // Resolve from/to version numbers
    let from_version = null;
    let to_version = null;

    if (diff.from_version_id) {
      const { data: fVer } = await supabase
        .from('doc_versions')
        .select('revision_number')
        .eq('id', diff.from_version_id)
        .single();
      if (fVer) from_version = fVer.revision_number;
    }

    if (diff.to_version_id) {
      const { data: tVer } = await supabase
        .from('doc_versions')
        .select('revision_number')
        .eq('id', diff.to_version_id)
        .single();
      if (tVer) to_version = tVer.revision_number;
    }

    res.status(200).json({
      status: "success",
      success: true,
      data: {
        document_id: diff.document_id,
        from_version,
        to_version,
        elements_added: diff.elements_added,
        elements_removed: diff.elements_removed,
        elements_modified: diff.elements_modified,
        suggested_affected_tasks: diff.suggested_affected_tasks,
        parsed_summary: diff.parsed_summary,
        model_used: diff.model_used
      }
    });
  } catch (err) {
    next(err);
  }
};

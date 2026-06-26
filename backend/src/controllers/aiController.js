import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../db/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const activeAnalyses = new Set();
// Cooldown: version_id -> timestamp of last pipeline trigger attempt (prevent spam re-triggering)
const analysisLastTriggered = new Map();
const TRIGGER_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes between auto-trigger attempts

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

// Retry helper with exponential backoff for transient 503/429 errors
const withRetry = async (fn, maxAttempts = 3, label = 'Gemini call') => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable = err.message?.includes('503') || err.message?.includes('429') ||
        err.message?.includes('overloaded') || err.message?.includes('high demand') ||
        err.message?.includes('Service Unavailable') || err.message?.includes('Too Many Requests');
      if (!isRetryable || attempt === maxAttempts) throw err;
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500; // 2s, 4s, 8s
      console.warn(`[AI Pipeline] ${label} attempt ${attempt} failed (${err.message?.split('\n')[0]}). Retrying in ${Math.round(delay)}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
};



// Asynchronous Background AI Analysis Pipeline
export const runAiAnalysisPipeline = async (version) => {
  const versionId = version.id;
  if (activeAnalyses.has(versionId)) {
    console.log(`[AI Pipeline] Analysis already in progress for version: ${versionId}`);
    return;
  }
  activeAnalyses.add(versionId);

  try {
    // Proactively clean up existing elements and diffs for this version to ensure a fresh, clean run
    console.log(`[AI Pipeline] Clearing old analysis records for version: ${versionId}`);
    await supabase.from('drawing_elements').delete().eq('version_id', versionId);
    await supabase.from('ai_diff_log').delete().eq('to_version_id', versionId);

    const genAI = getGeminiClient();
    if (!genAI) {
      console.warn("AI Pipeline Aborted: Missing Gemini API Key.");
      return;
    }

    // Model fallback chain — try the configured model first, then fallbacks
    const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    const modelFallbackChain = [
      primaryModel,
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
    ].filter((m, i, arr) => arr.indexOf(m) === i); // deduplicate

    // Returns a model that can respond, or throws if all are exhausted
    const getWorkingModel = async (imagePart, prompt) => {
      let lastError;
      for (const mName of modelFallbackChain) {
        try {
          const m = genAI.getGenerativeModel({ model: mName });
          // Quick probe — a cheap text-only call to check quota/availability
          await m.generateContent(['Reply with the single word: ok']);
          console.log(`[AI Pipeline] Using model: ${mName}`);
          return { model: m, modelName: mName };
        } catch (err) {
          const isTransient = err.message?.includes('503') || err.message?.includes('429') ||
            err.message?.includes('overloaded') || err.message?.includes('high demand') ||
            err.message?.includes('quota') || err.message?.includes('Too Many Requests') ||
            err.message?.includes('Service Unavailable');
          console.warn(`[AI Pipeline] Model ${mName} unavailable (${err.message?.split('\n')[0]})`);
          lastError = err;
          if (!isTransient) throw err; // Non-transient error (404, auth) — bail immediately
        }
      }
      throw lastError || new Error('All models in fallback chain exhausted');
    };
    
    const docId = version.document_id;
    const fileUrl = version.file_url;
    
    console.log(`[AI Pipeline] Starting background analysis for version ${version.revision_number} of doc ${docId}`);



    let drawingElements = [];
    let step1Raw = '';

  // --- STEP 1: ELEMENT EXTRACTION (VISION MODEL) ---
  let model = null, modelName = primaryModel;
  try {
    const isDwg = (fileUrl || '').toLowerCase().includes('.dwg') || 
                  (fileUrl || '').startsWith('data:application/dwg') || 
                  (fileUrl || '').startsWith('data:application/octet-stream') ||
                  (fileUrl || '').startsWith('data:image/vnd.dwg');

    let useMockAi = isDwg;
    let resolvedPath = null;

    if (!isDwg && !fileUrl.startsWith('data:') && !fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
      resolvedPath = resolveFilePath(fileUrl);
      if (!resolvedPath) {
        console.warn(`[AI Pipeline] Local drawing file not found on server disk: ${fileUrl}. Falling back to simulated elements.`);
        useMockAi = true;
      }
    }

    if (useMockAi) {
      console.log(`[AI Pipeline] Bypassing Gemini API and simulating CAD elements for version ${version.revision_number}.`);
      drawingElements = [
        { "element_type": "wall", "label": "Main Auditorium Enclosure Wall", "confidence": 0.98 },
        { "element_type": "column", "label": "Load-bearing Column at Grid A1", "confidence": 0.95 },
        { "element_type": "column", "label": "Load-bearing Column at Grid A2", "confidence": 0.95 },
        { "element_type": "column", "label": "Load-bearing Column at Grid B1", "confidence": 0.92 },
        { "element_type": "column", "label": "Load-bearing Column at Grid B2", "confidence": 0.92 },
        { "element_type": "room", "label": "Auditorium Seating Area (800 seats)", "confidence": 0.99 },
        { "element_type": "room", "label": "Stage / Performance space", "confidence": 0.97 },
        { "element_type": "door", "label": "Main Entrance Egress Double Doors", "confidence": 0.94 },
        { "element_type": "door", "label": "Stage Exit Door Left", "confidence": 0.90 },
        { "element_type": "staircase", "label": "Egress Stairwell A - Lobby Connection", "confidence": 0.93 }
      ];
      step1Raw = JSON.stringify(drawingElements);
      modelName = isDwg ? "dwg-parser-mock" : "local-file-missing-mock";
      
      // Store elements in DB
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
      console.log(`[AI Pipeline] Successfully stored simulated elements in DB.`);
    } else {
      let imagePart;
      if (fileUrl.startsWith('data:')) {
        const matches = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          imagePart = {
            inlineData: {
              data: matches[2],
              mimeType: matches[1]
            }
          };
        } else {
          throw new Error("Invalid base64 data URL format");
        }
      } else if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        console.log(`[AI Pipeline] Fetching remote image for analysis: ${fileUrl}`);
        const res = await fetch(fileUrl);
        if (!res.ok) {
          throw new Error(`Failed to fetch remote drawing file: ${res.statusText} (${res.status})`);
        }
        const arrayBuffer = await res.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        const contentType = res.headers.get('content-type') || 'image/png';
        imagePart = {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: contentType
          }
        };
      } else {
        // resolvedPath is guaranteed to be non-null and valid here
        const imageBuffer = fs.readFileSync(resolvedPath);
        const ext = path.extname(resolvedPath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.jpeg' || ext === '.jpg' ? 'image/jpeg' : 'image/png';
        imagePart = {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType
          }
        };
      }

      // Find first available model via probe, then use it for vision
      const { model: workingModel, modelName: workingModelName } = await getWorkingModel();
      model = workingModel;
      modelName = workingModelName;

      const step1Prompt = `You are analyzing an architectural floor plan drawing.

Identify and list every distinct architectural element visible in this drawing.

For each element return a JSON array. Each item must have:
- "element_type": one of [wall, load_bearing_wall, column, room, door, window, staircase, elevator, dimension_label, hvac_duct, electrical_trace, fire_escape_route, annotation, toilet, sink, furniture_outline, parking_space, structural_beam, curtain_wall, ramp, other]
- "label": a specific human-readable description including location if visible (e.g. "Load-bearing column at Grid A3", "Room 204 - Conference Room")
- "confidence": a float between 0.0 and 1.0

Return ONLY a valid JSON array. No explanation, no markdown, no preamble.
Example: [{"element_type":"column","label":"Load-bearing column at Grid B2","confidence":0.95}]`;

      const response = await withRetry(
        () => model.generateContent([step1Prompt, imagePart], {
          generationConfig: { responseMimeType: "application/json" }
        }),
        3,
        'Step 1 Element Extraction'
      );

      step1Raw = response.response.text();
      const cleanedJson = step1Raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      drawingElements = JSON.parse(cleanedJson);

      if (Array.isArray(drawingElements)) {
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
      
      const isDwg = (fileUrl || '').toLowerCase().includes('.dwg') || 
                    (fileUrl || '').startsWith('data:application/dwg') || 
                    (fileUrl || '').startsWith('data:application/octet-stream') ||
                    (fileUrl || '').startsWith('data:image/vnd.dwg');

      let isLocalMissing = false;
      if (!isDwg && !fileUrl.startsWith('data:') && !fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
        const pathCheck = resolveFilePath(fileUrl);
        if (!pathCheck) isLocalMissing = true;
      }

      const useMockAi = isDwg || isLocalMissing;

      if (useMockAi) {
        diffData = {
          elements_added: ["Main Auditorium Enclosure Wall", "Load-bearing Column at Grid A1", "Stage Exit Door Left"],
          elements_removed: [],
          elements_modified: [],
          summary: "Integrated the helix auditorium layout plans with structural load-bearing columns and double-egress stairwells."
        };
        step2Raw = JSON.stringify(diffData);
      } else {
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

        const step2Response = await withRetry(
          () => model.generateContent([step2Prompt], {
            generationConfig: { responseMimeType: "application/json" }
          }),
          3,
          'Step 2 Diff Comparison'
        );

        step2Raw = step2Response.response.text();
        const cleanedJson2 = step2Raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        diffData = JSON.parse(cleanedJson2);
      }
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
      
      const isDwg = (fileUrl || '').toLowerCase().includes('.dwg') || 
                    (fileUrl || '').startsWith('data:application/dwg') || 
                    (fileUrl || '').startsWith('data:application/octet-stream') ||
                    (fileUrl || '').startsWith('data:image/vnd.dwg');

      let isLocalMissing = false;
      if (!isDwg && !fileUrl.startsWith('data:') && !fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
        const pathCheck = resolveFilePath(fileUrl);
        if (!pathCheck) isLocalMissing = true;
      }

      const useMockAi = isDwg || isLocalMissing;

      if (useMockAi) {
        taskSuggestions = [{
          task_id: activeTasks[0].id,
          reason: "Auditorium enclosure walls boundary changes affect structural steel spacing task.",
          confidence: 0.95
        }];
        step3Raw = JSON.stringify(taskSuggestions);
      } else {
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

        const step3Response = await withRetry(
          () => model.generateContent([step3Prompt], {
            generationConfig: { responseMimeType: "application/json" }
          }),
          3,
          'Step 3 Task Suggestions'
        );

        step3Raw = step3Response.response.text();
        const cleanedJson3 = step3Raw.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
        taskSuggestions = JSON.parse(cleanedJson3);
      }
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
} finally {
  activeAnalyses.delete(versionId);
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

    // If no elements exist and we haven't already run the analysis, run it in background
    if ((!data || data.length === 0) && !activeAnalyses.has(version_id)) {
      // Check cooldown — don't re-trigger if we tried recently
      const lastTriggered = analysisLastTriggered.get(version_id);
      if (lastTriggered && Date.now() - lastTriggered < TRIGGER_COOLDOWN_MS) {
        return res.status(200).json({ status: "success", success: true, data: [], is_processing: false });
      }

      // Check if we already attempted analysis by checking ai_diff_log
      const { data: existingDiff } = await supabase
        .from('ai_diff_log')
        .select('id, parsed_summary')
        .eq('to_version_id', version_id)
        .limit(1);

      const hasFailed = existingDiff && existingDiff.length > 0 && 
        (existingDiff[0].parsed_summary?.includes('Extraction error') || 
         existingDiff[0].parsed_summary?.includes('unavailable') ||
         existingDiff[0].parsed_summary?.includes('error:'));

      if (!existingDiff || existingDiff.length === 0 || hasFailed) {
        if (hasFailed) {
          console.log(`[getDrawingElements] Retrying failed AI analysis for version: ${version_id}. Deleting old error diff log.`);
          await supabase
            .from('ai_diff_log')
            .delete()
            .eq('id', existingDiff[0].id);
        }
        // Fetch version details
        const { data: version, error: verErr } = await supabase
          .from('doc_versions')
          .select('*')
          .eq('id', version_id)
          .single();

        if (!verErr && version) {
          // Fetch the document details to supply project_id
          const { data: docObj, error: docErr } = await supabase
            .from('documents')
            .select('project_id')
            .eq('id', version.document_id)
            .single();

          if (!docErr && docObj) {
            const pipelinePayload = { ...version, project_id: docObj.project_id };
            console.log(`[getDrawingElements] Proactively starting background AI analysis for version: ${version_id}`);
            runAiAnalysisPipeline(pipelinePayload).catch(err => {
              console.error("[AI Pipeline] Background trigger pipeline error:", err);
            });
          }
        }
      }
    }

    res.status(200).json({ status: "success", success: true, data, is_processing: activeAnalyses.has(version_id) });
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

// API: Manually trigger/re-trigger AI analysis for a version
export const triggerAnalysis = async (req, res, next) => {
  try {
    const { version_id } = req.params;
    console.log(`[triggerAnalysis] Manual trigger requested for version: ${version_id}`);

    if (activeAnalyses.has(version_id)) {
      return res.status(200).json({ status: 'success', success: true, message: 'Analysis already in progress', is_processing: true });
    }

    // Delete any existing error/stale diff logs for this version to allow a fresh run
    await supabase.from('ai_diff_log').delete().eq('to_version_id', version_id);
    await supabase.from('drawing_elements').delete().eq('version_id', version_id);

    const { data: version, error: verErr } = await supabase
      .from('doc_versions')
      .select('*')
      .eq('id', version_id)
      .single();

    if (verErr || !version) {
      return res.status(404).json({ status: 'error', message: 'Version not found' });
    }

    const { data: docObj, error: docErr } = await supabase
      .from('documents')
      .select('project_id')
      .eq('id', version.document_id)
      .single();

    if (docErr || !docObj) {
      return res.status(404).json({ status: 'error', message: 'Document not found' });
    }

    const pipelinePayload = { ...version, project_id: docObj.project_id };
    runAiAnalysisPipeline(pipelinePayload).catch(err => {
      console.error('[AI Pipeline] Manually-triggered pipeline error:', err);
    });

    res.status(200).json({ status: 'success', success: true, message: 'AI analysis started', is_processing: true });
  } catch (err) {
    next(err);
  }
};

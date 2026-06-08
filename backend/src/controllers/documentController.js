import { supabase } from '../db/supabase.js';
import { runAiAnalysisPipeline } from './aiController.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Documents
export const getDocuments = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*');
    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const createDocument = async (req, res, next) => {
  try {
    const { id, project_id, title, doc_type, created_by } = req.body;
    const { data, error } = await supabase
      .from('documents')
      .insert({ id, project_id, title, doc_type, created_by })
      .select()
      .single();
    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const updateDocumentVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { current_version_id } = req.body;
    const { data, error } = await supabase
      .from('documents')
      .update({ current_version_id })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

// Versions
export const getDocVersions = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('doc_versions')
      .select('*');
    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const createDocVersion = async (req, res, next) => {
  try {
    const { id, document_id, revision_number, file_url, file_size, change_summary, created_by } = req.body;
    
    // Fetch project_id dynamically to supply to the background pipeline
    const { data: docObj, error: docErr } = await supabase
      .from('documents')
      .select('project_id')
      .eq('id', document_id)
      .single();
      
    if (docErr) throw new Error(docErr.message || JSON.stringify(docErr));

    const { data, error } = await supabase
      .from('doc_versions')
      .insert({ id, document_id, revision_number, file_url, file_size, change_summary, created_by })
      .select()
      .single();
    if (error) throw new Error(error.message || JSON.stringify(error));
    
    // Respond immediately with standard data block and success properties
    res.status(201).json({ 
      status: "success", 
      success: true, 
      version_id: data.id, 
      data 
    });

    // Run AI pipeline asynchronously
    const pipelinePayload = { ...data, project_id: docObj.project_id };
    runAiAnalysisPipeline(pipelinePayload).catch(err => {
      console.error("[AI Pipeline] Asynchronous background pipeline error:", err);
    });
  } catch (err) {
    next(err);
  }
};

// Reviews
export const getDocReviews = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('doc_reviews')
      .select('*');
    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const createDocReview = async (req, res, next) => {
  try {
    const { id, document_id, version_id, reviewer_id, status, comment } = req.body;
    const { data, error } = await supabase
      .from('doc_reviews')
      .insert({ id, document_id, version_id, reviewer_id, status, comment })
      .select()
      .single();
    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

// Approvals
export const getDocApprovals = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('doc_approvals')
      .select('*');
    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const createDocApproval = async (req, res, next) => {
  try {
    const { id, document_id, version_id, approved_by, tagging_confirmed, no_tasks_affected } = req.body;
    const { data, error } = await supabase
      .from('doc_approvals')
      .insert({ id, document_id, version_id, approved_by, tagging_confirmed, no_tasks_affected })
      .select()
      .single();
    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

// Task tags
export const getApprovalTaskTags = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('approval_task_tags')
      .select('*');
    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const createApprovalTaskTags = async (req, res, next) => {
  try {
    const tags = req.body; // array of tags
    const { data, error } = await supabase
      .from('approval_task_tags')
      .insert(tags)
      .select();
    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

// Upload drawing file (creates version or updates existing one)
export const uploadDrawing = async (req, res, next) => {
  try {
    const { document_id, filename, base64Data, changelog, created_by, version_id } = req.body;
    console.log(`[uploadDrawing] Request received for filename: "${filename}", document_id: "${document_id}", version_id: "${version_id || 'new version'}"`);
    if (!document_id || !filename || !base64Data) {
      return res.status(400).json({ status: "error", message: "Missing required fields: document_id, filename, base64Data" });
    }

    // Decode base64
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let imageBuffer;
    if (matches && matches.length === 3) {
      imageBuffer = Buffer.from(matches[2], 'base64');
    } else {
      imageBuffer = Buffer.from(base64Data, 'base64');
    }

    // Generate safe filename
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const safeFilename = `${Date.now()}_${cleanFilename}`;

    // Target path in frontend/public/drawings
    const targetDir = path.resolve(__dirname, '../../../frontend/public/drawings');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetPath = path.join(targetDir, safeFilename);
    fs.writeFileSync(targetPath, imageBuffer);

    const fileUrl = `/drawings/${safeFilename}`;
    const fileSize = imageBuffer.length;

    let targetVersion;

    if (version_id) {
      // Update existing version
      const { data: updatedVersion, error: updateErr } = await supabase
        .from('doc_versions')
        .update({
          file_url: fileUrl,
          file_size: fileSize,
          change_summary: changelog || undefined
        })
        .eq('id', version_id)
        .select()
        .single();
      if (updateErr) throw updateErr;
      targetVersion = updatedVersion;
    } else {
      // Insert new version
      const { data: versions, error: verCountErr } = await supabase
        .from('doc_versions')
        .select('revision_number')
        .eq('document_id', document_id);
      if (verCountErr) throw verCountErr;

      const revisionNumber = (versions?.length || 0) + 1;

      const { data: newVersion, error: insertErr } = await supabase
        .from('doc_versions')
        .insert({
          document_id,
          revision_number: revisionNumber,
          file_url: fileUrl,
          file_size: fileSize,
          change_summary: changelog || `Uploaded version v${revisionNumber}.0.0`,
          created_by,
          drawing_data: { strokes: [] }
        })
        .select()
        .single();
      
      if (insertErr) throw insertErr;
      targetVersion = newVersion;

      // Update document current version
      const { error: updateDocErr } = await supabase
        .from('documents')
        .update({ current_version_id: newVersion.id })
        .eq('id', document_id);

      if (updateDocErr) throw updateDocErr;
    }

    // Get project_id for AI analysis
    const { data: docObj, error: docErr } = await supabase
      .from('documents')
      .select('project_id')
      .eq('id', document_id)
      .single();

    if (!docErr && docObj) {
      // Run AI pipeline asynchronously
      const pipelinePayload = { ...targetVersion, project_id: docObj.project_id };
      runAiAnalysisPipeline(pipelinePayload).catch(err => {
        console.error("[AI Pipeline] Asynchronous background pipeline error for uploaded drawing:", err);
      });
    }

    res.status(201).json({
      status: "success",
      success: true,
      data: targetVersion,
      version_id: targetVersion.id
    });
  } catch (err) {
    next(err);
  }
};

// Update version drawing data (sketches/shapes)
export const updateVersionDrawingData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { drawing_data } = req.body;

    const { data, error } = await supabase
      .from('doc_versions')
      .update({ drawing_data })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", success: true, data });
  } catch (err) {
    next(err);
  }
};

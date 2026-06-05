import { supabase } from '../db/supabase.js';

// Documents
export const getDocuments = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*');
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const createDocVersion = async (req, res, next) => {
  try {
    const { id, document_id, revision_number, file_url, file_size, change_summary, created_by } = req.body;
    const { data, error } = await supabase
      .from('doc_versions')
      .insert({ id, document_id, revision_number, file_url, file_size, change_summary, created_by })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ status: "success", data });
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

import { supabase } from '../db/supabase.js';
import { v4 as uuidv4 } from 'uuid';

export const uploadTaskImage = async (req, res, next) => {
  try {
    const { id } = req.params; // task id
    const file = req.file;
    if (!file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }
    // Generate a new version id (attached_version_id)
    const attachedVersionId = uuidv4();

    // Convert file buffer to base64 Data URL
    const base64Data = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'image/png';
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    // Insert doc_versions record with base64 Data URL as file_url
    const { data: newVersion, error: verError } = await supabase
      .from('doc_versions')
      .insert({
        id: attachedVersionId,
        document_id: null, // no parent document, optional
        revision_number: 1,
        file_url: dataUrl,
        file_size: file.size,
        change_summary: 'Task image upload',
        created_by: req.headers['x-user-id'] || 'system',
        created_at: new Date().toISOString(),
        status: 'pending',
        drawing_data: { strokes: [] }
      })
      .select()
      .single();

    if (verError) throw new Error(verError.message || JSON.stringify(verError));

    // Update task with attached_version_id and status 'review'
    const { error: taskError } = await supabase
      .from('tasks')
      .update({ attached_version_id: attachedVersionId, status: 'review', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (taskError) throw new Error(taskError.message || JSON.stringify(taskError));

    return res.status(200).json({ status: 'success', attached_version_id: attachedVersionId, version: newVersion });
  } catch (err) {
    next(err);
  }
};

export const backtrackApproval = async (req, res, next) => {
  try {
    const { id } = req.params; // task id
    const { userId } = req.body; // principal performing backtrack
    // Reset task fields
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'pending', attached_version_id: null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message || JSON.stringify(error));
    return res.status(200).json({ status: 'success', message: 'Approval backtracked' });
  } catch (err) {
    next(err);
  }
};

// Existing exports remain unchanged
export const getTasks = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const { id, project_id, assigned_to, assigned_by, title, description, status, due_date } = req.body;
    const { data, error } = await supabase
      .from('tasks')
      .insert({ id, project_id, assigned_to, assigned_by, title, description, status, due_date })
      .select()
      .single();

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, description } = req.body;
    
    const updates = { status, updated_at: new Date().toISOString() };
    if (description !== undefined) {
      updates.description = description;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", message: "Task deleted successfully" });
  } catch (err) {
    next(err);
  }
};


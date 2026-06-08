import { supabase } from '../db/supabase.js';

export const getProjects = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const { id, name, description, status, created_by } = req.body;
    const { data, error } = await supabase
      .from('projects')
      .insert({ id, name, description, status, created_by })
      .select()
      .single();

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const updateProjectStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { data, error } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const getProjectMembers = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('project_members')
      .select('*');

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const assignProjectMembers = async (req, res, next) => {
  try {
    const { projectId, members } = req.body;
    
    // Delete existing members first
    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) throw new Error(deleteError.message || JSON.stringify(deleteError));

    if (members && members.length > 0) {
      const insertRows = members.map(m => ({
        project_id: projectId,
        user_id: m.userId,
        project_role: m.role
      }));

      const { data, error } = await supabase
        .from('project_members')
        .insert(insertRows)
        .select();

      if (error) throw new Error(error.message || JSON.stringify(error));
      res.status(200).json({ status: "success", data });
    } else {
      res.status(200).json({ status: "success", data: [] });
    }
  } catch (err) {
    next(err);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", message: "Project deleted successfully" });
  } catch (err) {
    next(err);
  }
};

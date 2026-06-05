import { supabase } from '../db/supabase.js';

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

import { supabase } from '../db/supabase.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const createAuditLog = async (req, res, next) => {
  try {
    const { id, actor_id, action, entity_type, entity_id, payload } = req.body;
    const { data, error } = await supabase
      .from('audit_log')
      .insert({ id, actor_id, action, entity_type, entity_id, payload })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

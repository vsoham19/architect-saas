import { supabase } from '../db/supabase.js';

export const getUsers = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw error;
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { id, email, full_name, system_role, avatar_url } = req.body;
    const { data, error } = await supabase
      .from('users')
      .insert({ id, email, full_name, system_role, avatar_url })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

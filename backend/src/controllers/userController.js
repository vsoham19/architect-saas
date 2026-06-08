import { supabase } from '../db/supabase.js';

export const getUsers = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw new Error(error.message || JSON.stringify(error));
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

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { system_role } = req.body;

    const validRoles = ['admin', 'principal', 'senior', 'junior'];
    if (!validRoles.includes(system_role)) {
      return res.status(400).json({ status: "error", message: "Invalid system role" });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ system_role })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};


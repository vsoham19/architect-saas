import { supabase } from '../db/supabase.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const createNotification = async (req, res, next) => {
  try {
    const { id, recipient_id, type, approval_id, task_id, message, is_read } = req.body;
    const { data, error } = await supabase
      .from('notifications')
      .insert({ id, recipient_id, type, approval_id, task_id, message, is_read })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .select();

    if (error) throw error;
    res.status(200).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

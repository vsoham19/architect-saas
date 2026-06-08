import { supabase } from '../db/supabase.js';

export const createPin = async (req, res, next) => {
  try {
    const { document_id, version_id, x_percent, y_percent, note, pin_type, created_by } = req.body;
    const creator = created_by || '00000000-0000-0000-0000-000000000001'; // Default to Sarah Jenkins if missing
    
    const { data, error } = await supabase
      .from('canvas_pins')
      .insert({
        document_id,
        version_id,
        x_percent,
        y_percent,
        note,
        pin_type: pin_type || 'review_comment',
        created_by: creator
      })
      .select()
      .single();

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(201).json({ status: "success", success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getPinsByVersion = async (req, res, next) => {
  try {
    const { version_id } = req.params;
    const { data, error } = await supabase
      .from('canvas_pins')
      .select('*')
      .eq('version_id', version_id)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", success: true, data });
  } catch (err) {
    next(err);
  }
};

export const resolvePin = async (req, res, next) => {
  try {
    const { pin_id } = req.params;
    const { resolved_by } = req.body;
    const resolver = resolved_by || '00000000-0000-0000-0000-000000000001'; // Default resolver
    
    const { data, error } = await supabase
      .from('canvas_pins')
      .update({
        resolved: true,
        resolved_by: resolver,
        resolved_at: new Date().toISOString()
      })
      .eq('id', pin_id)
      .select()
      .single();

    if (error) throw new Error(error.message || JSON.stringify(error));
    res.status(200).json({ status: "success", success: true, data });
  } catch (err) {
    next(err);
  }
};

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const rawUrl = process.env.SUPABASE_URL || '';
// Clean url by stripping trailing rest suffix
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn("Backend warning: SUPABASE_URL or SUPABASE_KEY environment variable is missing.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

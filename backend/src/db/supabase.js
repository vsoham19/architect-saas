import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv relative to the directory of this file (looks for .env at backend/.env)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const rawUrl = process.env.SUPABASE_URL || process.env.supabase_url || '';
// Clean url by stripping trailing rest suffix
const cleanedUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
// Fallback to placeholder if url is empty to prevent createClient throwing on startup
const supabaseUrl = cleanedUrl || 'https://placeholder-url.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.supabase_key || 'placeholder-key';

if (!rawUrl || !supabaseKey) {
  console.warn("Backend warning: SUPABASE_URL or SUPABASE_KEY environment variable is missing.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);


import { createClient } from '@supabase/supabase-js';

// Access environment variables safely
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Check if we have the configuration needed to start the cloud client
export const isCloudActive = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '');

// Export the client or null if not configured
export const supabase = isCloudActive 
    ? createClient(supabaseUrl!, supabaseAnonKey!) 
    : null;

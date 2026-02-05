import { createClient } from '@supabase/supabase-js';

// Access environment variables. VITE_ prefix is required for Vite-based projects.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isCloudConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create client only if configured to prevent runtime initialization errors
export const supabase = isCloudConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null as any;

if (!isCloudConfigured) {
    console.warn("Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing.");
}
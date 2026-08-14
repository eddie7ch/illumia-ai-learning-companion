import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True once real Supabase credentials are configured (see .env.example). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// The anon key is a public, RLS-restricted key by design — safe to ship to the browser.
// It is NOT the service_role key, which must never appear in client code.
// Row shapes are hand-typed in src/types/database.ts rather than passed as a generic here,
// since supabase-js's generic schema typing needs codegen from a live project to stay accurate.
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

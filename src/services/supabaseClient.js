import { createClient } from '@supabase/supabase-js';

// Browser-safe values only: the project URL and the *anon* (public) key.
// Never put the service_role key here.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const authConfigured = Boolean(url && key);
export const supabase = authConfigured ? createClient(url, key) : null;

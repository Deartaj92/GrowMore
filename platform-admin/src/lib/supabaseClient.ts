import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://seeeczoigcxwvpazfydj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZWVjem9pZ2N4d3ZwYXpmeWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNDQ0NTcsImV4cCI6MjA2NTYyMDQ1N30.r5IAvn9vGnIVsaxmHbyWsa7bMZ_Gju5QU2G3unvObqc';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to set auth context (for RLS) if needed
export const setAuthContext = async (userId: string) => {
  // Assuming an RPC exists in Supabase to set the auth context
  await supabase.rpc('set_auth_context', { uid: userId });
};

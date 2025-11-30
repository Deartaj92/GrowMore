import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://seeeczoigcxwvpazfydj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZWVjem9pZ2N4d3ZwYXpmeWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNDQ0NTcsImV4cCI6MjA2NTYyMDQ1N30.r5IAvn9vGnIVsaxmHbyWsa7bMZ_Gju5QU2G3unvObqc';

// Optimized Supabase client configuration for better performance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'school-app',
    },
  },
  // Enable connection pooling optimizations
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // Reduce default timeout for faster failure detection
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to set auth context
export const setAuthContext = async (username: string, password: string) => {
  const { data, error } = await supabase.rpc('set_auth_context', {
    username,
    password
  });
  if (error) throw error;
  return data;
}; 
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://seeeczoigcxwvpazfydj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZWVjem9pZ2N4d3ZwYXpmeWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNDQ0NTcsImV4cCI6MjA2NTYyMDQ1N30.r5IAvn9vGnIVsaxmHbyWsa7bMZ_Gju5QU2G3unvObqc';

// Custom fetch with connection optimization for WiFi networks
// WiFi routers often limit concurrent connections (50-100), so we need to optimize
const customFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  // Optimize options for connection reuse
  const optimizedOptions: RequestInit = {
    ...init,
    // Add keep-alive for connection reuse
    keepalive: true,
    // Reduce connection overhead
    cache: init?.cache || 'default',
  };

  return fetch(input, optimizedOptions);
};

// Optimized Supabase client configuration for better performance on WiFi networks
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'school-app',
      // Optimize for connection reuse
      'Connection': 'keep-alive',
    },
    // Use custom fetch to optimize connection handling
    fetch: customFetch,
  },
  // Enable connection pooling optimizations
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // Optimize realtime for WiFi networks
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    // Reduce WebSocket connection overhead
    heartbeatIntervalMs: 30000, // 30 seconds (default is 15s)
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
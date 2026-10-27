const fs = require('fs');

const content = `import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://onhaxcxntgqjahvulgar.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaGF4Y3hudGdxamFodnVsZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NDAyNDIsImV4cCI6MjEwODIxNjI0Mn0.Z5rZrrmTlJ9V69sJ5GNn7aEUrX2I_uT6njs0ARqxqAQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
`;

fs.writeFileSync('d:/newGrowMore/src/lib/supabase.ts', content, 'utf8');
console.log('Fixed supabase.ts successfully');

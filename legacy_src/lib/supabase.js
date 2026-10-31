import { createClient } from '@supabase/supabase-js';

// Default to user's active Supabase project (Project ID: qlqtujyhdbwmftogukh)
const DEFAULT_SUPABASE_URL = 'https://qlqtujyhdbwmftogukh.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFscXR1anloZGJ3bWZndG9ndWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMjU0NTAsImV4cCI6MjEwNDYwMTQ1MH0.YgFjtwzbv_dK7Hgul1fGuhMkRRkuL2_xKGExK_II7rU';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 40,
    },
  },
});

export const isSupabaseConfigured = () => !!supabase;

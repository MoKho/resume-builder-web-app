
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hyoklufqazdwqqbpqcwb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5b2tsdWZxYXpkd3FxYnBxY3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzkyMTYsImV4cCI6MjA3NDc1NTIxNn0.IKICi2An-R4-_5tpduLNpuKfeI4F2H3B_0IRJ4thIT8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

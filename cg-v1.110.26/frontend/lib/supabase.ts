
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables are missing! Realtime features will not work.');
}

// Create the client only if we have the URL, otherwise create a mock or throw a controlled error
// For now, we'll let it create but it might fail on calls if empty. 
// Supabase createClient might throw if URL is empty, so let's safeguard.

export const supabase = createClient(
    supabaseUrl || 'https://qqttugwxmkbnrgzgqbkz.supabase.co',
    supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxdHR1Z3d4bWtibnJnemdxYmt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzY1NDEsImV4cCI6MjA4MjY1MjU0MX0.JfzKDV-8yhW3ThFz1wHIXL2uJmjCl7yhS_R_yBt5pNE'
);

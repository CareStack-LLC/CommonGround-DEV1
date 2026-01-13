
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
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);

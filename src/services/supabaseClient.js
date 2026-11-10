import { createClient } from '@supabase/supabase-js';

// Vite only exposes variables that start with VITE_ to the browser.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

// The anon key is designed to be public. Security comes from Row Level Security (RLS),
// not from hiding this key. The service_role key must never be used here.
export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

// Quick check used by the connection test page. It asks Supabase Auth for its public
// settings, which only succeeds when the URL and anon key are both valid.
export async function testSupabaseConnection() {
  if (!supabaseConfigured) {
    return { ok: false, message: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env (restart npm run dev after editing).' };
  }
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } });
    if (!res.ok) return { ok: false, message: `Supabase answered ${res.status}. Check that the URL and anon key are correct.` };
    const settings = await res.json();
    return {
      ok: true,
      message: 'Connected to Supabase.',
      phoneLoginEnabled: Boolean(settings?.external?.phone),
      emailLoginEnabled: Boolean(settings?.external?.email),
    };
  } catch (err) {
    return { ok: false, message: 'Could not reach Supabase: ' + err.message };
  }
}
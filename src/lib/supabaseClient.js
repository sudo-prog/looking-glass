/**
 * LOOKING GLASS — Supabase Client Singleton
 *
 * Reads configuration from Vite env vars only:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *
 * NO secrets are hardcoded. The service_role key must NEVER be imported
 * into client code — RLS scopes all data to the authenticated user.
 *
 * The client is lazily created: if the env vars are missing (cloud sync not
 * configured) the singleton is `null` and all sync/auth code degrades
 * gracefully. We only throw a clear error if a caller actually tries to use
 * the client while it is unconfigured.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let _client = null;

if (isSupabaseConfigured) {
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

/** Returns the configured Supabase client, or null if not configured. */
export function getSupabaseClient() {
  return _client;
}

/**
 * Returns the configured client, throwing a clear error only when a caller
 * actually needs it but the environment is unset (e.g. user tried to log in).
 */
export function requireSupabaseClient() {
  if (!_client) {
    throw new Error(
      'Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are unset). ' +
      'Cloud sync is unavailable. The app continues to work fully local-first.'
    );
  }
  return _client;
}

export default _client;

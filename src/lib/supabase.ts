import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let supabaseClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(env.PUBLIC_SUPABASE_URL) &&
    env.PUBLIC_SUPABASE_URL !== 'https://mock-supabase.local' &&
    Boolean(env.PUBLIC_SUPABASE_ANON_KEY) &&
    env.PUBLIC_SUPABASE_ANON_KEY !== 'mock-anon-key'
  );
}

export function setSupabaseClient(client: SupabaseClient | null): void {
  supabaseClient = client;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  supabaseClient = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseClient;
}

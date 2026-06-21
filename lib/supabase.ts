import { type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

let browserClient: SupabaseClient | null = null;

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseBrowserClient() {
  if (!hasSupabaseEnv()) return null;

  if (!browserClient) {
    browserClient = createClient();
  }

  return browserClient;
}

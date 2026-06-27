import "server-only";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!adminKey) throw new Error("Missing server-only Supabase admin key (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY).");

export const supabaseAdmin = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  adminKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

import "server-only";
import { createClient } from "@/utils/supabase/server";

function adminEmails() {
  return String(process.env.CATALOG_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function canAccessCatalogAdmin() {
  if (process.env.NODE_ENV !== "production") return true;
  const allowed = adminEmails();
  if (!allowed.length) return false;
  const supabase = await createClient();
  if (!supabase) return false;
  const { data } = await supabase.auth.getUser();
  return Boolean(data.user?.email && allowed.includes(data.user.email.toLowerCase()));
}


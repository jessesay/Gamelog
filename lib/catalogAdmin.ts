import "server-only";
import { createClient } from "@/utils/supabase/server";

function adminEmails() {
  return String(process.env.BETA_ADMIN_EMAILS ?? process.env.CATALOG_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdminAccess() {
  const allowed = adminEmails();
  const supabase = await createClient();
  if (!supabase) return { allowed: false, signedIn: false, email: null };
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase() ?? null;
  return { allowed: Boolean(email && allowed.includes(email)), signedIn: Boolean(data.user), email };
}

export async function canAccessCatalogAdmin() {
  return (await getAdminAccess()).allowed;
}

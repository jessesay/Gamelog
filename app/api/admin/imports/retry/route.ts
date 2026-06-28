import { NextResponse } from "next/server";
import { canAccessCatalogAdmin } from "@/lib/catalogAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { safeServerError } from "@/lib/serverError";

export async function POST(request: Request) {
  if (!(await canAccessCatalogAdmin())) return NextResponse.json({ error: "Catalog admin access is not configured." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const requestedIds = Array.isArray(body?.errorIds)
    ? body.errorIds.map(Number).filter((id: number) => Number.isInteger(id) && id > 0).slice(0, 100)
    : [];

  let query = supabaseAdmin.from("catalog_import_errors").select("id, retry_count").eq("status", "failed").limit(100);
  if (requestedIds.length) query = query.in("id", requestedIds);
  const { data: errors, error } = await query;
  if (error) return NextResponse.json({ error: safeServerError(error, "Could not load failed imports.") }, { status: 500 });
  if (!errors?.length) return NextResponse.json({ queued: 0, message: "No failed imports are waiting for retry." });

  const now = new Date().toISOString();
  const updates = await Promise.all(errors.map((item) => supabaseAdmin
    .from("catalog_import_errors")
    .update({ status: "retrying", retry_count: Number(item.retry_count ?? 0) + 1, last_retry_at: now })
    .eq("id", item.id)));
  const updateError = updates.find((result) => result.error)?.error;
  if (updateError) return NextResponse.json({ error: safeServerError(updateError, "Could not queue import retries.") }, { status: 500 });

  return NextResponse.json({ queued: errors.length, message: `Queued ${errors.length} import ${errors.length === 1 ? "error" : "errors"}. Run pnpm run catalog:retry from a trusted worker.` });
}


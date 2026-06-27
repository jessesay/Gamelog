import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase?.auth.exchangeCodeForSession(code) ?? { error: new Error("Supabase is not configured.") };
    if (error) {
      const errorUrl = new URL("/app/profile", requestUrl.origin);
      errorUrl.searchParams.set("auth", "callback-error");
      return NextResponse.redirect(errorUrl);
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

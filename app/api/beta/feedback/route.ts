import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { safeServerError } from "@/lib/serverError";

const feedbackKinds = {
  bug: "Bug",
  idea: "Feature idea",
  confusion: "Other",
  praise: "Other",
} as const;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    // Quietly accept bot-filled honeypots without writing them.
    if (String(body.website ?? "").trim()) return NextResponse.json({ ok: true });

    const type = String(body.type ?? "") as keyof typeof feedbackKinds;
    const message = String(body.message ?? "").trim();
    const page = String(body.page ?? "").trim().slice(0, 500);
    const email = String(body.email ?? "").trim().slice(0, 254);
    if (!(type in feedbackKinds)) return NextResponse.json({ error: "Choose a feedback type." }, { status: 400 });
    if (message.length < 5) return NextResponse.json({ error: "Add a little more detail so we can act on it." }, { status: 400 });
    if (message.length > 4000) return NextResponse.json({ error: "Keep feedback under 4,000 characters." }, { status: 400 });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email or leave it blank." }, { status: 400 });

    const authClient = await createClient();
    const { data: authData } = authClient ? await authClient.auth.getUser() : { data: { user: null } };
    const user = authData.user;
    const { error } = await supabaseAdmin.from("beta_feedback").insert({
      user_id: user?.id ?? null,
      kind: feedbackKinds[type],
      body: message,
      target: type,
      contact: user ? null : email || null,
      page: page || null,
      app_version: "3.3.0",
      status: "new",
    });
    if (error) return NextResponse.json({ error: safeServerError(error, "Feedback could not be saved right now.") }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: safeServerError(error, "Feedback could not be saved right now.") }, { status: 500 });
  }
}

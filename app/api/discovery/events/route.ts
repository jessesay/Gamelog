import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { safeServerError } from "@/lib/serverError";

const allowedEvents = new Set(["save", "skip", "played", "want_to_play", "card_viewed", "signin_prompt_clicked"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const eventName = String(body?.event ?? "");
  const gameId = body?.gameId ? String(body.gameId) : null;
  const sessionId = String(body?.sessionId ?? "").slice(0, 128) || null;
  if (!allowedEvents.has(eventName) || (gameId && !uuidPattern.test(gameId))) {
    return NextResponse.json({ error: "Invalid discovery event." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ stored: false, signedIn: false });

  const { data: profile, error: profileError } = await supabase.from("profiles").select("id").eq("id", authData.user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: safeServerError(profileError, "Could not load your profile.") }, { status: 500 });
  if (!profile) return NextResponse.json({ stored: false, needsOnboarding: true }, { status: 202 });

  const { error } = await supabase.from("discovery_events").insert({
    user_id: authData.user.id,
    session_id: sessionId,
    game_id: gameId,
    event_name: eventName,
    metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
  });
  if (error) return NextResponse.json({ error: safeServerError(error, "Could not record discovery activity.") }, { status: 500 });
  return NextResponse.json({ stored: true });
}

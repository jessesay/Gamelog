import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { safeServerError } from "@/lib/serverError";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const allowedActions = new Set(["skipped", "liked", "saved", "played", "disliked"]);
const eventNames: Record<string, string> = {
  skipped: "skip",
  disliked: "skip",
  liked: "want_to_play",
  saved: "save",
  played: "played",
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const sessionId = String(body?.sessionId ?? "");
  const gameId = String(body?.gameId ?? "");
  const action = body?.action;

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!sessionId || sessionId.length > 128 || !uuidPattern.test(gameId) || !action) {
    return NextResponse.json(
      { error: "Missing or invalid sessionId, gameId, or action." },
      { status: 400 }
    );
  }

  if (!allowedActions.has(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = authData.user;

  // Guest discovery history stays on the device. This endpoint only persists
  // authenticated actions and their shelf side effects.
  if (!user || !supabase) {
    return NextResponse.json({ ok: true, signedIn: false, shelfSaved: false });
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("id, username").eq("id", user.id).maybeSingle();
  if (profileError) {
    return NextResponse.json({ error: safeServerError(profileError, "Could not load your profile.") }, { status: 500 });
  }

  const { error } = await supabaseAdmin.from("game_swipes").upsert(
    {
      session_id: sessionId,
      user_id: user.id,
      game_id: gameId,
      action,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "session_id,game_id",
    }
  );

  if (error) {
    return NextResponse.json({ error: safeServerError(error, "Could not save that swipe.") }, { status: 500 });
  }

  if (profile) {
    const { error: eventError } = await supabase.from("discovery_events").insert({
      user_id: user.id,
      session_id: sessionId,
      game_id: gameId,
      event_name: eventNames[action],
      metadata: { source: "discovery_feed" },
    });
    if (eventError) {
      return NextResponse.json({ error: safeServerError(eventError, "Could not record that discovery action.") }, { status: 500 });
    }
  }

  const shelfStatus = action === "saved" ? "Want to Play" : action === "liked" ? "Backlog" : action === "played" ? "Completed" : null;
  let shelfSaved = false;
  const needsOnboarding = Boolean(shelfStatus && !profile);

  if (profile && shelfStatus) {
    const { data: existing, error: existingError } = await supabase
      .from("game_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) {
      return NextResponse.json({ error: safeServerError(existingError, "Could not load your shelf.") }, { status: 500 });
    }

    const playedOn = shelfStatus === "Completed" ? new Date().toISOString().slice(0, 10) : null;
    const shelfQuery = existing?.id
      ? supabase.from("game_logs").update({ status: shelfStatus, played_on: playedOn }).eq("id", existing.id).eq("user_id", user.id)
      : supabase.from("game_logs").insert({ user_id: user.id, game_id: gameId, status: shelfStatus, played_on: playedOn });
    const { error: shelfError } = await shelfQuery;
    if (shelfError) {
      return NextResponse.json({ error: safeServerError(shelfError, "Could not add that game to your shelf.") }, { status: 500 });
    }

    shelfSaved = true;
    revalidatePath("/app/profile");
    revalidatePath("/backlog");
    revalidatePath(`/u/${profile.username}`);
  }

  return NextResponse.json({ ok: true, signedIn: Boolean(user), shelfSaved, shelfStatus, needsOnboarding });
}

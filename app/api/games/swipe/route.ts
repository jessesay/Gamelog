import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { safeServerError } from "@/lib/serverError";

export const runtime = "nodejs";

const allowedActions = new Set(["skipped", "liked", "saved", "played", "disliked"]);

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

  const { error } = await supabaseAdmin.from("game_swipes").upsert(
    {
      session_id: sessionId,
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

  return NextResponse.json({ ok: true });
}

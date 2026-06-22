import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const allowedActions = new Set(["liked", "disliked", "skipped", "saved"]);

export async function POST(request: NextRequest) {
  const body = await request.json();

  const sessionId = body.sessionId;
  const gameId = body.gameId;
  const action = body.action;

  if (!sessionId || !gameId || !action) {
    return NextResponse.json(
      { error: "Missing sessionId, gameId, or action" },
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

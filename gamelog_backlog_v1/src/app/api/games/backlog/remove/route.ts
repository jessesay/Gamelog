import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const sessionId = body.sessionId;
  const gameId = body.gameId;

  if (!sessionId || !gameId) {
    return NextResponse.json(
      { error: "Missing sessionId or gameId" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("game_swipes")
    .update({
      action: "skipped",
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("game_id", gameId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

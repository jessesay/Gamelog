import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing sessionId" },
      { status: 400 }
    );
  }

  const { data: swipes, error: swipeError } = await supabaseAdmin
    .from("game_swipes")
    .select("game_id, created_at")
    .eq("session_id", sessionId)
    .eq("action", "saved")
    .order("created_at", { ascending: false })
    .limit(200);

  if (swipeError) {
    return NextResponse.json({ error: swipeError.message }, { status: 500 });
  }

  const gameIds = swipes?.map((swipe) => swipe.game_id) ?? [];

  if (gameIds.length === 0) {
    return NextResponse.json({ games: [] });
  }

  const { data: games, error } = await supabaseAdmin
    .from("games")
    .select(
      "id, title, slug, cover_url, background_url, platforms, genres, tags, release_date, rating, metacritic, stores"
    )
    .in("id", gameIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const gameMap = new Map((games ?? []).map((game) => [game.id, game]));

  const orderedGames = gameIds
    .map((id) => gameMap.get(id))
    .filter(Boolean);

  return NextResponse.json({ games: orderedGames });
}

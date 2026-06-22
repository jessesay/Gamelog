import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const { data: swipes, error: swipeError } = await supabaseAdmin
    .from("game_swipes")
    .select("game_id")
    .eq("session_id", sessionId)
    .limit(2000);

  if (swipeError) {
    return NextResponse.json({ error: swipeError.message }, { status: 500 });
  }

  const swipedIds = swipes?.map((swipe) => swipe.game_id) ?? [];

  let query = supabaseAdmin
    .from("games")
    .select(
      "id, title, slug, cover_url, background_url, platforms, genres, tags, release_date, rating, metacritic, stores"
    )
    .not("cover_url", "is", null)
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(30);

  if (swipedIds.length > 0) {
    query = query.not("id", "in", `(${swipedIds.join(",")})`);
  }

  const { data: games, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ games: games ?? [] });
}

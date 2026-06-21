import { NextResponse } from "next/server";
import { IGDB_GAME_FIELDS, igdbPost, mapIgdbGame } from "@/lib/igdb";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.max(10, Math.min(Number(url.searchParams.get("limit") ?? "75") || 75, 100));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);

  try {
    const query = `
      fields ${IGDB_GAME_FIELDS};
      where cover != null & version_parent = null & total_rating_count > 10;
      sort total_rating_count desc;
      limit ${limit};
      offset ${offset};
    `;
    const results = await igdbPost("games", query);
    const games = (Array.isArray(results) ? results : []).map(mapIgdbGame).filter(Boolean);
    return NextResponse.json({ games, count: games.length, source: "IGDB", nextOffset: offset + limit });
  } catch (error) {
    return NextResponse.json(
      { games: [], error: error instanceof Error ? error.message : "IGDB popular import failed." },
      { status: 502 }
    );
  }
}

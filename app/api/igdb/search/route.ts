import { NextResponse } from "next/server";
import { escapeIgdbSearch, IGDB_GAME_FIELDS, igdbPost, mapIgdbGame } from "@/lib/igdb";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.max(5, Math.min(Number(url.searchParams.get("limit") ?? "30") || 30, 75));

  if (!q) {
    return NextResponse.json({ games: [], error: "Missing q search term." }, { status: 400 });
  }

  try {
    const query = `
      search "${escapeIgdbSearch(q)}";
      fields ${IGDB_GAME_FIELDS};
      where version_parent = null;
      limit ${limit};
    `;
    const results = await igdbPost("games", query);
    const games = (Array.isArray(results) ? results : []).map(mapIgdbGame).filter(Boolean);
    return NextResponse.json({ games, count: games.length, source: "IGDB" });
  } catch (error) {
    return NextResponse.json(
      { games: [], error: error instanceof Error ? error.message : "IGDB search failed." },
      { status: 502 }
    );
  }
}

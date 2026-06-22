import { NextResponse } from "next/server";
import { igdbPost, mapIgdbGame } from "@/lib/igdb";

export const runtime = "nodejs";

const TOP_CATALOG_FIELDS = [
  "id",
  "name",
  "slug",
  "summary",
  "storyline",
  "first_release_date",
  "cover.image_id",
  "cover.url",
  "genres.name",
  "platforms.name",
  "involved_companies.developer",
  "involved_companies.publisher",
  "involved_companies.company.name",
  "total_rating",
  "total_rating_count",
  "hypes",
  "follows",
  "url"
].join(",");

function scoreGame(game: any) {
  const totalRating = Number(game.total_rating ?? 0);
  const totalRatingCount = Number(game.total_rating_count ?? 0);
  const hypes = Number(game.hypes ?? 0);
  const follows = Number(game.follows ?? 0);
  const ratingPower = Math.log10(totalRatingCount + 1) * 34;
  const ratingQuality = totalRating ? totalRating * 0.28 : 0;
  const hypePower = Math.log10(hypes + 1) * 16;
  const followPower = Math.log10(follows + 1) * 13;
  return Math.round((ratingPower + ratingQuality + hypePower + followPower) * 100) / 100;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.max(25, Math.min(Number(url.searchParams.get("limit") ?? "250") || 250, 500));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0") || 0);
  const includeDlc = url.searchParams.get("includeDlc") === "true";
  const target = 10000;

  if (offset >= target) {
    return NextResponse.json({ games: [], count: 0, source: "IGDB", offset, nextOffset: offset, done: true, target });
  }

  try {
    const categoryClause = includeDlc ? "" : "& category = 0";
    const query = `
      fields ${TOP_CATALOG_FIELDS};
      where version_parent = null ${categoryClause} & cover != null;
      sort total_rating_count desc;
      limit ${Math.min(limit, target - offset)};
      offset ${offset};
    `;
    const results = await igdbPost("games", query);
    const games = (Array.isArray(results) ? results : [])
      .map((game: any, index: number) => {
        const mapped = mapIgdbGame(game);
        if (!mapped) return null;
        return {
          ...mapped,
          catalog_rank: offset + index + 1,
          catalog_score: scoreGame(game),
          igdb_total_rating: typeof game.total_rating === "number" ? Math.round(game.total_rating) : null,
          igdb_total_rating_count: typeof game.total_rating_count === "number" ? Math.round(game.total_rating_count) : 0,
          igdb_hypes: typeof game.hypes === "number" ? Math.round(game.hypes) : 0,
          igdb_follows: typeof game.follows === "number" ? Math.round(game.follows) : 0,
          catalog_imported_at: new Date().toISOString()
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      games,
      count: games.length,
      source: "IGDB",
      offset,
      nextOffset: offset + games.length,
      done: offset + games.length >= target || games.length === 0,
      target
    });
  } catch (error) {
    return NextResponse.json(
      { games: [], error: error instanceof Error ? error.message : "IGDB top catalog import failed." },
      { status: 502 }
    );
  }
}

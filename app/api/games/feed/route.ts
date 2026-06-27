import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { safeServerError } from "@/lib/serverError";

export const runtime = "nodejs";

type GameRow = {
  id: string;
  title: string;
  slug: string | null;
  source: string | null;
  source_url: string | null;
  description: string | null;
  summary: string | null;
  cover_url: string | null;
  background_url: string | null;
  platforms: string[] | null;
  genres: string[] | null;
  genre: string | null;
  tags: string[] | null;
  release_date: string | null;
  release_year: number | null;
  rating: number | null;
  metacritic: number | null;
  stores: unknown;
};

type SwipeRow = {
  action: string;
  game_id: string;
  games: GameRow | null;
};

const gameSelect = [
  "id",
  "title",
  "slug",
  "source",
  "source_url",
  "description",
  "summary",
  "cover_url",
  "background_url",
  "platforms",
  "genres",
  "genre",
  "tags",
  "release_date",
  "release_year",
  "rating",
  "metacritic",
  "stores",
].join(", ");

function normalize(value: string | null | undefined) {
  return String(value ?? "").toLowerCase().trim();
}

function addAll(target: Set<string>, values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = normalize(value);
    if (normalized) target.add(normalized);
  }
}

function traitsFor(game: GameRow | null | undefined) {
  const genres = new Set<string>();
  const tags = new Set<string>();
  const platforms = new Set<string>();
  const sources = new Set<string>();

  if (!game) return { genres, tags, platforms, sources };

  addAll(genres, [...(game.genres ?? []), game.genre]);
  addAll(tags, game.tags ?? []);
  addAll(platforms, game.platforms ?? []);
  addAll(sources, [game.source]);

  return { genres, tags, platforms, sources };
}

function overlapScore(values: Set<string>, likedValues: Set<string>, points: number) {
  let score = 0;
  for (const value of values) {
    if (likedValues.has(value)) score += points;
  }
  return score;
}

function scoreGame(game: GameRow, likedTraits: ReturnType<typeof traitsFor>, skippedIds: Set<string>) {
  const traits = traitsFor(game);
  let score = 0;

  // Simple recommendation logic:
  // - Liked and wishlisted games are treated as strong taste signals.
  // - Played games are useful but slightly weaker because they may include older history.
  // - Shared genre/source are strong boosts; tags/platforms add smaller explainable boosts.
  // - Skipped games are heavily penalized so they only come back in the fallback pool.
  score += overlapScore(traits.genres, likedTraits.genres, 8);
  score += overlapScore(traits.tags, likedTraits.tags, 4);
  score += overlapScore(traits.platforms, likedTraits.platforms, 3);
  score += overlapScore(traits.sources, likedTraits.sources, 5);
  score += Number(game.rating ?? 0);
  score += game.cover_url ? 2 : 0;

  if (skippedIds.has(game.id)) score -= 100;

  return score;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const limit = Math.max(1, Math.min(Number(searchParams.get("limit") ?? 24) || 24, 60));

  if (!sessionId || sessionId.length > 128) {
    return NextResponse.json({ error: "Missing or invalid sessionId." }, { status: 400 });
  }

  const { data: swipes, error: swipeError } = await supabaseAdmin
    .from("game_swipes")
    .select(`action, game_id, games(${gameSelect})`)
    .eq("session_id", sessionId)
    .limit(5000);

  if (swipeError) {
    return NextResponse.json({ error: safeServerError(swipeError, "Could not load your discovery history.") }, { status: 500 });
  }

  const swipeRows = (swipes ?? []) as unknown as SwipeRow[];
  const positiveActions = new Set(["liked", "saved", "played"]);
  const positiveGames = swipeRows
    .filter((swipe) => positiveActions.has(swipe.action))
    .map((swipe) => swipe.games)
    .filter(Boolean) as GameRow[];
  const skippedIds = new Set(
    swipeRows
      .filter((swipe) => swipe.action === "skipped" || swipe.action === "disliked")
      .map((swipe) => swipe.game_id)
      .filter(Boolean)
  );
  const blockedIds = swipeRows
    .filter((swipe) => swipe.action !== "skipped" && swipe.action !== "disliked")
    .map((swipe) => swipe.game_id)
    .filter(Boolean);

  const likedTraits = {
    genres: new Set<string>(),
    tags: new Set<string>(),
    platforms: new Set<string>(),
    sources: new Set<string>(),
  };

  for (const game of positiveGames) {
    const traits = traitsFor(game);
    addAll(likedTraits.genres, [...traits.genres]);
    addAll(likedTraits.tags, [...traits.tags]);
    addAll(likedTraits.platforms, [...traits.platforms]);
    addAll(likedTraits.sources, [...traits.sources]);
  }

  let query = supabaseAdmin
    .from("games")
    .select(gameSelect)
    .order("rating", { ascending: false, nullsFirst: false })
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(Math.max(limit * 5, 120));

  if (blockedIds.length > 0) {
    query = query.not("id", "in", `(${blockedIds.join(",")})`);
  }

  const { data: games, error } = await query;

  if (error) {
    return NextResponse.json({ error: safeServerError(error, "Could not load the game catalog.") }, { status: 500 });
  }

  const allGames = (games ?? []) as unknown as GameRow[];
  const candidateGames = allGames.filter((game) => !skippedIds.has(game.id));
  const fallbackSkippedGames = allGames.filter((game) => skippedIds.has(game.id));
  const rankedGames = candidateGames
    .map((game) => ({ game, score: scoreGame(game, likedTraits, skippedIds) }))
    .sort((a, b) => b.score - a.score || String(a.game.title).localeCompare(String(b.game.title)))
    .map((row) => row.game);

  const fallbackGames = fallbackSkippedGames
    .map((game) => ({ game, score: scoreGame(game, likedTraits, skippedIds) }))
    .sort((a, b) => b.score - a.score || String(a.game.title).localeCompare(String(b.game.title)))
    .map((row) => row.game);

  return NextResponse.json({ games: [...rankedGames, ...fallbackGames].slice(0, limit) });
}

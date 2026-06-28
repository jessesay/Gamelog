import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { safeServerError } from "@/lib/serverError";
import { createClient } from "@/utils/supabase/server";

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

type LogRow = {
  status: string;
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

function scoreGame(game: GameRow, likedTraits: ReturnType<typeof traitsFor>) {
  const traits = traitsFor(game);
  let score = 0;

  // Simple recommendation logic:
  // - Liked and wishlisted games are treated as strong taste signals.
  // - Played games are useful but slightly weaker because they may include older history.
  // - Shared genre/source are strong boosts; tags/platforms add smaller explainable boosts.
  score += overlapScore(traits.genres, likedTraits.genres, 8);
  score += overlapScore(traits.tags, likedTraits.tags, 4);
  score += overlapScore(traits.platforms, likedTraits.platforms, 3);
  score += overlapScore(traits.sources, likedTraits.sources, 5);
  score += Number(game.rating ?? 0);
  score += game.cover_url ? 2 : 0;

  return score;
}

function tasteMatchScore(game: GameRow, likedTraits: ReturnType<typeof traitsFor>) {
  const traits = traitsFor(game);
  const signalCount = likedTraits.genres.size + likedTraits.tags.size + likedTraits.platforms.size + likedTraits.sources.size;
  const quality = Math.min(18, Math.max(0, Number(game.rating ?? 0)) * 1.8);
  const artBonus = game.cover_url ? 3 : 0;

  if (!signalCount) return Math.round(Math.min(88, 54 + quality + artBonus));

  const affinity =
    overlapScore(traits.genres, likedTraits.genres, 12) +
    overlapScore(traits.tags, likedTraits.tags, 5) +
    overlapScore(traits.platforms, likedTraits.platforms, 4) +
    overlapScore(traits.sources, likedTraits.sources, 2);

  return Math.round(Math.min(98, 52 + quality + artBonus + Math.min(30, affinity)));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const limit = Math.max(1, Math.min(Number(searchParams.get("limit") ?? 24) || 24, 60));

  if (!sessionId || sessionId.length > 128) {
    return NextResponse.json({ error: "Missing or invalid sessionId." }, { status: 400 });
  }

  const authClient = await createClient();
  const { data: authData } = authClient ? await authClient.auth.getUser() : { data: { user: null } };
  const user = authData.user;

  const swipeQuery = supabaseAdmin
    .from("game_swipes")
    .select(`action, game_id, games(${gameSelect})`)
    .eq("session_id", sessionId)
    .limit(5000);
  const logQuery = user
    ? supabaseAdmin.from("game_logs").select(`status, game_id, games(${gameSelect})`).eq("user_id", user.id).limit(5000)
    : Promise.resolve({ data: [], error: null });
  const [{ data: swipes, error: swipeError }, { data: logs, error: logError }] = await Promise.all([swipeQuery, logQuery]);

  if (swipeError) {
    return NextResponse.json({ error: safeServerError(swipeError, "Could not load your discovery history.") }, { status: 500 });
  }
  if (logError) {
    return NextResponse.json({ error: safeServerError(logError, "Could not load your game shelves.") }, { status: 500 });
  }

  const swipeRows = (swipes ?? []) as unknown as SwipeRow[];
  const logRows = (logs ?? []) as unknown as LogRow[];
  const positiveActions = new Set(["liked", "saved", "played"]);
  const positiveGamesFromSwipes = swipeRows
    .filter((swipe) => positiveActions.has(swipe.action))
    .map((swipe) => swipe.games)
    .filter(Boolean) as GameRow[];
  const positiveGamesFromLogs = logRows
    .filter((log) => String(log.status).toLowerCase() !== "dropped")
    .map((log) => log.games)
    .filter(Boolean) as GameRow[];
  const positiveGames = [...positiveGamesFromSwipes, ...positiveGamesFromLogs];
  const blockedIds = [...new Set([
    ...swipeRows.map((swipe) => swipe.game_id),
    ...logRows.map((log) => log.game_id),
  ].filter(Boolean))];

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
    .limit(Math.max(limit * 8, 160));

  if (blockedIds.length > 0) {
    query = query.not("id", "in", `(${blockedIds.join(",")})`);
  }

  const { data: games, error } = await query;

  if (error) {
    return NextResponse.json({ error: safeServerError(error, "Could not load the game catalog.") }, { status: 500 });
  }

  const allGames = (games ?? []) as unknown as GameRow[];
  const rankedGames = allGames
    .map((game) => ({ game, score: scoreGame(game, likedTraits) }))
    .sort((a, b) => b.score - a.score || String(a.game.title).localeCompare(String(b.game.title)))
    .map((row) => ({ ...row.game, taste_match: tasteMatchScore(row.game, likedTraits) }));

  return NextResponse.json({ games: rankedGames.slice(0, limit), personalized: positiveGames.length > 0, signedIn: Boolean(user) });
}

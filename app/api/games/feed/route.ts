import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { safeServerError } from "@/lib/serverError";
import { createClient } from "@/utils/supabase/server";
import { emptyDiscoveryPreferences, normalizeDiscoveryPreferences, type DiscoveryPreferences } from "@/lib/discoveryPreferences";

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
  product_type: string | null;
  parent_game_id: string | null;
};

type SwipeRow = { action: string; game_id: string; games: GameRow | null };
type LogRow = { status: string; game_id: string; games: GameRow | null };
type EventRow = { event_name: string; game_id: string | null; games: GameRow | null };

type TasteProfile = {
  genres: Map<string, number>;
  platforms: Map<string, number>;
  years: Map<string, number>;
  savedGenres: Set<string>;
  savedPlatforms: Set<string>;
  styles: Set<string>;
  signalCount: number;
};

const gameSelect = [
  "id", "title", "slug", "source", "source_url", "description", "summary", "cover_url", "background_url",
  "platforms", "genres", "genre", "tags", "release_date", "release_year", "rating", "metacritic", "stores", "product_type", "parent_game_id",
].join(", ");
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const addOnProductTypes = new Set(["dlc", "add-on", "addon", "expansion", "soundtrack", "season_pass"]);
const addOnTitlePattern = /\b(dlc|expansion|season pass|soundtrack|ost|artbook|content pack|skin pack|cosmetic pack|currency pack|starter pack|bonus content)\b/i;

function normalize(value: string | null | undefined) {
  return String(value ?? "").toLowerCase().trim();
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map(normalize).filter(Boolean))];
}

function traitsFor(game: GameRow | null | undefined) {
  const genericValues = new Set(["game", "unknown", "n/a", "other"]);
  return {
    genres: unique([...(game?.genres ?? []), game?.genre]).filter((value) => !genericValues.has(value)),
    platforms: unique(game?.platforms ?? []).filter((value) => !genericValues.has(value)),
    tags: unique(game?.tags ?? []),
  };
}

function gameYear(game: GameRow) {
  if (game.release_year) return game.release_year;
  if (game.release_date) {
    const year = new Date(game.release_date).getFullYear();
    if (Number.isFinite(year)) return year;
  }
  return null;
}

function isAddOnProduct(game: GameRow) {
  const productType = normalize(game.product_type).replace(/\s+/g, "_");
  const catalogText = [game.title, game.genre, ...(game.genres ?? []), ...(game.tags ?? []), game.description, game.summary]
    .filter(Boolean)
    .join(" ");
  return Boolean(game.parent_game_id)
    || addOnProductTypes.has(productType)
    || addOnTitlePattern.test(catalogText);
}

function yearBucket(game: GameRow) {
  const year = gameYear(game);
  if (!year) return "unknown";
  if (year < 2000) return "classic";
  if (year < 2010) return "2000s";
  if (year < 2020) return "2010s";
  return "modern";
}

function addWeight(map: Map<string, number>, key: string, amount: number) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + amount);
}

function newTasteProfile(preferences: DiscoveryPreferences): TasteProfile {
  const profile: TasteProfile = {
    genres: new Map(),
    platforms: new Map(),
    years: new Map(),
    savedGenres: new Set(),
    savedPlatforms: new Set(),
    styles: new Set(preferences.discovery_styles.map(normalize)),
    signalCount: 0,
  };
  for (const genre of preferences.favorite_genres) addWeight(profile.genres, normalize(genre), 12);
  for (const platform of preferences.favorite_platforms) addWeight(profile.platforms, normalize(platform), 10);
  profile.signalCount += preferences.favorite_genres.length + preferences.favorite_platforms.length + preferences.discovery_styles.length;
  return profile;
}

function learnFromGame(profile: TasteProfile, game: GameRow | null, amount: number, saved = false) {
  if (!game) return;
  const traits = traitsFor(game);
  for (const genre of traits.genres) {
    addWeight(profile.genres, genre, amount);
    if (saved) profile.savedGenres.add(genre);
  }
  for (const platform of traits.platforms) {
    addWeight(profile.platforms, platform, amount * 0.75);
    if (saved) profile.savedPlatforms.add(platform);
  }
  addWeight(profile.years, yearBucket(game), amount * 0.7);
  profile.signalCount += 1;
}

function parseList(searchParams: URLSearchParams, key: string, limit = 50) {
  return unique((searchParams.get(key) ?? "").split("|")).slice(0, limit);
}

function parseIds(searchParams: URLSearchParams, key: string) {
  return parseList(searchParams, key).filter((value) => uuidPattern.test(value));
}

function preferenceFromGuest(searchParams: URLSearchParams): DiscoveryPreferences {
  return normalizeDiscoveryPreferences({
    favorite_platforms: parseList(searchParams, "platforms", 12),
    favorite_genres: parseList(searchParams, "genres", 12),
    favorite_games: parseList(searchParams, "favoriteGames", 5),
    discovery_styles: parseList(searchParams, "styles", 4),
    completed: searchParams.get("tuned") === "1",
  });
}

function overlapWeight(values: string[], weights: Map<string, number>) {
  return values.reduce((sum, value) => sum + (weights.get(value) ?? 0), 0);
}

function styleScore(game: GameRow, styles: Set<string>) {
  const traits = traitsFor(game);
  const year = gameYear(game);
  let score = 0;
  if (styles.has("indie") && (traits.genres.includes("indie") || traits.tags.includes("indie") || normalize(game.source) === "itch")) score += 12;
  if (styles.has("aaa") && (Number(game.metacritic ?? 0) >= 75 || Number(game.rating ?? 0) >= 8)) score += 9;
  if (styles.has("retro") && year && year < 2005) score += 14;
  if (styles.has("hidden_gems") && !game.metacritic) score += 8;
  return score;
}

function catalogQualityScore(game: GameRow) {
  const traits = traitsFor(game);
  let score = 0;
  if (game.cover_url?.trim()) score += 45;
  if (traits.genres.length) score += 18;
  if (traits.platforms.length) score += 18;
  if (gameYear(game)) score += 11;
  if ((game.description || game.summary)?.trim()) score += 8;
  return score;
}

function scoreGame(game: GameRow, profile: TasteProfile) {
  const traits = traitsFor(game);
  return overlapWeight(traits.genres, profile.genres)
    + overlapWeight(traits.platforms, profile.platforms)
    + (profile.years.get(yearBucket(game)) ?? 0)
    + styleScore(game, profile.styles)
    + catalogQualityScore(game) * 0.55
    + Number(game.rating ?? 0)
    + (game.cover_url ? 5 : 0);
}

function matchReasons(game: GameRow, profile: TasteProfile) {
  const traits = traitsFor(game);
  const reasons: string[] = [];
  const similarSaved = traits.genres.some((value) => profile.savedGenres.has(value)) || traits.platforms.some((value) => profile.savedPlatforms.has(value));
  if (similarSaved) reasons.push("Similar to games you saved");
  if (overlapWeight(traits.genres, profile.genres) > 0) reasons.push("Matches your favorite genres");
  if (overlapWeight(traits.platforms, profile.platforms) > 0) reasons.push("Popular on your platforms");

  const year = gameYear(game);
  if (profile.styles.has("retro") && year && year < 2005) reasons.push("A retro pick for your mood");
  else if (profile.styles.has("indie") && (traits.genres.includes("indie") || traits.tags.includes("indie"))) reasons.push("An indie pick for your feed");
  else if (profile.styles.has("hidden_gems") && !game.metacritic) reasons.push("A hidden gem beyond the charts");
  else if ((profile.years.get(yearBucket(game)) ?? 0) > 0) reasons.push("Fits the eras you play most");

  if (reasons.length < 2 && Number(game.rating ?? 0) >= 7) reasons.push("Well-loved by other players");
  if (reasons.length < 2) reasons.push("New recommendation for your shelf");
  if (reasons.length < 2) reasons.push("Fresh pick from the GameLog catalog");
  return [...new Set(reasons)].slice(0, 3);
}

function tasteMatchScore(game: GameRow, profile: TasteProfile) {
  const reasons = matchReasons(game, profile);
  const affinity = Math.max(0, scoreGame(game, profile) - Number(game.rating ?? 0) - (game.cover_url ? 3 : 0));
  const quality = Math.min(12, Math.max(0, Number(game.rating ?? 0)) * 1.2);
  const learned = profile.signalCount ? Math.min(30, affinity * 0.55) : 0;
  return Math.round(Math.max(48, Math.min(98, 54 + quality + learned + Math.min(4, reasons.length))));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const limit = Math.max(1, Math.min(Number(searchParams.get("limit") ?? 24) || 24, 60));
  if (!sessionId || sessionId.length > 128) return NextResponse.json({ error: "Missing or invalid sessionId." }, { status: 400 });

  const authClient = await createClient();
  const { data: authData } = authClient ? await authClient.auth.getUser() : { data: { user: null } };
  const user = authData.user;

  const swipeQuery = user
    ? supabaseAdmin.from("game_swipes").select(`action, game_id, games(${gameSelect})`).eq("user_id", user.id).limit(2500)
    : Promise.resolve({ data: [], error: null });
  const logQuery = user
    ? supabaseAdmin.from("game_logs").select(`status, game_id, games(${gameSelect})`).eq("user_id", user.id).limit(2500)
    : Promise.resolve({ data: [], error: null });
  const eventQuery = user
    ? supabaseAdmin.from("discovery_events").select(`event_name, game_id, games(${gameSelect})`).eq("user_id", user.id).order("created_at", { ascending: false }).limit(1500)
    : Promise.resolve({ data: [], error: null });
  const preferenceQuery = user
    ? supabaseAdmin.from("discovery_preferences").select("favorite_platforms, favorite_genres, favorite_games, discovery_styles, completed").eq("user_id", user.id).maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const profileQuery = user
    ? supabaseAdmin.from("profiles").select("favorite_platforms, favorite_genres, favorite_games, favorite_game").eq("id", user.id).maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [swipeResult, logResult, eventResult, preferenceResult, profileResult] = await Promise.all([swipeQuery, logQuery, eventQuery, preferenceQuery, profileQuery]);
  const firstError = swipeResult.error || logResult.error || eventResult.error || preferenceResult.error || profileResult.error;
  if (firstError) return NextResponse.json({ error: safeServerError(firstError, "Could not load your discovery profile.") }, { status: 500 });

  const storedPreferences = preferenceResult.data as Record<string, unknown> | null;
  const profilePreferences = profileResult.data as Record<string, unknown> | null;
  const preferences = user ? normalizeDiscoveryPreferences({
    favorite_platforms: (storedPreferences?.favorite_platforms as unknown[])?.length ? storedPreferences?.favorite_platforms : profilePreferences?.favorite_platforms,
    favorite_genres: (storedPreferences?.favorite_genres as unknown[])?.length ? storedPreferences?.favorite_genres : profilePreferences?.favorite_genres,
    favorite_games: (storedPreferences?.favorite_games as unknown[])?.length ? storedPreferences?.favorite_games : (profilePreferences?.favorite_games as unknown[])?.length ? profilePreferences?.favorite_games : [profilePreferences?.favorite_game].filter(Boolean),
    discovery_styles: storedPreferences?.discovery_styles,
    completed: storedPreferences?.completed,
  }) : preferenceFromGuest(searchParams);

  const swipeRows = (swipeResult.data ?? []) as unknown as SwipeRow[];
  const logRows = (logResult.data ?? []) as unknown as LogRow[];
  const eventRows = (eventResult.data ?? []) as unknown as EventRow[];
  const guestGroups = {
    saved: parseIds(searchParams, "savedIds"),
    wanted: parseIds(searchParams, "wantedIds"),
    played: parseIds(searchParams, "playedIds"),
    skipped: parseIds(searchParams, "skippedIds"),
    viewed: parseIds(searchParams, "viewedIds"),
  };
  const guestSignalIds = [...new Set(Object.values(guestGroups).flat())];
  const { data: guestSignalGames, error: guestSignalError } = guestSignalIds.length
    ? await supabaseAdmin.from("games").select(gameSelect).in("id", guestSignalIds)
    : { data: [], error: null };
  if (guestSignalError) return NextResponse.json({ error: safeServerError(guestSignalError, "Could not learn from guest activity.") }, { status: 500 });
  const guestGamesById = new Map(((guestSignalGames ?? []) as unknown as GameRow[]).map((game) => [game.id, game]));

  const taste = newTasteProfile(preferences);
  const eventGameIds = new Set(eventRows.filter((row) => row.game_id && row.event_name !== "card_viewed").map((row) => row.game_id));
  const eventWeights: Record<string, number> = { save: 8, want_to_play: 7, played: 4, skip: -5, card_viewed: 0.35 };
  for (const event of eventRows) learnFromGame(taste, event.games, eventWeights[event.event_name] ?? 0, event.event_name === "save" || event.event_name === "want_to_play");
  for (const swipe of swipeRows) {
    if (eventGameIds.has(swipe.game_id)) continue;
    const weight = swipe.action === "saved" ? 7 : swipe.action === "liked" ? 6 : swipe.action === "played" ? 4 : -4;
    learnFromGame(taste, swipe.games, weight, swipe.action === "saved" || swipe.action === "liked");
  }
  for (const log of logRows) learnFromGame(taste, log.games, normalize(log.status) === "dropped" ? -4 : 4, normalize(log.status) !== "dropped");
  for (const id of guestGroups.saved) learnFromGame(taste, guestGamesById.get(id) ?? null, 8, true);
  for (const id of guestGroups.wanted) learnFromGame(taste, guestGamesById.get(id) ?? null, 7, true);
  for (const id of guestGroups.played) learnFromGame(taste, guestGamesById.get(id) ?? null, 4, false);
  for (const id of guestGroups.skipped) learnFromGame(taste, guestGamesById.get(id) ?? null, -5, false);
  for (const id of guestGroups.viewed) learnFromGame(taste, guestGamesById.get(id) ?? null, 0.35, false);

  if (preferences.favorite_games.length) {
    const { data: favoriteGames } = await supabaseAdmin.from("games").select(gameSelect).in("title", preferences.favorite_games);
    for (const game of (favoriteGames ?? []) as unknown as GameRow[]) learnFromGame(taste, game, 10, true);
  }

  const blockedIds = [...new Set(user ? [
    ...swipeRows.map((row) => row.game_id),
    ...logRows.map((row) => row.game_id),
  ] : [...guestGroups.saved, ...guestGroups.wanted, ...guestGroups.played, ...guestGroups.skipped])].filter(Boolean);

  let query = supabaseAdmin.from("games").select(gameSelect)
    .order("rating", { ascending: false, nullsFirst: false })
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(Math.max(limit * 10, 200));
  if (blockedIds.length) query = query.not("id", "in", `(${blockedIds.join(",")})`);
  const { data: games, error } = await query;
  if (error) return NextResponse.json({ error: safeServerError(error, "Could not load the game catalog.") }, { status: 500 });

  const scoredGames = ((games ?? []) as unknown as GameRow[])
    .filter((game) => !isAddOnProduct(game))
    .map((game) => ({ game, quality: catalogQualityScore(game), score: scoreGame(game, taste) }))
    .sort((a, b) => b.score - a.score || String(a.game.title).localeCompare(String(b.game.title)));
  const discoveryReady = scoredGames.filter((row) => row.quality >= 65);
  const fallbackGames = scoredGames.filter((row) => row.quality < 65);
  const rankedGames = [...discoveryReady, ...fallbackGames]
    .slice(0, limit)
    .map(({ game, quality }) => ({ ...game, catalog_quality: quality, taste_match: tasteMatchScore(game, taste), match_reasons: matchReasons(game, taste) }));

  return NextResponse.json({
    games: rankedGames,
    personalized: taste.signalCount > 0,
    signedIn: Boolean(user),
    preferences: preferences ?? emptyDiscoveryPreferences,
  });
}

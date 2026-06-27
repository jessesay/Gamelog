import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { normalizeGameStatus } from "@/lib/gameStatus";
import { safeServerError } from "@/lib/serverError";

const gameFields = "id,title,slug,cover_url,release_year,release_date,platforms,genre,genres,tags,source,source_id,source_url,import_key,rating,imported_at,created_at";

function uniqueById(games: any[]) {
  return [...new Map(games.filter(Boolean).map((game) => [game.id, game])).values()];
}

function safeSearchTerm(value: string) {
  return value.replace(/[%_,().]/g, " ").replace(/\s+/g, " ").trim();
}

async function fallbackSearch(query: string) {
  const term = safeSearchTerm(query);
  if (!term) return [];
  const scalar = ["title", "slug", "developer", "publisher", "genre", "source", "source_id", "source_url", "import_key"]
    .map((field) => `${field}.ilike.%${term}%`)
    .join(",");
  const searches = [
    supabaseAdmin.from("games").select(gameFields).or(scalar).limit(50),
    supabaseAdmin.from("games").select(gameFields).overlaps("platforms", searchVariants(term)).limit(30),
    supabaseAdmin.from("games").select(gameFields).overlaps("genres", searchVariants(term)).limit(30),
    supabaseAdmin.from("games").select(gameFields).overlaps("tags", searchVariants(term)).limit(30),
  ];
  const results = await Promise.all(searches);
  const scalarError = results[0].error;
  if (scalarError) throw scalarError;
  const games = uniqueById(results.flatMap((result) => result.data ?? []));
  const lowered = query.toLowerCase();
  return games.sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    const score = (title: string) => title === lowered ? 0 : title.startsWith(lowered) ? 1 : 2;
    return score(aTitle) - score(bTitle) || aTitle.localeCompare(bTitle);
  }).slice(0, 50);
}

function searchVariants(term: string) {
  const titleCase = term.replace(/\b\w/g, (character) => character.toUpperCase());
  return [...new Set([term, term.toLowerCase(), term.toUpperCase(), titleCase])];
}

async function searchGames(query: string) {
  const { data, error } = await supabaseAdmin.rpc("search_games_global", {
    search_query: query,
    result_limit: 50,
  });
  if (!error) return data ?? [];
  // New deployments work before the optional search migration is applied.
  if (error.code === "PGRST202" || error.code === "42883") return fallbackSearch(query);
  throw error;
}

async function loadDefaultSections() {
  const [{ data: recentReviews, error: reviewError }, popularResult, importedResult] = await Promise.all([
    supabaseAdmin.from("game_reviews").select("game_id").order("updated_at", { ascending: false }).limit(40),
    supabaseAdmin.from("games").select(gameFields).order("rating", { ascending: false, nullsFirst: false }).limit(12),
    supabaseAdmin.from("games").select(gameFields).order("imported_at", { ascending: false, nullsFirst: false }).limit(12),
  ]);
  if (reviewError) throw reviewError;

  const recentIds = [...new Set((recentReviews ?? []).map((review) => review.game_id))].slice(0, 12);
  const { data: recentGames, error: recentError } = recentIds.length
    ? await supabaseAdmin.from("games").select(gameFields).in("id", recentIds)
    : { data: [], error: null };
  if (recentError) throw recentError;

  let popular = popularResult.data ?? [];
  if (popularResult.error) {
    const fallback = await supabaseAdmin.from("games").select(gameFields).order("rating", { ascending: false, nullsFirst: false }).limit(12);
    if (fallback.error) throw fallback.error;
    popular = fallback.data ?? [];
  }
  let imported = importedResult.data ?? [];
  if (importedResult.error) {
    const fallback = await supabaseAdmin.from("games").select(gameFields).order("created_at", { ascending: false }).limit(12);
    if (fallback.error) throw fallback.error;
    imported = fallback.data ?? [];
  }
  const recentMap = new Map((recentGames ?? []).map((game) => [game.id, game]));
  return {
    recent: recentIds.map((id) => recentMap.get(id)).filter(Boolean),
    popular,
    imported,
  };
}

async function enrich(games: any[]) {
  const uniqueGames = uniqueById(games);
  if (!uniqueGames.length) return { games: [], signedIn: false };
  const ids = uniqueGames.map((game) => game.id);
  const authClient = await createClient();
  const { data: authData } = authClient ? await authClient.auth.getUser() : { data: { user: null } };
  const user = authData.user;
  const [reviewsResult, logsResult] = await Promise.all([
    supabaseAdmin.from("game_reviews").select("game_id,rating").in("game_id", ids),
    user
      ? supabaseAdmin.from("game_logs").select("game_id,status,updated_at").eq("user_id", user.id).in("game_id", ids).order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (reviewsResult.error) throw reviewsResult.error;
  if (logsResult.error) throw logsResult.error;

  const stats = new Map<string, { sum: number; rated: number; count: number }>();
  for (const review of reviewsResult.data ?? []) {
    const current = stats.get(review.game_id) ?? { sum: 0, rated: 0, count: 0 };
    current.count += 1;
    if (review.rating !== null && review.rating !== undefined) {
      current.sum += Number(review.rating);
      current.rated += 1;
    }
    stats.set(review.game_id, current);
  }
  const statuses = new Map<string, string>();
  for (const log of logsResult.data ?? []) {
    if (!statuses.has(log.game_id)) statuses.set(log.game_id, normalizeGameStatus(log.status) ?? "");
  }
  return {
    signedIn: Boolean(user),
    games: uniqueGames.map((game) => {
      const review = stats.get(game.id);
      return {
        ...game,
        averageRating: review?.rated ? review.sum / review.rated : null,
        reviewCount: review?.count ?? 0,
        userStatus: user ? statuses.get(game.id) || null : undefined,
      };
    }),
  };
}

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 120) ?? "";
    if (query) {
      const result = await enrich(await searchGames(query));
      return NextResponse.json({ query, ...result });
    }
    const sections = await loadDefaultSections();
    const all = [...sections.recent, ...sections.popular, ...sections.imported];
    const enriched = await enrich(all);
    const byId = new Map(enriched.games.map((game) => [game.id, game]));
    return NextResponse.json({
      query: "",
      signedIn: enriched.signedIn,
      sections: {
        recent: sections.recent.map((game: any) => byId.get(game.id)).filter(Boolean),
        popular: sections.popular.map((game: any) => byId.get(game.id)).filter(Boolean),
        imported: sections.imported.map((game: any) => byId.get(game.id)).filter(Boolean),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: safeServerError(error, "Search could not load right now.") }, { status: 500 });
  }
}

import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Star, Timer } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { completionEstimateForGame, formatCompletionHours } from "@/lib/timeToBeat";
import GameSocialActions from "@/components/GameSocialActions";
import { dedupeGameLogs } from "@/lib/social";
import GameCoverArt from "@/components/GameCoverArt";


function gameHue(game: any) {
  const seed = (game.slug ?? game.title).split("").reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
  return seed % 360;
}

function coverStyle(game: any): CSSProperties {
  return { "--cover-hue": gameHue(game) } as CSSProperties;
}

function PublicGameCover({ game }: { game: any }) {
  return (
    <div className="cover poster-cover" style={coverStyle(game)}>
      <GameCoverArt src={game.cover_url} title={game.title} genre={game.genre} platforms={game.platforms} />
      <div className="poster-glow" />
    </div>
  );
}

function stars(rating: number | null | undefined) {
  if (rating === null || rating === undefined) return "Unrated";
  const rounded = Math.round(rating * 2) / 2;
  const full = Math.floor(rounded);
  const half = rounded % 1 ? "½" : "";
  return `${"★".repeat(full)}${half}${"☆".repeat(Math.max(0, 5 - Math.ceil(rounded)))}`;
}

function archiveSearchUrl(title: string) {
  const query = `(title:(\"${title}\") OR description:(\"${title}\")) AND mediatype:texts AND (manual OR guide OR walkthrough OR strategy)`;
  return `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier&fl[]=title&fl[]=description&rows=50&output=json`;
}

function archiveDetailsUrl(summary?: string | null) {
  return summary?.match(/https:\/\/archive\.org\/details\/[^\s)]+/i)?.[0] ?? null;
}

function releaseLabel(game: any) {
  if (game.release_date) {
    const date = new Date(game.release_date);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
  }
  return game.release_year || "TBA";
}

function sourceLink(game: any) {
  if (game.source_url) return game.source_url;
  const stores = Array.isArray(game.stores) ? game.stores : [];
  return stores.find((store: any) => store?.url)?.url ?? null;
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = supabaseAdmin;
  const authSupabase = await createClient();

  if (!supabase) {
    return (
      <main className="shell">
        <section className="card">
          <p className="eyebrow">GameLog game page</p>
          <h1>Supabase is not connected yet.</h1>
          <p className="muted">Game pages use your live catalog. Add env variables and run the schema first.</p>
          <Link className="secondary inline-link" href="/">Back home</Link>
        </section>
      </main>
    );
  }

  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!game) notFound();

  const [{ data: logs, error: logsError }, { data: reviews, error: reviewsError }, { data: addOns }, { data: parentGame }] = await Promise.all([
    supabase
      .from("game_logs")
      .select("*, profiles!game_logs_user_id_fkey(username, display_name), review_likes(user_id), comments(id)")
      .eq("game_id", game.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("game_reviews")
      .select("*, profiles(username, display_name)")
      .eq("game_id", game.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("games")
      .select("id, title, slug, cover_url, genre, product_type, release_year")
      .eq("parent_game_id", game.id)
      .order("release_year", { ascending: false, nullsFirst: false })
      .limit(24),
    game.parent_game_id
      ? supabase.from("games").select("id, title, slug").eq("id", game.parent_game_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (logsError) throw new Error(`Could not load game logs: ${logsError.message}`);
  if (reviewsError) throw new Error(`Could not load community reviews: ${reviewsError.message}`);

  const { data: userResult } = authSupabase ? await authSupabase.auth.getUser() : { data: { user: null } };
  const currentUserId = userResult.user?.id;
  const [{ data: existingLog }, { data: existingCanonicalReview }] = currentUserId
    ? await Promise.all([
      supabase
        .from("game_logs")
        .select("id, rating, review, status")
        .eq("user_id", currentUserId)
        .eq("game_id", game.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("game_reviews")
        .select("rating, body")
        .eq("user_id", currentUserId)
        .eq("game_id", game.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    : [{ data: null }, { data: null }];
  const existingReview = existingCanonicalReview
    ? {
        id: existingLog?.id ?? "",
        rating: existingCanonicalReview.rating,
        review: existingCanonicalReview.body,
        status: existingLog?.status ?? "Completed",
      }
    : null;

  const gameLogs = dedupeGameLogs(logs ?? []);
  const ratedReviews = (reviews ?? []).filter((review) => review.rating !== null && review.rating !== undefined);
  const avgRating = ratedReviews.length
    ? (ratedReviews.reduce((sum, review) => sum + Number(review.rating), 0) / ratedReviews.length).toFixed(1)
    : "0.0";
  const reviewCount = reviews?.length ?? 0;
  const completed = gameLogs.filter((log) => ["Completed", "100% Completed"].includes(log.status)).length;
  const logsByUser = new Map(gameLogs.map((log) => [log.user_id, log]));
  const completion = completionEstimateForGame(game);
  const genres = Array.from(new Set([...(game.genres ?? []), game.genre].filter(Boolean)));
  const tags = Array.isArray(game.tags) ? game.tags.filter(Boolean).slice(0, 10) : [];
  const sourceHref = sourceLink(game);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="nav-inner">
          <Link className="brand ghost" href="/">
            <span className="logo">GL</span>
            <span>GameLog</span>
          </Link>
          <Link className="pill" href="/">Open app</Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-card">
          <p className="eyebrow">Game page</p>
          <h1>{game.title}</h1>
          <p className="lede">{game.description || game.summary || "No description has been imported yet."}</p>
          <div className="tag-row">
            <span className="tag"><Star size={13} /> Avg {avgRating}</span>
            <span className="tag"><Timer size={13} /> {completion.label}</span>
            <span className="tag">{reviewCount} {reviewCount === 1 ? "review" : "reviews"}</span>
            <span className="tag">{gameLogs.length} {gameLogs.length === 1 ? "log" : "logs"}</span>
            <span className="tag">{completed} completed</span>
            {genres.map((genre: string) => <span className="tag" key={genre}>{genre}</span>)}
            {(game.platforms ?? []).map((platform: string) => <span className="tag" key={platform}>{platform}</span>)}
            {tags.map((tag: string) => <span className="tag" key={tag}>{tag}</span>)}
          </div>
        </div>
        <aside className="side-panel card">
          <PublicGameCover game={game} />
          <h2>Details</h2>
          <p className="muted">Developer: {game.developer || "Unknown"}</p>
          <p className="muted">Publisher: {game.publisher || "Unknown"}</p>
          <p className="muted">Release: {releaseLabel(game)}</p>
          <p className="muted">Source: {game.source || "Imported catalog"}</p>
          <p className="muted">Time: {completion.label}</p>
          <p className="muted">Extras: around {formatCompletionHours(completion.extraHours)} · Completionist: around {formatCompletionHours(completion.completionistHours)}</p>
          <div className="actions" style={{ marginTop: 12 }}>
            <Link className="primary inline-link" href="/app/discover">Discover more</Link>
            {sourceHref && <a className="secondary inline-link" href={sourceHref} target="_blank" rel="noreferrer">Open source/store</a>}
            <a className="secondary inline-link" href={archiveSearchUrl(game.title)} target="_blank" rel="noreferrer">Find manuals/guides</a>
            {archiveDetailsUrl(game.summary) && <a className="secondary inline-link" href={archiveDetailsUrl(game.summary) ?? "#"} target="_blank" rel="noreferrer">Open Archive item</a>}
          </div>
          <GameSocialActions gameId={game.id} existingReview={existingReview} />
        </aside>
      </section>

      <section className="card">
        {parentGame ? <div className="game-parent-link-v313"><span>This is additional content for</span><Link href={`/g/${parentGame.slug}`}>{parentGame.title}</Link></div> : null}
        <h2>Community reviews</h2>
        <div className="feed">
          {(reviews ?? []).length ? reviews?.map((review) => {
            const log = logsByUser.get(review.user_id);
            return (
            <article className="review-card" key={review.id}>
              <div className="review-top">
                <div>
                  <strong>{review.profiles?.display_name ?? "Player"}</strong>
                  <p className="muted" style={{ margin: "4px 0 0" }}>
                    @{review.profiles?.username ?? "player"}{log?.status ? ` · ${log.status}` : ""}
                  </p>
                </div>
                <div className="stars">{stars(review.rating)}</div>
              </div>
              {review.body && <p style={{ margin: "13px 0 8px", lineHeight: 1.6 }}>{review.body}</p>}
              <div className="tag-row">
                {log?.vibe && <span className="tag">{log.vibe}</span>}
                {log?.played_on && <span className="tag"><CalendarDays size={13} /> {log.played_on}</span>}
                {log?.id && <Link className="tag action-tag" href={`/r/${log.id}`}>Open review</Link>}
              </div>
            </article>
          )}) : <div className="empty">No community reviews for this game yet.</div>}
        </div>
      </section>
      {addOns?.length ? (
        <section className="card game-addons-v313">
          <div><p className="eyebrow">Part of this game</p><h2>Expansions &amp; DLC</h2><p className="muted">Optional content stays with the base game instead of crowding discovery.</p></div>
          <div className="game-addon-grid-v313">
            {addOns.map((addOn: any) => (
              <Link className="game-addon-card-v313" href={`/g/${addOn.slug}`} key={addOn.id}>
                <span><GameCoverArt src={addOn.cover_url} title={addOn.title} genre={addOn.genre} compact decorative /></span>
                <div><strong>{addOn.title}</strong><small>{String(addOn.product_type ?? "DLC").replace(/_/g, " ")} · {addOn.release_year ?? "TBA"}</small></div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

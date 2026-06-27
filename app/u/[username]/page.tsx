import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Heart, Layers3, MessageCircle, Share2, Star, Trophy } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dedupeGameLogs } from "@/lib/social";

function stars(rating: number | null | undefined) {
  if (rating === null || rating === undefined) return "Unrated";
  const rounded = Math.round(rating * 2) / 2;
  const full = Math.floor(rounded);
  const half = rounded % 1 ? "½" : "";
  return `${"★".repeat(full)}${half}${"☆".repeat(Math.max(0, 5 - Math.ceil(rounded)))}`;
}

function gameHue(game: any) {
  const seed = (game?.slug ?? game?.title ?? "profile").split("").reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
  return seed % 360;
}

function coverStyle(game: any): CSSProperties {
  return { "--cover-hue": gameHue(game) } as CSSProperties;
}

function PublicCover({ game }: { game: any }) {
  return (
    <div className="cover poster-cover" style={coverStyle(game)}>
      {game?.cover_url ? (
        <img src={game.cover_url} alt={`${game.title} cover art`} />
      ) : (
        <div className="poster-fallback">
          <span className="poster-kicker">{game?.genre ?? "Game"}</span>
          <div className="cover-title">{game?.title ?? "Game"}</div>
          <span className="poster-platforms">{(game?.platforms ?? []).slice(0, 2).join(" · ")}</span>
        </div>
      )}
      <div className="poster-glow" />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const supabase = supabaseAdmin;
  if (!supabase) return { title: `@${username} — GameLog` };

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, favorite_game")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return { title: `@${username} — GameLog` };
  return {
    title: `${profile.display_name} (@${profile.username}) — GameLog`,
    description: profile.bio || `${profile.display_name}'s public GameLog profile${profile.favorite_game ? ` — favorite game: ${profile.favorite_game}` : ""}.`,
    openGraph: {
      title: `${profile.display_name} on GameLog`,
      description: profile.bio || "Track what you play. Review what hits. Attack the backlog.",
      type: "profile"
    }
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = supabaseAdmin;

  if (!supabase) {
    return (
      <main className="shell">
        <section className="card">
          <p className="eyebrow">GameLog</p>
          <h1>Supabase is not connected yet.</h1>
          <p className="muted">Add your env variables, run the schema, then public profiles like /u/{username} will work.</p>
          <Link className="secondary inline-link" href="/">Back home</Link>
        </section>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const [{ data: logs }, { data: reviews }, { data: lists }, followerResult, followingResult] = await Promise.all([
    supabase
      .from("game_logs")
      .select("*, games(*), review_likes(user_id), comments(id)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("game_reviews")
      .select("*, games(*)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("game_lists")
      .select("*, list_items(id, position, games(*))")
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profile.id)
  ]);

  const profileLogs = dedupeGameLogs(logs ?? []);
  const profileReviews = reviews ?? [];
  const rated = profileReviews.filter((review) => review.rating !== null && review.rating !== undefined);
  const avgRating = rated.length
    ? (rated.reduce((sum, review) => sum + Number(review.rating), 0) / rated.length).toFixed(1)
    : "0.0";
  const completed = profileLogs.filter((log) => ["Completed", "100% Completed"].includes(log.status)).length;
  const backlog = profileLogs.filter((log) => ["Backlog", "Want to Play"].includes(log.status)).length;
  const reviewed = profileReviews.length;
  const logsByGame = new Map(profileLogs.map((log) => [log.game_id, log]));
  const shelfGames = profileLogs
    .filter((log) => log.games)
    .sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0) || new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .map((log) => log.games)
    .filter((game, index, array) => game && array.findIndex((item) => item?.id === game.id) === index)
    .slice(0, 5);
  const topGenres = [...profileLogs.reduce((map, log) => {
    const key = log.games?.genre || "Game";
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const topVibes = [...profileLogs.reduce((map, log) => {
    if (!log.vibe) return map;
    map.set(log.vibe, (map.get(log.vibe) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <main className="shell public-page-shell">
      <header className="topbar">
        <div className="nav-inner">
          <Link className="brand ghost" href="/">
            <span className="logo">GL</span>
            <span>GameLog</span>
          </Link>
          <Link className="pill" href="/">Open app</Link>
        </div>
      </header>

      <section className="hero public-profile-hero">
        <div className="hero-card">
          <p className="eyebrow">Public profile</p>
          <h1>{profile.display_name}</h1>
          <p className="lede">@{profile.username}</p>
          <p className="muted public-description">{profile.bio || "No bio yet."}</p>
          <div className="tag-row">
            <span className="tag">Favorite: {profile.favorite_game || "Unset"}</span>
            <span className="tag">Logs: {profileLogs.length}</span>
            <span className="tag">Completed: {completed}</span>
            <span className="tag">Backlog: {backlog}</span>
            <span className="tag">Avg: {avgRating}</span>
            <span className="tag">Followers: {followerResult.count ?? 0}</span>
            <span className="tag">Following: {followingResult.count ?? 0}</span>
          </div>
        </div>
        <div className="public-profile-card">
          <p className="eyebrow">Taste card</p>
          <div className="public-shelf-row">
            {shelfGames.length ? shelfGames.map((game: any) => <PublicCover key={game.id} game={game} />) : <div className="empty">Log games to build a shelf.</div>}
          </div>
          <div className="wrapped-mini-grid">
            <span><strong>{profileLogs.length}</strong><em>logs</em></span>
            <span><strong>{completed}</strong><em>done</em></span>
            <span><strong>{reviewed}</strong><em>reviews</em></span>
            <span><strong>{avgRating}</strong><em>avg</em></span>
          </div>
        </div>
      </section>

      <section className="grid">
        <div className="col-8 card">
          <div className="review-top">
            <div>
              <p className="eyebrow">Recent reviews</p>
              <h2>Latest takes</h2>
            </div>
            <Link className="secondary inline-link" href="/"><Share2 size={16} /> Make your profile</Link>
          </div>
          <div className="feed public-feed">
            {profileReviews.length ? profileReviews.slice(0, 12).map((review) => {
              const log = logsByGame.get(review.game_id);
              return (
              <article className="review-card public-review-row" key={review.id}>
                {review.games && <PublicCover game={review.games} />}
                <div className="public-review-body">
                  <div className="review-top">
                    <div>
                      <strong>{review.games?.title ?? "Unknown Game"}</strong>
                      {log?.status && <p className="muted" style={{ margin: "4px 0 0" }}>{log.status}</p>}
                    </div>
                    <div className="stars">{stars(review.rating)}</div>
                  </div>
                  {review.body && <p style={{ margin: "13px 0 8px", lineHeight: 1.6 }}>{review.body}</p>}
                  <div className="tag-row">
                    {log?.vibe && <span className="tag">{log.vibe}</span>}
                    {log?.played_on && <span className="tag"><CalendarDays size={13} /> {log.played_on}</span>}
                    {log && <span className="tag"><Heart size={13} /> {log.review_likes?.length ?? 0}</span>}
                    {log && <span className="tag"><MessageCircle size={13} /> {log.comments?.length ?? 0}</span>}
                    {log?.id && <Link className="tag action-tag" href={`/r/${log.id}`}>Open review</Link>}
                  </div>
                </div>
              </article>
            )}) : <div className="empty">No reviews yet.</div>}
          </div>
        </div>

        <aside className="col-4 card">
          <p className="eyebrow">Taste breakdown</p>
          <h2>What they play</h2>
          <div className="mini-list">
            {topGenres.length ? topGenres.map(([genre, count]) => <div className="mini-row" key={genre}><span>{genre}</span><strong>{count}</strong></div>) : <p className="muted">No genre data yet.</p>}
          </div>
          <div className="divider" />
          <h3>Review vibes</h3>
          <div className="tag-row">
            {topVibes.length ? topVibes.map(([vibe, count]) => <span className="tag" key={vibe}>{vibe} · {count}</span>) : <span className="tag">No vibe yet</span>}
          </div>
          <div className="divider" />
          <h3>Public lists</h3>
          <div className="mini-list">
            {(lists ?? []).length ? (lists ?? []).map((list: any) => {
              const ordered = [...(list.list_items ?? [])].sort((a: any, b: any) => Number(a.position ?? 9999) - Number(b.position ?? 9999));
              const cover = ordered.find((item: any) => item.games?.cover_url)?.games;
              return (
                <Link className="public-profile-list-v37" key={list.id} href={`/l/${list.id}`}>
                  <span className="public-profile-list-cover-v37">{cover?.cover_url ? <img src={cover.cover_url} alt="" /> : list.title.slice(0, 2).toUpperCase()}</span>
                  <span><strong>{list.title}</strong><small><Layers3 size={12} /> {ordered.length} {ordered.length === 1 ? "game" : "games"}</small></span>
                </Link>
              );
            }) : <p className="muted">No public lists yet.</p>}
          </div>
        </aside>
      </section>
    </main>
  );
}

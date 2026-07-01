import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Heart, MessageCircle, Share2, Star } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import GameCoverArt from "@/components/GameCoverArt";

function stars(rating: number | null | undefined) {
  if (rating === null || rating === undefined) return "Unrated";
  const rounded = Math.round(rating * 2) / 2;
  const full = Math.floor(rounded);
  const half = rounded % 1 ? "½" : "";
  return `${"★".repeat(full)}${half}${"☆".repeat(Math.max(0, 5 - Math.ceil(rounded)))}`;
}

function gameHue(game: any) {
  const seed = (game?.slug ?? game?.title ?? "review").split("").reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
  return seed % 360;
}

function coverStyle(game: any): CSSProperties {
  return { "--cover-hue": gameHue(game) } as CSSProperties;
}

function ReviewCover({ game }: { game: any }) {
  return (
    <div className="cover poster-cover public-review-cover" style={coverStyle(game)}>
      <GameCoverArt src={game?.cover_url} title={game?.title ?? "Game"} genre={game?.genre} platforms={game?.platforms} />
      <div className="poster-glow" />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return { title: "GameLog review" };

  const { data: log } = await supabase
    .from("game_logs")
    .select("rating, review, status, games(title), profiles!game_logs_user_id_fkey(display_name, username)")
    .eq("id", id)
    .maybeSingle();

  if (!log) return { title: "GameLog review" };
  const game = Array.isArray(log.games) ? log.games[0] : log.games;
  const profile = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
  return {
    title: `${game?.title ?? "Game"} review by ${profile?.display_name ?? "a player"} — GameLog`,
    description: log.review || `${profile?.display_name ?? "A player"} logged ${game?.title ?? "a game"} as ${log.status}.`,
    openGraph: {
      title: `${game?.title ?? "Game"} on GameLog`,
      description: log.review || "A public GameLog review.",
      type: "article"
    }
  };
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  if (!supabase) {
    return (
      <main className="shell">
        <section className="card">
          <p className="eyebrow">GameLog review</p>
          <h1>Supabase is not connected yet.</h1>
          <p className="muted">Review permalinks use the live database. Add your env variables and run the schema first.</p>
          <Link className="secondary inline-link" href="/">Back home</Link>
        </section>
      </main>
    );
  }

  const { data: log } = await supabase
    .from("game_logs")
    .select("*, games(*), profiles!game_logs_user_id_fkey(username, display_name, bio, avatar_url), review_likes(user_id), comments(id, body, created_at, profiles!comments_user_id_fkey(username, display_name))")
    .eq("id", id)
    .maybeSingle();

  if (!log) notFound();

  const likeCount = log.review_likes?.length ?? 0;
  const commentCount = log.comments?.length ?? 0;
  const profile = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;

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

      <section className="hero review-share-hero">
        <div className="hero-card review-quote-card">
          <p className="eyebrow">Review permalink</p>
          <h1>{log.games?.title ?? "Unknown Game"}</h1>
          <p className="lede">
            {profile?.display_name ?? "A player"} logged this as <strong>{log.status}</strong>.
          </p>
          <div className="tag-row">
            <span className="tag stars">{stars(log.rating)}</span>
            {log.vibe && <span className="tag">{log.vibe}</span>}
            {log.played_on && <span className="tag"><CalendarDays size={13} /> {log.played_on}</span>}
            <span className="tag"><Heart size={13} /> {likeCount}</span>
            <span className="tag"><MessageCircle size={13} /> {commentCount}</span>
          </div>
          <blockquote>{log.review || "No written review — just the log."}</blockquote>
          <div className="actions">
            {profile?.username && <Link className="secondary inline-link" href={`/u/${profile.username}`}>View profile</Link>}
            <Link className="primary inline-link" href="/"><Share2 size={16} /> Start your GameLog</Link>
          </div>
        </div>
        {log.games && <ReviewCover game={log.games} />}
      </section>

      <section className="grid">
        <article className="col-8 review-card public-full-review">
          <div className="review-top">
            <div>
              <strong>{profile?.display_name ?? "Player"}</strong>
              <p className="muted" style={{ margin: "4px 0 0" }}>@{profile?.username ?? "player"}</p>
            </div>
            <div className="stars">{stars(log.rating)}</div>
          </div>
          <p style={{ margin: "18px 0", lineHeight: 1.7, fontSize: "1.08rem" }}>{log.review || "No written review."}</p>
          <div className="tag-row">
            {log.games?.slug && <Link className="tag action-tag" href={`/g/${log.games.slug}`}>Game page</Link>}
            {profile?.username && <Link className="tag action-tag" href={`/u/${profile.username}`}>More from @{profile.username}</Link>}
          </div>
        </article>

        <aside className="col-4 card">
          <h2>Comments</h2>
          <div className="comments" style={{ borderTop: 0, paddingTop: 0 }}>
            {commentCount ? log.comments.map((comment: any) => (
              <div className="comment" key={comment.id}>
                <div>
                  <strong>{comment.profiles?.display_name ?? "Player"}</strong>
                  <p>{comment.body}</p>
                </div>
              </div>
            )) : <p className="muted">No comments yet.</p>}
          </div>
          <div className="divider" />
          <Link className="secondary inline-link" href="/"><Star size={16} /> Write your own review</Link>
        </aside>
      </section>
    </main>
  );
}

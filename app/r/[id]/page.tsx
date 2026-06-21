import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Heart, MessageCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

function stars(rating: number | null | undefined) {
  if (rating === null || rating === undefined) return "Unrated";
  const rounded = Math.round(rating * 2) / 2;
  const full = Math.floor(rounded);
  const half = rounded % 1 ? "½" : "";
  return `${"★".repeat(full)}${half}${"☆".repeat(Math.max(0, 5 - Math.ceil(rounded)))}`;
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
    .select("*, games(*), profiles(username, display_name, bio, avatar_url), review_likes(user_id), comments(id, body, created_at, profiles(username, display_name))")
    .eq("id", id)
    .maybeSingle();

  if (!log) notFound();

  const likeCount = log.review_likes?.length ?? 0;
  const commentCount = log.comments?.length ?? 0;

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

      <section className="hero single-hero">
        <div className="hero-card">
          <p className="eyebrow">Review permalink</p>
          <h1>{log.games?.title ?? "Unknown Game"}</h1>
          <p className="lede">
            {log.profiles?.display_name ?? "A player"} logged this as <strong>{log.status}</strong>.
          </p>
          <div className="tag-row">
            <span className="tag stars">{stars(log.rating)}</span>
            {log.vibe && <span className="tag">{log.vibe}</span>}
            {log.played_on && <span className="tag"><CalendarDays size={13} /> {log.played_on}</span>}
            <span className="tag"><Heart size={13} /> {likeCount}</span>
            <span className="tag"><MessageCircle size={13} /> {commentCount}</span>
          </div>
        </div>
      </section>

      <section className="grid">
        <article className="col-8 review-card">
          <div className="review-top">
            <div>
              <strong>{log.profiles?.display_name ?? "Player"}</strong>
              <p className="muted" style={{ margin: "4px 0 0" }}>@{log.profiles?.username ?? "player"}</p>
            </div>
            <div className="stars">{stars(log.rating)}</div>
          </div>
          <p style={{ margin: "18px 0", lineHeight: 1.7, fontSize: "1.08rem" }}>{log.review || "No written review."}</p>
          {log.games?.slug && <Link className="secondary inline-link" href={`/g/${log.games.slug}`}>View game page</Link>}
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
        </aside>
      </section>
    </main>
  );
}

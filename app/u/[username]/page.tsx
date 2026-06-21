import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CalendarDays } from "lucide-react";

function stars(rating: number | null | undefined) {
  if (!rating) return "Unrated";
  const rounded = Math.round(rating * 2) / 2;
  const full = Math.floor(rounded);
  const half = rounded % 1 ? "½" : "";
  return `${"★".repeat(full)}${half}${"☆".repeat(Math.max(0, 5 - Math.ceil(rounded)))}`;
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

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

  const { data: logs } = await supabase
    .from("game_logs")
    .select("*, games(*)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(40);

  const rated = (logs ?? []).filter((log) => log.rating !== null);
  const avgRating = rated.length
    ? (rated.reduce((sum, log) => sum + Number(log.rating), 0) / rated.length).toFixed(1)
    : "0.0";
  const completed = (logs ?? []).filter((log) => ["Completed", "100% Completed"].includes(log.status)).length;
  const backlog = (logs ?? []).filter((log) => ["Backlog", "Want to Play"].includes(log.status)).length;

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
          <p className="eyebrow">Public profile</p>
          <h1>{profile.display_name}</h1>
          <p className="lede">@{profile.username}</p>
          <p className="muted">{profile.bio || "No bio yet."}</p>
          <div className="tag-row">
            <span className="tag">Favorite: {profile.favorite_game || "Unset"}</span>
            <span className="tag">Logs: {logs?.length ?? 0}</span>
            <span className="tag">Completed: {completed}</span>
            <span className="tag">Backlog: {backlog}</span>
            <span className="tag">Avg: {avgRating}</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Recent logs</h2>
        <div className="feed">
          {(logs ?? []).length ? (logs ?? []).map((log) => (
            <article className="review-card" key={log.id}>
              <div className="review-top">
                <div>
                  <strong>{log.games?.title ?? "Unknown Game"}</strong>
                  <p className="muted" style={{ margin: "4px 0 0" }}>{log.status}</p>
                </div>
                <div className="stars">{stars(log.rating)}</div>
              </div>
              {log.review && <p style={{ margin: "13px 0 8px", lineHeight: 1.6 }}>{log.review}</p>}
              <div className="tag-row">
                {log.vibe && <span className="tag">{log.vibe}</span>}
                {log.played_on && <span className="tag"><CalendarDays size={13} /> {log.played_on}</span>}
              </div>
            </article>
          )) : <div className="empty">No logs yet.</div>}
        </div>
      </section>
    </main>
  );
}

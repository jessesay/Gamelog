import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Star } from "lucide-react";
import { createClient } from "@/utils/supabase/server";


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
      {game.cover_url ? (
        <img src={game.cover_url} alt={`${game.title} cover art`} />
      ) : (
        <div className="poster-fallback">
          <span className="poster-kicker">{game.genre ?? "Game"}</span>
          <div className="cover-title">{game.title}</div>
          <span className="poster-platforms">{(game.platforms ?? []).slice(0, 2).join(" · ")}</span>
        </div>
      )}
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

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

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

  const { data: logs } = await supabase
    .from("game_logs")
    .select("*, profiles(username, display_name), review_likes(user_id), comments(id)")
    .eq("game_id", game.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rated = (logs ?? []).filter((log) => log.rating !== null);
  const avgRating = rated.length ? (rated.reduce((sum, log) => sum + Number(log.rating), 0) / rated.length).toFixed(1) : "0.0";
  const completed = (logs ?? []).filter((log) => ["Completed", "100% Completed"].includes(log.status)).length;

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
          <p className="lede">{game.summary || "No summary yet."}</p>
          <div className="tag-row">
            <span className="tag"><Star size={13} /> Avg {avgRating}</span>
            <span className="tag">{logs?.length ?? 0} logs</span>
            <span className="tag">{completed} completed</span>
            {game.genre && <span className="tag">{game.genre}</span>}
            {(game.platforms ?? []).map((platform: string) => <span className="tag" key={platform}>{platform}</span>)}
          </div>
        </div>
        <aside className="side-panel card">
          <PublicGameCover game={game} />
          <h2>Details</h2>
          <p className="muted">Developer: {game.developer || "Unknown"}</p>
          <p className="muted">Publisher: {game.publisher || "Unknown"}</p>
          <p className="muted">Release: {game.release_year || "TBA"}</p>
          <div className="actions" style={{ marginTop: 12 }}>
            <Link className="primary inline-link" href="/">Log this in the app</Link>
            <a className="secondary inline-link" href={archiveSearchUrl(game.title)} target="_blank" rel="noreferrer">Find manuals/guides</a>
            {archiveDetailsUrl(game.summary) && <a className="secondary inline-link" href={archiveDetailsUrl(game.summary) ?? "#"} target="_blank" rel="noreferrer">Open Archive item</a>}
          </div>
        </aside>
      </section>

      <section className="card">
        <h2>Community reviews</h2>
        <div className="feed">
          {(logs ?? []).length ? logs?.map((log) => (
            <article className="review-card" key={log.id}>
              <div className="review-top">
                <div>
                  <strong>{log.profiles?.display_name ?? "Player"}</strong>
                  <p className="muted" style={{ margin: "4px 0 0" }}>@{log.profiles?.username ?? "player"} · {log.status}</p>
                </div>
                <div className="stars">{stars(log.rating)}</div>
              </div>
              {log.review && <p style={{ margin: "13px 0 8px", lineHeight: 1.6 }}>{log.review}</p>}
              <div className="tag-row">
                {log.vibe && <span className="tag">{log.vibe}</span>}
                {log.played_on && <span className="tag"><CalendarDays size={13} /> {log.played_on}</span>}
                <Link className="tag action-tag" href={`/r/${log.id}`}>Open review</Link>
              </div>
            </article>
          )) : <div className="empty">No logs for this game yet.</div>}
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, ListChecks, Share2, Star } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

function gameHue(game: any) {
  const seed = (game?.slug ?? game?.title ?? "list").split("").reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
  return seed % 360;
}

function coverStyle(game: any): CSSProperties {
  return { "--cover-hue": gameHue(game) } as CSSProperties;
}

function PublicCover({ game, compact = false }: { game: any; compact?: boolean }) {
  return (
    <div className={`cover poster-cover ${compact ? "public-compact-cover" : ""}`} style={coverStyle(game)}>
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

function stars(rating: number | null | undefined) {
  if (rating === null || rating === undefined) return "Unrated";
  const rounded = Math.round(rating * 2) / 2;
  const full = Math.floor(rounded);
  const half = rounded % 1 ? "½" : "";
  return `${"★".repeat(full)}${half}${"☆".repeat(Math.max(0, 5 - Math.ceil(rounded)))}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return { title: "GameLog list" };

  const { data: list } = await supabase
    .from("game_lists")
    .select("title, description, profiles(display_name, username)")
    .eq("id", id)
    .maybeSingle();

  if (!list) return { title: "GameLog list" };
  const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles;
  return {
    title: `${list.title} — GameLog list`,
    description: list.description || `A public GameLog list by ${owner?.display_name ?? owner?.username ?? "a player"}.`,
    openGraph: {
      title: `${list.title} — GameLog`,
      description: list.description || "A public GameLog list.",
      type: "article"
    }
  };
}

export default async function PublicListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  if (!supabase) {
    return (
      <main className="shell">
        <section className="card">
          <p className="eyebrow">GameLog list</p>
          <h1>Supabase is not connected yet.</h1>
          <p className="muted">Public list pages use the live database. Add your env variables and run the schema first.</p>
          <Link className="secondary inline-link" href="/">Back home</Link>
        </section>
      </main>
    );
  }

  const { data: list } = await supabase
    .from("game_lists")
    .select("*, profiles(username, display_name, avatar_url), list_items(id, position, created_at, games(*))")
    .eq("id", id)
    .maybeSingle();

  if (!list) notFound();

  const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles;
  const items = [...(list.list_items ?? [])].sort((a: any, b: any) => (a.position ?? 9999) - (b.position ?? 9999) || new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
  const coverGames = items.map((item: any) => item.games).filter(Boolean).slice(0, 5);

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

      <section className="hero public-list-hero">
        <div className="hero-card">
          <p className="eyebrow"><ListChecks size={14} /> Public list</p>
          <h1>{list.title}</h1>
          <p className="lede">by <Link href={`/u/${owner?.username ?? ""}`}>@{owner?.username ?? "player"}</Link></p>
          {list.description && <p className="muted public-description">{list.description}</p>}
          <div className="tag-row">
            <span className="tag">{items.length} games</span>
            {list.is_ranked && <span className="tag"><Star size={13} /> Ranked</span>}
            {list.created_at && <span className="tag"><CalendarDays size={13} /> {new Date(list.created_at).toLocaleDateString()}</span>}
          </div>
        </div>
        <div className="public-cover-stack">
          {coverGames.length ? coverGames.map((game: any) => <PublicCover key={game.id} game={game} compact />) : <div className="empty">No games yet.</div>}
        </div>
      </section>

      <section className="card">
        <div className="review-top">
          <div>
            <p className="eyebrow">List entries</p>
            <h2>{items.length ? "Games on this list" : "Empty list"}</h2>
          </div>
          <Link className="secondary inline-link" href="/"><Share2 size={16} /> Make your own</Link>
        </div>
        <div className="public-list-grid">
          {items.length ? items.map((item: any, index: number) => item.games ? (
            <article className="public-list-entry" key={item.id}>
              <span className="rank-number">#{index + 1}</span>
              <PublicCover game={item.games} />
              <div>
                <h3>{item.games.title}</h3>
                <p className="muted">{item.games.release_year ?? "TBA"} · {item.games.genre ?? "Game"}</p>
                <div className="tag-row">
                  {(item.games.platforms ?? []).slice(0, 3).map((platform: string) => <span className="tag" key={platform}>{platform}</span>)}
                </div>
                {item.games.slug && <Link className="tiny-link" href={`/g/${item.games.slug}`}>Open game page <ExternalLink size={12} /></Link>}
              </div>
            </article>
          ) : null) : <div className="empty">No games have been added to this list yet.</div>}
        </div>
      </section>
    </main>
  );
}

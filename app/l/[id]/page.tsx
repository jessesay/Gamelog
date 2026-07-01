import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, ListChecks, Lock, Share2, Star, Timer } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { completionEstimateForGame, formatCompletionTotal, totalCompletionHours } from "@/lib/timeToBeat";
import { safeServerError } from "@/lib/serverError";
import GameCoverArt from "@/components/GameCoverArt";

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
      <GameCoverArt src={game?.cover_url} title={game?.title ?? "Game"} genre={game?.genre} platforms={game?.platforms} compact={compact} />
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
    .eq("is_public", true)
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

  const { data: userResult } = await supabase.auth.getUser();
  const { data: list, error } = await supabase
    .from("game_lists")
    .select("*, profiles(username, display_name, avatar_url), list_items(id, position, created_at, games(*))")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return <main className="shell public-page-shell"><section className="card social-empty-v35"><h1>List could not load</h1><p className="muted">{safeServerError(error, "Please try this list again in a moment.")}</p><Link className="secondary inline-link" href="/">Back to GameLog</Link></section></main>;
  }
  if (!list || (list.is_public === false && list.user_id !== userResult.user?.id)) notFound();

  const owner = Array.isArray(list.profiles) ? list.profiles[0] : list.profiles;
  const items = [...(list.list_items ?? [])].sort((a: any, b: any) => (a.position ?? 9999) - (b.position ?? 9999) || new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
  const listGames = items.map((item: any) => item.games).filter(Boolean);
  const coverGames = listGames.slice(0, 5);
  const listHours = totalCompletionHours(listGames);

  return (
    <main className="shell public-page-shell">
      <header className="topbar">
        <div className="nav-inner">
          <Link className="brand ghost" href="/">
            <span className="logo">GL</span>
            <span>GameLog</span>
          </Link>
          <Link className="pill" href={list.user_id === userResult.user?.id ? "/app/lists" : "/"}>{list.user_id === userResult.user?.id ? "Manage list" : "Open app"}</Link>
        </div>
      </header>

      <section className="hero public-list-hero">
        <div className="hero-card">
          <p className="eyebrow">{list.is_public === false ? <Lock size={14} /> : <ListChecks size={14} />} {list.is_public === false ? "Private list" : "Public list"}</p>
          <h1>{list.title}</h1>
          <p className="lede">by <Link href={`/u/${owner?.username ?? ""}`}>@{owner?.username ?? "player"}</Link></p>
          {list.description && <p className="muted public-description">{list.description}</p>}
          <div className="tag-row">
            <span className="tag">{items.length} games</span>
            <span className="tag"><Timer size={13} /> {formatCompletionTotal(listHours)} to finish</span>
            {list.is_ranked && <span className="tag"><Star size={13} /> Ranked</span>}
            {list.created_at && <span className="tag"><CalendarDays size={13} /> {new Date(list.created_at).toLocaleDateString()}</span>}
          </div>
        </div>
        <div className="public-cover-stack">
          {coverGames.length ? coverGames.map((game: any) => <PublicCover key={game.id} game={game} compact />) : <div className="list-public-fallback-v37"><span>{list.title.slice(0, 2).toUpperCase()}</span><small>GameLog list</small></div>}
        </div>
      </section>

      <section className="card">
        <div className="review-top">
          <div>
            <p className="eyebrow">List entries</p>
            <h2>{items.length ? "Games on this list" : "Empty list"}</h2>
          </div>
          {list.is_public !== false ? <Link className="secondary inline-link" href="/"><Share2 size={16} /> Make your own</Link> : <span className="tag"><Lock size={13} /> Only you can see this</span>}
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
                  <span className="tag"><Timer size={13} /> {completionEstimateForGame(item.games).compactLabel}</span>
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

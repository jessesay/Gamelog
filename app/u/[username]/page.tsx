import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProfileStatusShelves from "@/components/ProfileStatusShelves";
import TasteMatchCard from "@/components/TasteMatchCard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { dedupeGameLogs } from "@/lib/social";
import { normalizeGameStatus } from "@/lib/gameStatus";
import { buildTasteProfile, calculateTasteMatch } from "@/lib/tasteMatch";
import { playerInsights } from "@/lib/playerInsights";
import TasteShareCard from "@/components/TasteShareCard";
import ShareButton from "@/components/ShareButton";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const { data: profile } = await supabaseAdmin.from("profiles").select("username, display_name, bio, favorite_game").eq("username", username).maybeSingle();
  if (!profile) return { title: `@${username} — GameLog` };
  return {
    title: `${profile.display_name} (@${profile.username}) — GameLog`,
    description: profile.bio || `${profile.display_name}'s gaming identity on GameLog.`,
    openGraph: { title: `${profile.display_name} on GameLog`, description: profile.bio || "See what they are playing, reviewing, and collecting.", type: "profile" },
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { data: profile } = await supabaseAdmin.from("profiles").select("id, username, display_name, bio, favorite_game, favorite_genres, favorite_platforms, avatar_url").eq("username", username).maybeSingle();
  if (!profile) notFound();

  const authClient = await createClient();
  const { data: authData } = authClient ? await authClient.auth.getUser() : { data: { user: null } };
  const viewer = authData.user;

  // Public profiles deliberately receive public profile fields, public log/review
  // data, and lists explicitly filtered to is_public. Owned/private lists are only
  // queried by the authenticated /app/profile page.
  const [{ data: logs }, { data: reviews }, { data: lists }, followerResult, followingResult] = await Promise.all([
    supabaseAdmin.from("game_logs").select("id, game_id, status, rating, review, played_on, created_at, updated_at, games(*)").eq("user_id", profile.id).order("updated_at", { ascending: false }).limit(250),
    supabaseAdmin.from("game_reviews").select("id, game_id, rating, body, created_at, updated_at, games(*)").eq("user_id", profile.id).order("updated_at", { ascending: false }).limit(250),
    supabaseAdmin.from("game_lists").select("id, title, description, is_public, created_at, updated_at, list_items(id, position, games(*))").eq("user_id", profile.id).eq("is_public", true).order("updated_at", { ascending: false }).limit(100),
    supabaseAdmin.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.id),
    supabaseAdmin.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profile.id),
  ]);

  const publicLogs = dedupeGameLogs(logs ?? []);
  const publicReviews = (reviews ?? []).map((review) => ({ ...review, review: review.body }));
  let tasteMatch = null;
  if (viewer && authClient) {
    const [viewerLogsResult, viewerReviewsResult, viewerListsResult] = await Promise.all([
      authClient.from("game_logs").select("game_id, status, rating, review, games(id, title, genre, genres, platforms)").eq("user_id", viewer.id).order("updated_at", { ascending: false }).limit(500),
      authClient.from("game_reviews").select("game_id, rating, body, games(id, title, genre, genres, platforms)").eq("user_id", viewer.id).order("updated_at", { ascending: false }).limit(500),
      authClient.from("game_lists").select("id, title, list_items(id, game_id, games(id, title, genre, genres, platforms))").eq("user_id", viewer.id).limit(200),
    ]);
    const viewerTaste = buildTasteProfile(viewerLogsResult.data ?? [], viewerReviewsResult.data ?? [], viewerListsResult.data ?? []);
    const ownerTaste = buildTasteProfile(publicLogs, publicReviews, lists ?? []);
    tasteMatch = calculateTasteMatch(viewerTaste, ownerTaste, viewer.id === profile.id);
  }
  const rated = publicReviews.filter((review) => review.rating !== null && review.rating !== undefined);
  const completed = publicLogs.filter((log) => ["played", "completed"].includes(normalizeGameStatus(log.status) ?? "")).length;
  const playing = publicLogs.filter((log) => normalizeGameStatus(log.status) === "playing").length;
  const avgRating = rated.length ? (rated.reduce((sum, review) => sum + Number(review.rating), 0) / rated.length).toFixed(1) : "0.0";
  const topGenres = [...publicLogs.reduce((map, log) => {
    const game = Array.isArray(log.games) ? log.games[0] : log.games;
    const genres = [...(game?.genres ?? []), game?.genre].filter(Boolean);
    for (const genre of new Set(genres)) map.set(genre, (map.get(genre) ?? 0) + 1);
    return map;
  }, new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const insights = playerInsights(publicLogs, profile.favorite_genres ?? [], profile.favorite_platforms ?? []);

  return (
    <main className="social-shell-v35 profile-identity-v39 public-identity-v39">
      <nav className="profile-public-nav-v39"><Link className="brand ghost" href="/"><span className="logo">GL</span><span>GameLog</span></Link><div className="actions"><ShareButton title="public_profile" text={`See ${profile.display_name}'s GameLog profile.`} url={`/u/${profile.username}`} /><Link className="secondary" href="/app">Open app</Link></div></nav>

      <section className="social-hero-v35 profile-identity-hero-v39">
        <div className="social-avatar-v35">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : profile.display_name.slice(0, 2).toUpperCase()}</div>
        <div><p className="eyebrow">Gaming identity</p><h1>{profile.display_name}</h1><p className="muted">@{profile.username}</p><p>{profile.bio || "This player is still writing their intro."}</p><div className="tag-row"><span className="tag">Favorite: {profile.favorite_game || "Unset"}</span><span className="tag">Followers: {followerResult.count ?? 0}</span><span className="tag">Following: {followingResult.count ?? 0}</span></div></div>
      </section>

      <section className="social-stat-grid-v35">
        <Stat label="Saved" value={insights.saved} /><Stat label="Playing now" value={playing} /><Stat label="Completed" value={completed} /><Stat label="Backlog Score" value={insights.backlogScore} />
      </section>

      <TasteShareCard ownerName={profile.display_name} username={profile.username} genres={insights.genres} platforms={insights.platforms} backlogCount={insights.saved} backlogScore={insights.backlogScore} scoreLabel={insights.scoreLabel} recommendation={insights.recommendations[0]} />

      <TasteMatchCard ownerName={profile.display_name} match={tasteMatch} />

      <section className="profile-taste-v39">
        <div><p className="eyebrow">Taste fingerprint</p><h2>What {profile.display_name} plays</h2></div>
        <div className="profile-genre-row-v39">{topGenres.length ? topGenres.map(([genre, count]) => <span key={genre}>{genre}<b>{count}</b></span>) : insights.genres.map((genre) => <span key={genre}>{genre}</span>)}{insights.platforms.map((platform) => <span key={platform}>{platform}</span>)}{!topGenres.length && !insights.genres.length && !insights.platforms.length ? <p className="muted">Taste tags will appear as this profile grows.</p> : null}</div>
      </section>

      <ProfileStatusShelves logs={publicLogs} reviews={publicReviews} lists={lists ?? []} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <article className="social-stat-v35"><strong>{value}</strong><span>{label}</span></article>;
}

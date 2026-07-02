import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileEditor from "@/components/ProfileEditor";
import ProfileStatusShelves from "@/components/ProfileStatusShelves";
import AuthPanel from "@/components/AuthPanel";
import { createClient } from "@/utils/supabase/server";
import { dedupeGameLogs, getSignedInProfile } from "@/lib/social";
import { normalizeGameStatus } from "@/lib/gameStatus";
import { playerInsights } from "@/lib/playerInsights";
import TasteShareCard from "@/components/TasteShareCard";
import { normalizeDiscoveryPreferences } from "@/lib/discoveryPreferences";

export default async function MyProfilePage() {
  const supabase = await createClient();
  if (!supabase) return <SetupState title="Profile sign-in is not configured yet" body="Add the Supabase browser key to enable account profiles." />;

  const { user, profile } = await getSignedInProfile(supabase);
  if (!profile) {
    if (user) redirect("/app/onboarding");
    return <SetupState title="Sign in to build your profile" body="Your shelves, reviews, lists, and gaming identity are tied to your GameLog account." auth />;
  }

  const [{ data: logs }, { data: canonicalReviews }, { data: lists }, followerResult, followingResult, { data: discoveryPreferences }] = await Promise.all([
    supabase.from("game_logs").select("*, games(*)").eq("user_id", profile.id).order("updated_at", { ascending: false }).limit(250),
    supabase.from("game_reviews").select("*, games(*)").eq("user_id", profile.id).order("updated_at", { ascending: false }).limit(250),
    supabase.from("game_lists").select("*, list_items(id, position, games(*))").eq("user_id", profile.id).order("updated_at", { ascending: false }).limit(100),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profile.id),
    supabase.from("discovery_preferences").select("favorite_platforms,favorite_genres,favorite_games,discovery_styles,completed").eq("user_id", profile.id).maybeSingle(),
  ]);

  const myLogs = dedupeGameLogs(logs ?? []);
  const logsByGame = new Map(myLogs.map((log) => [log.game_id, log]));
  const reviews = (canonicalReviews ?? []).map((review) => ({
    ...review,
    log_id: logsByGame.get(review.game_id)?.id,
    review: review.body,
  }));
  const rated = reviews.filter((review) => review.rating !== null && review.rating !== undefined);
  const completed = myLogs.filter((log) => ["played", "completed"].includes(normalizeGameStatus(log.status) ?? "")).length;
  const playing = myLogs.filter((log) => normalizeGameStatus(log.status) === "playing").length;
  const avgRating = rated.length ? (rated.reduce((sum, review) => sum + Number(review.rating), 0) / rated.length).toFixed(1) : "0.0";
  const onboardingTaste = normalizeDiscoveryPreferences(discoveryPreferences);
  const insights = playerInsights(myLogs, onboardingTaste.favorite_genres.length ? onboardingTaste.favorite_genres : profile.favorite_genres ?? [], onboardingTaste.favorite_platforms.length ? onboardingTaste.favorite_platforms : profile.favorite_platforms ?? []);

  return (
    <main className="social-shell-v35 profile-identity-v39">
      <section className="social-hero-v35 profile-identity-hero-v39">
        <div className="social-avatar-v35">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : profile.display_name.slice(0, 2).toUpperCase()}</div>
        <div><p className="eyebrow">My gaming identity</p><h1>{profile.display_name}</h1><p className="muted">@{profile.username}</p><p>{profile.bio || "Add a bio and tell people what kind of player you are."}</p><div className="tag-row"><span className="tag">Favorite: {profile.favorite_game || "Unset"}</span><span className="tag">Followers: {followerResult.count ?? 0}</span><span className="tag">Following: {followingResult.count ?? 0}</span><Link className="tag action-tag" href={`/u/${profile.username}`}>View public profile</Link><Link className="tag action-tag" href="/feedback?from=/app/profile">Send feedback</Link></div></div>
      </section>

      <section className="social-stat-grid-v35">
        <Stat label="Playing now" value={playing} /><Stat label="Completed" value={completed} /><Stat label="Saved" value={insights.saved} /><Stat label="Backlog Score" value={insights.backlogScore} />
      </section>

      <TasteShareCard ownerName={profile.display_name} username={profile.username} genres={insights.genres} platforms={insights.platforms} moods={onboardingTaste.favorite_moods} backlogCount={insights.saved} backlogScore={insights.backlogScore} scoreLabel={insights.scoreLabel} recommendation={insights.recommendations[0]} />
      <div className="profile-taste-actions-v318"><Link className="secondary" href="/app/discover?retake=1">Edit taste</Link><Link className="secondary" href="/app/discover?retake=1">Retake onboarding</Link></div>
      <ProfileEditor profile={profile} />
      <ProfileStatusShelves logs={myLogs} reviews={reviews} lists={lists ?? []} editable listsHref="/app/lists" />
    </main>
  );
}

function SetupState({ title, body, auth = false }: { title: string; body: string; auth?: boolean }) {
  return <main className="social-shell-v35"><section className="social-card-v35 social-empty-v35"><p className="eyebrow">GameLog profile</p><h1>{title}</h1><p className="muted">{body}</p>{auth ? <AuthPanel /> : null}</section></main>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <article className="social-stat-v35"><strong>{value}</strong><span>{label}</span></article>;
}

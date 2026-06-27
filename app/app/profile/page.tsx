import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileEditor from "@/components/ProfileEditor";
import ReviewActions from "@/components/ReviewActions";
import AuthPanel from "@/components/AuthPanel";
import { createClient } from "@/utils/supabase/server";
import { dedupeGameLogs, displayStars, gamePath, getSignedInProfile } from "@/lib/social";

export default async function MyProfilePage() {
  const supabase = await createClient();

  if (!supabase) {
    return <SetupState title="Profile sign-in is not configured yet" body="Add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable account profiles. Public social pages and Discover can still read through the server connection." />;
  }

  const { user, profile } = await getSignedInProfile(supabase);

  if (!profile) {
    if (user) redirect("/app/onboarding");
    return <SetupState title="Sign in to build your profile" body="Profiles, reviews, lists, follows, and your activity feed are tied to a signed-in GameLog account." auth />;
  }

  const [{ data: logs }, { data: canonicalReviews }, { data: lists }, followerResult, followingResult] = await Promise.all([
    supabase
      .from("game_logs")
      .select("*, games(*)")
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
      .select("*, list_items(id, games(*))")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profile.id),
  ]);

  const myLogs = dedupeGameLogs(logs ?? []);
  const logsByGame = new Map(myLogs.map((log) => [log.game_id, log]));
  const reviews = (canonicalReviews ?? []).map((review) => {
    const log = logsByGame.get(review.game_id);
    return {
      ...log,
      id: review.id,
      log_id: log?.id,
      game_id: review.game_id,
      games: review.games,
      review: review.body,
      rating: review.rating,
      created_at: review.created_at,
    };
  });
  const rated = reviews.filter((review) => review.rating !== null && review.rating !== undefined);
  const played = myLogs.filter((log) => ["Completed", "100% Completed", "Currently Playing", "Replaying"].includes(log.status));
  const wishlist = myLogs.filter((log) => ["Want to Play", "Backlog"].includes(log.status)).slice(0, 8);
  const avgRating = rated.length ? (rated.reduce((sum, log) => sum + Number(log.rating), 0) / rated.length).toFixed(1) : "0.0";

  return (
    <main className="social-shell-v35">
      <section className="social-hero-v35">
        <div className="social-avatar-v35">
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : profile.display_name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="eyebrow">My profile</p>
          <h1>{profile.display_name}</h1>
          <p className="muted">@{profile.username}</p>
          <p>{profile.bio || "Add a bio to make your GameLog feel like yours."}</p>
          <div className="tag-row">
            <span className="tag">Favorite: {profile.favorite_game || "Unset"}</span>
            <span className="tag">Followers: {followerResult.count ?? 0}</span>
            <span className="tag">Following: {followingResult.count ?? 0}</span>
            <Link className="tag action-tag" href={`/u/${profile.username}`}>View public profile</Link>
          </div>
        </div>
      </section>

      <section className="social-stat-grid-v35">
        <Stat label="Games played" value={played.length} />
        <Stat label="Reviews" value={reviews.length} />
        <Stat label="Lists" value={(lists ?? []).length} />
        <Stat label="Average rating" value={avgRating} />
      </section>

      <ProfileEditor profile={profile} />

      <section className="social-grid-v35">
        <div className="social-card-v35">
          <div className="social-section-head-v35">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h2>What you have been playing</h2>
            </div>
            <Link className="secondary" href="/app/activity">All activity</Link>
          </div>
          <ReviewList logs={myLogs.slice(0, 8)} editable />
        </div>

        <div className="social-card-v35">
          <p className="eyebrow">Wishlist</p>
          <h2>Want to play</h2>
          <GameShelf logs={wishlist} empty="Wishlist a game from Discover or a game page." />
        </div>
      </section>

      <section className="social-card-v35">
        <div className="social-section-head-v35">
          <div>
            <p className="eyebrow">Recent reviews</p>
            <h2>Your latest takes</h2>
          </div>
        </div>
        <ReviewList logs={reviews.slice(0, 8)} editable />
      </section>
    </main>
  );
}

function SetupState({ title, body, auth = false }: { title: string; body: string; auth?: boolean }) {
  return (
    <main className="social-shell-v35">
      <section className="social-card-v35 social-empty-v35">
        <p className="eyebrow">GameLog social</p>
        <h1>{title}</h1>
        <p className="muted">{body}</p>
        {auth ? <AuthPanel /> : null}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="social-stat-v35">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function ReviewList({ logs, editable = false }: { logs: any[]; editable?: boolean }) {
  if (!logs.length) return <div className="empty">No reviews yet.</div>;
  return (
    <div className="social-list-v35">
      {logs.map((log) => (
        <article className="social-row-v35" key={log.id}>
          {log.games?.cover_url ? <img src={log.games.cover_url} alt="" /> : <div className="social-cover-fallback-v35">GL</div>}
          <div>
            <strong>{log.games?.title ?? "Unknown game"}</strong>
            <p className="muted">{log.status} · {displayStars(log.rating)}</p>
            {log.review ? <p>{log.review}</p> : null}
            {log.games ? <Link className="tiny-link" href={gamePath(log.games)}>Open game page</Link> : null}
            {editable && log.log_id ? <ReviewActions reviewId={log.log_id} initialReview={log.review} initialRating={log.rating} /> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function GameShelf({ logs, empty }: { logs: any[]; empty: string }) {
  if (!logs.length) return <div className="empty">{empty}</div>;
  return (
    <div className="social-poster-row-v35">
      {logs.map((log) => log.games ? (
        <Link href={gamePath(log.games)} key={log.id}>
          {log.games.cover_url ? <img src={log.games.cover_url} alt="" /> : <span>{log.games.title}</span>}
        </Link>
      ) : null)}
    </div>
  );
}

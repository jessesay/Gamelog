import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { displayStars, gamePath } from "@/lib/social";
import { safeServerError } from "@/lib/serverError";

export default async function ActivityPage() {
  const [{ data: events, error }, { data: recentReviews, error: reviewError }] = await Promise.all([
    supabaseAdmin
      .from("activity_events")
      .select("*, games(*), profiles(username, display_name, avatar_url), game_reviews(*)")
      .order("created_at", { ascending: false })
      .limit(60),
    supabaseAdmin
      .from("game_reviews")
      .select("id, user_id, game_id, rating, body")
      .order("updated_at", { ascending: false })
      .limit(120),
  ]);

  if (error || reviewError) {
    return (
      <main className="social-shell-v35">
        <section className="social-card-v35 social-empty-v35">
          <h1>Activity could not load</h1>
          <p className="muted">{safeServerError(error ?? reviewError, "Please try loading activity again.")}</p>
        </section>
      </main>
    );
  }
  const reviewsByUserGame = new Map((recentReviews ?? []).map((review) => [`${review.user_id}:${review.game_id}`, review]));

  return (
    <main className="social-shell-v35">
      <section className="social-page-head-v35">
        <p className="eyebrow">Activity</p>
        <h1>What people are playing</h1>
        <p className="muted">Recent reviews, ratings, wishlist adds, and played logs from the GameLog community.</p>
      </section>

      <section className="social-card-v35">
        <div className="social-list-v35">
          {(events ?? []).length ? (events ?? []).map((event: any) => {
            const review = event.game_reviews ?? reviewsByUserGame.get(`${event.user_id}:${event.game_id}`);
            return (
            <article className="social-row-v35" key={event.id}>
              {event.games?.cover_url ? <img src={event.games.cover_url} alt="" /> : <div className="social-cover-fallback-v35">GL</div>}
              <div>
                <p className="muted">
                  <Link href={`/u/${event.profiles?.username ?? "player"}`}>@{event.profiles?.username ?? "player"}</Link>
                  {" "}{activityLabel(event.event_type)}
                </p>
                <strong>{event.games?.title ?? "Unknown game"}</strong>
                {review?.rating || event.metadata?.rating
                  ? <p className="muted">{displayStars(review?.rating ?? event.metadata?.rating)}</p>
                  : null}
                {review?.body ? <p>{review.body}</p> : null}
                <div className="tag-row">
                  {event.games ? <Link className="tag action-tag" href={gamePath(event.games)}>Game page</Link> : null}
                </div>
              </div>
            </article>
          )}) : <div className="empty">No public activity yet.</div>}
        </div>
      </section>
    </main>
  );
}

function activityLabel(eventType: string) {
  if (eventType === "reviewed") return "reviewed";
  if (eventType === "rated") return "rated";
  if (eventType === "wishlisted") return "wishlisted";
  if (eventType === "listed") return "added to a list";
  if (eventType === "followed") return "followed a player";
  return "played";
}

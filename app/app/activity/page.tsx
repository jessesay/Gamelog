import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { displayStars, gamePath } from "@/lib/social";
import { safeServerError } from "@/lib/serverError";
import GameCoverArt from "@/components/GameCoverArt";

export default async function ActivityPage() {
  const [{ data: events, error }, { data: recentReviews, error: reviewError }] = await Promise.all([
    supabaseAdmin
      .from("activity_events")
      .select("*, games(*), profiles(username, display_name, avatar_url), game_reviews(*), game_lists(id, title, is_public)")
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
  const visibleEvents = (events ?? []).filter((event: any, index, allEvents) => {
    if (!event.review_id) return true;
    return allEvents.findIndex((candidate: any) => (
      candidate.review_id === event.review_id && candidate.event_type === event.event_type
    )) === index;
  });

  return (
    <main className="social-shell-v35">
      <section className="social-page-head-v35">
        <p className="eyebrow">Activity</p>
        <h1>What people are playing</h1>
        <p className="muted">Recent reviews, ratings, wishlist adds, and played logs from the GameLog community.</p>
      </section>

      <section className="social-card-v35">
        <div className="social-list-v35">
          {visibleEvents.length ? visibleEvents.map((event: any) => {
            const review = ["reviewed", "rated"].includes(event.event_type)
              ? event.game_reviews ?? reviewsByUserGame.get(`${event.user_id}:${event.game_id}`)
              : null;
            const createdList = event.metadata?.action === "created-list";
            return (
            <article className="social-row-v35" key={event.id}>
              {event.games ? <GameCoverArt src={event.games.cover_url} title={event.games.title} genre={event.games.genre} compact decorative /> : <div className="social-cover-fallback-v35">GL</div>}
              <div>
                <p className="muted">
                  <Link href={`/u/${event.profiles?.username ?? "player"}`}>@{event.profiles?.username ?? "player"}</Link>
                  {" "}{activityLabel(event)}
                </p>
                <strong>{createdList ? event.game_lists?.title ?? event.metadata?.list_title ?? "Untitled list" : event.games?.title ?? "Unknown game"}</strong>
                {!createdList && (review?.rating || event.metadata?.rating)
                  ? <p className="muted">{displayStars(review?.rating ?? event.metadata?.rating)}</p>
                  : null}
                {!createdList && review?.body ? <p>{review.body}</p> : null}
                <div className="tag-row">
                  {createdList && event.list_id ? <Link className="tag action-tag" href={`/l/${event.list_id}`}>Open list</Link> : null}
                  {!createdList && event.games ? <Link className="tag action-tag" href={gamePath(event.games)}>Game page</Link> : null}
                </div>
              </div>
            </article>
          )}) : <div className="empty">No public activity yet.</div>}
        </div>
      </section>
    </main>
  );
}

function activityLabel(event: any) {
  if (event.metadata?.action === "created-list") return "created a list";
  const eventType = event.event_type;
  if (eventType === "reviewed") return "reviewed";
  if (eventType === "rated") return "rated";
  if (eventType === "wishlisted") return "wishlisted";
  if (eventType === "listed") return "added to a list";
  if (eventType === "followed") return "followed a player";
  return "played";
}

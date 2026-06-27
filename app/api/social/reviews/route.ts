import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { safeServerError } from "@/lib/serverError";

async function getUser() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null };
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

async function insertActivity(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, payload: Record<string, unknown>) {
  await supabase.from("activity_events").insert(payload);
}

async function syncCanonicalReview(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  payload: { user_id: string; game_id: string; rating: number | null; review: string | null }
) {
  const { data: existing, error: existingError } = await supabase
    .from("game_reviews")
    .select("id")
    .eq("user_id", payload.user_id)
    .eq("game_id", payload.game_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;

  const reviewPayload = {
    user_id: payload.user_id,
    game_id: payload.game_id,
    rating: payload.rating,
    body: payload.review,
    updated_at: new Date().toISOString(),
  };
  const query = existing?.id
    ? supabase.from("game_reviews").update(reviewPayload).eq("id", existing.id).eq("user_id", payload.user_id)
    : supabase.from("game_reviews").insert(reviewPayload);
  const { data: review, error: reviewError } = await query.select("id").single();
  if (reviewError) throw reviewError;
  return review;
}

async function syncRating(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  payload: { user_id: string; game_id: string; rating: number | null }
) {
  if (payload.rating !== null) {
    await supabase
      .from("game_ratings")
      .upsert({ user_id: payload.user_id, game_id: payload.game_id, rating: payload.rating }, { onConflict: "user_id,game_id" });
    return;
  }
  await supabase.from("game_ratings").delete().eq("user_id", payload.user_id).eq("game_id", payload.game_id);
}

function revalidateReviewPages(game: any, username?: string | null) {
  if (game?.slug) {
    revalidatePath(`/g/${game.slug}`);
    revalidatePath(`/game/${game.slug}`);
  }
  if (game?.id) revalidatePath(`/games/${game.id}`);
  if (username) revalidatePath(`/u/${username}`);
  revalidatePath("/app/profile");
  revalidatePath("/app/activity");
}

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  if (!user) return NextResponse.json({ error: "Sign in to review games." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("id, username").eq("id", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Finish onboarding before reviewing games." }, { status: 428 });

  const body = await request.json();
  const isStatusOnly = body.intent === "status";
  const parsedRating = body.rating === null || body.rating === undefined ? null : Number(body.rating);
  if (parsedRating !== null && !Number.isFinite(parsedRating)) {
    return NextResponse.json({ error: "Rating must be a number from 1 to 5." }, { status: 400 });
  }
  const rating = parsedRating === null ? null : Math.max(1, Math.min(5, parsedRating));
  const status = body.status === "Wishlist" ? "Want to Play" : body.status === "Played" ? "Completed" : String(body.status ?? "Completed");
  if (!["Want to Play", "Completed"].includes(status)) {
    return NextResponse.json({ error: "Invalid review status." }, { status: 400 });
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, slug")
    .eq("id", String(body.gameId ?? ""))
    .maybeSingle();
  if (gameError) return NextResponse.json({ error: safeServerError(gameError, "Could not load that game.") }, { status: 500 });
  if (!game) return NextResponse.json({ error: "That game no longer exists in the catalog." }, { status: 400 });

  const { data: existing, error: existingError } = await supabase
    .from("game_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("game_id", game.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: safeServerError(existingError, "Could not load your existing review.") }, { status: 500 });

  const payload = {
    user_id: user.id,
    game_id: game.id,
    status,
    rating,
    review: body.review ? String(body.review).slice(0, 4000) : null,
    played_on: status === "Completed" ? new Date().toISOString().slice(0, 10) : null,
  };

  const updatePayload = isStatusOnly
    ? { status, played_on: status === "Completed" ? new Date().toISOString().slice(0, 10) : null }
    : { status, rating, review: payload.review, played_on: status === "Completed" ? new Date().toISOString().slice(0, 10) : null };
  const query = existing?.id
    ? supabase
        .from("game_logs")
        .update(updatePayload)
        .eq("id", existing.id)
        .eq("user_id", user.id)
    : supabase.from("game_logs").insert(payload);

  const { data, error } = await query
    .select("*, games(*)")
    .single();

  if (error) return NextResponse.json({ error: safeServerError(error, "Could not save your game log.") }, { status: 500 });
  const eventType = status === "Want to Play" ? "wishlisted" : !isStatusOnly && payload.review ? "reviewed" : !isStatusOnly && payload.rating ? "rated" : "played";
  try {
    const canonicalReview = isStatusOnly ? null : await syncCanonicalReview(supabase, payload);
    if (!isStatusOnly) await syncRating(supabase, payload).catch(() => undefined);
    await insertActivity(supabase, {
      user_id: payload.user_id,
      game_id: payload.game_id,
      review_id: canonicalReview?.id ?? null,
      event_type: eventType,
      metadata: { rating: payload.rating, has_review: Boolean(payload.review) },
    }).catch(() => undefined);
  } catch (socialError) {
    return NextResponse.json({ error: safeServerError(socialError, "Could not publish the review.") }, { status: 500 });
  }
  revalidateReviewPages(data.games ?? game, profile.username);
  return NextResponse.json({ review: data });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  if (!user) return NextResponse.json({ error: "Sign in to edit reviews." }, { status: 401 });

  const body = await request.json();
  const parsedRating = body.rating === null || body.rating === undefined ? null : Number(body.rating);
  if (parsedRating !== null && !Number.isFinite(parsedRating)) {
    return NextResponse.json({ error: "Rating must be a number from 1 to 5." }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("game_logs")
    .update({
      rating: parsedRating === null ? null : Math.max(1, Math.min(5, parsedRating)),
      review: body.review ? String(body.review).slice(0, 4000) : null,
      status: body.status ? String(body.status) : undefined,
    })
    .eq("id", body.reviewId)
    .eq("user_id", user.id)
    .select("*, games(*)")
    .single();

  if (error) return NextResponse.json({ error: safeServerError(error, "Could not update that review.") }, { status: 500 });
  try {
    const canonicalReview = await syncCanonicalReview(supabase, {
      user_id: user.id,
      game_id: data.game_id,
      rating: data.rating,
      review: data.review,
    });
    await syncRating(supabase, { user_id: user.id, game_id: data.game_id, rating: data.rating }).catch(() => undefined);
    await insertActivity(supabase, {
      user_id: user.id,
      game_id: data.game_id,
      review_id: canonicalReview.id,
      event_type: data.review ? "reviewed" : "rated",
      metadata: { rating: data.rating, edited: true },
    }).catch(() => undefined);
  } catch (socialError) {
    return NextResponse.json({ error: safeServerError(socialError, "Could not update the published review.") }, { status: 500 });
  }
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  revalidateReviewPages(data.games, profile?.username);
  return NextResponse.json({ review: data });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  if (!user) return NextResponse.json({ error: "Sign in to delete reviews." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const reviewId = searchParams.get("reviewId");
  if (!reviewId) return NextResponse.json({ error: "Missing reviewId." }, { status: 400 });

  const { data: log, error: logError } = await supabase
    .from("game_logs")
    .select("game_id, games(id, slug)")
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (logError) return NextResponse.json({ error: safeServerError(logError, "Could not load that review.") }, { status: 500 });
  if (!log) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  const { error } = await supabase.from("game_logs").delete().eq("id", reviewId).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: safeServerError(error, "Could not delete that review.") }, { status: 500 });
  const [{ error: reviewError }, { error: ratingError }] = await Promise.all([
    supabase.from("game_reviews").delete().eq("user_id", user.id).eq("game_id", log.game_id),
    supabase.from("game_ratings").delete().eq("user_id", user.id).eq("game_id", log.game_id),
  ]);
  if (reviewError || ratingError) {
    return NextResponse.json({ error: safeServerError(reviewError ?? ratingError, "The review was removed, but related rating data could not be cleaned up.") }, { status: 500 });
  }
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  revalidateReviewPages(log.games, profile?.username);
  return NextResponse.json({ ok: true });
}

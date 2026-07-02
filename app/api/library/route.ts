import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { gameStatusKeys, normalizeGameStatus, toStorageStatus } from "@/lib/gameStatus";
import { encodeLibraryVibe, libraryMetaFromLog } from "@/lib/libraryMeta";
import { safeServerError } from "@/lib/serverError";

function refreshLibraryPaths(slug?: string | null) {
  revalidatePath("/backlog");
  revalidatePath("/play-next");
  revalidatePath("/app/profile");
  if (slug) { revalidatePath(`/g/${slug}`); revalidatePath(`/game/${slug}`); }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Library storage is not configured." }, { status: 500 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in to sync your library." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const gameId = String(body.gameId ?? "");
  const { data: game } = await supabase.from("games").select("id,slug").eq("id", gameId).maybeSingle();
  if (!game) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  const { data: existing, error: readError } = await supabase.from("game_logs").select("*").eq("user_id", auth.user.id).eq("game_id", gameId).maybeSingle();
  if (readError) return NextResponse.json({ error: safeServerError(readError, "Could not load this library entry.") }, { status: 500 });
  const current = libraryMetaFromLog(existing);
  const requestedStatus = body.status === undefined ? current.status : normalizeGameStatus(body.status);
  if (!requestedStatus || !gameStatusKeys.includes(requestedStatus)) return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
  const ratingValue = body.rating === undefined ? current.rating : body.rating === null || body.rating === "" ? null : Number(body.rating);
  if (ratingValue !== null && (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 10)) return NextResponse.json({ error: "Rating must be a whole number from 1 to 10." }, { status: 400 });
  const hoursValue = body.hoursPlayed === undefined ? current.hoursPlayed : body.hoursPlayed === null || body.hoursPlayed === "" ? null : Number(body.hoursPlayed);
  if (hoursValue !== null && (!Number.isFinite(hoursValue) || hoursValue < 0 || hoursValue > 100000)) return NextResponse.json({ error: "Hours played must be zero or more." }, { status: 400 });
  const notes = body.notes === undefined ? current.notes : String(body.notes).trim().slice(0, 4000);
  const payload = {
    user_id: auth.user.id,
    game_id: gameId,
    status: toStorageStatus(requestedStatus),
    rating: ratingValue === null ? null : ratingValue / 2,
    review: notes || null,
    vibe: encodeLibraryVibe(requestedStatus, hoursValue),
    played_on: requestedStatus === "completed" ? new Date().toISOString().slice(0, 10) : existing?.played_on ?? null,
  };
  const query = existing?.id
    ? supabase.from("game_logs").update(payload).eq("id", existing.id).eq("user_id", auth.user.id)
    : supabase.from("game_logs").insert(payload);
  const { data: saved, error } = await query.select("*, games(*)").single();
  if (error) return NextResponse.json({ error: safeServerError(error, "Could not save your library entry.") }, { status: 500 });
  refreshLibraryPaths(game.slug);
  return NextResponse.json({ item: saved, meta: libraryMetaFromLog(saved) });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Library storage is not configured." }, { status: 500 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in to sync your library." }, { status: 401 });
  const gameId = new URL(request.url).searchParams.get("gameId");
  if (!gameId) return NextResponse.json({ error: "Missing gameId." }, { status: 400 });
  const { data: game } = await supabase.from("games").select("slug").eq("id", gameId).maybeSingle();
  const { error } = await supabase.from("game_logs").delete().eq("user_id", auth.user.id).eq("game_id", gameId);
  if (error) return NextResponse.json({ error: safeServerError(error, "Could not remove this game.") }, { status: 500 });
  await Promise.all([
    supabase.from("game_reviews").delete().eq("user_id", auth.user.id).eq("game_id", gameId),
    supabase.from("game_ratings").delete().eq("user_id", auth.user.id).eq("game_id", gameId),
  ]);
  refreshLibraryPaths(game?.slug);
  return NextResponse.json({ ok: true });
}

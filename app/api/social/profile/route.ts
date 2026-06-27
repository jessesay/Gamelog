import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { safeServerError } from "@/lib/serverError";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) return NextResponse.json({ error: "Sign in to edit your profile." }, { status: 401 });

  const body = await request.json();
  const username = String(body.username ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);

  if (username.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
  }
  const displayName = String(body.display_name ?? "").trim().slice(0, 80);
  if (!displayName) return NextResponse.json({ error: "Display name is required." }, { status: 400 });

  const { data: usernameOwner, error: usernameError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (usernameError) return NextResponse.json({ error: safeServerError(usernameError, "Could not check that username.") }, { status: 500 });
  if (usernameOwner) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });

  const profilePayload: Record<string, unknown> = {
    id: user.id,
    username,
    display_name: displayName,
    avatar_url: body.avatar_url ? String(body.avatar_url).trim().slice(0, 500) : null,
    bio: body.bio ? String(body.bio).trim().slice(0, 500) : "",
    favorite_game: body.favorite_game ? String(body.favorite_game).trim().slice(0, 140) : "",
  };
  if (Array.isArray(body.favorite_games)) {
    profilePayload.favorite_games = body.favorite_games.map((item: unknown) => String(item).trim().slice(0, 140)).filter(Boolean).slice(0, 3);
  }
  if (Array.isArray(body.favorite_platforms)) {
    profilePayload.favorite_platforms = body.favorite_platforms.map((item: unknown) => String(item).trim().slice(0, 80)).filter(Boolean).slice(0, 8);
  }
  if (Array.isArray(body.favorite_genres)) {
    profilePayload.favorite_genres = body.favorite_genres.map((item: unknown) => String(item).trim().slice(0, 80)).filter(Boolean).slice(0, 8);
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(profilePayload)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: safeServerError(error, "Could not save your profile.") }, { status: 500 });
  revalidatePath("/app/profile");
  revalidatePath(`/u/${username}`);
  return NextResponse.json({ profile: data });
}

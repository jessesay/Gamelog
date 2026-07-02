import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { emptyDiscoveryPreferences, normalizeDiscoveryPreferences } from "@/lib/discoveryPreferences";
import { safeServerError } from "@/lib/serverError";

async function getUser() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null };
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export async function GET() {
  const { supabase, user } = await getUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  if (!user) return NextResponse.json({ preferences: emptyDiscoveryPreferences, signedIn: false });

  const [{ data: preferences, error }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("discovery_preferences").select("favorite_platforms, favorite_genres, favorite_games, discovery_styles, completed").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("favorite_platforms, favorite_genres, favorite_games, favorite_game").eq("id", user.id).maybeSingle(),
  ]);
  if (error || profileError) return NextResponse.json({ error: safeServerError(error || profileError, "Could not load discovery preferences.") }, { status: 500 });

  const merged = normalizeDiscoveryPreferences({
    favorite_platforms: preferences?.favorite_platforms?.length ? preferences.favorite_platforms : profile?.favorite_platforms,
    favorite_genres: preferences?.favorite_genres?.length ? preferences.favorite_genres : profile?.favorite_genres,
    favorite_games: preferences?.favorite_games?.length ? preferences.favorite_games : profile?.favorite_games?.length ? profile.favorite_games : [profile?.favorite_game].filter(Boolean),
    discovery_styles: preferences?.discovery_styles,
    completed: preferences?.completed,
  });
  return NextResponse.json({ preferences: merged, signedIn: true });
}

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  if (!user) return NextResponse.json({ error: "Sign in to save your taste profile." }, { status: 401 });

  const { data: profile, error: profileError } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: safeServerError(profileError, "Could not load your profile.") }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Finish account onboarding before syncing discovery preferences." }, { status: 428 });

  const preferences = normalizeDiscoveryPreferences(await request.json().catch(() => null));
  const { error } = await supabase.from("discovery_preferences").upsert({
    user_id: user.id,
    favorite_platforms: preferences.favorite_platforms,
    favorite_genres: preferences.favorite_genres,
    favorite_games: preferences.favorite_games,
    discovery_styles: [...preferences.discovery_styles, ...preferences.favorite_moods.map((mood) => `mood:${mood}`)],
    completed: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: safeServerError(error, "Could not save discovery preferences.") }, { status: 500 });
  return NextResponse.json({ preferences: { ...preferences, completed: true } });
}

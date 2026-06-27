import type { SupabaseClient } from "@supabase/supabase-js";

export function displayStars(rating: number | null | undefined) {
  if (rating === null || rating === undefined) return "Unrated";
  const rounded = Math.round(Number(rating) * 2) / 2;
  const full = Math.floor(rounded);
  const half = rounded % 1 ? "1/2" : "";
  return `${"*".repeat(full)}${half}${"-".repeat(Math.max(0, 5 - Math.ceil(rounded)))}`;
}

export function gamePath(game: { slug?: string | null; id?: string | null }) {
  return game.slug ? `/game/${game.slug}` : `/games/${game.id}`;
}

export function dedupeGameLogs<T extends { game_id?: string | null; user_id?: string | null }>(logs: T[]) {
  const seen = new Set<string>();
  return logs.filter((log) => {
    if (!log.game_id) return false;
    const key = `${log.user_id ?? "anonymous"}:${log.game_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getSignedInProfile(supabase: SupabaseClient) {
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) return { user: null, profile: null };

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: existing ?? null };
}

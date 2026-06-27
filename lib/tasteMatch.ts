import { normalizeGameStatus } from "@/lib/gameStatus";

type TasteProfile = {
  ratings: Map<string, number>;
  completed: Set<string>;
  wishlist: Set<string>;
  liked: Set<string>;
  reviewed: Set<string>;
  engaged: Set<string>;
  played: Set<string>;
  genres: Set<string>;
  platforms: Set<string>;
  listGames: Set<string>;
  games: Map<string, { id: string; title: string }>;
};

export type TasteMatchResult = {
  percentage: number;
  signalCount: number;
  bothLiked: string[];
  discoveries: string[];
  sharedGenres: string[];
  sharedPlatforms: string[];
  isSelf?: boolean;
};

function one<T = any>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function addGame(profile: TasteProfile, value: any, genreCounts: Map<string, number>, platformCounts: Map<string, number>) {
  const game = one(value);
  if (!game?.id) return;
  profile.games.set(game.id, { id: game.id, title: game.title ?? "Unknown game" });
  for (const genre of new Set([...(game.genres ?? []), game.genre].filter(Boolean) as string[])) {
    genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
  }
  for (const platform of new Set((game.platforms ?? []).filter(Boolean) as string[])) {
    platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1);
  }
}

function topKeys(counts: Map<string, number>, limit: number) {
  return new Set([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([key]) => key));
}

export function buildTasteProfile(logs: any[], reviews: any[], lists: any[]): TasteProfile {
  const profile: TasteProfile = {
    ratings: new Map(), completed: new Set(), wishlist: new Set(), liked: new Set(), reviewed: new Set(), engaged: new Set(), played: new Set(),
    genres: new Set(), platforms: new Set(), listGames: new Set(), games: new Map(),
  };
  const genreCounts = new Map<string, number>();
  const platformCounts = new Map<string, number>();

  for (const log of logs) {
    if (!log.game_id) continue;
    addGame(profile, log.games, genreCounts, platformCounts);
    const status = normalizeGameStatus(log.status);
    if (status === "played" || status === "completed") profile.completed.add(log.game_id);
    if (status === "wishlist" || status === "want_to_play") profile.wishlist.add(log.game_id);
    if (status && !["wishlist", "want_to_play"].includes(status)) profile.played.add(log.game_id);
    if (log.rating !== null && log.rating !== undefined) profile.ratings.set(log.game_id, Number(log.rating));
  }

  for (const review of reviews) {
    if (!review.game_id) continue;
    addGame(profile, review.games, genreCounts, platformCounts);
    if (review.rating !== null && review.rating !== undefined) profile.ratings.set(review.game_id, Number(review.rating));
    if (String(review.body ?? review.review ?? "").trim()) profile.reviewed.add(review.game_id);
    profile.played.add(review.game_id);
  }

  for (const [gameId, rating] of profile.ratings) if (rating >= 4) profile.liked.add(gameId);
  profile.engaged = new Set([...profile.liked, ...profile.reviewed]);

  for (const list of lists) {
    for (const item of list.list_items ?? []) {
      const game = one(item.games);
      const gameId = item.game_id ?? game?.id;
      if (!gameId) continue;
      profile.listGames.add(gameId);
      addGame(profile, game, genreCounts, platformCounts);
    }
  }

  profile.genres = topKeys(genreCounts, 6);
  profile.platforms = topKeys(platformCounts, 6);
  return profile;
}

function intersection<T>(left: Set<T>, right: Set<T>) {
  return [...left].filter((value) => right.has(value));
}

function dice(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return null;
  return (2 * intersection(left, right).length) / (left.size + right.size);
}

function ratingAgreement(left: Map<string, number>, right: Map<string, number>) {
  if (!left.size || !right.size) return null;
  const shared = [...left.keys()].filter((gameId) => right.has(gameId));
  if (!shared.length) return 0;
  return shared.reduce((sum, gameId) => sum + Math.max(0, 1 - Math.abs(left.get(gameId)! - right.get(gameId)!) / 4), 0) / shared.length;
}

function titles(ids: string[], profiles: TasteProfile[], limit = 3) {
  return ids.map((id) => profiles.map((profile) => profile.games.get(id)).find(Boolean)?.title).filter(Boolean).slice(0, limit) as string[];
}

export function calculateTasteMatch(viewer: TasteProfile, owner: TasteProfile, isSelf = false): TasteMatchResult {
  if (isSelf) {
    return {
      percentage: 100,
      signalCount: 7,
      bothLiked: titles([...owner.liked], [owner], 3),
      discoveries: [],
      sharedGenres: [...owner.genres].slice(0, 3),
      sharedPlatforms: [...owner.platforms].slice(0, 3),
      isSelf: true,
    };
  }

  const signals = [
    { value: ratingAgreement(viewer.ratings, owner.ratings), weight: 30 },
    { value: dice(viewer.completed, owner.completed), weight: 15 },
    { value: dice(viewer.wishlist, owner.wishlist), weight: 10 },
    { value: dice(viewer.engaged, owner.engaged), weight: 20 },
    { value: dice(viewer.genres, owner.genres), weight: 10 },
    { value: dice(viewer.platforms, owner.platforms), weight: 10 },
    { value: dice(viewer.listGames, owner.listGames), weight: 5 },
  ].filter((signal): signal is { value: number; weight: number } => signal.value !== null);
  const weight = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const percentage = weight ? Math.round(100 * signals.reduce((sum, signal) => sum + signal.value * signal.weight, 0) / weight) : 0;
  const bothLikedIds = intersection(viewer.liked, owner.liked);
  const discoveryIds = [...owner.liked].filter((gameId) => !viewer.played.has(gameId));

  return {
    percentage,
    signalCount: signals.length,
    bothLiked: titles(bothLikedIds, [owner, viewer]),
    discoveries: titles(discoveryIds, [owner]),
    sharedGenres: intersection(viewer.genres, owner.genres).slice(0, 3),
    sharedPlatforms: intersection(viewer.platforms, owner.platforms).slice(0, 3),
  };
}

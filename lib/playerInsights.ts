import { normalizeGameStatus } from "@/lib/gameStatus";
import { libraryMetaFromLog } from "@/lib/libraryMeta";

function gameFor(log: any) { return Array.isArray(log?.games) ? log.games[0] : log?.games; }

export function playerInsights(logs: any[], preferredGenres: string[] = [], preferredPlatforms: string[] = []) {
  const counts = { saved: 0, wantToPlay: 0, playing: 0, paused: 0, completed: 0, dropped: 0 };
  const genreCounts = new Map<string, number>();
  const platformCounts = new Map<string, number>();
  const backlog: any[] = [];
  for (const log of logs) {
    const game = gameFor(log);
    const status = libraryMetaFromLog(log).status ?? normalizeGameStatus(log.status);
    if (["want_to_play", "wishlist"].includes(status ?? "")) { counts.saved += 1; counts.wantToPlay += 1; }
    if (status === "playing") counts.playing += 1;
    if (status === "paused") counts.paused += 1;
    if (["played", "completed"].includes(status ?? "")) counts.completed += 1;
    if (status === "dropped") counts.dropped += 1;
    if (!game) continue;
    if (["want_to_play", "wishlist", "playing", "paused"].includes(status ?? "")) backlog.push({ game, status });
    const signalWeight = status === "completed" || status === "played" ? 5 : status === "playing" ? 4 : status === "paused" ? 3 : status === "dropped" ? -2 : 2;
    for (const genre of new Set([...(game.genres ?? []), game.genre].filter(Boolean) as string[])) genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + signalWeight);
    for (const platform of new Set((game.platforms ?? []).filter(Boolean) as string[])) platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + signalWeight);
  }
  const ranked = (map: Map<string, number>, preferred: string[]) => {
    const behavior = [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
    return [...new Set(logs.length >= 5 ? [...behavior, ...preferred] : [...preferred, ...behavior])].slice(0, 4);
  };
  const genres = ranked(genreCounts, preferredGenres);
  const platforms = ranked(platformCounts, preferredPlatforms);
  const recommendationScore = (game: any) => {
    const traits = [...(game.genres ?? []), game.genre].filter(Boolean);
    const platformMatches = (game.platforms ?? []).filter((item: string) => platforms.includes(item)).length;
    const genreMatches = traits.filter((item: string) => genres.includes(item)).length;
    return genreMatches * 14 + platformMatches * 9 + Number(game.rating ?? 0) * 2 + (game.cover_url ? 4 : 0) + (game.summary || game.description ? 3 : 0);
  };
  const statusPriority: Record<string, number> = { playing: 18, paused: 15, want_to_play: 12, wishlist: 9 };
  const recommendations = [...backlog].sort((a, b) => (statusPriority[b.status ?? ""] ?? 0) + recommendationScore(b.game) - ((statusPriority[a.status ?? ""] ?? 0) + recommendationScore(a.game)) || String(a.game.title).localeCompare(String(b.game.title))).slice(0, 3).map(({ game, status }, index) => {
    const gameGenres = [...(game.genres ?? []), game.genre].filter(Boolean);
    const sharedGenre = gameGenres.find((item: string) => genres.includes(item));
    const sharedPlatform = (game.platforms ?? []).find((item: string) => platforms.includes(item));
    const percentage = Math.min(96, 68 + Math.min(14, recommendationScore(game)) + Math.max(0, 4 - index * 2));
    const statusReason = status === "playing" ? "Continue what you are already playing" : status === "paused" ? "A good time to resume this one" : "High on your want-to-play shelf";
    const reasons = [statusReason, sharedGenre ? `Fits your ${sharedGenre} streak` : null, sharedPlatform ? `Ready on ${sharedPlatform}` : null, index === 0 ? "Best current backlog fit" : "Strong change-of-pace pick"].filter(Boolean).slice(0, 3) as string[];
    return { game, percentage, reasons };
  });
  const rawScore = 38 + Math.min(20, counts.saved * 2) + Math.min(14, counts.playing * 5) + Math.min(8, counts.paused * 2) + Math.min(28, counts.completed * 3) + Math.min(6, counts.dropped);
  const backlogScore = Math.max(42, Math.min(99, rawScore));
  const scoreLabel = backlogScore >= 85 ? "Backlog architect" : backlogScore >= 70 ? "Quest curator" : backlogScore >= 55 ? "Promising pile" : "Fresh save file";
  return { ...counts, genres, platforms, backlogScore, scoreLabel, recommendations };
}

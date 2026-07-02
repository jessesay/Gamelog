import { gameStatusLabels, normalizeGameStatus, type GameStatusKey } from "@/lib/gameStatus";

export const guestLibraryKey = "gamelog_guest_discovery_shelf";

export type LibraryMeta = {
  status: GameStatusKey;
  rating: number | null;
  notes: string;
  hoursPlayed: number | null;
};

export function encodeLibraryVibe(status: GameStatusKey, hoursPlayed: number | null) {
  return `${gameStatusLabels[status]}${hoursPlayed === null ? "" : ` · ${hoursPlayed}h`}`;
}

export function decodeLibraryVibe(value: unknown): Partial<LibraryMeta> {
  const text = String(value ?? "");
  const label = text.split(" · ")[0];
  const status = (Object.entries(gameStatusLabels).find(([, value]) => value === label)?.[0] ?? null) as GameStatusKey | null;
  if (!status) return {};
  try {
    const hoursMatch = text.match(/ · ([0-9.]+)h$/);
    const parsed = { status, hoursPlayed: hoursMatch ? Number(hoursMatch[1]) : null };
    return {
      status: normalizeGameStatus(parsed.status) ?? undefined,
      hoursPlayed: Number.isFinite(Number(parsed.hoursPlayed)) ? Math.max(0, Number(parsed.hoursPlayed)) : null,
    };
  } catch { return {}; }
}

export function libraryMetaFromLog(log: any): LibraryMeta {
  const encoded = decodeLibraryVibe(log?.vibe);
  return {
    status: encoded.status ?? normalizeGameStatus(log?.status) ?? "want_to_play",
    rating: log?.rating === null || log?.rating === undefined ? null : Math.max(1, Math.min(10, Number(log.rating) * 2)),
    notes: String(log?.review ?? ""),
    hoursPlayed: encoded.hoursPlayed ?? null,
  };
}

export function normalizeGuestLibraryItem(item: any) {
  const actionStatus = item?.action === "played" ? "completed" : "want_to_play";
  return {
    ...item,
    id: item?.id ?? `guest:${item?.gameId}`,
    game_id: item?.game_id ?? item?.gameId,
    status: normalizeGameStatus(item?.status) ?? actionStatus,
    rating: item?.rating === null || item?.rating === undefined ? null : Math.max(1, Math.min(10, Number(item.rating))),
    notes: String(item?.notes ?? ""),
    hoursPlayed: Number.isFinite(Number(item?.hoursPlayed)) ? Math.max(0, Number(item.hoursPlayed)) : null,
    games: item?.games ?? {
      id: item?.gameId,
      title: item?.title,
      slug: item?.slug ?? null,
      cover_url: item?.coverUrl ?? null,
      release_year: item?.releaseYear ?? null,
      platforms: item?.platforms ?? [],
      genres: item?.genres ?? [],
      genre: item?.genre ?? null,
    },
  };
}

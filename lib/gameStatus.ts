export const gameStatusKeys = [
  "want_to_play",
  "playing",
  "paused",
  "played",
  "completed",
  "dropped",
  "wishlist",
] as const;

export type GameStatusKey = (typeof gameStatusKeys)[number];

export const gameStatusLabels: Record<GameStatusKey, string> = {
  want_to_play: "Want to play",
  playing: "Playing",
  paused: "Paused",
  played: "Played",
  completed: "Completed",
  dropped: "Dropped",
  wishlist: "Wishlist",
};

// Keep the established database values so existing profiles, charts, and discovery
// continue to understand logs created through the new quick actions.
const storageStatus: Record<GameStatusKey, string> = {
  want_to_play: "Backlog",
  playing: "Currently Playing",
  paused: "Currently Playing",
  played: "Completed",
  completed: "100% Completed",
  dropped: "Dropped",
  wishlist: "Want to Play",
};

const aliases: Record<string, GameStatusKey> = {
  want_to_play: "want_to_play",
  "want to play": "wishlist",
  backlog: "want_to_play",
  playing: "playing",
  "currently playing": "playing",
  replaying: "playing",
  paused: "paused",
  played: "played",
  completed: "played",
  "100% completed": "completed",
  dropped: "dropped",
  wishlist: "wishlist",
};

export function normalizeGameStatus(value: unknown): GameStatusKey | null {
  return aliases[String(value ?? "").trim().toLowerCase()] ?? null;
}

export function toStorageStatus(status: GameStatusKey) {
  return storageStatus[status];
}

export function gameStatusLabel(value: unknown) {
  const status = normalizeGameStatus(value);
  return status ? gameStatusLabels[status] : String(value ?? "");
}

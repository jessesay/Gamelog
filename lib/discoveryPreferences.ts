export const discoveryPlatformOptions = ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Steam Deck", "iOS", "Android"];
export const discoveryGenreOptions = ["RPG", "Action", "Adventure", "Strategy", "Indie", "Cozy", "Shooter", "Horror", "Puzzle", "Simulation"];
export const discoveryStyleOptions = [
  { value: "indie", label: "Indie" },
  { value: "aaa", label: "AAA" },
  { value: "retro", label: "Retro" },
  { value: "hidden_gems", label: "Hidden gems" },
];

export type DiscoveryPreferences = {
  favorite_platforms: string[];
  favorite_genres: string[];
  favorite_games: string[];
  discovery_styles: string[];
  completed: boolean;
};

export const emptyDiscoveryPreferences: DiscoveryPreferences = {
  favorite_platforms: [],
  favorite_genres: [],
  favorite_games: [],
  discovery_styles: [],
  completed: false,
};

function cleanList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].slice(0, limit);
}

export function normalizeDiscoveryPreferences(value: unknown): DiscoveryPreferences {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    favorite_platforms: cleanList(input.favorite_platforms, 12),
    favorite_genres: cleanList(input.favorite_genres, 12),
    favorite_games: cleanList(input.favorite_games, 5),
    discovery_styles: cleanList(input.discovery_styles, 4),
    completed: Boolean(input.completed),
  };
}

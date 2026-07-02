export const discoveryPlatformOptions = ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Steam Deck", "Mobile"];
export const discoveryPlatformLabels: Record<string, string> = { "Nintendo Switch": "Switch" };
export const discoveryGenreOptions = ["RPG", "Action", "Adventure", "Strategy", "Shooter", "Indie", "Horror", "Sports", "Simulation", "Cozy"];
export const discoveryMoodOptions = ["Story-rich", "Competitive", "Relaxing", "Difficult", "Funny", "Dark", "Open world"];
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
  favorite_moods: string[];
  completed: boolean;
};

export const emptyDiscoveryPreferences: DiscoveryPreferences = {
  favorite_platforms: [],
  favorite_genres: [],
  favorite_games: [],
  discovery_styles: [],
  favorite_moods: [],
  completed: false,
};

function cleanList(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].slice(0, limit);
}

export function normalizeDiscoveryPreferences(value: unknown): DiscoveryPreferences {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const storedStyles = cleanList(input.discovery_styles, 20);
  const storedMoods = storedStyles.filter((item) => item.startsWith("mood:")).map((item) => item.slice(5));
  return {
    favorite_platforms: cleanList(input.favorite_platforms, 12),
    favorite_genres: cleanList(input.favorite_genres, 12),
    favorite_games: cleanList(input.favorite_games, 5),
    discovery_styles: storedStyles.filter((item) => !item.startsWith("mood:")).slice(0, 4),
    favorite_moods: cleanList(input.favorite_moods, 7).length ? cleanList(input.favorite_moods, 7) : storedMoods.slice(0, 7),
    completed: Boolean(input.completed),
  };
}

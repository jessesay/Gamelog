type RawgGame = {
  id: number;
  slug?: string;
  name: string;
  released?: string | null;
  background_image?: string | null;
  rating?: number | null;
  metacritic?: number | null;
  platforms?: { platform?: { name?: string } }[];
  genres?: { name?: string }[];
  tags?: { name?: string; language?: string }[];
  stores?: { store?: { id?: number; name?: string; slug?: string } }[];
};

type RawgResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: RawgGame[];
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export async function fetchRawgGames(page: number, pageSize: number) {
  const apiKey = requireEnv("RAWG_API_KEY");

  const url = new URL("https://api.rawg.io/api/games");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set("ordering", "-rating");

  const response = await fetch(url.toString());

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`RAWG request failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as RawgResponse;
  return data.results ?? [];
}

export function mapRawgGame(game: RawgGame) {
  return {
    source: "rawg",
    source_id: String(game.id),
    title: game.name,
    slug: game.slug ?? null,
    description: null,
    cover_url: game.background_image ?? null,
    background_url: game.background_image ?? null,
    platforms:
      game.platforms
        ?.map((item) => item.platform?.name)
        .filter(Boolean)
        .slice(0, 12) ?? [],
    genres:
      game.genres
        ?.map((item) => item.name)
        .filter(Boolean)
        .slice(0, 8) ?? [],
    tags:
      game.tags
        ?.filter((tag) => !tag.language || tag.language === "eng")
        .map((tag) => tag.name)
        .filter(Boolean)
        .slice(0, 12) ?? [],
    release_date: game.released ?? null,
    rating: game.rating ?? null,
    metacritic: game.metacritic ?? null,
    stores:
      game.stores?.map((item) => ({
        id: item.store?.id ?? null,
        name: item.store?.name ?? null,
        slug: item.store?.slug ?? null,
      })) ?? [],
    raw: game,
    updated_at: new Date().toISOString(),
  };
}

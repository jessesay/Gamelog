import "server-only";

export const IGDB_GAME_FIELDS = [
  "id",
  "name",
  "slug",
  "summary",
  "storyline",
  "first_release_date",
  "cover.image_id",
  "cover.url",
  "genres.name",
  "platforms.name",
  "involved_companies.developer",
  "involved_companies.publisher",
  "involved_companies.company.name",
  "total_rating",
  "total_rating_count",
  "url"
].join(",");

type TwitchToken = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

type TokenCache = {
  token: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

function requireIgdbEnv() {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("IGDB is not connected. Add IGDB_CLIENT_ID and IGDB_CLIENT_SECRET to .env.local, then restart the dev server.");
  }

  return { clientId, clientSecret };
}

export function escapeIgdbSearch(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').trim();
}

function makeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function coverImageUrl(cover?: { image_id?: string | null; url?: string | null } | null) {
  if (cover?.image_id) {
    return `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover.image_id}.jpg`;
  }

  if (cover?.url) {
    const url = cover.url.startsWith("//") ? `https:${cover.url}` : cover.url;
    return url.replace("t_thumb", "t_cover_big");
  }

  return null;
}

function unixYear(value?: number | null) {
  if (!value) return null;
  const year = new Date(value * 1000).getUTCFullYear();
  return Number.isFinite(year) ? year : null;
}

function pickCompany(game: any, kind: "developer" | "publisher") {
  const companies = Array.isArray(game?.involved_companies) ? game.involved_companies : [];
  const match = companies.find((entry: any) => Boolean(entry?.[kind]) && entry?.company?.name);
  return match?.company?.name ?? null;
}

export function mapIgdbGame(game: any) {
  const title = typeof game?.name === "string" ? game.name.trim() : "";
  if (!title) return null;

  const releaseYear = unixYear(game.first_release_date);
  const platforms = Array.isArray(game.platforms)
    ? game.platforms.map((platform: any) => platform?.name).filter(Boolean).slice(0, 8)
    : [];
  const genre = Array.isArray(game.genres) && game.genres.length ? game.genres[0]?.name ?? "Game" : "Game";
  const totalRating = typeof game.total_rating === "number" ? Math.round(game.total_rating) : null;
  const ratingCount = typeof game.total_rating_count === "number" ? Math.round(game.total_rating_count) : null;
  const summaryParts = [game.summary || game.storyline || null];

  if (totalRating && ratingCount) {
    summaryParts.push(`IGDB community score: ${totalRating}/100 from ${ratingCount.toLocaleString()} ratings.`);
  }

  const igdbId = typeof game.id === "number" ? game.id : null;

  return {
    title,
    slug: `igdb-${igdbId ?? "game"}-${game.slug || makeSlug(title)}`,
    developer: pickCompany(game, "developer") ?? "IGDB import",
    publisher: pickCompany(game, "publisher"),
    release_year: releaseYear,
    genre,
    platforms: platforms.length ? platforms : ["Unknown"],
    cover_url: coverImageUrl(game.cover),
    summary: summaryParts.filter(Boolean).join(" "),
    igdb_id: igdbId,
    source: "IGDB",
    source_url: typeof game.url === "string" ? game.url : igdbId ? `https://www.igdb.com/games/${game.slug || makeSlug(title)}` : null,
    is_community: true
  };
}

export async function getIgdbToken() {
  const { clientId, clientSecret } = requireIgdbEnv();
  const now = Date.now();

  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return { token: tokenCache.token, clientId };
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials"
  });

  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params.toString()}`, {
    method: "POST",
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twitch token request failed with status ${response.status}: ${text.slice(0, 220)}`);
  }

  const body = (await response.json()) as TwitchToken;
  tokenCache = {
    token: body.access_token,
    expiresAt: now + Math.max(0, body.expires_in - 120) * 1000
  };

  return { token: body.access_token, clientId };
}

export async function igdbPost(endpoint: string, body: string) {
  const { token, clientId } = await getIgdbToken();
  const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    },
    body,
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IGDB ${endpoint} request failed with status ${response.status}: ${text.slice(0, 220)}`);
  }

  return response.json();
}

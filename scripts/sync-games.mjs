const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAWG_API_KEY = process.env.RAWG_API_KEY;

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
if (!SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
if (!RAWG_API_KEY) throw new Error("Missing RAWG_API_KEY in .env.local");

const pageSize = Number(process.env.RAWG_PAGE_SIZE || 40);
const pages = Number(process.env.RAWG_SYNC_PAGES || 10);

function cleanArray(items) {
  return [...new Set(items.filter(Boolean))];
}

function mapRawgGame(game) {
  return {
    source: "rawg",
    source_id: String(game.id),
    title: game.name,
    slug: game.slug || null,
    description: null,
    cover_url: game.background_image || null,
    background_url: game.background_image || null,
    platforms: cleanArray(
      (game.platforms || [])
        .map((item) => item.platform && item.platform.name)
        .filter(Boolean)
        .slice(0, 12)
    ),
    genres: cleanArray(
      (game.genres || [])
        .map((item) => item.name)
        .filter(Boolean)
        .slice(0, 8)
    ),
    tags: cleanArray(
      (game.tags || [])
        .filter((tag) => !tag.language || tag.language === "eng")
        .map((tag) => tag.name)
        .filter(Boolean)
        .slice(0, 12)
    ),
    release_date: game.released || null,
    rating: game.rating || null,
    metacritic: game.metacritic || null,
    stores: (game.stores || []).map((item) => ({
      id: item.store && item.store.id ? item.store.id : null,
      name: item.store && item.store.name ? item.store.name : null,
      slug: item.store && item.store.slug ? item.store.slug : null,
    })),
    raw: game,
    updated_at: new Date().toISOString(),
  };
}

async function fetchRawgGames(page) {
  const url = new URL("https://api.rawg.io/api/games");
  url.searchParams.set("key", RAWG_API_KEY);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set("ordering", "-rating");

  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RAWG failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.results || [];
}

async function upsertGames(rows) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/games?on_conflict=source,source_id`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase failed: ${response.status} ${text}`);
  }
}

async function main() {
  let totalSaved = 0;

  console.log(`Starting RAWG sync: ${pages} pages x ${pageSize} games`);

  for (let page = 1; page <= pages; page++) {
    console.log(`Fetching RAWG page ${page}...`);

    const games = await fetchRawgGames(page);

    const rows = games
      .map(mapRawgGame)
      .filter((game) => game.title && game.cover_url);

    if (rows.length === 0) {
      console.log(`Page ${page}: no usable games`);
      continue;
    }

    await upsertGames(rows);

    totalSaved += rows.length;
    console.log(`Page ${page}: saved or updated ${rows.length} games`);
  }

  console.log(`Done. Saved or updated ${totalSaved} games.`);
}

main().catch((error) => {
  console.error("Sync failed:");
  console.error(error);
  process.exit(1);
});
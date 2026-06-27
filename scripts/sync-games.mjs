#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const clean = arg.replace(/^--/, "");
    const [key, ...valueParts] = clean.split("=");
    return [key, valueParts.length ? valueParts.join("=") : "true"];
  })
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const rawgApiKey = process.env.RAWG_API_KEY;
const itchApiKey = process.env.ITCH_API_KEY;
const dryRun = truthy(args.get("dry-run")) || truthy(args.get("dryRun"));
const reset = truthy(args.get("reset"));
const reseed = truthy(args.get("reseed"));
const skipExisting = args.get("skip-existing") !== "false";
const sources = String(args.get("sources") || process.env.GAMELOG_IMPORT_SOURCES || "rawg,steam,itch")
  .split(",")
  .map((source) => source.trim().toLowerCase())
  .filter(Boolean);

const rawgPages = numberArg("rawg-pages", "RAWG_SYNC_PAGES", 3, 0, 100);
const rawgPageSize = numberArg("rawg-page-size", "RAWG_PAGE_SIZE", 40, 1, 40);
const steamLimit = numberArg("steam-limit", "STEAM_IMPORT_LIMIT", 80, 0, 300);
const itchLimit = numberArg("itch-limit", "ITCH_IMPORT_LIMIT", 50, 0, 250);

if (!supabaseUrl) fail("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local.");
if (!serviceRoleKey) fail("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local.");

const importedSources = ["rawg", "steam", "itch"];

function truthy(value) {
  return ["1", "true", "yes", "y"].includes(String(value || "").toLowerCase());
}

function numberArg(argName, envName, fallback, min, max) {
  const value = Number(args.get(argName) ?? process.env[envName] ?? fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(Math.floor(value), max));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function unique(items) {
  return [...new Set((items || []).filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];
}

function makeSlug(value) {
  return String(value || "game")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "game";
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/\b(game of the year|goty|deluxe|ultimate|complete|definitive|enhanced|remastered|remake|edition|bundle)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function yearFromDate(value) {
  if (!value) return null;
  const date = new Date(value);
  const year = date.getUTCFullYear();
  return Number.isFinite(year) ? year : null;
}

function canonicalKey(game) {
  const title = normalizeTitle(game.title);
  if (!title) return null;
  const year = yearFromDate(game.release_date) || game.release_year || "";
  return `${title}:${year}`;
}

function cleanDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function rowQuality(row) {
  let score = 0;
  if (row.cover_url) score += 40;
  if (row.background_url && row.background_url !== row.cover_url) score += 8;
  if (row.description || row.summary) score += 14;
  if (row.release_date) score += 8;
  if (row.rating) score += Number(row.rating);
  if (row.metacritic) score += Number(row.metacritic) / 10;
  score += Math.min(row.platforms?.length || 0, 6);
  score += Math.min(row.genres?.length || 0, 5);
  if (row.source === "rawg") score += 4;
  if (row.source === "steam") score += 3;
  return score;
}

function mergeRows(a, b) {
  const better = rowQuality(b) > rowQuality(a) ? b : a;
  const other = better === b ? a : b;
  return {
    ...better,
    description: better.description || other.description || null,
    summary: better.summary || other.summary || better.description || other.description || null,
    cover_url: better.cover_url || other.cover_url || null,
    background_url: better.background_url || other.background_url || better.cover_url || other.cover_url || null,
    platforms: unique([...(better.platforms || []), ...(other.platforms || [])]).slice(0, 16),
    genres: unique([...(better.genres || []), ...(other.genres || [])]).slice(0, 12),
    tags: unique([...(better.tags || []), ...(other.tags || [])]).slice(0, 20),
    stores: mergeStores(better.stores, other.stores),
    raw: {
      ...(typeof other.raw === "object" ? other.raw : {}),
      ...(typeof better.raw === "object" ? better.raw : {}),
      merged_sources: unique([other.source, better.source, ...(other.raw?.merged_sources || []), ...(better.raw?.merged_sources || [])])
    }
  };
}

function mergeStores(a = [], b = []) {
  const byKey = new Map();
  for (const store of [...a, ...b]) {
    if (!store) continue;
    const key = store.url || store.slug || store.name || JSON.stringify(store);
    byKey.set(key, { ...(byKey.get(key) || {}), ...store });
  }
  return [...byKey.values()].slice(0, 20);
}

function finalizeRow(row) {
  const importKey = canonicalKey(row);
  const sourceId = String(row.source_id || importKey || row.title);
  const slug = row.slug || `${row.source}-${sourceId}-${makeSlug(row.title)}`;
  const releaseYear = row.release_year || yearFromDate(row.release_date);
  const firstGenre = row.genre || row.genres?.[0] || null;
  const summary = row.summary || row.description || null;
  return {
    source: row.source,
    source_id: sourceId,
    import_key: importKey,
    title: row.title,
    slug,
    developer: row.developer || null,
    publisher: row.publisher || null,
    release_year: releaseYear,
    genre: firstGenre,
    description: row.description || summary,
    summary,
    cover_url: row.cover_url || null,
    background_url: row.background_url || row.cover_url || null,
    platforms: unique(row.platforms).slice(0, 16),
    genres: unique(row.genres || (firstGenre ? [firstGenre] : [])).slice(0, 12),
    tags: unique(row.tags).slice(0, 20),
    release_date: cleanDate(row.release_date),
    rating: row.rating ?? null,
    metacritic: row.metacritic ?? null,
    stores: row.stores || [],
    raw: row.raw || {},
    source_url: row.source_url || null,
    is_community: false,
    imported_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": "GameLog importer (local development)",
      Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${url} failed ${response.status}: ${text.slice(0, 240)}`);
  }
  return response.json();
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": "GameLog importer (local development)",
      Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${url} failed ${response.status}: ${text.slice(0, 240)}`);
  }
  return response.text();
}

async function fetchRawgRows() {
  if (!rawgApiKey) {
    console.log("RAWG skipped: add RAWG_API_KEY to .env.local to enable it.");
    return [];
  }
  const rows = [];
  for (let page = 1; page <= rawgPages; page++) {
    const url = new URL("https://api.rawg.io/api/games");
    url.searchParams.set("key", rawgApiKey);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(rawgPageSize));
    url.searchParams.set("ordering", "-rating");
    console.log(`RAWG page ${page}/${rawgPages}`);
    const data = await fetchJson(url);
    for (const game of data.results || []) {
      const title = String(game.name || "").trim();
      if (!title) continue;
      rows.push({
        source: "rawg",
        source_id: String(game.id),
        title,
        slug: game.slug ? `rawg-${game.id}-${game.slug}` : null,
        description: null,
        cover_url: game.background_image || null,
        background_url: game.background_image || null,
        platforms: (game.platforms || []).map((item) => item.platform?.name),
        genres: (game.genres || []).map((item) => item.name),
        tags: (game.tags || []).filter((tag) => !tag.language || tag.language === "eng").map((tag) => tag.name),
        release_date: game.released || null,
        rating: game.rating ?? null,
        metacritic: game.metacritic ?? null,
        stores: (game.stores || []).map((item) => ({
          id: item.store?.id ?? null,
          name: item.store?.name ?? null,
          slug: item.store?.slug ?? null
        })),
        raw: { rawg: game },
        source_url: game.slug ? `https://rawg.io/games/${game.slug}` : null
      });
    }
  }
  return rows;
}

async function fetchSteamRows() {
  const ids = await discoverSteamIds();
  const rows = [];
  const limitedIds = ids.slice(0, steamLimit);
  for (let index = 0; index < limitedIds.length; index++) {
    const appid = limitedIds[index];
    if (index % 20 === 0) console.log(`Steam details ${index + 1}-${Math.min(index + 20, limitedIds.length)}/${limitedIds.length}`);
    try {
      const data = await fetchJson(`https://store.steampowered.com/api/appdetails?appids=${appid}&filters=basic,genres,categories,developers,publishers,release_date,metacritic`);
      const detail = data?.[appid]?.data;
      if (!data?.[appid]?.success || !detail || detail.type !== "game") continue;
      rows.push(mapSteamDetail(appid, detail));
    } catch (error) {
      console.warn(`Steam ${appid} skipped: ${error.message}`);
    }
    await sleep(75);
  }
  return rows.filter(Boolean);
}

async function discoverSteamIds() {
  const configured = splitList(process.env.STEAM_APP_IDS || args.get("steam-app-ids"));
  if (configured.length) return configured.map(Number).filter(Boolean);
  const ids = [];
  try {
    const featured = await fetchJson("https://store.steampowered.com/api/featuredcategories");
    for (const bucket of Object.values(featured || {})) {
      for (const item of bucket?.items || []) {
        if (item?.type === 0 && Number.isFinite(Number(item.id))) ids.push(Number(item.id));
      }
    }
  } catch (error) {
    console.warn(`Steam featured discovery failed: ${error.message}`);
  }
  return unique(ids).map(Number).filter(Boolean);
}

function mapSteamDetail(appid, detail) {
  const title = String(detail.name || "").trim();
  if (!title) return null;
  const genres = (detail.genres || []).map((genre) => genre.description);
  const platforms = Object.entries(detail.platforms || {})
    .filter(([, enabled]) => enabled)
    .map(([name]) => (name === "windows" ? "PC" : name[0].toUpperCase() + name.slice(1)));
  const releaseDate = steamDate(detail.release_date?.date);
  return {
    source: "steam",
    source_id: String(appid),
    title,
    slug: `steam-${appid}-${makeSlug(title)}`,
    developer: detail.developers?.[0] || null,
    publisher: detail.publishers?.[0] || null,
    description: stripHtml(detail.short_description || detail.about_the_game || ""),
    cover_url: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900.jpg`,
    background_url: detail.background_raw || detail.header_image || null,
    platforms: unique(["Steam", ...platforms]),
    genres,
    tags: (detail.categories || []).map((category) => category.description),
    release_date: releaseDate,
    metacritic: detail.metacritic?.score ?? null,
    stores: [{ name: "Steam", slug: "steam", url: `https://store.steampowered.com/app/${appid}` }],
    raw: { steam: detail },
    source_url: `https://store.steampowered.com/app/${appid}`
  };
}

function steamDate(value) {
  if (!value || /coming soon|to be announced|tba/i.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

async function fetchItchRows() {
  const rows = [];
  if (itchApiKey) {
    try {
      const data = await fetchJson("https://itch.io/api/1/key/my-games", {
        headers: { Authorization: `Bearer ${itchApiKey}` }
      });
      for (const game of (data.games || []).slice(0, itchLimit)) {
        rows.push(mapItchApiGame(game));
      }
    } catch (error) {
      console.warn(`itch.io API import skipped: ${error.message}`);
    }
  }

  const urls = splitList(process.env.ITCH_GAME_URLS || args.get("itch-game-urls")).slice(0, itchLimit);
  for (const url of urls) {
    try {
      rows.push(await fetchItchPageRow(url));
    } catch (error) {
      console.warn(`itch.io page skipped (${url}): ${error.message}`);
    }
  }

  if (!rows.length) {
    console.log("itch.io skipped: add ITCH_API_KEY for your itch library or ITCH_GAME_URLS for public game pages.");
  }
  return rows.filter(Boolean);
}

function mapItchApiGame(game) {
  const title = String(game.title || "").trim();
  if (!title) return null;
  return {
    source: "itch",
    source_id: String(game.id || game.url || title),
    title,
    slug: `itch-${game.id || makeSlug(title)}-${makeSlug(title)}`,
    developer: game.user?.username || null,
    description: game.short_text || null,
    cover_url: game.cover_url || null,
    background_url: game.cover_url || null,
    platforms: ["itch.io"],
    genres: [],
    tags: [],
    release_date: cleanDate(game.published_at || game.created_at),
    stores: [{ name: "itch.io", slug: "itch", url: game.url || null }],
    raw: { itch: game },
    source_url: game.url || null
  };
}

async function fetchItchPageRow(inputUrl) {
  const html = await fetchText(inputUrl);
  const jsonLd = extractJsonLd(html);
  const title = decodeHtml(jsonLd?.name || meta(html, "og:title") || titleTag(html)).replace(/\s+by\s+.+$/i, "").trim();
  if (!title) return null;
  const image = absolutizeUrl(jsonLd?.image || meta(html, "og:image"), inputUrl);
  const description = decodeHtml(jsonLd?.description || meta(html, "description") || meta(html, "og:description") || "");
  const author = typeof jsonLd?.author === "object" ? jsonLd.author.name : null;
  return {
    source: "itch",
    source_id: makeSlug(new URL(inputUrl).pathname || title),
    title,
    slug: `itch-${makeSlug(title)}`,
    developer: author || null,
    description,
    cover_url: image,
    background_url: image,
    platforms: ["itch.io"],
    genres: [],
    tags: [],
    release_date: cleanDate(jsonLd?.datePublished),
    stores: [{ name: "itch.io", slug: "itch", url: inputUrl }],
    raw: { itch_page: { jsonLd, url: inputUrl } },
    source_url: inputUrl
  };
}

function extractJsonLd(html) {
  const matches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed?.["@type"] === "VideoGame" || parsed?.name) return parsed;
    } catch {
      // Ignore malformed embedded metadata.
    }
  }
  return null;
}

function meta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return html.match(pattern)?.[1] || null;
}

function titleTag(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
}

function stripHtml(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function absolutizeUrl(value, baseUrl) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function splitList(value) {
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function restHeaders(extra = {}) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}

function restUrl(table, query = "") {
  return `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}${query ? `?${query}` : ""}`;
}

function postgrestValue(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function inFilter(values) {
  return `in.(${values.map(postgrestValue).join(",")})`;
}

async function restRequest(table, query, options = {}) {
  const response = await fetch(restUrl(table, query), {
    ...options,
    headers: restHeaders(options.headers || {})
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${table} failed ${response.status}: ${text.slice(0, 500)}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function assertSchemaReady() {
  try {
    await restRequest("games", "select=id,source,source_id,import_key,cover_url&limit=1");
  } catch (error) {
    throw new Error(`Import schema is not ready. Run supabase/v3_4_import_pipeline.sql in Supabase first. ${error.message}`);
  }
}

async function resetImportedGames() {
  console.log("Resetting imported discovery data...");
  const ids = await importedGameIds();
  if (ids.length) {
    for (let index = 0; index < ids.length; index += 100) {
      const chunk = ids.slice(index, index + 100);
      await restRequest("game_swipes", `game_id=${encodeURIComponent(inFilter(chunk))}`, { method: "DELETE" });
    }
  }

  await restRequest("games", `source=${encodeURIComponent(inFilter(importedSources))}`, { method: "DELETE" });
}

async function importedGameIds() {
  const ids = [];
  let offset = 0;
  const step = 1000;
  while (true) {
    const data = await restRequest(
      "games",
      `select=id&source=${encodeURIComponent(inFilter(importedSources))}&limit=${step}&offset=${offset}`
    );
    ids.push(...(data || []).map((row) => row.id));
    if (!data || data.length < step) break;
    offset += step;
  }
  return ids;
}

async function existingImportKeys(keys) {
  if (dryRun || !skipExisting || !keys.length) return new Set();
  const existing = new Set();
  for (let index = 0; index < keys.length; index += 500) {
    const chunk = keys.slice(index, index + 500);
    const data = await restRequest("games", `select=import_key&import_key=${encodeURIComponent(inFilter(chunk))}`);
    for (const row of data || []) {
      if (row.import_key) existing.add(row.import_key);
    }
  }
  return existing;
}

async function upsertRows(rows) {
  const finalized = rows.map(finalizeRow).filter((row) => row.title && row.cover_url);
  const byKey = new Map();
  for (const row of finalized) {
    const key = row.import_key || `${row.source}:${row.source_id}`;
    byKey.set(key, byKey.has(key) ? mergeRows(byKey.get(key), row) : row);
  }

  const deduped = [...byKey.values()].map(finalizeRow);
  const existingKeys = await existingImportKeys(deduped.map((row) => row.import_key).filter(Boolean));
  const rowsToSave = deduped.filter((row) => !row.import_key || !existingKeys.has(row.import_key));

  if (dryRun) {
    console.log(`Dry run: collected ${rows.length}, deduped to ${deduped.length}, would save ${rowsToSave.length}.`);
    console.log(rowsToSave.slice(0, 5).map((row) => `- ${row.title} (${row.source})`).join("\n"));
    return rowsToSave.length;
  }

  let saved = 0;
  for (let index = 0; index < rowsToSave.length; index += 100) {
    const chunk = rowsToSave.slice(index, index + 100);
    await restRequest("games", "on_conflict=source,source_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(chunk)
    });
    saved += chunk.length;
    console.log(`Saved ${saved}/${rowsToSave.length}`);
  }
  console.log(`Collected ${rows.length}, deduped to ${deduped.length}, saved ${saved}.`);
  return saved;
}

async function main() {
  if (!dryRun || reset || reseed) await assertSchemaReady();
  if (reset || reseed) await resetImportedGames();
  if (reset && !reseed) {
    console.log("Reset complete.");
    return;
  }

  const rows = [];
  if (sources.includes("rawg")) rows.push(...(await fetchRawgRows()));
  if (sources.includes("steam") && steamLimit > 0) rows.push(...(await fetchSteamRows()));
  if (sources.includes("itch") && itchLimit > 0) rows.push(...(await fetchItchRows()));

  if (!rows.length) {
    console.log("No games collected. Check source credentials and limits.");
    return;
  }

  await upsertRows(rows);
}

main().catch((error) => {
  console.error("\nImport failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

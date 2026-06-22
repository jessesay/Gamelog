#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const rootDir = process.cwd();

function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
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

const target = Math.max(1, Math.min(Number(args.get("target") ?? 10000) || 10000, 10000));
const batchSize = Math.max(25, Math.min(Number(args.get("batch") ?? 500) || 500, 500));
const startOffset = Math.max(0, Number(args.get("start") ?? 0) || 0);
const includeDlc = args.get("include-dlc") === "true" || args.get("includeDlc") === "true";
const dryRun = args.get("dry-run") === "true" || args.get("dryRun") === "true";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const igdbClientId = process.env.IGDB_CLIENT_ID;
const igdbClientSecret = process.env.IGDB_CLIENT_SECRET;

function required(name, value) {
  if (!value) {
    console.error(`Missing ${name}. Add it to .env.local before running this importer.`);
    process.exit(1);
  }
}

required("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
required("SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey);
required("IGDB_CLIENT_ID", igdbClientId);
required("IGDB_CLIENT_SECRET", igdbClientSecret);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getIgdbToken() {
  const now = Date.now();
  if (cachedToken && cachedTokenExpiresAt > now + 60000) return cachedToken;

  const params = new URLSearchParams({
    client_id: igdbClientId,
    client_secret: igdbClientSecret,
    grant_type: "client_credentials"
  });
  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params.toString()}`, { method: "POST" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twitch token failed ${response.status}: ${text.slice(0, 240)}`);
  }
  const body = await response.json();
  cachedToken = body.access_token;
  cachedTokenExpiresAt = now + Math.max(0, Number(body.expires_in ?? 0) - 120) * 1000;
  return cachedToken;
}

async function igdbPost(endpoint, body) {
  const token = await getIgdbToken();
  const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": igdbClientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    },
    body
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IGDB ${endpoint} failed ${response.status}: ${text.slice(0, 240)}`);
  }
  return response.json();
}

function makeSlug(value) {
  return String(value ?? "game")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "game";
}

function coverImageUrl(cover) {
  if (cover?.image_id) return `https://images.igdb.com/igdb/image/upload/t_cover_big/${cover.image_id}.jpg`;
  if (cover?.url) {
    const url = cover.url.startsWith("//") ? `https:${cover.url}` : cover.url;
    return url.replace("t_thumb", "t_cover_big");
  }
  return null;
}

function unixYear(value) {
  if (!value) return null;
  const year = new Date(value * 1000).getUTCFullYear();
  return Number.isFinite(year) ? year : null;
}

function pickCompany(game, kind) {
  const companies = Array.isArray(game?.involved_companies) ? game.involved_companies : [];
  const match = companies.find((entry) => Boolean(entry?.[kind]) && entry?.company?.name);
  return match?.company?.name ?? null;
}

function scoreGame(game) {
  const totalRating = Number(game.total_rating ?? 0);
  const totalRatingCount = Number(game.total_rating_count ?? 0);
  const hypes = Number(game.hypes ?? 0);
  const follows = Number(game.follows ?? 0);
  const ratingPower = Math.log10(totalRatingCount + 1) * 34;
  const ratingQuality = totalRating ? totalRating * 0.28 : 0;
  const hypePower = Math.log10(hypes + 1) * 16;
  const followPower = Math.log10(follows + 1) * 13;
  return Math.round((ratingPower + ratingQuality + hypePower + followPower) * 100) / 100;
}

function mapGame(game, rank) {
  const title = typeof game?.name === "string" ? game.name.trim() : "";
  if (!title || typeof game.id !== "number") return null;
  const platforms = Array.isArray(game.platforms)
    ? game.platforms.map((platform) => platform?.name).filter(Boolean).slice(0, 10)
    : [];
  const genre = Array.isArray(game.genres) && game.genres.length ? game.genres[0]?.name ?? "Game" : "Game";
  const totalRating = typeof game.total_rating === "number" ? Math.round(game.total_rating) : null;
  const totalRatingCount = typeof game.total_rating_count === "number" ? Math.round(game.total_rating_count) : 0;
  const summaryParts = [game.summary || game.storyline || null];
  if (totalRating && totalRatingCount) {
    summaryParts.push(`IGDB community score: ${totalRating}/100 from ${totalRatingCount.toLocaleString()} ratings.`);
  }

  return {
    title,
    slug: `igdb-${game.id}-${game.slug || makeSlug(title)}`,
    developer: pickCompany(game, "developer") ?? "IGDB import",
    publisher: pickCompany(game, "publisher"),
    release_year: unixYear(game.first_release_date),
    genre,
    platforms: platforms.length ? platforms : ["Unknown"],
    cover_url: coverImageUrl(game.cover),
    summary: summaryParts.filter(Boolean).join(" "),
    igdb_id: game.id,
    source: "IGDB",
    source_url: typeof game.url === "string" ? game.url : `https://www.igdb.com/games/${game.slug || makeSlug(title)}`,
    is_community: false,
    catalog_rank: rank,
    catalog_score: scoreGame(game),
    igdb_total_rating: totalRating,
    igdb_total_rating_count: totalRatingCount,
    igdb_hypes: typeof game.hypes === "number" ? Math.round(game.hypes) : 0,
    igdb_follows: typeof game.follows === "number" ? Math.round(game.follows) : 0,
    catalog_imported_at: new Date().toISOString()
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function assertSchemaReady() {
  const { error } = await supabase.from("games").select("id,igdb_id,catalog_rank,catalog_score", { count: "exact", head: true }).limit(1);
  if (error) {
    throw new Error(`Catalog schema is not ready. Run supabase/v3_3_top_10000_catalog.sql first. Supabase said: ${error.message}`);
  }
}

async function importTopGames() {
  await assertSchemaReady();
  console.log(`GameLog top catalog import starting: target=${target}, batch=${batchSize}, start=${startOffset}, includeDlc=${includeDlc}, dryRun=${dryRun}`);
  let imported = 0;
  let offset = startOffset;
  const importedAt = new Date().toISOString();

  while (imported < target) {
    const limit = Math.min(batchSize, target - imported);
    const rankStart = offset + 1;
    const categoryClause = includeDlc ? "" : "& category = 0";
    const query = `
      fields id,name,slug,summary,storyline,first_release_date,cover.image_id,cover.url,genres.name,platforms.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,total_rating,total_rating_count,hypes,follows,url;
      where version_parent = null ${categoryClause} & cover != null;
      sort total_rating_count desc;
      limit ${limit};
      offset ${offset};
    `;

    console.log(`Fetching IGDB games ${offset + 1}-${offset + limit}...`);
    const results = await igdbPost("games", query);
    const rows = (Array.isArray(results) ? results : [])
      .map((game, index) => mapGame(game, rankStart + index))
      .filter(Boolean)
      .map((row) => ({ ...row, catalog_imported_at: importedAt }));

    if (!rows.length) {
      console.log("IGDB returned no more rows. Stopping early.");
      break;
    }

    if (dryRun) {
      console.log(`Dry run: would upsert ${rows.length} rows. Example: ${rows[0].title} (#${rows[0].catalog_rank})`);
    } else {
      const { error } = await supabase.from("games").upsert(rows, { onConflict: "igdb_id" });
      if (error) throw new Error(`Supabase upsert failed at offset ${offset}: ${error.message}`);
      console.log(`Upserted ${rows.length} games. Last rank: ${rows.at(-1)?.catalog_rank}`);
    }

    imported += rows.length;
    offset += rows.length;
    await sleep(275);
  }

  if (!dryRun) {
    const { count, error } = await supabase.from("games").select("id", { count: "exact", head: true }).eq("source", "IGDB");
    if (!error) console.log(`Done. Supabase now has about ${count?.toLocaleString() ?? "unknown"} IGDB catalog games.`);
  } else {
    console.log("Dry run complete. Run again without --dry-run to write to Supabase.");
  }
}

importTopGames().catch((error) => {
  console.error("\nImport failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

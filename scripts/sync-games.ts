import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { fetchRawgGames, mapRawgGame } from "../src/lib/gameSources/rawg";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  process.env.SUPABASE_SECRET_KEY || requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

async function main() {
  const pageSize = Number(process.env.RAWG_PAGE_SIZE ?? 40);
  const pages = Number(process.env.RAWG_SYNC_PAGES ?? 10);

  let totalSaved = 0;

  console.log(`Starting RAWG sync: ${pages} pages x ${pageSize} games`);

  for (let page = 1; page <= pages; page++) {
    console.log(`Fetching RAWG page ${page}...`);

    const games = await fetchRawgGames(page, pageSize);

    const rows = games
      .map(mapRawgGame)
      .filter((game) => game.title && game.cover_url);

    if (rows.length === 0) {
      console.log(`Page ${page}: no usable games found`);
      continue;
    }

    const { error } = await supabase.from("games").upsert(rows, {
      onConflict: "source,source_id",
    });

    if (error) {
      throw error;
    }

    totalSaved += rows.length;
    console.log(`Page ${page}: saved ${rows.length} games`);
  }

  console.log(`Done. Saved or updated ${totalSaved} games.`);
}

main().catch((error) => {
  console.error("Sync failed:");
  console.error(error);
  process.exit(1);
});

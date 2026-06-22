#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase URL/key in .env.local.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const [{ count: total, error: totalError }, { count: igdb, error: igdbError }, { count: ranked, error: rankedError }] = await Promise.all([
  supabase.from("games").select("id", { count: "exact", head: true }),
  supabase.from("games").select("id", { count: "exact", head: true }).eq("source", "IGDB"),
  supabase.from("games").select("id", { count: "exact", head: true }).not("catalog_rank", "is", null)
]);

if (totalError || igdbError || rankedError) {
  console.error("Could not read catalog count. Make sure supabase/v3_3_top_10000_catalog.sql has been run.");
  console.error(totalError?.message || igdbError?.message || rankedError?.message);
  process.exit(1);
}

console.log("GameLog catalog count");
console.log(`Total games: ${Number(total ?? 0).toLocaleString()}`);
console.log(`IGDB games: ${Number(igdb ?? 0).toLocaleString()}`);
console.log(`Ranked top catalog games: ${Number(ranked ?? 0).toLocaleString()}`);

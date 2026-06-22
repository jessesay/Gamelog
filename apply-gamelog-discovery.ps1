$ErrorActionPreference = "Stop"

function Write-Step($Text) {
  Write-Host "`n==> $Text" -ForegroundColor Cyan
}

function Ensure-Dir($Path) {
  if (!(Test-Path $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function Write-File($Path, $Content) {
  $Dir = Split-Path $Path -Parent
  if ($Dir) { Ensure-Dir $Dir }
  Set-Content -Path $Path -Value $Content -Encoding UTF8
  Write-Host "Wrote $Path" -ForegroundColor Green
}

if (!(Test-Path "package.json")) {
  throw "Run this from the root of your GameLog project, where package.json is located."
}

Write-Step "Creating GameLog discovery files"

Write-File "src/lib/gameSources/rawg.ts" @'
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
'@

Write-File "src/lib/supabase/admin.ts" @'
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const supabaseAdmin = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
'@

Write-File "scripts/sync-games.ts" @'
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
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
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
'@

Write-File "src/app/api/games/feed/route.ts" @'
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const { data: swipes, error: swipeError } = await supabaseAdmin
    .from("game_swipes")
    .select("game_id")
    .eq("session_id", sessionId)
    .limit(2000);

  if (swipeError) {
    return NextResponse.json({ error: swipeError.message }, { status: 500 });
  }

  const swipedIds = swipes?.map((swipe) => swipe.game_id) ?? [];

  let query = supabaseAdmin
    .from("games")
    .select(
      "id, title, slug, cover_url, background_url, platforms, genres, tags, release_date, rating, metacritic, stores"
    )
    .not("cover_url", "is", null)
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(30);

  if (swipedIds.length > 0) {
    query = query.not("id", "in", `(${swipedIds.join(",")})`);
  }

  const { data: games, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ games: games ?? [] });
}
'@

Write-File "src/app/api/games/swipe/route.ts" @'
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const allowedActions = new Set(["liked", "disliked", "skipped", "saved"]);

export async function POST(request: NextRequest) {
  const body = await request.json();

  const sessionId = body.sessionId;
  const gameId = body.gameId;
  const action = body.action;

  if (!sessionId || !gameId || !action) {
    return NextResponse.json(
      { error: "Missing sessionId, gameId, or action" },
      { status: 400 }
    );
  }

  if (!allowedActions.has(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("game_swipes").upsert(
    {
      session_id: sessionId,
      game_id: gameId,
      action,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "session_id,game_id",
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
'@

Write-File "src/components/GameSwipeDeck.tsx" @'
"use client";

import { useEffect, useMemo, useState } from "react";

type Game = {
  id: string;
  title: string;
  cover_url: string | null;
  background_url: string | null;
  platforms: string[] | null;
  genres: string[] | null;
  tags: string[] | null;
  release_date: string | null;
  rating: number | null;
  metacritic: number | null;
};

function getSessionId() {
  const key = "gamelog_session_id";

  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
}

export default function GameSwipeDeck() {
  const [sessionId, setSessionId] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading games...");

  const currentGame = games[0];

  const visibleGenres = useMemo(() => {
    return currentGame?.genres?.slice(0, 3) ?? [];
  }, [currentGame]);

  const visiblePlatforms = useMemo(() => {
    return currentGame?.platforms?.slice(0, 4) ?? [];
  }, [currentGame]);

  async function loadFeed(id: string) {
    setLoading(true);

    const response = await fetch(`/api/games/feed?sessionId=${id}`);
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not load games.");
      setLoading(false);
      return;
    }

    setGames(data.games ?? []);
    setLoading(false);

    if (!data.games || data.games.length === 0) {
      setMessage("No more games found. Run npm run sync:games to add more.");
    }
  }

  async function swipe(action: "liked" | "disliked" | "skipped" | "saved") {
    if (!currentGame || !sessionId) return;

    const swipedGame = currentGame;

    setGames((previous) => previous.slice(1));

    await fetch("/api/games/swipe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        gameId: swipedGame.id,
        action,
      }),
    });

    if (games.length < 6) {
      loadFeed(sessionId);
    }
  }

  useEffect(() => {
    const id = getSessionId();
    setSessionId(id);
    loadFeed(id);
  }, []);

  if (loading && games.length === 0) {
    return (
      <main style={styles.page}>
        <div style={styles.shell}>
          <p style={styles.message}>{message}</p>
        </div>
      </main>
    );
  }

  if (!currentGame) {
    return (
      <main style={styles.page}>
        <div style={styles.shell}>
          <p style={styles.message}>{message}</p>
          <button style={styles.primaryButton} onClick={() => loadFeed(sessionId)}>
            Refresh feed
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topBar}>
          <div>
            <p style={styles.kicker}>GameLog Discovery</p>
            <h1 style={styles.heading}>Find your next game</h1>
          </div>
          <div style={styles.counter}>{games.length} left</div>
        </div>

        <section style={styles.card}>
          <div
            style={{
              ...styles.cover,
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.78)), url(${currentGame.cover_url})`,
            }}
          >
            <div style={styles.cardContent}>
              <div style={styles.badges}>
                {visibleGenres.map((genre) => (
                  <span key={genre} style={styles.badge}>
                    {genre}
                  </span>
                ))}
              </div>

              <h2 style={styles.title}>{currentGame.title}</h2>

              <div style={styles.metaRow}>
                {currentGame.rating ? <span>⭐ {currentGame.rating.toFixed(1)}</span> : null}
                {currentGame.metacritic ? <span>Meta {currentGame.metacritic}</span> : null}
                {currentGame.release_date ? (
                  <span>{new Date(currentGame.release_date).getFullYear()}</span>
                ) : null}
              </div>

              <div style={styles.platforms}>
                {visiblePlatforms.map((platform) => (
                  <span key={platform}>{platform}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div style={styles.actions}>
          <button style={styles.noButton} onClick={() => swipe("disliked")}>
            ✕
          </button>

          <button style={styles.maybeButton} onClick={() => swipe("skipped")}>
            Maybe
          </button>

          <button style={styles.yesButton} onClick={() => swipe("saved")}>
            ✓
          </button>
        </div>

        <p style={styles.hint}>X = pass. Maybe = skip for now. Check = save to backlog.</p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #003049 0%, #111827 45%, #030712 100%)",
    color: "#FDF0D5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "Helvetica, Arial, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  shell: {
    width: "100%",
    maxWidth: 430,
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 18,
  },
  kicker: {
    margin: 0,
    fontSize: 13,
    opacity: 0.75,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heading: {
    margin: "4px 0 0",
    fontSize: 28,
    lineHeight: 1,
  },
  counter: {
    fontSize: 13,
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.1)",
  },
  card: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
    background: "#111827",
  },
  cover: {
    height: 610,
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    alignItems: "flex-end",
  },
  cardContent: {
    width: "100%",
    padding: 24,
  },
  badges: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  badge: {
    fontSize: 12,
    padding: "6px 9px",
    borderRadius: 999,
    background: "rgba(253,240,213,0.16)",
    backdropFilter: "blur(8px)",
  },
  title: {
    fontSize: 36,
    lineHeight: 1,
    margin: "0 0 12px",
    textShadow: "0 2px 20px rgba(0,0,0,0.7)",
  },
  metaRow: {
    display: "flex",
    gap: 12,
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 12,
  },
  platforms: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    fontSize: 12,
    opacity: 0.85,
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1.2fr 1fr",
    gap: 12,
    marginTop: 18,
  },
  noButton: {
    border: "none",
    height: 62,
    borderRadius: 999,
    fontSize: 28,
    cursor: "pointer",
    background: "#780000",
    color: "#FDF0D5",
  },
  maybeButton: {
    border: "none",
    height: 62,
    borderRadius: 999,
    fontSize: 18,
    cursor: "pointer",
    background: "#FDF0D5",
    color: "#003049",
    fontWeight: 800,
  },
  yesButton: {
    border: "none",
    height: 62,
    borderRadius: 999,
    fontSize: 30,
    cursor: "pointer",
    background: "#669BBC",
    color: "#030712",
  },
  primaryButton: {
    border: "none",
    height: 52,
    borderRadius: 14,
    padding: "0 18px",
    cursor: "pointer",
    background: "#669BBC",
    color: "#030712",
    fontWeight: 800,
  },
  message: {
    fontSize: 18,
    textAlign: "center",
  },
  hint: {
    textAlign: "center",
    fontSize: 13,
    opacity: 0.7,
    marginTop: 14,
  },
};
'@

Write-File "src/app/page.tsx" @'
import GameSwipeDeck from "@/components/GameSwipeDeck";

export default function Home() {
  return <GameSwipeDeck />;
}
'@

Write-Step "Writing Supabase SQL file"

Write-File "gamelog_discovery_schema.sql" @'
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text not null,
  title text not null,
  slug text,
  description text,
  cover_url text,
  background_url text,
  platforms text[] default '{}',
  genres text[] default '{}',
  tags text[] default '{}',
  release_date date,
  rating numeric,
  metacritic integer,
  stores jsonb default '[]',
  raw jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (source, source_id)
);

create table if not exists public.game_swipes (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid,
  game_id uuid not null references public.games(id) on delete cascade,
  action text not null check (action in ('liked', 'disliked', 'skipped', 'saved')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (session_id, game_id)
);

create index if not exists games_source_idx on public.games(source);
create index if not exists games_rating_idx on public.games(rating desc);
create index if not exists games_release_date_idx on public.games(release_date desc);
create index if not exists game_swipes_session_idx on public.game_swipes(session_id);
create index if not exists game_swipes_game_idx on public.game_swipes(game_id);

alter table public.games enable row level security;
alter table public.game_swipes enable row level security;

drop policy if exists "Games are readable by everyone" on public.games;

create policy "Games are readable by everyone"
on public.games
for select
using (true);
'@

Write-Step "Updating package.json scripts"

$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
if ($null -eq $pkg.scripts) {
  $pkg | Add-Member -MemberType NoteProperty -Name scripts -Value ([PSCustomObject]@{})
}
$pkg.scripts | Add-Member -NotePropertyName "sync:games" -NotePropertyValue "tsx scripts/sync-games.ts" -Force
$pkg | ConvertTo-Json -Depth 40 | Set-Content "package.json" -Encoding UTF8
Write-Host "Added npm run sync:games" -ForegroundColor Green

Write-Step "Adding .env.local placeholders if missing"

if (!(Test-Path ".env.local")) {
  New-Item -ItemType File -Path ".env.local" | Out-Null
}

$envText = Get-Content ".env.local" -Raw
$toAppend = ""
if ($envText -notmatch "RAWG_API_KEY=") {
  $toAppend += "`nRAWG_API_KEY=your_rawg_api_key_here"
}
if ($envText -notmatch "SUPABASE_SERVICE_ROLE_KEY=") {
  $toAppend += "`nSUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here"
}
if ($toAppend.Length -gt 0) {
  Add-Content ".env.local" $toAppend
  Write-Host "Added missing env placeholders to .env.local" -ForegroundColor Yellow
} else {
  Write-Host ".env.local already has discovery env keys" -ForegroundColor Green
}

Write-Step "Installing helper packages"

npm install -D tsx dotenv

Write-Step "Done"
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "1. Open Supabase SQL Editor and run gamelog_discovery_schema.sql"
Write-Host "2. Put your real RAWG_API_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local"
Write-Host "3. Run: npm run sync:games"
Write-Host "4. Run: npm run dev"

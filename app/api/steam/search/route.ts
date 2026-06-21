import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 86400;

function makeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function looksLikeNonGame(name: string) {
  return /\b(dlc|soundtrack|ost|demo|trailer|server|dedicated server|sdk|tool|editor|test|playtest|beta|episode|artbook|wallpaper|upgrade|season pass|currency|points|pack)\b/i.test(name);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.max(5, Math.min(Number(url.searchParams.get("limit") ?? "30") || 30, 75));

  if (!q) {
    return NextResponse.json({ games: [], error: "Missing q search term." }, { status: 400 });
  }

  const response = await fetch("https://api.steampowered.com/ISteamApps/GetAppList/v2/", {
    next: { revalidate: 86400 }
  });

  if (!response.ok) {
    return NextResponse.json({ games: [], error: `Steam app list failed with status ${response.status}.` }, { status: 502 });
  }

  const body = await response.json();
  const apps = body?.applist?.apps ?? [];
  const words = q.split(/\s+/).filter(Boolean);

  const matches = apps
    .filter((app: any) => typeof app?.name === "string" && app.name.trim() && typeof app?.appid === "number")
    .filter((app: any) => {
      const name = app.name.toLowerCase();
      if (looksLikeNonGame(name)) return false;
      return words.every((word) => name.includes(word));
    })
    .slice(0, limit)
    .map((app: any) => {
      const title = app.name.trim();
      const appid = app.appid;
      return {
        title,
        slug: `steam-${appid}-${makeSlug(title)}`,
        developer: "Steam import",
        publisher: null,
        release_year: null,
        genre: "Steam",
        platforms: ["PC", "Steam"],
        // Steam has several public store image sizes. The portrait library image is best for swipe cards when present.
        cover_url: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900.jpg`,
        summary: `Imported from Steam app catalog. Steam AppID: ${appid}.`,
        is_community: true
      };
    });

  return NextResponse.json({ games: matches, count: matches.length });
}

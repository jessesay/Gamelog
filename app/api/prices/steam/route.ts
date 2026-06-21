import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 1800;

type SteamSearchItem = {
  id?: number;
  appid?: number;
  name?: string;
};

function parseAppId(value: string | null) {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

async function findSteamAppId(term: string) {
  const searchUrl = new URL("https://store.steampowered.com/api/storesearch/");
  searchUrl.searchParams.set("term", term);
  searchUrl.searchParams.set("cc", "US");
  searchUrl.searchParams.set("l", "en");
  searchUrl.searchParams.set("category1", "998");

  const response = await fetch(searchUrl, { next: { revalidate: 3600 } });
  if (!response.ok) return null;
  const body = await response.json();
  const first = (body?.items ?? [])[0] as SteamSearchItem | undefined;
  return first?.id ?? first?.appid ?? null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const region = (url.searchParams.get("cc") ?? "US").trim().toUpperCase().slice(0, 2) || "US";
  let appid = parseAppId(url.searchParams.get("appid"));

  if (!appid && q) appid = await findSteamAppId(q);

  if (!appid) {
    return NextResponse.json({ ok: false, error: "No Steam AppID found. Try importing the game from Steam first." }, { status: 404 });
  }

  const detailsUrl = new URL("https://store.steampowered.com/api/appdetails");
  detailsUrl.searchParams.set("appids", String(appid));
  detailsUrl.searchParams.set("cc", region);
  detailsUrl.searchParams.set("l", "en");
  detailsUrl.searchParams.set("filters", "basic,price_overview");

  const response = await fetch(detailsUrl, { next: { revalidate: 1800 } });
  if (!response.ok) {
    return NextResponse.json({ ok: false, error: `Steam price lookup failed with status ${response.status}.` }, { status: 502 });
  }

  const body = await response.json();
  const entry = body?.[appid];
  const data = entry?.data;
  const price = data?.price_overview;

  if (!entry?.success || !data) {
    return NextResponse.json({ ok: false, appid, error: "Steam did not return product data for this app." }, { status: 404 });
  }

  const current = typeof price?.final === "number" ? price.final / 100 : null;
  const original = typeof price?.initial === "number" ? price.initial / 100 : current;
  const discount = typeof price?.discount_percent === "number" ? price.discount_percent : 0;

  return NextResponse.json({
    ok: true,
    source: "Steam",
    appid,
    title: data.name ?? q,
    currency: price?.currency ?? "USD",
    current_price: current,
    original_price: original,
    discount_percent: discount,
    final_formatted: price?.final_formatted ?? (current === null ? "Free / unavailable" : `$${current.toFixed(2)}`),
    initial_formatted: price?.initial_formatted ?? (original === null ? null : `$${original.toFixed(2)}`),
    checked_at: new Date().toISOString(),
    store_url: `https://store.steampowered.com/app/${appid}`
  });
}

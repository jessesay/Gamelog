import { NextResponse } from "next/server";
import { buildArchiveQuery, mapArchiveItem } from "@/lib/archive";

export const runtime = "nodejs";
export const revalidate = 3600;

const FIELDS = [
  "identifier",
  "title",
  "description",
  "creator",
  "date",
  "year",
  "publisher",
  "subject",
  "collection",
  "mediatype",
  "downloads",
  "licenseurl",
  "rights"
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const mode = (url.searchParams.get("mode") ?? "guides").trim();
  const limit = Math.max(5, Math.min(Number(url.searchParams.get("limit") ?? "25") || 25, 75));

  if (!q) {
    return NextResponse.json({ games: [], error: "Missing q search term." }, { status: 400 });
  }

  try {
    const params = new URLSearchParams();
    params.set("q", buildArchiveQuery(q, mode));
    params.set("output", "json");
    params.set("rows", String(limit));
    params.set("page", "1");
    params.append("sort[]", "downloads desc");
    for (const field of FIELDS) params.append("fl[]", field);

    const response = await fetch(`https://archive.org/advancedsearch.php?${params.toString()}`, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "GameLog catalog importer (metadata search)" }
    });

    if (!response.ok) {
      return NextResponse.json({ games: [], error: `Internet Archive search failed with status ${response.status}.` }, { status: 502 });
    }

    const body = await response.json();
    const docs = body?.response?.docs ?? [];
    const games = (Array.isArray(docs) ? docs : []).map((item) => mapArchiveItem(item, mode)).filter(Boolean);

    return NextResponse.json({ games, count: games.length, source: "Internet Archive", query: body?.responseHeader?.params?.q ?? q });
  } catch (error) {
    return NextResponse.json(
      { games: [], error: error instanceof Error ? error.message : "Internet Archive import failed." },
      { status: 502 }
    );
  }
}

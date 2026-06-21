import type { Game } from "@/lib/types";

function makeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function firstValue(value: unknown): string | null {
  if (Array.isArray(value)) return value.find((item) => typeof item === "string" && item.trim())?.trim() ?? null;
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseYear(item: any): number | null {
  const raw = firstValue(item.year) ?? firstValue(item.date);
  if (!raw) return null;
  const match = raw.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

export function buildArchiveQuery(q: string, mode: string) {
  const clean = q.replace(/["()]/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean).slice(0, 8);
  const titleSearch = words.length ? words.map((word) => `${word}*`).join(" AND ") : "video game";

  if (mode === "software") {
    return `(${titleSearch}) AND mediatype:software`;
  }

  if (mode === "covers") {
    return `(${titleSearch}) AND (cover OR box OR scan OR art OR manual) AND (mediatype:image OR mediatype:texts OR mediatype:software)`;
  }

  return `(${titleSearch}) AND mediatype:texts AND (manual OR guide OR walkthrough OR strategy OR game)`;
}

export function mapArchiveItem(item: any, mode: string): Partial<Game> | null {
  const identifier = firstValue(item.identifier);
  const title = firstValue(item.title) ?? identifier;
  if (!identifier || !title) return null;

  const archiveUrl = `https://archive.org/details/${identifier}`;
  const mediatype = firstValue(item.mediatype) ?? "archive";
  const creator = firstValue(item.creator);
  const publisher = firstValue(item.publisher);
  const subject = firstValue(item.subject);
  const description = firstValue(item.description);
  const year = parseYear(item);
  const tag = mode === "software" ? "Archive Software" : mode === "covers" ? "Archive Scan" : "Manual / Guide";
  const summaryBits = [
    description ? stripHtml(description).slice(0, 280) : null,
    `Internet Archive ${tag.toLowerCase()} record.`,
    `Source: ${archiveUrl}`
  ].filter(Boolean);

  return {
    title,
    slug: `archive-${makeSlug(identifier)}`,
    developer: creator ?? "Internet Archive",
    publisher: publisher ?? null,
    release_year: year,
    genre: tag,
    platforms: ["Archive.org", mediatype].filter(Boolean),
    cover_url: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    summary: summaryBits.join(" "),
    is_community: true
  };
}

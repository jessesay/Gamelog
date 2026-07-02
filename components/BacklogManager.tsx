"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { track } from "@vercel/analytics";
import GameCoverArt from "@/components/GameCoverArt";
import { gamePath } from "@/lib/social";
import { gameStatusKeys, gameStatusLabels, normalizeGameStatus, type GameStatusKey } from "@/lib/gameStatus";
import { guestLibraryKey, libraryMetaFromLog, normalizeGuestLibraryItem } from "@/lib/libraryMeta";

const tabs: Array<{ key: "all" | GameStatusKey; label: string }> = [{ key: "all", label: "All" }, ...gameStatusKeys.filter((key) => key !== "played").map((key) => ({ key, label: gameStatusLabels[key] }))];

export default function BacklogManager({ initialItems, signedIn = true }: { initialItems: any[]; signedIn?: boolean }) {
  const [items, setItems] = useState(() => initialItems.map((item) => ({ ...item, ...libraryMetaFromLog(item) })));
  const [active, setActive] = useState<"all" | GameStatusKey>("all");
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (signedIn) return;
    try {
      const raw = JSON.parse(localStorage.getItem(guestLibraryKey) ?? "[]");
      setItems(Array.isArray(raw) ? raw.map(normalizeGuestLibraryItem) : []);
    } catch { setItems([]); }
  }, [signedIn]);

  function persistGuest(next: any[]) {
    setItems(next);
    localStorage.setItem(guestLibraryKey, JSON.stringify(next.map((item) => ({
      ...item, gameId: item.game_id, title: item.games?.title, slug: item.games?.slug, coverUrl: item.games?.cover_url,
      releaseYear: item.games?.release_year, platforms: item.games?.platforms, genres: item.games?.genres, genre: item.games?.genre,
    }))));
  }

  async function changeStatus(item: any, status: GameStatusKey) {
    setSaving(item.id); setError("");
    if (!signedIn) {
      persistGuest(items.map((entry) => entry.id === item.id ? { ...entry, status } : entry));
      track("status_change", { status, signed_in: false }); setSaving(""); return;
    }
    const response = await fetch("/api/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: item.game_id, status }) });
    const data = await response.json().catch(() => ({})); setSaving("");
    if (!response.ok) { setError(data.error ?? "Could not update that status."); return; }
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status } : entry));
    track("status_change", { status, signed_in: true });
  }

  async function remove(item: any) {
    setSaving(item.id); setError("");
    if (!signedIn) { persistGuest(items.filter((entry) => entry.id !== item.id)); setSaving(""); return; }
    const response = await fetch(`/api/library?gameId=${encodeURIComponent(item.game_id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({})); setSaving("");
    if (!response.ok) { setError(data.error ?? "Could not remove that game."); return; }
    setItems((current) => current.filter((entry) => entry.id !== item.id));
  }

  const counts = useMemo(() => Object.fromEntries(tabs.map(({ key }) => [key, key === "all" ? items.length : items.filter((item) => normalizeGameStatus(item.status) === key).length])), [items]);
  const visible = active === "all" ? items : items.filter((item) => normalizeGameStatus(item.status) === active);

  return <>
    <nav className="backlog-tabs-v319" aria-label="Library status filters">{tabs.map((tab) => <button key={tab.key} className={active === tab.key ? "active" : ""} onClick={() => setActive(tab.key)}>{tab.label}<b>{counts[tab.key] ?? 0}</b></button>)}</nav>
    {!items.length ? <section className="social-card-v35 social-empty-v35"><h2>Your library is ready</h2><p className="muted">Save a game from discovery and it will appear here.</p><Link className="primary inline-link" href="/app/discover">Discover games</Link></section> : null}
    {items.length && !visible.length ? <section className="social-card-v35 social-empty-v35"><h2>No games here yet</h2><p className="muted">Change a game&apos;s status to build this shelf.</p></section> : null}
    {visible.length ? <section className="backlog-grid-v314">{visible.map((item) => item.games ? <article className="backlog-card-v314" key={item.id}>
      <Link className="backlog-cover-v314" href={gamePath(item.games)}><GameCoverArt src={item.games.cover_url} title={item.games.title} genre={item.games.genre} compact /></Link>
      <div><Link href={gamePath(item.games)}><strong>{item.games.title}</strong></Link><small>{item.games.release_year ?? "TBA"} · {(item.games.platforms ?? []).slice(0, 2).join(" · ") || "Platform TBA"}</small><select aria-label={`Status for ${item.games.title}`} value={normalizeGameStatus(item.status) ?? "want_to_play"} onChange={(event) => void changeStatus(item, event.target.value as GameStatusKey)} disabled={saving === item.id}>{tabs.filter((tab) => tab.key !== "all").map((tab) => <option key={tab.key} value={tab.key}>{tab.label}</option>)}</select></div>
      <button className="backlog-remove-v314" onClick={() => void remove(item)} disabled={Boolean(saving)} aria-label={`Remove ${item.games.title} from library`}><Trash2 size={16} />{saving === item.id ? "Saving…" : "Remove"}</button>
    </article> : null)}</section> : null}
    {error ? <p className="backlog-error-v314" role="alert">{error}</p> : null}
  </>;
}

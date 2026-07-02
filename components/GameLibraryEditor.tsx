"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { gameStatusKeys, gameStatusLabels, type GameStatusKey } from "@/lib/gameStatus";
import { guestLibraryKey, libraryMetaFromLog, normalizeGuestLibraryItem } from "@/lib/libraryMeta";

const editableStatuses = gameStatusKeys.filter((status) => status !== "played");

export default function GameLibraryEditor({ game, existingLog, signedIn }: { game: any; existingLog?: any; signedIn: boolean }) {
  const router = useRouter();
  const initial = useMemo(() => {
    if (existingLog) return libraryMetaFromLog(existingLog);
    return { status: "want_to_play" as GameStatusKey, rating: null, notes: "", hoursPlayed: null };
  }, [existingLog, game.id, signedIn]);
  const [status, setStatus] = useState<GameStatusKey>(initial.status);
  const [rating, setRating] = useState<string>(initial.rating?.toString() ?? "");
  const [notes, setNotes] = useState(initial.notes);
  const [hours, setHours] = useState<string>(initial.hoursPlayed?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (signedIn || existingLog) return;
    try {
      const raw = JSON.parse(localStorage.getItem(guestLibraryKey) ?? "[]");
      const match = Array.isArray(raw) ? raw.map(normalizeGuestLibraryItem).find((item) => item.game_id === game.id) : null;
      if (match) { setStatus(match.status); setRating(match.rating?.toString() ?? ""); setNotes(match.notes); setHours(match.hoursPlayed?.toString() ?? ""); }
    } catch { /* clean fallback */ }
  }, [existingLog, game.id, signedIn]);

  function saveGuest() {
    const raw = JSON.parse(localStorage.getItem(guestLibraryKey) ?? "[]");
    const items = Array.isArray(raw) ? raw.map(normalizeGuestLibraryItem) : [];
    const nextItem = normalizeGuestLibraryItem({
      gameId: game.id, title: game.title, slug: game.slug, coverUrl: game.cover_url, releaseYear: game.release_year,
      platforms: game.platforms, genres: game.genres, genre: game.genre, status,
      rating: rating ? Number(rating) : null, notes, hoursPlayed: hours ? Number(hours) : null, savedAt: new Date().toISOString(),
    });
    localStorage.setItem(guestLibraryKey, JSON.stringify([nextItem, ...items.filter((item) => item.game_id !== game.id)]));
  }

  async function save() {
    setSaving(true); setMessage("");
    if (rating && (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 10)) { setSaving(false); setMessage("Choose a whole-number rating from 1 to 10."); return; }
    const previous = initial;
    if (!signedIn) { saveGuest(); setSaving(false); setMessage("Saved on this device."); emitAnalytics(previous); return; }
    const response = await fetch("/api/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: game.id, status, rating: rating || null, notes, hoursPlayed: hours || null }) });
    const data = await response.json().catch(() => ({})); setSaving(false);
    if (!response.ok) { setMessage(data.error ?? "Could not save your library entry."); return; }
    setMessage("Library entry saved."); emitAnalytics(previous); router.refresh();
  }

  function emitAnalytics(previous: typeof initial) {
    const shared = { signed_in: signedIn };
    if (previous.status !== status) track("status_change", { ...shared, status });
    if (String(previous.rating ?? "") !== rating) track("rating_save", shared);
    if (previous.notes !== notes) track("notes_save", shared);
    if (String(previous.hoursPlayed ?? "") !== hours) track("hours_played_save", shared);
  }

  return <section className="library-editor-v319">
    <div><p className="eyebrow">Your library</p><h2>{existingLog ? "Update your game" : "Add to your library"}</h2><p className="muted">{signedIn ? "Tracking details sync with your account." : "Guest details stay on this device."}</p></div>
    <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as GameStatusKey)}>{editableStatuses.map((key) => <option value={key} key={key}>{gameStatusLabels[key]}</option>)}</select></label>
    <div className="library-editor-row-v319"><label>Rating <span>1–10</span><input type="number" min="1" max="10" step="1" value={rating} onChange={(event) => setRating(event.target.value)} placeholder="—" /></label><label>Hours played<input type="number" min="0" max="100000" step="0.5" value={hours} onChange={(event) => setHours(event.target.value)} placeholder="0" /></label></div>
    <label>Personal notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} placeholder="Where you left off, what you loved, or what to remember…" /></label>
    <button className="primary" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save library details"}</button>
    {message ? <p className="library-editor-message-v319" role="status">{message}</p> : null}
  </section>;
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import GameCoverArt from "@/components/GameCoverArt";
import { gamePath } from "@/lib/social";

export default function BacklogManager({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const [removing, setRemoving] = useState("");
  const [error, setError] = useState("");

  async function remove(item: any) {
    setRemoving(item.id);
    setError("");
    const response = await fetch(`/api/social/reviews?reviewId=${encodeURIComponent(item.id)}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setRemoving("");
    if (!response.ok) {
      setError(data.error ?? "Could not remove that game from your backlog.");
      return;
    }
    setItems((current) => current.filter((entry) => entry.id !== item.id));
  }

  if (!items.length) {
    return <section className="social-card-v35 social-empty-v35"><h2>Your backlog is clear</h2><p className="muted">Save a game from discovery and it will appear here.</p><Link className="primary inline-link" href="/app/discover">Discover games</Link></section>;
  }

  return (
    <section className="backlog-grid-v314">
      {items.map((item) => item.games ? (
        <article className="backlog-card-v314" key={item.id}>
          <Link className="backlog-cover-v314" href={gamePath(item.games)}><GameCoverArt src={item.games.cover_url} title={item.games.title} genre={item.games.genre} compact /></Link>
          <div><Link href={gamePath(item.games)}><strong>{item.games.title}</strong></Link><small>{item.games.release_year ?? "TBA"} · {(item.games.platforms ?? []).slice(0, 2).join(" · ") || "Platform TBA"}</small></div>
          <button className="backlog-remove-v314" onClick={() => void remove(item)} disabled={Boolean(removing)} aria-label={`Remove ${item.games.title} from backlog`}><Trash2 size={16} />{removing === item.id ? "Removing…" : "Remove"}</button>
        </article>
      ) : null)}
      {error ? <p className="backlog-error-v314" role="alert">{error}</p> : null}
    </section>
  );
}

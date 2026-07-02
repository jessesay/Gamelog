"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import GameCoverArt from "@/components/GameCoverArt";
import { gamePath } from "@/lib/social";
import { guestLibraryKey, normalizeGuestLibraryItem } from "@/lib/libraryMeta";
import { playerInsights } from "@/lib/playerInsights";
import PlayNextShareCard from "@/components/PlayNextShareCard";

export default function GuestPlayNext() {
  const [recommendations, setRecommendations] = useState<any[] | null>(null);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(guestLibraryKey) ?? "[]");
      const items = Array.isArray(raw) ? raw.map(normalizeGuestLibraryItem) : [];
      setRecommendations(playerInsights(items).recommendations);
    } catch { setRecommendations([]); }
  }, []);
  if (recommendations === null) return <section className="social-card-v35 social-empty-v35"><p>Reading your guest library…</p></section>;
  if (!recommendations.length) return <section className="social-card-v35 social-empty-v35"><h2>Your oracle needs a backlog</h2><p className="muted">Save a game as want to play, playing, or paused, then come back.</p><Link className="primary inline-link" href="/app/discover">Start swiping</Link></section>;
  return <><PlayNextShareCard username="guest-player" recommendations={recommendations} /><section className="play-next-grid-v315">{recommendations.map((item, index) => <article className="play-next-card-v315" key={item.game.id}><div className="play-next-rank-v315">0{index + 1}</div><Link className="play-next-cover-v315" href={gamePath(item.game)}><GameCoverArt src={item.game.cover_url} title={item.game.title} genre={item.game.genre} /></Link><div className="play-next-copy-v315"><p><Sparkles size={14} /> {item.percentage}% Taste Match</p><h2>{item.game.title}</h2><div>{item.reasons.map((reason: string) => <span key={reason}>{reason}</span>)}</div><Link className="primary inline-link" href={gamePath(item.game)}>Open game</Link></div></article>)}</section></>;
}

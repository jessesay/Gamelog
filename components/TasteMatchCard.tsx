import Link from "next/link";
import { Gamepad2, Heart, LogIn, Sparkles, Tags } from "lucide-react";
import type { TasteMatchResult } from "@/lib/tasteMatch";

export default function TasteMatchCard({ ownerName, match }: { ownerName: string; match: TasteMatchResult | null }) {
  if (!match) {
    return (
      <section className="taste-match-v310 taste-match-signed-out-v310">
        <div className="taste-match-icon-v310"><LogIn size={23} /></div>
        <div><p className="eyebrow">Taste Match</p><h2>See how your libraries line up</h2><p>Sign in to compare ratings, favorites, genres, platforms, and lists with {ownerName}.</p></div>
        <Link className="primary" href="/app/profile">Sign in to compare</Link>
      </section>
    );
  }

  const sharedTaste = [...match.sharedGenres, ...match.sharedPlatforms];
  return (
    <section className="taste-match-v310">
      <div className="taste-match-score-v310" style={{ "--taste-score": `${match.percentage * 3.6}deg` } as React.CSSProperties}>
        <span><strong>{match.percentage}%</strong><small>Taste Match</small></span>
      </div>
      <div className="taste-match-copy-v310">
        <p className="eyebrow">Your overlap with {ownerName}</p>
        <h2>{match.isSelf ? "Naturally, you have excellent taste." : match.percentage >= 75 ? "You speak the same gaming language." : match.percentage >= 45 ? "Plenty of common ground." : "Different lanes, interesting discoveries."}</h2>
        <p className="muted">Based on {match.signalCount} available {match.signalCount === 1 ? "signal" : "signals"}. Missing data is ignored.</p>
      </div>
      <div className="taste-match-reasons-v310">
        <Reason icon={<Heart size={17} />} label="Games you both liked" value={match.bothLiked.length ? match.bothLiked.join(" · ") : "No shared favorites yet"} />
        <Reason icon={<Sparkles size={17} />} label="They liked, you have not played" value={match.isSelf ? "This is your own profile" : match.discoveries.length ? match.discoveries.join(" · ") : "You are caught up on their favorites"} />
        <Reason icon={sharedTaste.length ? <Tags size={17} /> : <Gamepad2 size={17} />} label="Shared genres and platforms" value={sharedTaste.length ? sharedTaste.join(" · ") : "No strong shared pattern yet"} />
      </div>
    </section>
  );
}

function Reason({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="taste-match-reason-v310"><span>{icon}</span><div><strong>{label}</strong><p>{value}</p></div></div>;
}

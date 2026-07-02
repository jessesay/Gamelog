import { Sparkles } from "lucide-react";
import GameCoverArt from "@/components/GameCoverArt";
import TasteCardExportActions from "@/components/TasteCardExportActions";

export default function PlayNextShareCard({ username, recommendations, shareUrl = "/play-next" }: { username: string; recommendations: Array<{ game: any; percentage: number; reasons: string[] }>; shareUrl?: string }) {
  if (!recommendations.length) return null;
  const safeName = username.replace(/[^a-z0-9_-]/gi, "-");
  const targetId = `play-next-card-${safeName}`;
  return <section className="play-next-share-wrap-v320">
    <article className="play-next-share-card-v320" id={targetId}>
      <header><span style={{ background: "#35e0cb", color: "#06110f" }}>GL</span><div><p>GameLog · Early Beta</p><strong>What should I play next?</strong></div><em>@{username}</em></header>
      <div className="play-next-share-list-v320">{recommendations.slice(0, 3).map((item, index) => <div key={item.game.id}><span><GameCoverArt src={item.game.cover_url} title={item.game.title} genre={item.game.genre} compact /></span><section><small>Pick 0{index + 1}</small><strong>{item.game.title}</strong><p>{item.reasons[0]}</p></section><b>{item.percentage}%<small>Match</small></b></div>)}</div>
      <footer><Sparkles size={14} /> Picked from my GameLog library <span>thegamelog.app</span></footer>
    </article>
    <TasteCardExportActions targetId={targetId} username={username} shareUrl={shareUrl} analyticsSurface="play_next" />
  </section>;
}

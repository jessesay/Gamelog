import Link from "next/link";
import { ArrowRight, Gamepad2, Sparkles } from "lucide-react";
import GameCoverArt from "@/components/GameCoverArt";
import TasteCardExportActions from "@/components/TasteCardExportActions";

type Recommendation = { game: any; percentage: number; reasons: string[] };

export default function TasteShareCard({ ownerName, username, genres, platforms, moods = [], backlogCount, playingCount = 0, completedCount = 0, backlogScore, scoreLabel, recommendations = [], shareable = true }: { ownerName: string; username: string; genres: string[]; platforms: string[]; moods?: string[]; backlogCount: number; playingCount?: number; completedCount?: number; backlogScore: number; scoreLabel: string; recommendations?: Recommendation[]; shareable?: boolean }) {
  const targetId = `taste-card-${username.replace(/[^a-z0-9_-]/gi, "-")}`;
  return <section className="taste-share-wrap-v315">
    <article className="taste-share-card-v315 taste-share-card-v320" id={targetId}>
      <header><div><span style={{ background: "#35e0cb", color: "#06110f" }}>GL</span><p>GameLog Taste Card</p></div><em>Early Beta</em></header>
      <div className="taste-share-owner-v315"><p>@{username}</p><h2>{ownerName}&apos;s taste, logged.</h2><div className="taste-share-tags-v315">{genres.slice(0, 4).map((item) => <span key={item}>{item}</span>)}{platforms.slice(0, 3).map((item) => <span key={item}>{item}</span>)}{moods.slice(0, 2).map((item) => <span key={item}>{item}</span>)}</div></div>
      <div className="taste-share-score-row-v315"><div><strong>{backlogScore}</strong><span>Backlog Score</span><small>{scoreLabel}</small></div><div><strong>{backlogCount}</strong><span>Want to play</span><small>Future adventures</small></div></div>
      <div className="taste-status-signals-v319"><span><b>{playingCount}</b> Playing</span><span><b>{backlogCount}</b> Want to play</span><span><b>{completedCount}</b> Completed</span></div>
      {recommendations.length ? <section className="taste-top-picks-v320"><p><Sparkles size={13} /> Recommended next</p>{recommendations.slice(0, 3).map((item, index) => <div className="taste-share-pick-v315" key={item.game.id}><span><GameCoverArt src={item.game.cover_url} title={item.game.title} genre={item.game.genre} compact /></span><div><small>0{index + 1} · {item.reasons[0]}</small><strong>{item.game.title}</strong></div><b>{item.percentage}%<small>Match</small></b></div>)}</section> : <div className="taste-share-empty-v315"><Gamepad2 size={22} /><span><strong>Save a few games</strong><small>Your next-game matches will appear here.</small></span></div>}
      <footer><span>thegamelog.app</span><span>Swipe. Save. Play.</span></footer>
    </article>
    {shareable ? <><TasteCardExportActions targetId={targetId} username={username} shareUrl={`/u/${username}`} />{recommendations.length ? <div className="taste-share-actions-v315"><Link className="secondary" href="/play-next">What should I play next? <ArrowRight size={15} /></Link></div> : null}</> : null}
  </section>;
}

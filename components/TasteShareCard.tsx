import Link from "next/link";
import { ArrowRight, Gamepad2, Sparkles } from "lucide-react";
import GameCoverArt from "@/components/GameCoverArt";
import ShareButton from "@/components/ShareButton";

export default function TasteShareCard({ ownerName, username, genres, platforms, moods = [], backlogCount, backlogScore, scoreLabel, recommendation, shareable = true }: { ownerName: string; username: string; genres: string[]; platforms: string[]; moods?: string[]; backlogCount: number; backlogScore: number; scoreLabel: string; recommendation?: { game: any; percentage: number; reasons: string[] }; shareable?: boolean }) {
  return <section className="taste-share-wrap-v315">
    <article className="taste-share-card-v315">
      <header><div><span>GL</span><p>GameLog Taste Card</p></div><em>Early Beta</em></header>
      <div className="taste-share-owner-v315"><p>@{username}</p><h2>{ownerName}&apos;s taste, logged.</h2><div className="taste-share-tags-v315">{genres.slice(0, 3).map((item) => <span key={item}>{item}</span>)}{platforms.slice(0, 2).map((item) => <span key={item}>{item}</span>)}{moods.slice(0, 1).map((item) => <span key={item}>{item}</span>)}</div></div>
      <div className="taste-share-score-row-v315"><div><strong>{backlogScore}</strong><span>Backlog Score</span><small>{scoreLabel}</small></div><div><strong>{backlogCount}</strong><span>Saved games</span><small>Future adventures</small></div></div>
      {recommendation ? <div className="taste-share-pick-v315"><span><GameCoverArt src={recommendation.game.cover_url} title={recommendation.game.title} genre={recommendation.game.genre} compact /></span><div><p><Sparkles size={13} /> Play next</p><strong>{recommendation.game.title}</strong><small>{recommendation.reasons[0]}</small></div><b>{recommendation.percentage}%<small>Taste Match</small></b></div> : <div className="taste-share-empty-v315"><Gamepad2 size={22} /><span><strong>Save a few games</strong><small>Your next-game match will appear here.</small></span></div>}
      <footer><span>thegamelog.app</span><span>Swipe. Save. Play.</span></footer>
    </article>
    {shareable ? <div className="taste-share-actions-v315"><ShareButton title="taste_card" text={`See ${ownerName}'s GameLog taste card.`} url={`/u/${username}`} label="Share taste card" />{recommendation ? <Link className="secondary" href="/play-next">What should I play next? <ArrowRight size={15} /></Link> : null}</div> : null}
  </section>;
}

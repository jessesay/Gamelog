import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Compass, Gamepad2, Heart, Layers3, ListPlus, Search, Sparkles, Star, UserRound } from "lucide-react";
import TasteMatchCard from "@/components/TasteMatchCard";
import GrowthEvent from "@/components/GrowthEvent";

export const metadata: Metadata = {
  title: "GameLog — Track, review, and discover games",
  description: "Track what you play. Review what you love. Discover what’s next. Join the early GameLog beta.",
};

const demoMatch = {
  percentage: 86,
  signalCount: 7,
  bothLiked: ["Elden Ring", "Baldur’s Gate 3"],
  discoveries: ["Disco Elysium", "Hades"],
  sharedGenres: ["RPG", "Adventure"],
  sharedPlatforms: ["PC"],
};

export default function MarketingHomePage() {
  return (
    <main className="home-v311">
      <GrowthEvent name="homepage_visit" />
      <header className="home-nav-v311">
        <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
        <nav aria-label="Website navigation"><Link href="#features">Features</Link><Link href="/start">Beta guide</Link><Link href="/join">Join beta</Link><Link className="home-nav-cta-v311" href="/app/profile">Start Logging</Link></nav>
      </header>

      <section className="home-hero-v311">
        <div className="home-hero-copy-v311">
          <div className="home-beta-badge-v311"><span /> Early Beta · Shape what comes next</div>
          <h1>Swipe to find<br /><em>your next game.</em></h1>
          <p>Build your backlog, track what you play, and discover what actually fits your taste.</p>
          <div className="home-cta-row-v311">
            <Link className="primary xl" href="/app/discover">Start swiping <ArrowRight size={18} /></Link>
            <Link className="secondary xl" href="/demo-profile"><UserRound size={18} /> View Demo Profile</Link>
          </div>
          <div className="home-proof-v311"><span><Check size={14} /> Six clear statuses</span><span><Check size={14} /> Public profile shelves</span><span><Check size={14} /> Explainable Taste Match</span></div>
        </div>
        <HeroAppMock />
      </section>

      <section className="home-feature-intro-v311" id="features">
        <p className="eyebrow">One home for your gaming life</p>
        <h2>Useful before, during, and after every game.</h2>
        <p>Start with a search. Log what you are playing. Leave a review when the credits roll. Then let your history guide the next pick.</p>
      </section>

      <section className="home-feature-v311">
        <div className="home-feature-copy-v311"><span className="home-feature-number-v311">01</span><p className="eyebrow">Log and review</p><h2>Remember every game—and how it felt.</h2><p>Move games through Playing, Played, Completed, Dropped, Want to Play, and Wishlist. Add a rating or a real review when you have something to say.</p><Link href="/app/search">Find a game to log <ArrowRight size={16} /></Link></div>
        <LogReviewMock />
      </section>

      <section className="home-feature-v311 home-feature-reverse-v311">
        <div className="home-feature-copy-v311"><span className="home-feature-number-v311">02</span><p className="eyebrow">Lists and shelves</p><h2>Turn your history into a gaming identity.</h2><p>Your profile organizes what you are playing, saving, completing, dropping, and loving. Curate public or private lists for everything else.</p><Link href="/demo-profile">See a finished profile <ArrowRight size={16} /></Link></div>
        <ProfileShelfMock />
      </section>

      <section className="home-feature-v311">
        <div className="home-feature-copy-v311"><span className="home-feature-number-v311">03</span><p className="eyebrow">Search, swipe, and match</p><h2>Discover from the catalog—and from people you trust.</h2><p>Search across titles, platforms, genres, tags, and sources. Swipe through the catalog or open a public profile to see an explainable Taste Match.</p><Link href="/app/discover">Start discovering <ArrowRight size={16} /></Link></div>
        <div className="home-match-preview-v311"><TasteMatchCard ownerName="Alex" match={demoMatch} /></div>
      </section>

      <section className="home-beta-panel-v311">
        <div><div className="home-beta-badge-v311"><span /> Early Beta</div><h2>Your first five minutes in GameLog.</h2><p>Create your identity, log a few games, and the useful parts of GameLog begin to wake up.</p></div>
        <ol><li><span>1</span><div><strong>Create your profile</strong><small>Choose a username, favorite genres, platforms, and games.</small></div></li><li><span>2</span><div><strong>Log three games</strong><small>Search the catalog and set the statuses that describe your library.</small></div></li><li><span>3</span><div><strong>Review, list, and compare</strong><small>Write a take, build a list, then try Taste Match on a public profile.</small></div></li></ol>
        <div className="home-cta-row-v311"><Link className="primary xl" href="/app/discover">Start swiping <ArrowRight size={18} /></Link><Link className="secondary xl" href="/demo-profile">View demo profile</Link></div>
      </section>

      <footer className="home-footer-v311"><Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link><span>Early Beta · Built for people who care what they play.</span><nav><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/feedback">Feedback</Link><Link href="/status">Status</Link></nav></footer>
    </main>
  );
}

function HeroAppMock() {
  return <div className="home-app-mock-v311" aria-label="GameLog search and quick logging preview"><div className="home-mock-top-v311"><span className="logo">GL</span><strong>Search games</strong><span>•••</span></div><div className="home-mock-search-v311"><Search size={18} /><span>Search games, genres, platforms…</span></div><div className="home-mock-result-v311"><span className="home-mock-cover-v311">ER</span><div><p className="eyebrow">Action RPG · 2022</p><h2>Elden Ring</h2><small><Star size={13} /> 4.8 · 2,491 reviews</small><div className="home-status-row-v311"><b>Playing</b><span>Completed</span><span>Wishlist</span></div></div></div><div className="home-mock-tabs-v311"><span><Compass size={16} /> Discover</span><span className="active"><Search size={16} /> Search</span><span><Layers3 size={16} /> Lists</span><span><UserRound size={16} /> Profile</span></div></div>;
}

function LogReviewMock() {
  return <div className="home-ui-card-v311"><div className="home-ui-head-v311"><div><p className="eyebrow">Your review</p><h3>Baldur’s Gate 3</h3></div><span className="home-review-stars-v311">★★★★★</span></div><div className="home-review-copy-v311">“A party of lovable disasters, impossible choices, and one more quest before bed.”</div><div className="home-review-meta-v311"><span><Gamepad2 size={14} /> Completed</span><span><Heart size={14} /> 38 likes</span></div><button>Save review</button></div>;
}

function ProfileShelfMock() {
  const games = [{ code: "DC", title: "Dead Cells", status: "Playing" }, { code: "SV", title: "Stardew Valley", status: "Completed" }, { code: "DE", title: "Disco Elysium", status: "Wishlist" }];
  return <div className="home-ui-card-v311 home-profile-mock-v311"><div className="home-profile-line-v311"><span>AP</span><div><p className="eyebrow">Gaming identity</p><h3>Alex Plays</h3><small>@alex · RPGs, indies, and bad decisions</small></div></div><div className="home-shelf-head-v311"><strong>Profile shelves</strong><span>View all</span></div><div className="home-poster-row-v311">{games.map((game) => <article key={game.title}><span>{game.code}</span><strong>{game.title}</strong><small>{game.status}</small></article>)}</div><div className="home-list-line-v311"><ListPlus size={17} /><span><strong>Perfect rainy weekend games</strong><small>12 games · Public</small></span><ArrowRight size={16} /></div></div>;
}

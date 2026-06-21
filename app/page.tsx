import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, BarChart3, CheckCircle2, Gamepad2, Layers3, MessageSquare, Radio, Sparkles, Trophy, UserPlus } from "lucide-react";

export const metadata: Metadata = {
  title: "GameLog — Your gaming command center",
  description: "Track your games, find what to play tonight, watch deals, follow releases, build collections, join the beta, and share your gaming taste."
};

const productPillars = [
  {
    title: "Decide what to play",
    text: "Pulse, Matchmaker, and Arena turn your backlog into clear tonight-ready picks.",
    icon: Sparkles
  },
  {
    title: "Track every game",
    text: "Log ratings, reviews, statuses, shelves, public profiles, lists, and yearly recaps.",
    icon: Gamepad2
  },
  {
    title: "Buy at the right time",
    text: "Price Watch and Deal Radar organize sales, historical prices, and DLC under the right game family.",
    icon: BadgeDollarSign
  },
  {
    title: "Share your taste",
    text: "Collections, public lists, review links, and profile cards make GameLog feel social from day one.",
    icon: Layers3
  }
];

const featureRail = ["Guided Setup", "Pulse", "Matchmaker", "Arena", "Charts", "Collections", "Release Radar", "Deal Radar", "Price Watch", "Beta Launch"];

const launchSteps = [
  "Join the beta list",
  "Use the first-run checklist",
  "Import or seed a starter catalog",
  "Save three games to your backlog",
  "Try Matchmaker, Arena, Deals, and Collections",
  "Share feedback or vote on the next feature"
];

const betaActions = [
  { title: "Join beta", text: "Capture tester info and copy a clean invite message.", href: "/join", icon: UserPlus },
  { title: "Start guide", text: "Walk new users through the first 60 seconds of GameLog, then continue inside /app setup.", href: "/start", icon: CheckCircle2 },
  { title: "Feedback board", text: "Turn bug reports and feature ideas into the next build.", href: "/feedback", icon: MessageSquare }
];

export default function MarketingHomePage() {
  return (
    <main className="marketing-site">
      <header className="marketing-nav">
        <Link className="marketing-brand" href="/">
          <span className="logo">GL</span>
          <span>GameLog</span>
        </Link>
        <nav className="marketing-links" aria-label="Website navigation">
          <Link href="/features">Features</Link>
          <Link href="/join">Join beta</Link>
          <Link href="/roadmap">Roadmap</Link>
          <Link href="/status">Status</Link>
          <Link href="/app" className="marketing-nav-cta">Open app</Link>
        </nav>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero-copy">
          <p className="eyebrow">Gaming diary + discovery + deals</p>
          <h1>The command center for everything you play.</h1>
          <p className="hero-subtitle">
            GameLog helps players track their library, decide what to play tonight, watch prices, follow releases, build collections, and share their taste.
          </p>
          <div className="hero-actions">
            <Link className="primary xl" href="/app">
              Launch GameLog <ArrowRight size={18} />
            </Link>
            <Link className="secondary xl" href="/join">Join the beta</Link>
            <Link className="secondary xl" href="/features">Explore features</Link>
          </div>
          <div className="trust-strip" aria-label="GameLog highlights">
            <span>No spreadsheet needed</span>
            <span>Mobile-first</span>
            <span>Built for public profiles</span>
          </div>
        </div>

        <div className="product-preview-card" aria-label="GameLog product preview">
          <div className="preview-topline">
            <span className="status-dot" />
            <span>GameLog Pulse</span>
            <strong>Tonight</strong>
          </div>
          <div className="preview-pick">
            <div>
              <p className="muted small">Tonight's pick</p>
              <h2>Elden Ring</h2>
              <p>High match because you like challenging RPGs, open worlds, and long-haul games.</p>
            </div>
            <span className="match-score">94%</span>
          </div>
          <div className="preview-grid">
            <article>
              <Trophy size={18} />
              <strong>Arena winner</strong>
              <span>Saved to backlog</span>
            </article>
            <article>
              <BadgeDollarSign size={18} />
              <strong>Deal Radar</strong>
              <span>Buy zone detected</span>
            </article>
            <article>
              <Radio size={18} />
              <strong>Release Radar</strong>
              <span>Watch upcoming drops</span>
            </article>
            <article>
              <BarChart3 size={18} />
              <strong>Charts</strong>
              <span>Top rated and hidden gems</span>
            </article>
          </div>
        </div>
      </section>

      <section className="feature-rail" aria-label="GameLog feature rail">
        {featureRail.map((item) => <span key={item}>{item}</span>)}
      </section>

      <section className="marketing-section">
        <div className="section-heading">
          <p className="eyebrow">Why it is different</p>
          <h2>Not just a review app. A playing app.</h2>
          <p>Letterboxd-style logging is only one piece. GameLog becomes useful before, during, and after someone plays.</p>
        </div>
        <div className="pillar-grid">
          {productPillars.map(({ title, text, icon: Icon }) => (
            <article className="pillar-card" key={title}>
              <Icon size={24} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section">
        <div className="section-heading">
          <p className="eyebrow">Beta launch funnel</p>
          <h2>Built to move visitors into the app.</h2>
          <p>v3.0 adds beta signup, a first-run checklist, a feedback inbox, and voting so GameLog is easier to test and improve.</p>
        </div>
        <div className="website-grid three">
          {launchSteps.map((step, index) => (
            <article className="website-card" key={step}>
              <span className="step-number">{index + 1}</span>
              <h3>{step}</h3>
              <p>Designed as a clear next action for first-time players and beta testers.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section">
        <div className="section-heading">
          <p className="eyebrow">Beta launch system</p>
          <h2>From visitor to tester in one clear path.</h2>
          <p>The website now gives people somewhere to join, somewhere to start, and somewhere to send feedback.</p>
        </div>
        <div className="website-grid three">
          {betaActions.map(({ title, text, href, icon: Icon }) => (
            <Link className="website-card action-link-card" href={href} key={title}>
              <Icon size={24} />
              <h3>{title}</h3>
              <p>{text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="launch-panel">
        <div>
          <p className="eyebrow">Ready for beta</p>
          <h2>Send people to a real website first, then into the app.</h2>
          <p>GameLog now has product pages, beta signup, tester onboarding, feedback voting, status messaging, press copy, roadmap, policy pages, sitemap, PWA shortcuts, and a launch checklist.</p>
        </div>
        <div className="launch-actions-stack">
          <Link className="primary xl" href="/app">Open GameLog</Link>
          <Link className="secondary xl" href="/start">Start guide</Link>
        </div>
      </section>

      <footer className="marketing-footer">
        <span>© {new Date().getFullYear()} GameLog</span>
        <Link href="/features">Features</Link>
        <Link href="/join">Join beta</Link>
        <Link href="/changelog">Changelog</Link>
        <Link href="/status">Status</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/press">Press</Link>
      </footer>
    </main>
  );
}

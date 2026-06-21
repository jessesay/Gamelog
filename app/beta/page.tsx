import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Beta Access",
  description: "GameLog beta access guide for testers, feedback, and launch validation."
};

const testerFlow = [
  "Open /app and create a profile",
  "Add or import a few games",
  "Try Pulse, Matchmaker, Arena, Deals, Radar, and Collections",
  "Publish one list or share your profile",
  "Send feedback from the in-app Beta board"
];

const feedbackTargets = ["First impression", "What felt confusing", "What made you want to come back", "Missing games or wrong data", "Mobile layout issues", "Deal or price tracking ideas"];

export default function BetaPage() {
  return (
    <main className="legal-page wide-page">
      <header className="marketing-nav compact-nav">
        <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
        <nav className="marketing-links" aria-label="Website navigation">
          <Link href="/features">Features</Link>
          <Link href="/status">Status</Link>
          <Link href="/join">Join</Link><Link href="/app" className="marketing-nav-cta">Open app</Link>
        </nav>
      </header>

      <section className="legal-card page-hero-card">
        <p className="eyebrow">Public beta</p>
        <h1>Help shape the gaming command center.</h1>
        <p>GameLog beta testers help prove the core loop: find what to play, track it, watch prices, and share useful collections.</p>
        <div className="hero-actions"><Link className="primary xl" href="/join">Join beta</Link><Link className="secondary xl" href="/start">Start guide</Link><Link className="secondary xl" href="/launch">Launch checklist</Link></div>
      </section>

      <section className="website-grid two">
        <article className="website-card">
          <h2>Tester path</h2>
          <ol className="number-list">
            {testerFlow.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </article>
        <article className="website-card">
          <h2>What to report</h2>
          <ul className="clean-list">
            {feedbackTargets.map((target) => <li key={target}>{target}</li>)}
          </ul>
        </article>
      </section>

      <section className="launch-panel beta-copy-card">
        <div>
          <p className="eyebrow">Share copy</p>
          <h2>Beta invite</h2>
          <p>I'm testing GameLog — a gaming command center for deciding what to play, tracking your library, watching deals, following releases, and sharing collections. Try it and tell me what feels useful or confusing.</p>
        </div>
        <Link className="primary xl" href="/feedback">Open feedback board</Link>
      </section>
    </main>
  );
}

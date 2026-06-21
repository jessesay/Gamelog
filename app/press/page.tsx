import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "GameLog Press Kit", description: "Short description, positioning, and launch copy for GameLog." };

export default function PressPage() {
  return (
    <main className="legal-page">
      <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
      <section className="legal-card">
        <p className="eyebrow">Press kit</p>
        <h1>GameLog helps players decide, track, buy, and share games.</h1>
        <h2>One-liner</h2>
        <p>GameLog is a mobile-first gaming command center for tracking your library, choosing what to play, watching deals, following releases, and sharing your taste.</p>
        <h2>Short description</h2>
        <p>GameLog combines a social game diary with practical discovery tools like Pulse, Matchmaker, Arena, Price Watch, Deal Radar, Release Radar, and Collections.</p>
        <h2>Brand notes</h2>
        <ul>
          <li>Name: GameLog</li>
          <li>Tagline: Decide what to play. Track what you love.</li>
          <li>Positioning: A command center for gamers, not just a review wall.</li>
        </ul>
        <p><Link className="primary" href="/app">Open beta</Link></p>
      </section>
    </main>
  );
}

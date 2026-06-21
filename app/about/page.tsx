import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About GameLog", description: "What GameLog is building and why it exists." };

export default function AboutPage() {
  return (
    <main className="legal-page">
      <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
      <section className="legal-card">
        <p className="eyebrow">About</p>
        <h1>GameLog is a gaming command center.</h1>
        <p>GameLog started as a game diary, but the bigger idea is stronger: help players decide what to play, track what they played, watch prices, follow releases, build shareable collections, and show off their gaming taste.</p>
        <h2>What makes it different</h2>
        <ul>
          <li>Pulse gives players a daily reason to open the app.</li>
          <li>Matchmaker and Arena help players pick from a messy backlog.</li>
          <li>Price Watch and Deal Radar help players buy at the right time.</li>
          <li>DLC and smaller products stay nested under the game they belong to.</li>
          <li>Collections turn taste into shareable public shelves.</li>
        </ul>
        <p><Link className="primary" href="/app">Open the app</Link></p>
      </section>
    </main>
  );
}

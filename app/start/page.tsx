import type { Metadata } from "next";
import Link from "next/link";
import LaunchChecklistClient from "@/components/LaunchChecklistClient";

export const metadata: Metadata = {
  title: "Start Guide",
  description: "A first-run onboarding checklist for GameLog beta testers."
};

const starterActions = [
  { title: "Import games first", text: "A full catalog makes every other feature feel better.", href: "/app?view=sources" },
  { title: "Build taste signals", text: "Use the in-app setup hub to choose starter taste, save a backlog pick, and open the right next tool.", href: "/app?view=onboarding" },
  { title: "Pick tonight's game", text: "Pulse, Matchmaker, and Arena should get a tester to one clear answer.", href: "/app?view=match" },
  { title: "Try the buy loop", text: "Track one price, open Deal Radar, and watch one upcoming release.", href: "/app?view=deals" }
];

export default function StartGuidePage() {
  return (
    <main className="legal-page wide-page">
      <header className="marketing-nav compact-nav">
        <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
        <nav className="marketing-links" aria-label="Website navigation">
          <Link href="/join">Join beta</Link>
          <Link href="/feedback">Feedback</Link>
          <Link href="/app" className="marketing-nav-cta">Open app</Link>
        </nav>
      </header>

      <section className="legal-card page-hero-card">
        <p className="eyebrow">v3.1 first 60 seconds</p>
        <h1>Give every tester a clear path inside the app.</h1>
        <p>The best beta flow is simple: open the guided setup, fill the catalog, build taste, pick a game, check a deal, share one thing, then tell us what broke or felt good.</p>
      </section>

      <LaunchChecklistClient />

      <section className="website-grid two">
        {starterActions.map((action) => (
          <article className="website-card" key={action.title}>
            <h2>{action.title}</h2>
            <p>{action.text}</p>
            <Link className="secondary xl" href={action.href}>Open step</Link>
          </article>
        ))}
      </section>
    </main>
  );
}

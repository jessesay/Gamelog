import type { Metadata } from "next";
import Link from "next/link";
import LaunchChecklistClient from "@/components/LaunchChecklistClient";

export const metadata: Metadata = {
  title: "Start Guide",
  description: "A first-run onboarding checklist for GameLog beta testers."
};

const starterActions = [
  { title: "Create your profile", text: "Set up the identity that holds your shelves, reviews, lists, and Taste Match signals.", href: "/app/profile" },
  { title: "Search and quick log", text: "Find three games, then mark what you are playing, completed, and saving for later.", href: "/app/search" },
  { title: "Swipe into something new", text: "Use the discovery deck when you want inspiration instead of a specific title.", href: "/app/discover" },
  { title: "Build a list", text: "Create a public recommendation or a private collection for yourself.", href: "/app/lists" }
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
        <p className="eyebrow">Early Beta · Your first five minutes</p>
        <h1>Build a profile that gets smarter with every game.</h1>
        <p>Create your gaming identity, log three titles, review a favorite, build a list, and let GameLog turn those signals into better discovery.</p>
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

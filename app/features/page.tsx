import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Features",
  description: "Explore GameLog features for tracking, discovery, price watching, releases, collections, and sharing."
};

const groups = [
  {
    title: "Catalog depth",
    items: ["Top 10,000 IGDB catalog pipeline", "Ranked catalog metadata", "Bulk import scripts", "Catalog count checker"]
  },
  {
    title: "Play decisions",
    items: ["Pulse daily command center", "Matchmaker session filters", "Arena head-to-head picks", "Charts and hidden gems"]
  },
  {
    title: "Library and identity",
    items: ["Ratings, reviews, statuses, vibes", "Public profiles and review links", "Yearly wrapped summaries", "Lists and collections"]
  },
  {
    title: "Buying intelligence",
    items: ["Price Watch history", "Deal Radar scoring", "DLC and add-on nesting", "Release Radar watch actions"]
  },
  {
    title: "Launch-ready website",
    items: ["Landing page", "Beta signup", "First-run checklist", "Feedback voting", "Status page", "Changelog, FAQ, press, privacy, and terms"]
  }
];

export default function FeaturesPage() {
  return (
    <main className="legal-page wide-page">
      <header className="marketing-nav compact-nav">
        <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
        <nav className="marketing-links" aria-label="Website navigation">
          <Link href="/catalog-builder">Catalog</Link>
          <Link href="/join">Join beta</Link>
          <Link href="/roadmap">Roadmap</Link>
          <Link href="/app" className="marketing-nav-cta">Open app</Link>
        </nav>
      </header>

      <section className="legal-card page-hero-card">
        <p className="eyebrow">Feature map</p>
        <h1>Everything GameLog does now.</h1>
        <p>GameLog is becoming a full gaming command center: decide what to play, log what happened, watch prices, follow releases, and share your taste.</p>
        <div className="hero-actions"><Link className="primary xl" href="/app">Open app</Link><Link className="secondary xl" href="/join">Join beta</Link><Link className="secondary xl" href="/start">Start guide</Link></div>
      </section>

      <section className="website-grid two">
        {groups.map((group) => (
          <article className="website-card" key={group.title}>
            <h2>{group.title}</h2>
            <ul className="clean-list">
              {group.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}

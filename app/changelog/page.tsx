import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog",
  description: "GameLog release history and product updates."
};

const releases = [
  { version: "v2.9", title: "Website readiness", notes: ["Features page", "Beta access guide", "Changelog", "Status page", "FAQ", "Updated sitemap and website navigation"] },
  { version: "v2.8", title: "Real website shell", notes: ["Landing page", "About, roadmap, press, privacy, terms, launch pages", "PWA start URL moved to /app"] },
  { version: "v2.7", title: "Collections", notes: ["Shareable collection shelves", "Publish as list", "Backlog and deal-driven playlists"] },
  { version: "v2.6", title: "Release Radar", notes: ["Upcoming and recent release layers", "Watch price from Radar", "Save to backlog"] },
  { version: "v2.5", title: "Deal Radar", notes: ["Deal scoring", "Buy zone labels", "Backlog-aware sale ranking"] },
  { version: "v2.4", title: "Product families", notes: ["DLC and add-on nesting", "Family pricing", "Cleaner catalog"] }
];

export default function ChangelogPage() {
  return (
    <main className="legal-page wide-page">
      <header className="marketing-nav compact-nav">
        <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
        <nav className="marketing-links" aria-label="Website navigation">
          <Link href="/features">Features</Link>
          <Link href="/roadmap">Roadmap</Link>
          <Link href="/app" className="marketing-nav-cta">Open app</Link>
        </nav>
      </header>
      <section className="legal-card page-hero-card"><p className="eyebrow">Release notes</p><h1>GameLog changelog.</h1><p>Major product updates as GameLog moves from prototype to real website and beta app.</p></section>
      <section className="timeline-list">
        {releases.map((release) => (
          <article className="website-card timeline-card" key={release.version}>
            <span className="version-pill">{release.version}</span>
            <div>
              <h2>{release.title}</h2>
              <ul className="clean-list">{release.notes.map((note) => <li key={note}>{note}</li>)}</ul>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

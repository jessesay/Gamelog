import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What's New",
  description: "What's new in the latest GameLog beta update."
};

const updates = [
  "Top 10,000 IGDB catalog importer",
  "Supabase catalog rank and score metadata",
  "Catalog Builder website page",
  "Windows import and count scripts",
  "Server-safe service role workflow"
];

export default function UpdatesPage() {
  return (
    <main className="legal-page wide-page">
      <header className="marketing-nav compact-nav">
        <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
        <nav className="marketing-links" aria-label="Website navigation">
          <Link href="/catalog-builder">Catalog</Link>
          <Link href="/changelog">Changelog</Link>
          <Link href="/join">Join beta</Link>
          <Link href="/app" className="marketing-nav-cta">Open app</Link>
        </nav>
      </header>
      <section className="legal-card page-hero-card">
        <p className="eyebrow">What's new</p>
        <h1>GameLog v3.3 top 10,000 catalog system.</h1>
        <p>This update gives GameLog a real database growth path with a ranked IGDB top 10,000 importer, Supabase catalog metadata, and local admin scripts.</p>
        <div className="hero-actions"><Link className="primary xl" href="/catalog-builder">Open Catalog Builder</Link><Link className="secondary xl" href="/app">Open app</Link></div>
      </section>
      <section className="website-grid two">
        {updates.map((item, index) => (
          <article className="website-card" key={item}>
            <span className="step-number">{index + 1}</span>
            <h2>{item}</h2>
            <p>Built to make GameLog easier to test, explain, and improve.</p>
          </article>
        ))}
      </section>
    </main>
  );
}

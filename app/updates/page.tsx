import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What's New",
  description: "What's new in the latest GameLog beta update."
};

const updates = [
  "Beta signup and tester invite flow",
  "First-run onboarding checklist",
  "Feedback inbox with lightweight voting",
  "Launch funnel links across the public website",
  "v3.0 beta launch checklist and Supabase schema"
];

export default function UpdatesPage() {
  return (
    <main className="legal-page wide-page">
      <header className="marketing-nav compact-nav">
        <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
        <nav className="marketing-links" aria-label="Website navigation">
          <Link href="/changelog">Changelog</Link>
          <Link href="/join">Join beta</Link>
          <Link href="/app" className="marketing-nav-cta">Open app</Link>
        </nav>
      </header>
      <section className="legal-card page-hero-card">
        <p className="eyebrow">What's new</p>
        <h1>GameLog v3.0 beta launch system.</h1>
        <p>This update turns the website into a stronger beta funnel and gives testers a clear first-run path.</p>
        <div className="hero-actions"><Link className="primary xl" href="/start">Start guide</Link><Link className="secondary xl" href="/feedback">Feedback board</Link></div>
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

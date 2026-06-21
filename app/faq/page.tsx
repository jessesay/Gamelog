import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Common questions about GameLog."
};

const faqs = [
  ["Is GameLog only a review app?", "No. Reviews are part of it, but the bigger idea is helping players decide what to play, track their library, watch deals, follow releases, and share collections."],
  ["Does GameLog show DLC as separate clutter?", "No. DLC, add-ons, passes, and smaller products are grouped under the base game family so the catalog stays clean."],
  ["Can it track game prices?", "Yes. Price Watch and Deal Radar can track snapshots, sale labels, lowest-seen prices, and family pricing."],
  ["Where does the full app live?", "The public website starts at / and the actual app opens at /app."],
  ["Is this production-ready?", "It is in beta. The core product is working, but testers should still report bugs, missing games, wrong data, and confusing flows."]
];

export default function FAQPage() {
  return (
    <main className="legal-page wide-page">
      <header className="marketing-nav compact-nav">
        <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
        <nav className="marketing-links" aria-label="Website navigation"><Link href="/features">Features</Link><Link href="/beta">Beta</Link><Link href="/app" className="marketing-nav-cta">Open app</Link></nav>
      </header>
      <section className="legal-card page-hero-card"><p className="eyebrow">FAQ</p><h1>Questions testers will ask.</h1><p>Quick answers for people landing on GameLog for the first time.</p></section>
      <section className="website-grid two">
        {faqs.map(([q, a]) => <article className="website-card" key={q}><h2>{q}</h2><p>{a}</p></article>)}
      </section>
    </main>
  );
}

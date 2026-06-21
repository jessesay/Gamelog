import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Status",
  description: "GameLog beta status and known launch notes."
};

const systems = [
  ["Website", "Online", "Landing pages, product pages, roadmap, press, and policy routes are live."],
  ["App shell", "Online", "The main GameLog app runs at /app."],
  ["Catalog imports", "Beta", "Steam, IGDB, and starter catalog tools are available when credentials are configured."],
  ["Price tools", "Beta", "Price Watch and Deal Radar can save local history and use Steam price lookups."],
  ["Social sharing", "Beta", "Public profile, review, and list routes are available for testing."],
  ["Cloud sync", "Config needed", "Supabase environment variables must be added locally and in Vercel." ]
];

export default function StatusPage() {
  return (
    <main className="legal-page wide-page">
      <header className="marketing-nav compact-nav">
        <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
        <nav className="marketing-links" aria-label="Website navigation">
          <Link href="/features">Features</Link>
          <Link href="/beta">Beta</Link>
          <Link href="/app" className="marketing-nav-cta">Open app</Link>
        </nav>
      </header>
      <section className="legal-card page-hero-card"><p className="eyebrow">System status</p><h1>GameLog beta status.</h1><p>A simple public status page for testers so the site feels trustworthy while the app is still in beta.</p></section>
      <section className="status-grid">
        {systems.map(([name, state, text]) => (
          <article className="website-card status-card" key={name}>
            <div className="status-heading"><h2>{name}</h2><span className={`status-badge ${state.toLowerCase().replaceAll(" ", "-")}`}>{state}</span></div>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

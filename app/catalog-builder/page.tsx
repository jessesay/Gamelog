import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, DownloadCloud, Gamepad2, ShieldAlert, TerminalSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Catalog Builder",
  description: "Build GameLog's top 10,000 game catalog with IGDB and Supabase."
};

const importSteps = [
  {
    title: "Run the database upgrade",
    text: "Open Supabase SQL Editor and run supabase/v3_3_top_10000_catalog.sql so the games table has rank, score, IGDB metadata, and import timestamps.",
    icon: Database
  },
  {
    title: "Add the service role key locally",
    text: "Put SUPABASE_SERVICE_ROLE_KEY in .env.local. Keep it server-only and never paste it into browser code or commit it.",
    icon: ShieldAlert
  },
  {
    title: "Run the importer",
    text: "Double-click import-top-10000.bat or run pnpm catalog:igdb-top. It imports IGDB games in safe 500-game batches.",
    icon: DownloadCloud
  },
  {
    title: "Check the count",
    text: "Run check-catalog-count.bat or pnpm catalog:count to confirm the database is filling up.",
    icon: CheckCircle2
  }
];

const envKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "IGDB_CLIENT_ID",
  "IGDB_CLIENT_SECRET"
];

export default function CatalogBuilderPage() {
  return (
    <main className="legal-page wide-page">
      <header className="marketing-nav compact-nav">
        <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
        <nav className="marketing-links" aria-label="Website navigation">
          <Link href="/features">Features</Link>
          <Link href="/changelog">Changelog</Link>
          <Link href="/app" className="marketing-nav-cta">Open app</Link>
        </nav>
      </header>

      <section className="legal-card page-hero-card">
        <p className="eyebrow">Catalog HQ</p>
        <h1>Fill GameLog with the top 10,000 games.</h1>
        <p>
          GameLog v3.3 adds a real catalog pipeline: pull ranked game data from IGDB, write it into Supabase, and give the app a much deeper discovery base for search, charts, Matchmaker, Arena, deals, releases, and collections.
        </p>
        <div className="hero-actions">
          <Link className="primary xl" href="/app">Open app <ArrowRight size={18} /></Link>
          <Link className="secondary xl" href="/features">Feature map</Link>
        </div>
      </section>

      <section className="website-grid two">
        {importSteps.map(({ title, text, icon: Icon }) => (
          <article className="website-card" key={title}>
            <Icon size={26} />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="website-grid two">
        <article className="website-card">
          <TerminalSquare size={26} />
          <h2>Fast commands</h2>
          <p>After the patch is copied in, run these from the GameLog folder.</p>
          <pre className="code-block">pnpm catalog:igdb-top{"\n"}pnpm catalog:count</pre>
          <p>Windows shortcut files are included too: import-top-10000.bat and check-catalog-count.bat.</p>
        </article>

        <article className="website-card">
          <Gamepad2 size={26} />
          <h2>Required .env.local keys</h2>
          <p>The importer reads these locally and uses the service role key only on your machine.</p>
          <ul className="clean-list">
            {envKeys.map((key) => <li key={key}>{key}</li>)}
          </ul>
        </article>
      </section>

      <section className="launch-panel">
        <div>
          <p className="eyebrow">Why this matters</p>
          <h2>GameLog needs depth before it feels universal.</h2>
          <p>
            A 700-game starter catalog is good for a prototype. A 10,000-game catalog makes search, discovery, lists, public pages, price watching, release radar, and recommendations feel like a real gaming website.
          </p>
        </div>
        <div className="launch-actions-stack">
          <Link className="primary xl" href="/changelog">Read changelog</Link>
          <Link className="secondary xl" href="/app">Launch GameLog</Link>
        </div>
      </section>
    </main>
  );
}

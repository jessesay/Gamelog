import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "GameLog Terms", description: "GameLog beta terms of use draft." };

export default function TermsPage() {
  return (
    <main className="legal-page">
      <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
      <section className="legal-card">
        <p className="eyebrow">Terms</p>
        <h1>Terms of use</h1>
        <p>Last updated: June 2026. These beta terms are a plain-language launch draft.</p>
        <h2>Use GameLog respectfully</h2>
        <p>Do not abuse the service, attack other users, post illegal content, or try to break the app.</p>
        <h2>Your content</h2>
        <p>You are responsible for the reviews, lists, feedback, profile text, and other content you add to GameLog.</p>
        <h2>Game and price data</h2>
        <p>Catalog, release, DLC, and price information can be incomplete or delayed. Always confirm final pricing at the store before buying.</p>
        <h2>Beta note</h2>
        <p>This page should be legally reviewed before GameLog moves beyond beta.</p>
        <p><Link className="secondary" href="/privacy">Read privacy</Link></p>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "GameLog Privacy", description: "GameLog privacy policy draft for beta users." };

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
      <section className="legal-card">
        <p className="eyebrow">Privacy</p>
        <h1>Privacy policy</h1>
        <p>Last updated: June 2026. This beta privacy page explains the basic data GameLog may use to run the app.</p>
        <h2>Information you provide</h2>
        <p>GameLog may store account information, profile details, game logs, ratings, reviews, lists, feedback, watchlists, and collection activity.</p>
        <h2>How it is used</h2>
        <p>Data is used to run your library, public profile, recommendations, collections, price watch features, and beta feedback tools.</p>
        <h2>Public content</h2>
        <p>Public profiles, lists, and shared reviews may be visible to other people if you publish or share them.</p>
        <h2>Beta note</h2>
        <p>This is a beta product page and should be reviewed by a lawyer before a full public launch.</p>
        <p><Link className="secondary" href="/terms">Read terms</Link></p>
      </section>
    </main>
  );
}

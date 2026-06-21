import type { Metadata } from "next";
import Link from "next/link";
import BetaFeedbackBoard from "@/components/BetaFeedbackBoard";

export const metadata: Metadata = {
  title: "Beta Feedback",
  description: "GameLog beta feedback inbox and feature voting board."
};

export default function FeedbackPage() {
  return (
    <main className="legal-page wide-page">
      <header className="marketing-nav compact-nav">
        <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
        <nav className="marketing-links" aria-label="Website navigation">
          <Link href="/join">Join beta</Link>
          <Link href="/start">Start guide</Link>
          <Link href="/status">Status</Link>
          <Link href="/app" className="marketing-nav-cta">Open app</Link>
        </nav>
      </header>

      <section className="legal-card page-hero-card">
        <p className="eyebrow">Beta feedback</p>
        <h1>Turn tester notes into the next build.</h1>
        <p>Capture bug reports, missing game requests, confusing flows, and feature votes so GameLog keeps improving in the right direction.</p>
      </section>

      <BetaFeedbackBoard />
    </main>
  );
}

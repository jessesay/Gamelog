import type { Metadata } from "next";
import Link from "next/link";
import BetaWaitlistForm from "@/components/BetaWaitlistForm";

export const metadata: Metadata = {
  title: "Join the Beta",
  description: "Join the early GameLog beta. Track what you play, review what you love, and discover what is next."
};

export default function JoinBetaPage() {
  return (
    <main className="legal-page wide-page">
      <header className="marketing-nav compact-nav">
        <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
        <nav className="marketing-links" aria-label="Website navigation">
          <Link href="/features">Features</Link>
          <Link href="/start">Start guide</Link>
          <Link href="/feedback">Feedback</Link>
          <Link href="/app" className="marketing-nav-cta">Open app</Link>
        </nav>
      </header>

      <section className="legal-card page-hero-card">
        <p className="eyebrow">Early Beta</p>
        <h1>Help shape a better home for your gaming life.</h1>
        <p>Track what you play. Review what you love. Discover what’s next. Join the beta and tell us where GameLog feels brilliant—or bewildering.</p>
      </section>

      <BetaWaitlistForm />
    </main>
  );
}

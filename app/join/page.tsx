import type { Metadata } from "next";
import Link from "next/link";
import BetaWaitlistForm from "@/components/BetaWaitlistForm";

export const metadata: Metadata = {
  title: "Join the Beta",
  description: "Join the GameLog beta waitlist and help shape the gaming command center."
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
        <p className="eyebrow">GameLog v3.0</p>
        <h1>Join the beta launch list.</h1>
        <p>GameLog now has a cleaner tester funnel: signup, onboarding, feedback, voting, and launch-ready next steps.</p>
      </section>

      <BetaWaitlistForm />
    </main>
  );
}

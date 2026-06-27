import type { Metadata } from "next";
import Link from "next/link";
import BetaFeedbackForm from "@/components/BetaFeedbackForm";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "Send Beta Feedback", description: "Send a bug, idea, confusion, or bit of praise to the GameLog beta team." };

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  return (
    <main className="legal-page wide-page beta-feedback-page-v312">
      <header className="marketing-nav compact-nav"><Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link><nav className="marketing-links" aria-label="Website navigation"><Link href="/start">Beta guide</Link><Link href="/app/profile">Profile</Link><Link href="/app" className="marketing-nav-cta">Open app</Link></nav></header>
      <section className="legal-card page-hero-card beta-feedback-hero-v312"><p className="eyebrow">Early Beta · Direct line</p><h1>Help make GameLog feel better.</h1><p>Report a bug, pitch an idea, flag something confusing, or tell us what already works. Short and honest is perfect.</p></section>
      <section className="website-card beta-feedback-card-v312"><div><p className="eyebrow">Send feedback</p><h2>What is on your mind?</h2></div><BetaFeedbackForm signedIn={Boolean(data.user)} initialPage={String(params.from ?? "").slice(0, 500)} /></section>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "GameLog Launch Checklist", description: "Beta launch checklist for GameLog." };

const checklist = [
  "Confirm Supabase environment variables in Vercel.",
  "Confirm IGDB keys are set in local and Vercel environments.",
  "Run optional Supabase SQL files for beta feedback, prices, product families, and collections.",
  "Test app install on mobile from the Vercel production URL.",
  "Create 3 public lists and one shareable profile card.",
  "Invite 10 beta testers and ask them to submit one missing game and one feedback item."
];

export default function LaunchPage() {
  return (
    <main className="legal-page">
      <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
      <section className="legal-card">
        <p className="eyebrow">Launch</p>
        <h1>Beta launch checklist</h1>
        <ul>{checklist.map((item) => <li key={item}>{item}</li>)}</ul>
        <p><Link className="primary" href="/app">Open GameLog</Link></p>
      </section>
    </main>
  );
}

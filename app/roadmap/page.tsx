import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "GameLog Roadmap", description: "The public product roadmap for GameLog." };

const phases = [
  ["Now", "Beta polish, website launch shell, public pages, collections, prices, deal radar, release radar."],
  ["Next", "Cloud-synced price alerts, stronger DLC grouping, notification preferences, collection following, public charts."],
  ["Later", "Native-style mobile install polish, critic/community lists, import partners, richer social graph, creator pages."],
  ["Dream", "The place players open before they decide what to play or buy."],
];

export default function RoadmapPage() {
  return (
    <main className="legal-page">
      <Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link>
      <section className="legal-card">
        <p className="eyebrow">Roadmap</p>
        <h1>Building the gaming app people open every day.</h1>
        {phases.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}
        <p><Link className="primary" href="/app?view=beta">Send beta feedback</Link></p>
      </section>
    </main>
  );
}

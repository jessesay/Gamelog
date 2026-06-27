import type { Metadata } from "next";
import Link from "next/link";
import ProfileStatusShelves from "@/components/ProfileStatusShelves";
import TasteMatchCard from "@/components/TasteMatchCard";

export const metadata: Metadata = { title: "Demo Profile", description: "Preview a complete GameLog gaming identity profile." };

const games = {
  elden: { id: "demo-elden", title: "Elden Ring", slug: "elden-ring", release_year: 2022, genre: "Action RPG", platforms: ["PC", "PlayStation"] },
  baldurs: { id: "demo-bg3", title: "Baldur’s Gate 3", slug: "baldurs-gate-3", release_year: 2023, genre: "CRPG", platforms: ["PC"] },
  stardew: { id: "demo-stardew", title: "Stardew Valley", slug: "stardew-valley", release_year: 2016, genre: "Cozy Sim", platforms: ["PC", "Switch"] },
  disco: { id: "demo-disco", title: "Disco Elysium", slug: "disco-elysium", release_year: 2019, genre: "Narrative RPG", platforms: ["PC"] },
  minecraft: { id: "demo-minecraft", title: "Minecraft", slug: "minecraft", release_year: 2011, genre: "Sandbox", platforms: ["PC", "Console"] },
};
const logs = [
  { id: "log-1", game_id: games.elden.id, status: "Currently Playing", games: games.elden },
  { id: "log-2", game_id: games.baldurs.id, status: "100% Completed", rating: 5, games: games.baldurs },
  { id: "log-3", game_id: games.stardew.id, status: "Completed", rating: 4.5, games: games.stardew },
  { id: "log-4", game_id: games.disco.id, status: "Want to Play", games: games.disco },
  { id: "log-5", game_id: games.minecraft.id, status: "Backlog", games: games.minecraft },
];
const reviews = [
  { id: "review-1", game_id: games.baldurs.id, rating: 5, review: "An unforgettable campaign where every choice feels like mine.", games: games.baldurs, created_at: "2026-05-01" },
  { id: "review-2", game_id: games.stardew.id, rating: 4.5, review: "The coziest hundred hours I have ever accidentally spent.", games: games.stardew, created_at: "2026-04-01" },
];
const lists = [{ id: "demo-list", title: "Perfect rainy weekend games", href: "/demo-profile#shelf-lists", is_public: true, list_items: logs.slice(1, 4).map((log, position) => ({ id: `item-${position}`, position, games: log.games })) }];

export default function DemoProfilePage() {
  return <main className="social-shell-v35 profile-identity-v39 public-identity-v39"><nav className="profile-public-nav-v39"><Link className="marketing-brand" href="/"><span className="logo">GL</span><span>GameLog</span></Link><Link className="primary" href="/app/profile">Start your profile</Link></nav><section className="social-hero-v35 profile-identity-hero-v39"><div className="social-avatar-v35">AP</div><div><p className="eyebrow">Demo gaming identity</p><h1>Alex Plays</h1><p className="muted">@alex · Example profile</p><p>RPG devotee, indie explorer, and chronic side-quest accepter.</p><div className="tag-row"><span className="tag">Favorite: Baldur’s Gate 3</span><span className="tag">PC · Switch</span><span className="tag">Early Beta demo</span></div></div></section><section className="social-stat-grid-v35"><Stat label="Playing now" value={1} /><Stat label="Completed" value={2} /><Stat label="Reviews" value={2} /><Stat label="Average rating" value="4.8" /></section><TasteMatchCard ownerName="Alex" match={{ percentage: 86, signalCount: 7, bothLiked: ["Baldur’s Gate 3", "Stardew Valley"], discoveries: ["Disco Elysium"], sharedGenres: ["RPG"], sharedPlatforms: ["PC"] }} /><ProfileStatusShelves logs={logs} reviews={reviews} lists={lists} /></main>;
}

function Stat({ label, value }: { label: string; value: string | number }) { return <article className="social-stat-v35"><strong>{value}</strong><span>{label}</span></article>; }

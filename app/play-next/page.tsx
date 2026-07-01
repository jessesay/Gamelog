import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import AppBottomNav from "@/components/AppBottomNav";
import AuthPanel from "@/components/AuthPanel";
import GameCoverArt from "@/components/GameCoverArt";
import GrowthEvent from "@/components/GrowthEvent";
import { createClient } from "@/utils/supabase/server";
import { dedupeGameLogs, gamePath } from "@/lib/social";
import { playerInsights } from "@/lib/playerInsights";

export default async function PlayNextPage() {
  const supabase = await createClient();
  if (!supabase) return <Frame><State title="Recommendations are not configured" body="Connect Supabase to rank your backlog." /></Frame>;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return <Frame><State title="Sign in to rank your backlog" body="Save games, then GameLog will pick three that fit your taste." auth /></Frame>;
  const { data: profile } = await supabase.from("profiles").select("id, favorite_genres, favorite_platforms").eq("id", auth.user.id).maybeSingle();
  if (!profile) redirect("/app/onboarding");
  const { data: logs } = await supabase.from("game_logs").select("*, games(*)").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(300);
  const insights = playerInsights(dedupeGameLogs(logs ?? []), profile.favorite_genres ?? [], profile.favorite_platforms ?? []);
  return <Frame><main className="social-shell-v35 play-next-page-v315"><GrowthEvent name="play_next_visit" /><section className="social-page-head-v35"><p className="eyebrow">Backlog oracle</p><h1>What should I play next?</h1><p className="muted">Three picks from games you already saved—ranked by your genres, platforms, and library history.</p><div className="tag-row"><span className="tag">Backlog Score {insights.backlogScore}</span><span className="tag">{insights.saved} saved</span></div></section>{insights.recommendations.length ? <section className="play-next-grid-v315">{insights.recommendations.map((item, index) => <article className="play-next-card-v315" key={item.game.id}><div className="play-next-rank-v315">0{index + 1}</div><Link className="play-next-cover-v315" href={gamePath(item.game)}><GameCoverArt src={item.game.cover_url} title={item.game.title} genre={item.game.genre} /></Link><div className="play-next-copy-v315"><p><Sparkles size={14} /> {item.percentage}% Taste Match</p><h2>{item.game.title}</h2><div>{item.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div><Link className="primary inline-link" href={gamePath(item.game)}>Open game</Link></div></article>)}</section> : <State title="Your oracle needs a backlog" body="Save at least one game from discovery and come back for your ranked picks." action />}</main></Frame>;
}

function Frame({ children }: { children: React.ReactNode }) { return <div className="app-frame-v35">{children}<AppBottomNav /></div>; }
function State({ title, body, auth = false, action = false }: { title: string; body: string; auth?: boolean; action?: boolean }) { return <main className="social-shell-v35"><section className="social-card-v35 social-empty-v35"><p className="eyebrow">GameLog picks</p><h1>{title}</h1><p className="muted">{body}</p>{auth ? <AuthPanel /> : null}{action ? <Link className="primary inline-link" href="/app/discover">Start swiping</Link> : null}</section></main>; }

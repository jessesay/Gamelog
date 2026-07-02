import { redirect } from "next/navigation";
import Link from "next/link";
import AppBottomNav from "@/components/AppBottomNav";
import BacklogManager from "@/components/BacklogManager";
import { createClient } from "@/utils/supabase/server";
import { dedupeGameLogs } from "@/lib/social";
import GrowthEvent from "@/components/GrowthEvent";

export default async function BacklogPage() {
  const supabase = await createClient();
  if (!supabase) return <BacklogFrame><main className="social-shell-v35 backlog-page-v314"><BacklogHeader signedIn={false} /><BacklogManager initialItems={[]} signedIn={false} /></main></BacklogFrame>;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return <BacklogFrame><main className="social-shell-v35 backlog-page-v314"><GrowthEvent name="backlog_visit" /><BacklogHeader signedIn={false} /><BacklogManager initialItems={[]} signedIn={false} /></main></BacklogFrame>;

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", auth.user.id).maybeSingle();
  if (!profile) redirect("/app/onboarding");
  const { data: logs, error } = await supabase.from("game_logs").select("*, games(*)").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(300);
  if (error) return <BacklogFrame><State title="Your backlog could not load" body="Please refresh and try again." /></BacklogFrame>;
  const backlog = dedupeGameLogs(logs ?? []);

  return <BacklogFrame><main className="social-shell-v35 backlog-page-v314"><GrowthEvent name="backlog_visit" /><BacklogHeader signedIn /><BacklogManager initialItems={backlog} /></main></BacklogFrame>;
}

function BacklogHeader({ signedIn }: { signedIn: boolean }) { return <section className="social-page-head-v35"><p className="eyebrow">Your game library</p><h1>Backlog & library</h1><p className="muted">{signedIn ? "Track what you want, what you are playing, and every game you finish." : "Guest changes stay on this device. Sign in anytime to build a synced shelf."}</p><div className="actions"><Link className="secondary inline-link" href="/app/discover">Find more games</Link><Link className="primary inline-link" href="/play-next">What should I play next?</Link></div></section>; }

function BacklogFrame({ children }: { children: React.ReactNode }) { return <div className="app-frame-v35">{children}<AppBottomNav /></div>; }
function State({ title, body }: { title: string; body: string }) { return <main className="social-shell-v35"><section className="social-card-v35 social-empty-v35"><p className="eyebrow">GameLog backlog</p><h1>{title}</h1><p className="muted">{body}</p></section></main>; }

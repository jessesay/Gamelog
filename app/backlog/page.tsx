import { redirect } from "next/navigation";
import Link from "next/link";
import AppBottomNav from "@/components/AppBottomNav";
import AuthPanel from "@/components/AuthPanel";
import BacklogManager from "@/components/BacklogManager";
import { createClient } from "@/utils/supabase/server";
import { dedupeGameLogs } from "@/lib/social";
import { normalizeGameStatus } from "@/lib/gameStatus";
import GrowthEvent from "@/components/GrowthEvent";

export default async function BacklogPage() {
  const supabase = await createClient();
  if (!supabase) return <BacklogFrame><State title="Backlog is not configured" body="Connect Supabase to use your saved shelf." /></BacklogFrame>;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return <BacklogFrame><State title="Sign in to open your backlog" body="Your saved games sync across devices when they are attached to your GameLog account." auth /></BacklogFrame>;

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", auth.user.id).maybeSingle();
  if (!profile) redirect("/app/onboarding");
  const { data: logs, error } = await supabase.from("game_logs").select("*, games(*)").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(300);
  if (error) return <BacklogFrame><State title="Your backlog could not load" body="Please refresh and try again." /></BacklogFrame>;
  const backlog = dedupeGameLogs(logs ?? []).filter((log) => ["want_to_play", "wishlist"].includes(normalizeGameStatus(log.status) ?? ""));

  return <BacklogFrame><main className="social-shell-v35 backlog-page-v314"><GrowthEvent name="backlog_visit" /><section className="social-page-head-v35"><p className="eyebrow">Saved for later</p><h1>Your backlog</h1><p className="muted">Everything you saved from discovery, synced to your GameLog account.</p><div className="actions"><Link className="secondary inline-link" href="/app/discover">Find more games</Link><Link className="primary inline-link" href="/play-next">What should I play next?</Link></div></section><BacklogManager initialItems={backlog} /></main></BacklogFrame>;
}

function BacklogFrame({ children }: { children: React.ReactNode }) { return <div className="app-frame-v35">{children}<AppBottomNav /></div>; }
function State({ title, body, auth = false }: { title: string; body: string; auth?: boolean }) { return <main className="social-shell-v35"><section className="social-card-v35 social-empty-v35"><p className="eyebrow">GameLog backlog</p><h1>{title}</h1><p className="muted">{body}</p>{auth ? <AuthPanel /> : null}</section></main>; }

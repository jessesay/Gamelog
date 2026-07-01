import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, Bookmark, Bug, CheckCircle2, Gamepad2, Lightbulb, MessageCircleQuestion, MessageSquare, PartyPopper, Search, Users } from "lucide-react";
import { getAdminAccess } from "@/lib/catalogAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Beta Launch Dashboard", robots: { index: false, follow: false, nocache: true } };

const filters = ["all", "bug", "idea", "confusion", "praise", "other"] as const;
type FeedbackType = (typeof filters)[number];

function feedbackType(row: any): Exclude<FeedbackType, "all"> {
  try {
    const parsed = JSON.parse(String(row.target ?? "{}"));
    if (["bug", "idea", "confusion", "praise", "other"].includes(parsed.feedback_type)) return parsed.feedback_type;
  } catch { /* Legacy target values are handled below. */ }
  const target = String(row.target ?? "").toLowerCase();
  if (["bug", "idea", "confusion", "praise", "other"].includes(target)) return target as Exclude<FeedbackType, "all">;
  if (String(row.kind).toLowerCase().includes("bug")) return "bug";
  if (String(row.kind).toLowerCase().includes("idea")) return "idea";
  return "other";
}

function feedbackMeta(row: any) {
  try { return JSON.parse(String(row.target ?? "{}")) as { session_id?: string | null; device?: string | null }; } catch { return {}; }
}

function isAddOn(game: any) {
  const type = String(game.product_type ?? "").toLowerCase();
  const text = [game.title, game.genre, ...(game.genres ?? []), ...(game.tags ?? []), game.description, game.summary].filter(Boolean).join(" ");
  return Boolean(game.parent_game_id) || ["dlc", "add-on", "addon", "expansion", "soundtrack", "season_pass"].includes(type) || /\b(dlc|expansion|season pass|soundtrack|ost|artbook|content pack|skin pack|cosmetic pack|currency pack|starter pack|bonus content)\b/i.test(text);
}

function date(value: unknown) {
  if (!value) return "—";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
}

export default async function BetaAdminPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const access = await getAdminAccess();
  if (!access.signedIn) redirect("/app/profile?next=/admin/beta");
  if (!access.allowed) notFound();
  const params = await searchParams;
  const selected = filters.includes(params.type as FeedbackType) ? params.type as FeedbackType : "all";

  const [users, logs, feedback, feedbackTotal, recentLogs, recentUsers, catalog, missingCoverResult] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("game_logs").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("beta_feedback").select("id,user_id,kind,body,target,contact,page,app_version,status,created_at").order("created_at", { ascending: false }).limit(1000),
    supabaseAdmin.from("beta_feedback").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("game_logs").select("id,user_id,status,updated_at,games(id,title,slug,cover_url),profiles!game_logs_user_id_fkey(username,display_name)").in("status", ["Want to Play", "Backlog"]).order("updated_at", { ascending: false }).limit(12),
    supabaseAdmin.from("profiles").select("id,username,display_name,created_at").order("created_at", { ascending: false }).limit(10),
    supabaseAdmin.from("games").select("id,title,cover_url,genre,genres,platforms,tags,description,summary,release_year,release_date,product_type,parent_game_id").order("rating", { ascending: false, nullsFirst: false }).limit(300),
    supabaseAdmin.from("games").select("id", { count: "exact", head: true }).is("cover_url", null),
  ]);
  const queryError = users.error || logs.error || feedback.error || feedbackTotal.error || recentLogs.error || recentUsers.error || catalog.error || missingCoverResult.error;
  if (queryError) throw new Error(`Beta dashboard query failed: ${queryError.message}`);
  const feedbackRows = (feedback.data ?? []).map((row) => ({ ...row, feedbackType: feedbackType(row), meta: feedbackMeta(row) }));
  const shownFeedback = selected === "all" ? feedbackRows : feedbackRows.filter((row) => row.feedbackType === selected);
  const counts = Object.fromEntries(filters.slice(1).map((type) => [type, feedbackRows.filter((row) => row.feedbackType === type).length])) as Record<Exclude<FeedbackType, "all">, number>;
  const catalogRows = catalog.data ?? [];
  const discoveryReady = catalogRows.filter((game) => game.cover_url && (game.genres?.length || game.genre) && game.platforms?.length && (game.release_year || game.release_date));
  const visibleDiscovery = discoveryReady.filter((game) => !isAddOn(game));
  const discoveryAddOns = visibleDiscovery.filter(isAddOn);
  const discoveryCount = Math.min(60, visibleDiscovery.length);
  const missingCovers = missingCoverResult.count ?? 0;
  const searchHealthy = catalogRows.some((game) => String(game.title).toLowerCase().includes("hades")) || !catalog.error;

  return <main className="beta-admin-v317">
    <header className="beta-admin-head-v317"><div><p className="eyebrow">GameLog · Private admin</p><h1>Beta launch dashboard</h1><p>Live signals for users, saves, feedback, and catalog health.</p></div><div><span>Approved admin</span><small>{access.email}</small><Link className="secondary" href="/">Open GameLog</Link></div></header>
    <section className="beta-admin-stats-v317">
      <Metric icon={<Users />} label="Signed-up users" value={users.count ?? 0} />
      <Metric icon={<Bookmark />} label="Library entries" value={logs.count ?? 0} />
      <Metric icon={<MessageSquare />} label="Feedback" value={feedbackTotal.count ?? feedbackRows.length} />
      <Metric icon={<Bug />} label="Bug reports" value={counts.bug} />
      <Metric icon={<Lightbulb />} label="Ideas" value={counts.idea} />
      <Metric icon={<MessageCircleQuestion />} label="Confusion" value={counts.confusion} />
      <Metric icon={<PartyPopper />} label="Praise" value={counts.praise} />
    </section>

    <section className="beta-admin-health-v317">
      <div><p className="eyebrow">App health</p><h2>Launch readiness</h2></div>
      <div className="beta-health-grid-v317"><Health label="Discovery-ready games" value={discoveryCount} good /><Health label="Missing covers in sample" value={missingCovers} good={missingCovers === 0} /><Health label="DLC in discovery sample" value={discoveryAddOns.length} good={discoveryAddOns.length === 0} /><Health label="Search route" value={searchHealthy ? "Operational" : "Check needed"} good={searchHealthy} /></div>
    </section>

    <section className="beta-admin-panel-v317">
      <header><div><p className="eyebrow">Beta inbox</p><h2>Recent feedback</h2></div><nav>{filters.map((type) => <Link className={selected === type ? "active" : ""} href={type === "all" ? "/admin/beta" : `/admin/beta?type=${type}`} key={type}>{type}<b>{type === "all" ? feedbackRows.length : counts[type]}</b></Link>)}</nav></header>
      {shownFeedback.length ? <div className="beta-feedback-list-v317">{shownFeedback.slice(0, 100).map((row) => <article key={row.id}><div><span className={`is-${row.feedbackType}`}>{row.feedbackType}</span><time>{date(row.created_at)}</time></div><p>{row.body}</p><dl><div><dt>Page</dt><dd>{row.page || "—"}</dd></div><div><dt>Email</dt><dd>{row.contact || "—"}</dd></div><div><dt>User</dt><dd>{row.user_id || "Anonymous"}</dd></div><div><dt>Session</dt><dd>{row.meta.session_id || "—"}</dd></div></dl></article>)}</div> : <Empty text={`No ${selected === "all" ? "" : `${selected} `}feedback yet.`} />}
    </section>

    <div className="beta-admin-columns-v317"><section className="beta-admin-panel-v317"><header><div><p className="eyebrow">Intent</p><h2>Recent saved games</h2></div></header>{recentLogs.data?.length ? <div className="beta-simple-list-v317">{recentLogs.data.map((log: any) => <article key={log.id}><Gamepad2 size={17} /><div><strong>{log.games?.title ?? "Unknown game"}</strong><small>@{log.profiles?.username ?? "player"} · {log.status}</small></div><time>{date(log.updated_at)}</time></article>)}</div> : <Empty text="No recent saves." />}</section><section className="beta-admin-panel-v317"><header><div><p className="eyebrow">Acquisition</p><h2>Recent signups</h2></div></header>{recentUsers.data?.length ? <div className="beta-simple-list-v317">{recentUsers.data.map((profile) => <article key={profile.id}><Users size={17} /><div><strong>{profile.display_name || profile.username}</strong><small>@{profile.username}</small></div><time>{date(profile.created_at)}</time></article>)}</div> : <Empty text="No profiles yet." />}</section></div>
  </main>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <article><span>{icon}</span><div><strong>{value.toLocaleString()}</strong><small>{label}</small></div></article>; }
function Health({ label, value, good }: { label: string; value: string | number; good: boolean }) { return <article><span className={good ? "good" : "warn"}>{good ? <CheckCircle2 /> : <AlertTriangle />}</span><div><strong>{typeof value === "number" ? value.toLocaleString() : value}</strong><small>{label}</small></div></article>; }
function Empty({ text }: { text: string }) { return <div className="beta-admin-empty-v317">{text}</div>; }

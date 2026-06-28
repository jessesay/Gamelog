import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Database, ImageOff, Layers3, ServerCog, Tags } from "lucide-react";
import ImportRetryButton from "@/components/ImportRetryButton";
import { canAccessCatalogAdmin } from "@/lib/catalogAdmin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Catalog Import Status", robots: { index: false, follow: false } };

type Health = {
  total_games: number;
  discovery_ready: number;
  missing_box_art: number;
  missing_genres: number;
  missing_platforms: number;
  missing_release_year: number;
};

function number(value: unknown) {
  return Number(value ?? 0).toLocaleString();
}

function date(value: unknown) {
  if (!value) return "—";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
}

export default async function CatalogStatusPage() {
  if (!(await canAccessCatalogAdmin())) notFound();

  const [healthResult, runsResult, errorsResult, failedCountResult, totalResult] = await Promise.all([
    supabaseAdmin.rpc("catalog_health_summary").maybeSingle(),
    supabaseAdmin.from("catalog_import_runs").select("id, importer, sources, status, dry_run, stats, error_message, started_at, finished_at").order("started_at", { ascending: false }).limit(12),
    supabaseAdmin.from("catalog_import_errors").select("id, source, source_id, title, error_message, status, retry_count, first_seen_at, last_retry_at").in("status", ["failed", "retrying"]).order("first_seen_at", { ascending: false }).limit(30),
    supabaseAdmin.from("catalog_import_errors").select("id", { count: "exact", head: true }).in("status", ["failed", "retrying"]),
    supabaseAdmin.from("games").select("id", { count: "exact", head: true }),
  ]);
  const trackingError = healthResult.error || runsResult.error || errorsResult.error || failedCountResult.error || totalResult.error;
  const health = (healthResult.data ?? {
    total_games: totalResult.count ?? 0,
    discovery_ready: 0,
    missing_box_art: 0,
    missing_genres: 0,
    missing_platforms: 0,
    missing_release_year: 0,
  }) as Health;
  const runs = runsResult.data ?? [];
  const errors = errorsResult.data ?? [];
  const failedCount = failedCountResult.count ?? 0;
  const readyPercent = health?.total_games ? Math.round((Number(health.discovery_ready) / Number(health.total_games)) * 100) : 0;

  return (
    <main className="catalog-status-page-v311">
      <header className="catalog-status-head-v311">
        <div><Link href="/catalog-builder"><ArrowLeft size={16} /> Catalog Builder</Link><p className="eyebrow">GameLog · Early Beta · Admin</p><h1>Catalog health</h1><p>Live coverage, importer history, and retryable failures for the discovery catalog.</p></div>
        <ImportRetryButton disabled={Boolean(trackingError) || failedCount === 0} />
      </header>

      {trackingError ? <section className="catalog-migration-warning-v311"><AlertTriangle size={22} /><div><strong>Import health tracking is not installed yet.</strong><p>Run <code>supabase/v3_11_catalog_import_health.sql</code> in Supabase, then refresh this page. Existing game data is untouched.</p></div></section> : null}

      <section className="catalog-health-grid-v311">
        <HealthCard icon={<Database />} label="Total games" value={number(health?.total_games)} detail="All catalog rows" />
        <HealthCard icon={<CheckCircle2 />} label="Discovery ready" value={number(health?.discovery_ready)} detail={`${readyPercent}% have art + core metadata`} tone="good" />
        <HealthCard icon={<ImageOff />} label="Missing box art" value={number(health?.missing_box_art)} detail="Suppressed in discovery" tone="warn" />
        <HealthCard icon={<Tags />} label="Missing genres" value={number(health?.missing_genres)} detail="Genre and genre array empty" tone="warn" />
        <HealthCard icon={<Layers3 />} label="Missing platforms" value={number(health?.missing_platforms)} detail="No platform targeting signal" tone="warn" />
        <HealthCard icon={<AlertTriangle />} label="Failed imports" value={number(failedCount)} detail="Failed or queued for retry" tone={failedCount ? "bad" : "good"} />
      </section>

      <section className="catalog-status-panel-v311">
        <header><div><p className="eyebrow">Recent jobs</p><h2>Import runs</h2></div><code>pnpm run catalog:import</code></header>
        {runs.length ? <div className="catalog-run-list-v311">{runs.map((run) => <article key={run.id}><span className={`catalog-run-state-v311 is-${run.status}`}>{run.status}</span><div><strong>{run.importer}</strong><small>{(run.sources ?? []).join(", ") || "catalog"} · started {date(run.started_at)}</small>{run.error_message ? <p>{run.error_message}</p> : null}</div><div><b>{number((run.stats as Record<string, unknown> | null)?.saved ?? (run.stats as Record<string, unknown> | null)?.imported)}</b><small>saved</small></div></article>)}</div> : <EmptyRow text="No tracked runs yet. The next local import will appear here." />}
      </section>

      <section className="catalog-status-panel-v311">
        <header><div><p className="eyebrow">Needs attention</p><h2>Import errors</h2></div><span>{number(failedCount)} open</span></header>
        {errors.length ? <div className="catalog-error-list-v311">{errors.map((error) => <article key={error.id}><span className={`catalog-run-state-v311 is-${error.status}`}>{error.status}</span><div><strong>{error.title || `${error.source} ${error.source_id || "import"}`}</strong><p>{error.error_message}</p><small>{error.source} · first seen {date(error.first_seen_at)} · retries {error.retry_count}</small></div></article>)}</div> : <EmptyRow text="No unresolved import errors." />}
      </section>

      <section className="catalog-production-guide-v311">
        <ServerCog size={28} />
        <div><p className="eyebrow">Safe production imports</p><h2>Run imports as an operator job, never in the web request.</h2><ol><li>Back up Supabase and apply migrations through v3.11.</li><li>Pull production secrets into a trusted local shell or dedicated worker. Never expose the admin key to the browser.</li><li>Start with <code>pnpm run catalog:import -- --dry-run --sources=steam --steam-limit=1</code>.</li><li>Run bounded source batches with <code>pnpm run catalog:import</code>.</li><li>Queue failures here, then process them with <code>pnpm run catalog:retry</code>.</li><li>Refresh this page and confirm Discovery Ready rises without a spike in errors.</li></ol></div>
      </section>
    </main>
  );
}

function HealthCard({ icon, label, value, detail, tone = "" }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: string }) {
  return <article className={`catalog-health-card-v311 ${tone ? `is-${tone}` : ""}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>;
}

function EmptyRow({ text }: { text: string }) {
  return <div className="catalog-empty-v311">{text}</div>;
}

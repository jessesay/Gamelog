import Link from "next/link";
import { redirect } from "next/navigation";
import ListCreator from "@/components/ListCreator";
import AuthPanel from "@/components/AuthPanel";
import { createClient } from "@/utils/supabase/server";
import { gamePath, getSignedInProfile } from "@/lib/social";
import { safeServerError } from "@/lib/serverError";

export default async function MyListsPage() {
  const supabase = await createClient();

  if (!supabase) {
    return (
      <main className="social-shell-v35">
        <section className="social-card-v35 social-empty-v35">
          <h1>List editing needs sign-in</h1>
          <p className="muted">Add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable account-owned lists.</p>
        </section>
      </main>
    );
  }

  const { user, profile } = await getSignedInProfile(supabase);
  if (!profile) {
    if (user) redirect("/app/onboarding");
    return (
      <main className="social-shell-v35">
        <section className="social-card-v35 social-empty-v35">
          <h1>Sign in to create lists</h1>
          <p className="muted">Your lists appear on your public profile and can be shared.</p>
          <AuthPanel />
        </section>
      </main>
    );
  }

  const { data: lists, error } = await supabase
    .from("game_lists")
    .select("*, list_items(id, games(*))")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="social-shell-v35">
        <section className="social-card-v35 social-empty-v35">
          <h1>Lists could not load</h1>
          <p className="muted">{safeServerError(error, "Please try loading your lists again.")}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="social-shell-v35">
      <section className="social-page-head-v35">
        <p className="eyebrow">Lists</p>
        <h1>Your game lists</h1>
        <p className="muted">Make public shelves for favorites, backlogs, ranked runs, and themed recommendations.</p>
      </section>

      <ListCreator />

      <section className="social-grid-v35">
        {(lists ?? []).length ? (lists ?? []).map((list: any) => (
          <article className="social-card-v35" key={list.id}>
            <div className="social-section-head-v35">
              <div>
                <h2>{list.title}</h2>
                <p className="muted">{list.description || "No description yet."}</p>
              </div>
              <Link className="secondary" href={`/l/${list.id}`}>Public</Link>
            </div>
            <div className="social-poster-row-v35">
              {(list.list_items ?? []).slice(0, 8).map((item: any) => item.games ? (
                <Link href={gamePath(item.games)} key={item.id}>
                  {item.games.cover_url ? <img src={item.games.cover_url} alt="" /> : <span>{item.games.title}</span>}
                </Link>
              ) : null)}
            </div>
            {!(list.list_items ?? []).length ? <div className="empty">No games in this list yet.</div> : null}
          </article>
        )) : <section className="social-card-v35 social-empty-v35"><h2>No lists yet</h2><p className="muted">Create your first list above.</p></section>}
      </section>
    </main>
  );
}

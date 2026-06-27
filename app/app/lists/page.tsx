import { redirect } from "next/navigation";
import ListCreator from "@/components/ListCreator";
import ListManager from "@/components/ListManager";
import AuthPanel from "@/components/AuthPanel";
import { createClient } from "@/utils/supabase/server";
import { getSignedInProfile } from "@/lib/social";
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
    .select("*, list_items(id, position, created_at, games(*))")
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
        <p className="muted">Build shareable collections, private backlogs, rankings, and recommendations that feel unmistakably yours.</p>
      </section>

      <ListCreator />

      <section className="list-manager-grid-v37">
        {(lists ?? []).length ? (lists ?? []).map((list: any) => (
          <ListManager list={list} key={list.id} />
        )) : <section className="social-card-v35 social-empty-v35"><h2>Your first list starts here</h2><p className="muted">Create a public recommendation or keep a private shortlist for yourself.</p></section>}
      </section>
    </main>
  );
}

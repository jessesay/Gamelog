import OnboardingForm from "@/components/OnboardingForm";
import AuthPanel from "@/components/AuthPanel";
import { createClient } from "@/utils/supabase/server";
import { getSignedInProfile } from "@/lib/social";

export default async function OnboardingPage() {
  const supabase = await createClient();

  if (!supabase) {
    return (
      <main className="social-shell-v35">
        <section className="social-card-v35 social-empty-v35">
          <p className="eyebrow">Setup needed</p>
          <h1>Supabase auth is not configured</h1>
          <p className="muted">Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to enable signed-in profiles and onboarding.</p>
        </section>
      </main>
    );
  }

  const { user, profile } = await getSignedInProfile(supabase);

  if (!user) {
    return (
      <main className="social-shell-v35">
        <section className="social-card-v35 social-empty-v35">
          <p className="eyebrow">Sign in required</p>
          <h1>Create an account to continue</h1>
          <p className="muted">Onboarding saves your public profile, reviews, lists, and activity to your GameLog account.</p>
          <AuthPanel />
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-shell-v36">
      <OnboardingForm defaultEmail={user.email} initialProfile={profile} />
    </main>
  );
}

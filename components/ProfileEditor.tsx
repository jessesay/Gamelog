"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type ProfileDraft = {
  username: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  favorite_game?: string | null;
};

export default function ProfileEditor({ profile }: { profile: ProfileDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState({
    username: profile.username ?? "",
    display_name: profile.display_name ?? "",
    avatar_url: profile.avatar_url ?? "",
    bio: profile.bio ?? "",
    favorite_game: profile.favorite_game ?? "",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/social/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json();
    setSaving(false);
    setMessage(response.ok ? "Profile saved." : data.error ?? "Could not save profile.");
    if (response.ok) router.refresh();
  }

  async function signOut() {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/app/profile");
    router.refresh();
  }

  return (
    <section className="social-card-v35">
      <div className="social-section-head-v35">
        <div>
          <p className="eyebrow">Profile</p>
          <h2>Edit your public card</h2>
        </div>
        <button className="primary" onClick={saveProfile} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button className="secondary" onClick={signOut}>Sign out</button>
      </div>
      <div className="social-form-grid-v35">
        <label>
          <span>Username</span>
          <input value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} />
        </label>
        <label>
          <span>Display name</span>
          <input value={draft.display_name} onChange={(event) => setDraft({ ...draft, display_name: event.target.value })} />
        </label>
        <label>
          <span>Avatar URL</span>
          <input value={draft.avatar_url} onChange={(event) => setDraft({ ...draft, avatar_url: event.target.value })} />
        </label>
        <label>
          <span>Favorite game</span>
          <input value={draft.favorite_game} onChange={(event) => setDraft({ ...draft, favorite_game: event.target.value })} />
        </label>
        <label className="social-wide-field-v35">
          <span>Bio</span>
          <textarea value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} />
        </label>
      </div>
      {message ? <p className="muted">{message}</p> : null}
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const platformOptions = ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Steam Deck", "iOS", "Android"];
const genreOptions = ["RPG", "Action", "Adventure", "Strategy", "Indie", "Cozy", "Shooter", "Horror", "Puzzle", "Simulation"];

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

type InitialProfile = {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  favorite_game?: string | null;
  favorite_games?: string[] | null;
  favorite_platforms?: string[] | null;
  favorite_genres?: string[] | null;
} | null;

export default function OnboardingForm({ defaultEmail, initialProfile }: { defaultEmail?: string | null; initialProfile?: InitialProfile }) {
  const router = useRouter();
  const initialFavorites = initialProfile?.favorite_games?.length
    ? [...initialProfile.favorite_games.slice(0, 3), "", ""].slice(0, 3)
    : [initialProfile?.favorite_game ?? "", "", ""];
  const [draft, setDraft] = useState({
    username: initialProfile?.username ?? defaultEmail?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 18) ?? "",
    display_name: initialProfile?.display_name ?? defaultEmail?.split("@")[0] ?? "",
    avatar_url: initialProfile?.avatar_url ?? "",
    bio: initialProfile?.bio ?? "",
    favorite_platforms: initialProfile?.favorite_platforms ?? [],
    favorite_genres: initialProfile?.favorite_genres ?? [],
    favorite_games: initialFavorites,
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/social/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draft,
        favorite_game: draft.favorite_games.find(Boolean) ?? "",
        favorite_games: draft.favorite_games.map((game) => game.trim()).filter(Boolean).slice(0, 3),
      }),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(data.error ?? "Could not save your profile.");
      return;
    }

    router.push("/app/profile");
    router.refresh();
  }

  return (
    <section className="onboarding-card-v36">
      <div>
        <p className="eyebrow">Welcome to GameLog</p>
        <h1>Set up your player profile</h1>
        <p className="muted">This becomes your public Letterboxd-style profile for games.</p>
      </div>

      <div className="social-form-grid-v35">
        <label>
          <span>Username</span>
          <input value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} placeholder="pixelcritic" />
        </label>
        <label>
          <span>Display name</span>
          <input value={draft.display_name} onChange={(event) => setDraft({ ...draft, display_name: event.target.value })} placeholder="Pixel Critic" />
        </label>
        <label className="social-wide-field-v35">
          <span>Avatar URL</span>
          <input value={draft.avatar_url} onChange={(event) => setDraft({ ...draft, avatar_url: event.target.value })} placeholder="Optional image URL" />
        </label>
        <label className="social-wide-field-v35">
          <span>Bio</span>
          <textarea value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} placeholder="Tell people what you play and how you rate." />
        </label>
      </div>

      <ChoiceGroup title="Favorite platforms" values={platformOptions} selected={draft.favorite_platforms} onToggle={(value) => setDraft({ ...draft, favorite_platforms: toggle(draft.favorite_platforms, value) })} />
      <ChoiceGroup title="Favorite genres" values={genreOptions} selected={draft.favorite_genres} onToggle={(value) => setDraft({ ...draft, favorite_genres: toggle(draft.favorite_genres, value) })} />

      <section className="onboarding-section-v36">
        <h2>Three favorite games</h2>
        <div className="social-form-grid-v35">
          {draft.favorite_games.map((game, index) => (
            <label key={index}>
              <span>Favorite #{index + 1}</span>
              <input
                value={game}
                onChange={(event) => {
                  const nextGames = [...draft.favorite_games];
                  nextGames[index] = event.target.value;
                  setDraft({ ...draft, favorite_games: nextGames });
                }}
                placeholder={index === 0 ? "Elden Ring" : "Optional"}
              />
            </label>
          ))}
        </div>
      </section>

      <button className="primary onboarding-finish-v36" onClick={finish} disabled={saving || draft.username.length < 3 || !draft.display_name.trim()}>
        {saving ? "Saving..." : "Finish setup"}
      </button>
      {message ? <p className="notice error">{message}</p> : null}
    </section>
  );
}

function ChoiceGroup({ title, values, selected, onToggle }: { title: string; values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <section className="onboarding-section-v36">
      <h2>{title}</h2>
      <div className="onboarding-choice-grid-v36">
        {values.map((value) => (
          <button className={selected.includes(value) ? "selected" : ""} key={value} onClick={() => onToggle(value)} type="button">
            {value}
          </button>
        ))}
      </div>
    </section>
  );
}

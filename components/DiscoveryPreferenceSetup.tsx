"use client";

import { useState } from "react";
import { Loader2, SlidersHorizontal, Sparkles } from "lucide-react";
import {
  discoveryGenreOptions,
  discoveryPlatformOptions,
  discoveryStyleOptions,
  type DiscoveryPreferences,
} from "@/lib/discoveryPreferences";

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export default function DiscoveryPreferenceSetup({
  initialPreferences,
  signedIn,
  onSave,
  onSkip,
}: {
  initialPreferences: DiscoveryPreferences;
  signedIn: boolean;
  onSave: (preferences: DiscoveryPreferences) => Promise<string | null>;
  onSkip: () => void;
}) {
  const [draft, setDraft] = useState({
    ...initialPreferences,
    favorite_games: [...initialPreferences.favorite_games, "", "", ""].slice(0, 3),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const message = await onSave({
      ...draft,
      favorite_games: draft.favorite_games.map((game) => game.trim()).filter(Boolean),
      completed: true,
    });
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <section className="discovery-setup-v310" aria-labelledby="discovery-setup-title">
      <header>
        <span className="discovery-setup-icon-v310"><SlidersHorizontal size={22} /></span>
        <div><p className="swipe-eyebrow-v34">GameLog · Early Beta</p><h1 id="discovery-setup-title">Tune your first stack</h1><p>Give Taste Match a few signals. You can change these later, and you can start swiping right away.</p></div>
      </header>

      <PreferenceChoices title="Favorite platforms" values={discoveryPlatformOptions} selected={draft.favorite_platforms} onToggle={(value) => setDraft({ ...draft, favorite_platforms: toggle(draft.favorite_platforms, value) })} />
      <PreferenceChoices title="Favorite genres" values={discoveryGenreOptions} selected={draft.favorite_genres} onToggle={(value) => setDraft({ ...draft, favorite_genres: toggle(draft.favorite_genres, value) })} />

      <section className="discovery-setup-section-v310">
        <div><h2>Games you already like</h2><span>Up to three</span></div>
        <div className="discovery-favorite-games-v310">
          {draft.favorite_games.map((game, index) => <input key={index} value={game} onChange={(event) => {
            const next = [...draft.favorite_games];
            next[index] = event.target.value;
            setDraft({ ...draft, favorite_games: next });
          }} placeholder={index === 0 ? "e.g. Hades" : "Another favorite"} aria-label={`Favorite game ${index + 1}`} />)}
        </div>
      </section>

      <PreferenceChoices title="What should we surface?" values={discoveryStyleOptions.map((option) => option.value)} labels={Object.fromEntries(discoveryStyleOptions.map((option) => [option.value, option.label]))} selected={draft.discovery_styles} onToggle={(value) => setDraft({ ...draft, discovery_styles: toggle(draft.discovery_styles, value) })} />

      {error ? <p className="discovery-setup-error-v310">{error}</p> : null}
      <div className="discovery-setup-actions-v310">
        <button className="discovery-tune-v310" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="swipe-spin-v34" size={18} /> : <Sparkles size={18} />}Tune my feed</button>
        <button className="discovery-skip-v310" onClick={onSkip} disabled={saving}>Skip and start swiping</button>
      </div>
      <p className="discovery-setup-footnote-v310">{signedIn ? "Your choices sync to your GameLog taste profile." : "Guest choices stay on this device until you sign in."}</p>
    </section>
  );
}

function PreferenceChoices({ title, values, labels, selected, onToggle }: { title: string; values: string[]; labels?: Record<string, string>; selected: string[]; onToggle: (value: string) => void }) {
  return <section className="discovery-setup-section-v310"><div><h2>{title}</h2><span>Select any</span></div><div className="discovery-choice-grid-v310">{values.map((value) => <button type="button" aria-pressed={selected.includes(value)} className={selected.includes(value) ? "is-selected" : ""} key={value} onClick={() => onToggle(value)}>{labels?.[value] ?? value}</button>)}</div></section>;
}

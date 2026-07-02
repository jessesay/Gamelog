"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { track } from "@vercel/analytics";
import { discoveryGenreOptions, discoveryMoodOptions, discoveryPlatformLabels, discoveryPlatformOptions, type DiscoveryPreferences } from "@/lib/discoveryPreferences";

function toggle(values: string[], value: string) { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }

const stepNames = ["Welcome", "Platforms", "Genres", "Mood", "Finish"];

export default function DiscoveryPreferenceSetup({ initialPreferences, signedIn, onSave, onSkip }: { initialPreferences: DiscoveryPreferences; signedIn: boolean; onSave: (preferences: DiscoveryPreferences) => Promise<string | null>; onSkip: () => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { track("onboarding_start", { signed_in: signedIn }); }, [signedIn]);

  async function finish() {
    setSaving(true); setError("");
    const message = await onSave({ ...draft, completed: true });
    setSaving(false);
    if (message) { setError(message); return; }
    track("onboarding_complete", { signed_in: signedIn, platforms: draft.favorite_platforms.join("|"), genres: draft.favorite_genres.join("|"), moods: draft.favorite_moods.join("|") });
    track("start_swiping", { source: "onboarding", signed_in: signedIn });
  }

  function skip() {
    track("onboarding_complete", { signed_in: signedIn, skipped: true });
    track("start_swiping", { source: "onboarding_skip", signed_in: signedIn });
    onSkip();
  }

  return <section className="onboarding-v318" aria-labelledby="onboarding-title">
    <div className="onboarding-progress-v318">{stepNames.map((name, index) => <span className={index <= step ? "active" : ""} key={name}><b>{index < step ? <Check size={11} /> : index + 1}</b><em>{name}</em></span>)}</div>
    {step === 0 ? <div className="onboarding-welcome-v318"><span><Sparkles size={28} /></span><p className="eyebrow">GameLog · Early Beta</p><h1 id="onboarding-title">Swipe to find your next game.</h1><p>Give us a few quick signals and your first stack will feel more like you. This takes less than a minute.</p><button className="primary xl" onClick={() => setStep(1)}>Get started <ArrowRight size={18} /></button><button className="onboarding-skip-v318" onClick={skip}>Skip for now</button></div> : null}
    {step === 1 ? <Step title="Where do you play?" note="Pick any that belong in your rotation." values={discoveryPlatformOptions} labels={discoveryPlatformLabels} selected={draft.favorite_platforms} onToggle={(value) => setDraft({ ...draft, favorite_platforms: toggle(draft.favorite_platforms, value) })} /> : null}
    {step === 2 ? <Step title="What do you usually love?" note="Choose a few genres. We will still mix in surprises." values={discoveryGenreOptions} selected={draft.favorite_genres} onToggle={(value) => setDraft({ ...draft, favorite_genres: toggle(draft.favorite_genres, value) })} /> : null}
    {step === 3 ? <Step title="What mood are you in?" note="Optional—change this whenever your vibe changes." values={discoveryMoodOptions} selected={draft.favorite_moods} onToggle={(value) => setDraft({ ...draft, favorite_moods: toggle(draft.favorite_moods, value) })} /> : null}
    {step === 4 ? <div className="onboarding-finish-v318"><span><Check size={30} /></span><p className="eyebrow">Taste profile ready</p><h1 id="onboarding-title">Nice. Let&apos;s find your next game.</h1><p>{draft.favorite_platforms.length + draft.favorite_genres.length + draft.favorite_moods.length ? `Your first stack is tuned with ${draft.favorite_platforms.length + draft.favorite_genres.length + draft.favorite_moods.length} taste signals.` : "We will start broad and learn from every swipe."}</p>{error ? <p className="discovery-setup-error-v310">{error}</p> : null}<button className="primary xl" onClick={() => void finish()} disabled={saving}>{saving ? <Loader2 className="swipe-spin-v34" size={18} /> : <Sparkles size={18} />}Start Swiping</button></div> : null}
    {step > 0 && step < 4 ? <div className="onboarding-actions-v318"><button className="secondary" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={16} /> Back</button><button className="primary" onClick={() => setStep((current) => current + 1)}>{step === 3 ? "Review" : "Continue"} <ArrowRight size={16} /></button></div> : null}
    <p className="onboarding-footnote-v318">{signedIn ? "Your choices sync to your GameLog account." : "Guest choices stay on this device."}</p>
  </section>;
}

function Step({ title, note, values, labels, selected, onToggle }: { title: string; note: string; values: string[]; labels?: Record<string,string>; selected: string[]; onToggle: (value: string) => void }) {
  return <div className="onboarding-step-v318"><p className="eyebrow">Quick taste check</p><h1 id="onboarding-title">{title}</h1><p>{note}</p><div className="onboarding-options-v318">{values.map((value) => <button type="button" aria-pressed={selected.includes(value)} className={selected.includes(value) ? "selected" : ""} onClick={() => onToggle(value)} key={value}>{selected.includes(value) ? <Check size={15} /> : null}{labels?.[value] ?? value}</button>)}</div></div>;
}

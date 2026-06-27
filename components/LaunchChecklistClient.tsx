"use client";

import { useEffect, useMemo, useState } from "react";

const checklistKey = "gamelog-v311-beta-checklist";
const steps = [
  { id: "profile", title: "Create your gaming identity", text: "Choose a username, bio, favorite genres, platforms, and games." },
  { id: "logs", title: "Log three games", text: "Search the catalog and mark what you are playing, completed, or saving." },
  { id: "review", title: "Rate or review a favorite", text: "A rating starts shaping Top Rated and your future Taste Matches." },
  { id: "list", title: "Build your first list", text: "Curate a public recommendation or keep a private collection." },
  { id: "match", title: "Try discovery and Taste Match", text: "Swipe the catalog, search a genre, then compare a public profile." }
];

export default function LaunchChecklistClient() {
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(checklistKey);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      setDone([]);
    }
  }, []);

  function toggle(id: string) {
    const next = done.includes(id) ? done.filter((item) => item !== id) : [...done, id];
    setDone(next);
    try {
      window.localStorage.setItem(checklistKey, JSON.stringify(next));
    } catch {
      // Best effort only.
    }
  }

  const percent = useMemo(() => Math.round((done.length / steps.length) * 100), [done.length]);

  return (
    <section className="website-card onboarding-checklist-card">
      <div className="status-heading">
        <div>
          <p className="eyebrow">First-run setup</p>
          <h2>{percent}% beta-ready</h2>
          <p>Track what you play, shape your profile, and make discovery personal in one first session.</p>
        </div>
        <span className="match-score launch-score">{done.length}/{steps.length}</span>
      </div>
      <div className="launch-progress"><span style={{ width: `${percent}%` }} /></div>
      <div className="checklist-stack">
        {steps.map((step) => {
          const checked = done.includes(step.id);
          return (
            <button className={`checklist-row ${checked ? "complete" : ""}`} key={step.id} type="button" onClick={() => toggle(step.id)}>
              <span className="check-circle">{checked ? "✓" : ""}</span>
              <span><strong>{step.title}</strong><small>{step.text}</small></span>
            </button>
          );
        })}
      </div>
      <div className="hero-actions"><a className="primary xl" href="/app/profile">Start logging</a><a className="secondary xl" href="/app/search">Explore games</a><a className="secondary xl" href="/feedback">Send feedback</a></div>
    </section>
  );
}

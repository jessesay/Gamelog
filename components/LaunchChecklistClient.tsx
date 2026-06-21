"use client";

import { useEffect, useMemo, useState } from "react";

const checklistKey = "gamelog-v3-launch-checklist";
const steps = [
  { id: "profile", title: "Create your profile", text: "Set display name, username, favorite game, and a quick bio." },
  { id: "catalog", title: "Import or repair catalog", text: "Use IGDB, Steam, or the starter catalog so the app feels full." },
  { id: "taste", title: "Build your taste profile", text: "Save a few games, rate something, and try the Taste setup." },
  { id: "matchmaker", title: "Pick tonight's game", text: "Use Pulse, Matchmaker, or Arena to get one clear play pick." },
  { id: "prices", title: "Track one price", text: "Watch a game, seed price history, or check Steam price." },
  { id: "share", title: "Share one thing", text: "Copy your profile, publish a list, or share a collection." },
  { id: "feedback", title: "Send feedback", text: "Report what was confusing, missing, or surprisingly useful." }
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
          <p>Give testers a clear path through the best parts of GameLog in the first session.</p>
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
      <div className="hero-actions"><a className="primary xl" href="/app">Open app</a><a className="secondary xl" href="/feedback">Send feedback</a></div>
    </section>
  );
}

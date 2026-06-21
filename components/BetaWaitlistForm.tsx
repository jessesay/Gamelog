"use client";

import { useEffect, useMemo, useState } from "react";

type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  platform: string;
  gamerType: string;
  notes: string;
  createdAt: string;
};

const storageKey = "gamelog-beta-waitlist";

function safeId() {
  return `beta-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function BetaWaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState("PC / Steam");
  const [gamerType, setGamerType] = useState("Backlog builder");
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setEntries(JSON.parse(raw));
    } catch {
      setEntries([]);
    }
  }, []);

  const testerCount = entries.length;
  const shareText = useMemo(() => {
    return "I’m testing GameLog — a gaming command center for deciding what to play, tracking your library, watching deals, following releases, and sharing collections. Join the beta and help shape it.";
  }, []);

  function saveEntry() {
    const entry: WaitlistEntry = {
      id: safeId(),
      name: name.trim() || "Beta tester",
      email: email.trim(),
      platform,
      gamerType,
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    const next = [entry, ...entries].slice(0, 100);
    setEntries(next);
    setSaved(true);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Keep the local confirmation even if storage is blocked.
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="launch-system-grid">
      <section className="website-card launch-form-card">
        <p className="eyebrow">Beta signup</p>
        <h2>Join the GameLog beta</h2>
        <p>Save tester info locally for now, then move it to Supabase when you are ready for a real public signup table.</p>
        <label className="launch-field">
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Jesse" />
        </label>
        <label className="launch-field">
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tester@email.com" type="email" />
        </label>
        <div className="launch-field-grid">
          <label className="launch-field">
            <span>Main platform</span>
            <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
              <option>PC / Steam</option>
              <option>PlayStation</option>
              <option>Xbox</option>
              <option>Nintendo Switch</option>
              <option>Mobile</option>
              <option>Multiple platforms</option>
            </select>
          </label>
          <label className="launch-field">
            <span>Tester type</span>
            <select value={gamerType} onChange={(event) => setGamerType(event.target.value)}>
              <option>Backlog builder</option>
              <option>Deal hunter</option>
              <option>Completionist</option>
              <option>Collector</option>
              <option>Social reviewer</option>
              <option>Casual player</option>
            </select>
          </label>
        </div>
        <label className="launch-field">
          <span>What should GameLog help you with?</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Example: deciding what to play next, tracking DLC, finding sales..." />
        </label>
        <button className="primary xl" type="button" onClick={saveEntry}>Save beta signup</button>
        {saved ? <p className="success-note">Saved. This tester is now in your local beta signup list.</p> : null}
      </section>

      <aside className="website-card launch-metric-card">
        <p className="eyebrow">Launch pulse</p>
        <h2>{testerCount} local beta signups</h2>
        <p>Use this for early manual testing. Once the beta is public, connect the same flow to Supabase.</p>
        <div className="mini-stat-stack">
          <span><strong>Goal 1:</strong> 10 trusted testers</span>
          <span><strong>Goal 2:</strong> 25 feedback notes</span>
          <span><strong>Goal 3:</strong> 5 repeat users</span>
        </div>
        <button className="secondary xl" type="button" onClick={copyInvite}>{copied ? "Copied" : "Copy beta invite"}</button>
        <a className="primary xl" href="/start">Start tester onboarding</a>
      </aside>
    </div>
  );
}

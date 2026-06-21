"use client";

import { useEffect, useMemo, useState } from "react";

type FeedbackItem = {
  id: string;
  type: string;
  title: string;
  details: string;
  priority: string;
  votes: number;
  status: string;
  createdAt: string;
};

const feedbackKey = "gamelog-beta-feedback-board";
const starterItems: FeedbackItem[] = [
  {
    id: "starter-onboarding",
    type: "Feature request",
    title: "Make first-run setup impossible to miss",
    details: "Guide users to import games, build taste, save a backlog pick, and try Matchmaker in the first minute.",
    priority: "High",
    votes: 8,
    status: "Planned",
    createdAt: "2026-06-21T00:00:00.000Z"
  },
  {
    id: "starter-price-alerts",
    type: "Feature request",
    title: "Price alert notifications",
    details: "Let users track a game or DLC and get reminded when it hits a buy-zone price.",
    priority: "Medium",
    votes: 6,
    status: "Next",
    createdAt: "2026-06-21T00:00:00.000Z"
  },
  {
    id: "starter-mobile-polish",
    type: "Bug / polish",
    title: "Tighten mobile spacing on dense cards",
    details: "Keep Pulse, Deals, Radar, and Collections readable on smaller phones.",
    priority: "High",
    votes: 5,
    status: "In review",
    createdAt: "2026-06-21T00:00:00.000Z"
  }
];

function newId() {
  return `feedback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function BetaFeedbackBoard() {
  const [items, setItems] = useState<FeedbackItem[]>(starterItems);
  const [type, setType] = useState("Bug / polish");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [priority, setPriority] = useState("Medium");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(feedbackKey);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      setItems(starterItems);
    }
  }, []);

  function persist(next: FeedbackItem[]) {
    setItems(next);
    try {
      window.localStorage.setItem(feedbackKey, JSON.stringify(next));
    } catch {
      // Local storage can be blocked in some browsers.
    }
  }

  function addFeedback() {
    if (!title.trim()) return;
    const item: FeedbackItem = {
      id: newId(),
      type,
      title: title.trim(),
      details: details.trim() || "No details yet.",
      priority,
      votes: 1,
      status: "New",
      createdAt: new Date().toISOString()
    };
    persist([item, ...items]);
    setTitle("");
    setDetails("");
  }

  function vote(id: string) {
    persist(items.map((item) => item.id === id ? { ...item, votes: item.votes + 1 } : item).sort((a, b) => b.votes - a.votes));
  }

  const stats = useMemo(() => {
    return {
      total: items.length,
      high: items.filter((item) => item.priority === "High").length,
      votes: items.reduce((sum, item) => sum + item.votes, 0)
    };
  }, [items]);

  return (
    <div className="launch-system-grid">
      <section className="website-card launch-form-card">
        <p className="eyebrow">Feedback inbox</p>
        <h2>Capture beta feedback</h2>
        <p>Use this board while testing. It stores feedback locally and gives you a shape for the future Supabase version.</p>
        <div className="launch-field-grid">
          <label className="launch-field">
            <span>Type</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option>Bug / polish</option>
              <option>Feature request</option>
              <option>Missing game</option>
              <option>Confusing flow</option>
              <option>Deal / price idea</option>
            </select>
          </label>
          <label className="launch-field">
            <span>Priority</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value)}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Launch blocker</option>
            </select>
          </label>
        </div>
        <label className="launch-field">
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Deals page needs clearer buy button" />
        </label>
        <label className="launch-field">
          <span>Details</span>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="What happened? What should be better?" />
        </label>
        <button className="primary xl" type="button" onClick={addFeedback}>Add feedback</button>
      </section>

      <section className="website-card feedback-board-card">
        <div className="status-heading">
          <div>
            <p className="eyebrow">Voting board</p>
            <h2>What to fix or build next</h2>
          </div>
          <span className="status-badge beta">{stats.total} notes · {stats.votes} votes</span>
        </div>
        <div className="feedback-list">
          {[...items].sort((a, b) => b.votes - a.votes).map((item) => (
            <article className="feedback-item" key={item.id}>
              <div>
                <span className="feedback-kicker">{item.type} · {item.priority} · {item.status}</span>
                <h3>{item.title}</h3>
                <p>{item.details}</p>
              </div>
              <button className="vote-button" type="button" onClick={() => vote(item.id)}>{item.votes} ▲</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

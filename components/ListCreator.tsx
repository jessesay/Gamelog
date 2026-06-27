"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ListCreator() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function createList() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/social/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, is_ranked: false }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(data.error ?? "Could not create list.");
      return;
    }
    setTitle("");
    setDescription("");
    setMessage("List created.");
    router.refresh();
  }

  return (
    <section className="social-card-v35">
      <p className="eyebrow">New list</p>
      <h2>Create a game list</h2>
      <div className="social-form-grid-v35">
        <label>
          <span>List name</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Best cozy games" />
        </label>
        <label className="social-wide-field-v35">
          <span>Description</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What ties this list together?" />
        </label>
      </div>
      <button className="primary" onClick={createList} disabled={saving || !title.trim()}>
        {saving ? "Creating..." : "Create list"}
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </section>
  );
}

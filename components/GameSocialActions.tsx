"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

type ExistingReview = {
  id: string;
  rating: number | null;
  review: string | null;
  status: string;
} | null;

export default function GameSocialActions({ gameId, existingReview }: { gameId: string; existingReview?: ExistingReview }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [review, setReview] = useState(existingReview?.review ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState("");
  const [hasReview, setHasReview] = useState(Boolean(existingReview));

  async function saveReview(status = "Completed") {
    setSaving(status);
    setMessage("");
    const response = await fetch("/api/social/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, status, rating, review }),
    });
    const data = await response.json();
    setSaving("");
    if (!response.ok) {
      setMessage(data.error ?? "Could not save.");
      return;
    }
    setHasReview(true);
    setMessage("Review saved. It now appears on your profile and this game page.");
    setOpen(false);
    router.refresh();
  }

  async function saveStatus(status: "Completed" | "Want to Play") {
    setSaving(status);
    setMessage("");
    const response = await fetch("/api/social/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, status, intent: "status" }),
    });
    const data = await response.json();
    setSaving("");
    setMessage(response.ok
      ? status === "Completed" ? "Marked as played." : "Added to your wishlist."
      : data.error ?? "Could not update this game.");
    if (response.ok) router.refresh();
  }

  async function deleteReview() {
    const reviewId = existingReview?.id;
    if (!reviewId) return;
    setSaving("delete");
    const response = await fetch(`/api/social/reviews?reviewId=${encodeURIComponent(reviewId)}`, { method: "DELETE" });
    const data = await response.json();
    setSaving("");
    if (!response.ok) {
      setMessage(data.error ?? "Could not delete review.");
      return;
    }
    setHasReview(false);
    setReview("");
    setMessage("Review deleted.");
    setOpen(false);
    router.refresh();
  }

  async function addToList() {
    setSaving("list");
    setMessage("");
    const response = await fetch("/api/social/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "add-to-default", gameId }),
    });
    const data = await response.json();
    setSaving("");
    setMessage(response.ok ? "Added to your Want to Play list." : data.error ?? "Could not add to list.");
  }

  return (
    <section className="game-actions-v35">
      <button className="primary" onClick={() => setOpen(true)}>
        {hasReview ? "Edit your review" : "Review this game"}
      </button>
      <div className="game-action-grid-v35">
        <button className="secondary" onClick={() => saveStatus("Completed")} disabled={Boolean(saving)}>Played</button>
        <button className="secondary" onClick={() => saveStatus("Want to Play")} disabled={Boolean(saving)}>Wishlist</button>
        <button className="secondary" onClick={addToList} disabled={Boolean(saving)}>Add to List</button>
      </div>
      {message && !open ? <p className="muted">{message}</p> : null}

      {open ? (
        <div className="review-modal-backdrop-v36" role="presentation" onClick={() => setOpen(false)}>
          <section className="review-modal-v36" role="dialog" aria-modal="true" aria-labelledby="review-modal-title" onClick={(event) => event.stopPropagation()}>
            <header className="review-modal-head-v36">
              <div>
                <p className="eyebrow">GameLog review</p>
                <h2 id="review-modal-title">{hasReview ? "Edit your review" : "Review this game"}</h2>
              </div>
              <button className="swipe-modal-close-v34" onClick={() => setOpen(false)} aria-label="Close review modal">
                <X size={20} />
              </button>
            </header>

            <div className="letterboxd-stars-v36" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button className={value <= rating ? "active" : ""} key={value} onClick={() => setRating(value)} type="button" aria-label={`${value} star${value === 1 ? "" : "s"}`}>
                  ★
                </button>
              ))}
            </div>

            <textarea value={review} onChange={(event) => setReview(event.target.value)} placeholder="What did this game make you feel? What should other players know?" />

            <div className="game-action-grid-v35">
              <button className="primary" onClick={() => saveReview("Completed")} disabled={Boolean(saving)}>
                {saving === "Completed" ? "Saving..." : "Save review"}
              </button>
              <button className="secondary" onClick={() => saveReview("Want to Play")} disabled={Boolean(saving)}>Wishlist</button>
              {existingReview?.id ? <button className="danger" onClick={deleteReview} disabled={Boolean(saving)}>Delete</button> : null}
            </div>
            {message ? <p className="muted">{message}</p> : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}

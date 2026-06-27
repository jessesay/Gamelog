"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewActions({ reviewId, initialReview, initialRating }: { reviewId: string; initialReview?: string | null; initialRating?: number | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [review, setReview] = useState(initialReview ?? "");
  const [rating, setRating] = useState(initialRating ?? 5);
  const [message, setMessage] = useState("");
  const [deleted, setDeleted] = useState(false);

  if (deleted) return <p className="muted">Review deleted. Refresh to update the list.</p>;

  async function save() {
    const response = await fetch("/api/social/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, review, rating, status: "Completed" }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Review updated." : data.error ?? "Could not update review.");
    if (response.ok) {
      setEditing(false);
      router.refresh();
    }
  }

  async function remove() {
    const response = await fetch(`/api/social/reviews?reviewId=${encodeURIComponent(reviewId)}`, { method: "DELETE" });
    const data = await response.json();
    if (response.ok) {
      setDeleted(true);
      router.refresh();
    }
    else setMessage(data.error ?? "Could not delete review.");
  }

  return (
    <div className="review-actions-v35">
      {editing ? (
        <>
          <div className="game-rating-row-v35">
            {[1, 2, 3, 4, 5].map((value) => (
              <button className={value <= rating ? "active" : ""} key={value} onClick={() => setRating(value)} type="button">
                ★
              </button>
            ))}
          </div>
          <textarea value={review} onChange={(event) => setReview(event.target.value)} />
          <button className="primary" onClick={save}>Save review</button>
          <button className="secondary" onClick={() => setEditing(false)}>Cancel</button>
        </>
      ) : (
        <>
          <button className="secondary" onClick={() => setEditing(true)}>Edit</button>
          <button className="danger" onClick={remove}>Delete</button>
        </>
      )}
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}

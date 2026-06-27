"use client";

export default function ListsError({ reset }: { reset: () => void }) {
  return (
    <main className="social-shell-v35">
      <section className="social-card-v35 social-empty-v35">
        <p className="eyebrow">Lists</p><h1>Your lists hit a snag</h1>
        <p className="muted">Nothing was changed. Try loading the list studio again.</p>
        <button className="primary" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}

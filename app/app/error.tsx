"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="social-shell-v35">
      <section className="social-card-v35 social-empty-v35" role="alert">
        <p className="eyebrow">GameLog</p>
        <h1>Something did not load</h1>
        <p className="muted">Your data is safe. Try loading this screen again.</p>
        <button className="primary" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}

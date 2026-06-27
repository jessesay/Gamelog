"use client";

import Link from "next/link";

export default function PublicListError({ reset }: { reset: () => void }) {
  return (
    <main className="shell public-page-shell">
      <section className="card social-empty-v35">
        <p className="eyebrow">GameLog list</p><h1>This list could not load</h1>
        <p className="muted">The list is still safe. Try again or return to GameLog.</p>
        <div className="actions"><button className="primary" onClick={reset}>Try again</button><Link className="secondary inline-link" href="/">Go home</Link></div>
      </section>
    </main>
  );
}

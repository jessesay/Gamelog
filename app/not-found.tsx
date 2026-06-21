import Link from "next/link";

export default function NotFound() {
  return (
    <main className="legal-page">
      <section className="legal-card page-hero-card">
        <p className="eyebrow">404</p>
        <h1>That GameLog page is not here yet.</h1>
        <p>The app is moving fast. Head back to the website or open the full GameLog app.</p>
        <div className="hero-actions"><Link className="primary xl" href="/">Back home</Link><Link className="secondary xl" href="/app">Open app</Link></div>
      </section>
    </main>
  );
}

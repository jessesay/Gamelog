"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Game = {
  id: string;
  title: string;
  cover_url: string | null;
  background_url: string | null;
  platforms: string[] | null;
  genres: string[] | null;
  tags: string[] | null;
  release_date: string | null;
  rating: number | null;
  metacritic: number | null;
};

function getSessionId() {
  const key = "gamelog_session_id";

  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
}

export default function BacklogList() {
  const [sessionId, setSessionId] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading backlog...");

  async function loadBacklog(id: string) {
    setLoading(true);

    const response = await fetch(`/api/games/backlog?sessionId=${id}`);
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not load backlog.");
      setLoading(false);
      return;
    }

    setGames(data.games ?? []);
    setLoading(false);

    if (!data.games || data.games.length === 0) {
      setMessage("Your backlog is empty. Go save some games from the discovery feed.");
    }
  }

  async function removeFromBacklog(gameId: string) {
    if (!sessionId) return;

    setGames((previous) => previous.filter((game) => game.id !== gameId));

    await fetch("/api/games/backlog/remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        gameId,
      }),
    });
  }

  useEffect(() => {
    const id = getSessionId();
    setSessionId(id);
    loadBacklog(id);
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <nav style={styles.nav}>
          <Link href="/" style={styles.navLink}>
            ← Discovery
          </Link>
          <span style={styles.navPill}>{games.length} saved</span>
        </nav>

        <header style={styles.header}>
          <p style={styles.kicker}>GameLog</p>
          <h1 style={styles.heading}>My Backlog</h1>
          <p style={styles.subheading}>
            Games you hit ✓ on are saved here. This is the start of your real play-next list.
          </p>
        </header>

        {loading ? (
          <p style={styles.message}>{message}</p>
        ) : games.length === 0 ? (
          <section style={styles.emptyCard}>
            <p style={styles.message}>{message}</p>
            <Link href="/" style={styles.primaryLink}>
              Start discovering
            </Link>
          </section>
        ) : (
          <section style={styles.grid}>
            {games.map((game) => {
              const year = game.release_date
                ? new Date(game.release_date).getFullYear()
                : null;

              return (
                <article key={game.id} style={styles.card}>
                  <div
                    style={{
                      ...styles.cover,
                      backgroundImage: game.cover_url
                        ? `linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.72)), url(${game.cover_url})`
                        : "linear-gradient(135deg, #003049, #111827)",
                    }}
                  >
                    <div style={styles.coverContent}>
                      <div style={styles.badges}>
                        {(game.genres ?? []).slice(0, 2).map((genre) => (
                          <span key={genre} style={styles.badge}>
                            {genre}
                          </span>
                        ))}
                      </div>

                      <h2 style={styles.title}>{game.title}</h2>

                      <div style={styles.metaRow}>
                        {game.rating ? <span>⭐ {game.rating.toFixed(1)}</span> : null}
                        {game.metacritic ? <span>Meta {game.metacritic}</span> : null}
                        {year ? <span>{year}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div style={styles.cardFooter}>
                    <div style={styles.platforms}>
                      {(game.platforms ?? []).slice(0, 3).map((platform) => (
                        <span key={platform}>{platform}</span>
                      ))}
                    </div>

                    <button
                      style={styles.removeButton}
                      onClick={() => removeFromBacklog(game.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #003049 0%, #111827 45%, #030712 100%)",
    color: "#FDF0D5",
    padding: 20,
    fontFamily:
      "Helvetica, Arial, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  shell: {
    width: "100%",
    maxWidth: 1080,
    margin: "0 auto",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  navLink: {
    color: "#FDF0D5",
    textDecoration: "none",
    fontWeight: 800,
  },
  navPill: {
    fontSize: 13,
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.1)",
  },
  header: {
    marginBottom: 24,
  },
  kicker: {
    margin: 0,
    fontSize: 13,
    opacity: 0.75,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heading: {
    margin: "6px 0 8px",
    fontSize: 44,
    lineHeight: 1,
  },
  subheading: {
    margin: 0,
    maxWidth: 650,
    opacity: 0.75,
    lineHeight: 1.5,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(245px, 1fr))",
    gap: 18,
  },
  card: {
    overflow: "hidden",
    borderRadius: 24,
    background: "rgba(255,255,255,0.08)",
    boxShadow: "0 24px 70px rgba(0,0,0,0.3)",
  },
  cover: {
    height: 320,
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    alignItems: "flex-end",
  },
  coverContent: {
    width: "100%",
    padding: 18,
  },
  badges: {
    display: "flex",
    gap: 7,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  badge: {
    fontSize: 11,
    padding: "5px 8px",
    borderRadius: 999,
    background: "rgba(253,240,213,0.16)",
  },
  title: {
    fontSize: 26,
    lineHeight: 1,
    margin: "0 0 10px",
    textShadow: "0 2px 18px rgba(0,0,0,0.7)",
  },
  metaRow: {
    display: "flex",
    gap: 10,
    fontSize: 13,
    opacity: 0.9,
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  platforms: {
    display: "flex",
    gap: 7,
    flexWrap: "wrap",
    fontSize: 11,
    opacity: 0.75,
  },
  removeButton: {
    border: "none",
    borderRadius: 999,
    padding: "9px 12px",
    cursor: "pointer",
    background: "#780000",
    color: "#FDF0D5",
    fontWeight: 800,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 26,
    background: "rgba(255,255,255,0.08)",
    textAlign: "center",
  },
  primaryLink: {
    display: "inline-flex",
    marginTop: 12,
    borderRadius: 999,
    padding: "12px 16px",
    background: "#669BBC",
    color: "#030712",
    textDecoration: "none",
    fontWeight: 900,
  },
  message: {
    fontSize: 18,
  },
};

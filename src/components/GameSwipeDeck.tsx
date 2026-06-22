"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function GameSwipeDeck() {
  const [sessionId, setSessionId] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading games...");

  const currentGame = games[0];

  const visibleGenres = useMemo(() => {
    return currentGame?.genres?.slice(0, 3) ?? [];
  }, [currentGame]);

  const visiblePlatforms = useMemo(() => {
    return currentGame?.platforms?.slice(0, 4) ?? [];
  }, [currentGame]);

  async function loadFeed(id: string) {
    setLoading(true);

    const response = await fetch(`/api/games/feed?sessionId=${id}`);
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Could not load games.");
      setLoading(false);
      return;
    }

    setGames(data.games ?? []);
    setLoading(false);

    if (!data.games || data.games.length === 0) {
      setMessage("No more games found. Run npm run sync:games to add more.");
    }
  }

  async function swipe(action: "liked" | "disliked" | "skipped" | "saved") {
    if (!currentGame || !sessionId) return;

    const swipedGame = currentGame;

    setGames((previous) => previous.slice(1));

    await fetch("/api/games/swipe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        gameId: swipedGame.id,
        action,
      }),
    });

    if (games.length < 6) {
      loadFeed(sessionId);
    }
  }

  useEffect(() => {
    const id = getSessionId();
    setSessionId(id);
    loadFeed(id);
  }, []);

  if (loading && games.length === 0) {
    return (
      <main style={styles.page}>
        <div style={styles.shell}>
          <p style={styles.message}>{message}</p>
        </div>
      </main>
    );
  }

  if (!currentGame) {
    return (
      <main style={styles.page}>
        <div style={styles.shell}>
          <p style={styles.message}>{message}</p>
          <button style={styles.primaryButton} onClick={() => loadFeed(sessionId)}>
            Refresh feed
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topBar}>
          <div>
            <p style={styles.kicker}>GameLog Discovery</p>
            <h1 style={styles.heading}>Find your next game</h1>
          </div>
          <div style={styles.counter}>{games.length} left</div>
        </div>

        <section style={styles.card}>
          <div
            style={{
              ...styles.cover,
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.78)), url(${currentGame.cover_url})`,
            }}
          >
            <div style={styles.cardContent}>
              <div style={styles.badges}>
                {visibleGenres.map((genre) => (
                  <span key={genre} style={styles.badge}>
                    {genre}
                  </span>
                ))}
              </div>

              <h2 style={styles.title}>{currentGame.title}</h2>

              <div style={styles.metaRow}>
                {currentGame.rating ? <span>⭐ {currentGame.rating.toFixed(1)}</span> : null}
                {currentGame.metacritic ? <span>Meta {currentGame.metacritic}</span> : null}
                {currentGame.release_date ? (
                  <span>{new Date(currentGame.release_date).getFullYear()}</span>
                ) : null}
              </div>

              <div style={styles.platforms}>
                {visiblePlatforms.map((platform) => (
                  <span key={platform}>{platform}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div style={styles.actions}>
          <button style={styles.noButton} onClick={() => swipe("disliked")}>
            ✕
          </button>

          <button style={styles.maybeButton} onClick={() => swipe("skipped")}>
            Maybe
          </button>

          <button style={styles.yesButton} onClick={() => swipe("saved")}>
            ✓
          </button>
        </div>

        <p style={styles.hint}>X = pass. Maybe = skip for now. Check = save to backlog.</p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #003049 0%, #111827 45%, #030712 100%)",
    color: "#FDF0D5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "Helvetica, Arial, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  shell: {
    width: "100%",
    maxWidth: 430,
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 18,
  },
  kicker: {
    margin: 0,
    fontSize: 13,
    opacity: 0.75,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heading: {
    margin: "4px 0 0",
    fontSize: 28,
    lineHeight: 1,
  },
  counter: {
    fontSize: 13,
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.1)",
  },
  card: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
    background: "#111827",
  },
  cover: {
    height: 610,
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    alignItems: "flex-end",
  },
  cardContent: {
    width: "100%",
    padding: 24,
  },
  badges: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  badge: {
    fontSize: 12,
    padding: "6px 9px",
    borderRadius: 999,
    background: "rgba(253,240,213,0.16)",
    backdropFilter: "blur(8px)",
  },
  title: {
    fontSize: 36,
    lineHeight: 1,
    margin: "0 0 12px",
    textShadow: "0 2px 20px rgba(0,0,0,0.7)",
  },
  metaRow: {
    display: "flex",
    gap: 12,
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 12,
  },
  platforms: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    fontSize: 12,
    opacity: 0.85,
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1.2fr 1fr",
    gap: 12,
    marginTop: 18,
  },
  noButton: {
    border: "none",
    height: 62,
    borderRadius: 999,
    fontSize: 28,
    cursor: "pointer",
    background: "#780000",
    color: "#FDF0D5",
  },
  maybeButton: {
    border: "none",
    height: 62,
    borderRadius: 999,
    fontSize: 18,
    cursor: "pointer",
    background: "#FDF0D5",
    color: "#003049",
    fontWeight: 800,
  },
  yesButton: {
    border: "none",
    height: 62,
    borderRadius: 999,
    fontSize: 30,
    cursor: "pointer",
    background: "#669BBC",
    color: "#030712",
  },
  primaryButton: {
    border: "none",
    height: 52,
    borderRadius: 14,
    padding: "0 18px",
    cursor: "pointer",
    background: "#669BBC",
    color: "#030712",
    fontWeight: 800,
  },
  message: {
    fontSize: 18,
    textAlign: "center",
  },
  hint: {
    textAlign: "center",
    fontSize: 13,
    opacity: 0.7,
    marginTop: 14,
  },
};

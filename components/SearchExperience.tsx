"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, ListPlus, Loader2, Search, Star, X } from "lucide-react";
import { gameStatusLabels, type GameStatusKey } from "@/lib/gameStatus";

type SearchGame = {
  id: string;
  title: string;
  slug: string;
  cover_url?: string | null;
  release_year?: number | null;
  release_date?: string | null;
  platforms?: string[] | null;
  averageRating?: number | null;
  reviewCount: number;
  userStatus?: GameStatusKey | null;
};

type SearchPayload = {
  query: string;
  signedIn: boolean;
  games?: SearchGame[];
  sections?: { recent: SearchGame[]; popular: SearchGame[]; imported: SearchGame[] };
  error?: string;
};

type GameList = { id: string; title: string; list_items?: Array<{ games?: { id?: string } | null }> | null };

const statusActions: Array<{ key: GameStatusKey; label: string }> = [
  { key: "playing", label: "Playing" },
  { key: "played", label: "Played" },
  { key: "completed", label: "Completed" },
  { key: "dropped", label: "Dropped" },
  { key: "wishlist", label: "Wishlist" },
];

export default function SearchExperience() {
  const [query, setQuery] = useState("");
  const [payload, setPayload] = useState<SearchPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  async function load(value: string) {
    const request = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/games/search${value ? `?q=${encodeURIComponent(value)}` : ""}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Search could not load.");
      if (request === requestRef.current) setPayload(data);
    } catch (caught) {
      if (request === requestRef.current) setError(caught instanceof Error ? caught.message : "Search could not load.");
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q") ?? "";
    setQuery(initial);
    void load(initial.trim());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const value = query.trim();
      const url = value ? `/app/search?q=${encodeURIComponent(value)}` : "/app/search";
      window.history.replaceState(null, "", url);
      void load(value);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  function updateGame(gameId: string, status: GameStatusKey) {
    setPayload((current) => {
      if (!current) return current;
      const update = (game: SearchGame) => game.id === gameId ? { ...game, userStatus: status } : game;
      return {
        ...current,
        games: current.games?.map(update),
        sections: current.sections ? {
          recent: current.sections.recent.map(update),
          popular: current.sections.popular.map(update),
          imported: current.sections.imported.map(update),
        } : undefined,
      };
    });
  }

  const results = payload?.games ?? [];

  return (
    <main className="search-page-v38">
      <header className="search-head-v38">
        <p className="eyebrow">Global catalog</p>
        <h1>Find any game</h1>
        <p className="muted">Search titles, platforms, genres, tags, and import sources. Log a game without leaving the results.</p>
        <label className="search-input-v38">
          <Search size={21} />
          <input
            autoComplete="off"
            autoFocus
            aria-label="Search games"
            placeholder="Search games, genres, platforms…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {loading ? <Loader2 className="search-spin-v38" size={19} aria-label="Searching" /> : query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={18} /></button>
          ) : null}
        </label>
      </header>

      {error ? (
        <SearchState title="Search hit a snag" body={error} action="Try again" onAction={() => void load(query.trim())} />
      ) : loading && !payload ? (
        <LoadingState />
      ) : query.trim() ? (
        <section className="search-section-v38" aria-live="polite">
          <div className="search-section-title-v38">
            <div><p className="eyebrow">Results</p><h2>{loading ? "Searching…" : `${results.length} ${results.length === 1 ? "game" : "games"}`}</h2></div>
          </div>
          {results.length ? (
            <div className={`search-results-v38 ${loading ? "is-updating" : ""}`}>
              {results.map((game) => <GameResult key={game.id} game={game} signedIn={Boolean(payload?.signedIn)} onStatus={updateGame} />)}
            </div>
          ) : !loading ? <SearchState title="No games found" body={`Nothing matched “${query.trim()}”. Try a shorter title, a platform, genre, tag, or source.`} /> : null}
        </section>
      ) : payload?.sections ? (
        <>
          <GameSection eyebrow="Fresh takes" title="Recently reviewed" games={payload.sections.recent} signedIn={payload.signedIn} onStatus={updateGame} />
          <GameSection eyebrow="Community favorites" title="Popular" games={payload.sections.popular} signedIn={payload.signedIn} onStatus={updateGame} />
          <GameSection eyebrow="Catalog arrivals" title="Newly imported" games={payload.sections.imported} signedIn={payload.signedIn} onStatus={updateGame} />
        </>
      ) : null}
    </main>
  );
}

function GameSection({ eyebrow, title, games, signedIn, onStatus }: { eyebrow: string; title: string; games: SearchGame[]; signedIn: boolean; onStatus: (id: string, status: GameStatusKey) => void }) {
  if (!games.length) return null;
  return (
    <section className="search-section-v38">
      <div className="search-section-title-v38"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><span>{games.length} games</span></div>
      <div className="search-results-v38">
        {games.map((game) => <GameResult key={game.id} game={game} signedIn={signedIn} onStatus={onStatus} />)}
      </div>
    </section>
  );
}

function GameResult({ game, signedIn, onStatus }: { game: SearchGame; signedIn: boolean; onStatus: (id: string, status: GameStatusKey) => void }) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const href = `/game/${game.slug}`;

  async function setStatus(status: GameStatusKey) {
    if (!signedIn) {
      setMessage("Sign in from Profile to log games.");
      return;
    }
    setBusy(status);
    setMessage("");
    try {
      const response = await fetch("/api/social/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id, status, intent: "status" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update your status.");
      onStatus(game.id, status);
      setMessage(`${gameStatusLabels[status]} saved.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not update your status.");
    } finally {
      setBusy("");
    }
  }

  return (
    <article className="search-result-v38">
      <Link className="search-cover-v38" href={href} aria-label={`Open ${game.title}`}>
        {game.cover_url ? <img src={game.cover_url} alt={`${game.title} cover art`} /> : <span>GL</span>}
      </Link>
      <div className="search-result-body-v38">
        <div className="search-result-top-v38">
          <div>
            <Link href={href}><h3>{game.title}</h3></Link>
            <p>{game.release_year ?? "Year TBA"}{game.platforms?.length ? ` · ${game.platforms.slice(0, 3).join(" · ")}` : ""}</p>
          </div>
          <Link className="search-open-v38" href={href} aria-label={`View ${game.title}`}><ChevronRight size={20} /></Link>
        </div>
        <div className="search-stats-v38">
          <span><Star size={14} /> {game.averageRating === null || game.averageRating === undefined ? "Unrated" : game.averageRating.toFixed(1)}</span>
          <span>{game.reviewCount} {game.reviewCount === 1 ? "review" : "reviews"}</span>
          {signedIn && game.userStatus ? <span className="search-current-v38"><Check size={13} /> {gameStatusLabels[game.userStatus]}</span> : null}
        </div>
        <div className="search-actions-v38">
          {statusActions.map((action) => (
            <button key={action.key} className={game.userStatus === action.key ? "active" : ""} disabled={Boolean(busy)} onClick={() => void setStatus(action.key)}>
              {busy === action.key ? <Loader2 className="search-spin-v38" size={14} /> : null}{action.label}
            </button>
          ))}
          <button onClick={() => signedIn ? setReviewOpen(true) : setMessage("Sign in from Profile to review games.")}>Review</button>
          <button onClick={() => signedIn ? setListOpen(true) : setMessage("Sign in from Profile to manage lists.")}><ListPlus size={14} /> Add to List</button>
        </div>
        {message ? <p className="search-message-v38">{message} {!signedIn ? <Link href="/app/profile">Open Profile</Link> : null}</p> : null}
      </div>
      {reviewOpen ? <ReviewDialog game={game} onClose={() => setReviewOpen(false)} onSaved={() => { onStatus(game.id, "played"); setMessage("Review saved."); }} /> : null}
      {listOpen ? <ListDialog game={game} onClose={() => setListOpen(false)} onSaved={(text) => setMessage(text)} /> : null}
    </article>
  );
}

function ReviewDialog({ game, onClose, onSaved }: { game: SearchGame; onClose: () => void; onSaved: () => void }) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/social/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: game.id, status: "played", rating, review: review.trim() || null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save your review.");
      onSaved(); onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save your review."); }
    finally { setBusy(false); }
  }
  return (
    <Modal title={`Review ${game.title}`} onClose={onClose}>
      <div className="search-rating-v38" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((value) => <button key={value} className={value <= rating ? "active" : ""} onClick={() => setRating(value)} aria-label={`${value} stars`}>★</button>)}
      </div>
      <textarea value={review} onChange={(event) => setReview(event.target.value)} placeholder="Share your take (optional when rating)…" maxLength={4000} />
      <button className="primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save review"}</button>
      {error ? <p className="search-message-v38 error">{error}</p> : null}
    </Modal>
  );
}

function ListDialog({ game, onClose, onSaved }: { game: SearchGame; onClose: () => void; onSaved: (message: string) => void }) {
  const [lists, setLists] = useState<GameList[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/social/lists", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load your lists.");
      setLists(data.lists ?? []);
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load your lists.")).finally(() => setLoading(false));
  }, []);
  async function add(list: GameList) {
    setBusy(list.id); setError("");
    try {
      const response = await fetch("/api/social/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "add-game", listId: list.id, gameId: game.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not add this game.");
      onSaved(data.added === false ? `Already on “${list.title}”.` : `Added to “${list.title}”.`); onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not add this game."); }
    finally { setBusy(""); }
  }
  return (
    <Modal title={`Add ${game.title} to a list`} onClose={onClose}>
      {loading ? <p className="muted">Loading your lists…</p> : error ? <p className="search-message-v38 error">{error}</p> : lists.length ? (
        <div className="search-list-options-v38">{lists.map((list) => {
          const added = list.list_items?.some((item) => item.games?.id === game.id);
          return <button key={list.id} disabled={Boolean(busy) || added} onClick={() => void add(list)}><span><strong>{list.title}</strong><small>{list.list_items?.length ?? 0} games</small></span><em>{added ? "Added" : busy === list.id ? "Adding…" : "Add"}</em></button>;
        })}</div>
      ) : <p className="muted">No lists yet. <Link href="/app/lists">Create your first list.</Link></p>}
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="search-modal-backdrop-v38" role="presentation" onClick={onClose}><section className="search-modal-v38" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}><header><h2>{title}</h2><button onClick={onClose} aria-label="Close"><X size={20} /></button></header>{children}</section></div>;
}

function SearchState({ title, body, action, onAction }: { title: string; body: string; action?: string; onAction?: () => void }) {
  return <section className="search-state-v38"><Search size={26} /><h2>{title}</h2><p>{body}</p>{action && onAction ? <button className="secondary" onClick={onAction}>{action}</button> : null}</section>;
}

function LoadingState() {
  return <div className="search-loading-v38" aria-label="Loading games">{[1, 2, 3].map((item) => <div key={item}><span /><section><i /><i /><i /></section></div>)}</div>;
}

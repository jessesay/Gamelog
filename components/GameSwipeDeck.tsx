"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Bookmark, CheckCircle2, ExternalLink, Gamepad2, Loader2, LogIn, RotateCcw, Sparkles, X } from "lucide-react";

type SwipeAction = "skipped" | "liked" | "saved" | "played";

type StoreLink = {
  name?: string | null;
  slug?: string | null;
  url?: string | null;
};

type Game = {
  id: string;
  title: string;
  slug: string | null;
  source: string | null;
  source_url: string | null;
  description: string | null;
  summary: string | null;
  cover_url: string | null;
  background_url: string | null;
  platforms: string[] | null;
  genres: string[] | null;
  genre: string | null;
  tags: string[] | null;
  release_date: string | null;
  release_year: number | null;
  rating: number | null;
  metacritic: number | null;
  stores: StoreLink[] | null;
  taste_match: number;
};

type Notice = { message: string; href?: string; linkLabel?: string };

const sessionKey = "gamelog_swipe_session_id";
const guestShelfKey = "gamelog_guest_discovery_shelf";

function makeSessionId() {
  return window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function getSessionId() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(sessionKey);
  if (existing) return existing;
  const next = makeSessionId();
  window.localStorage.setItem(sessionKey, next);
  return next;
}

function rememberGuestAction(game: Game, action: SwipeAction) {
  if (action === "skipped") return;
  try {
    const current = JSON.parse(window.localStorage.getItem(guestShelfKey) ?? "[]") as Array<Record<string, unknown>>;
    const next = current.filter((item) => item.gameId !== game.id);
    next.unshift({ gameId: game.id, title: game.title, coverUrl: game.cover_url, action, savedAt: new Date().toISOString() });
    window.localStorage.setItem(guestShelfKey, JSON.stringify(next.slice(0, 100)));
  } catch {
    window.localStorage.removeItem(guestShelfKey);
  }
}

function releaseYear(game: Game) {
  if (game.release_year) return String(game.release_year);
  if (game.release_date) {
    const date = new Date(game.release_date);
    if (!Number.isNaN(date.getTime())) return String(date.getFullYear());
  }
  return "TBA";
}

function formatDate(game: Game) {
  if (game.release_date) {
    const date = new Date(game.release_date);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }
  }
  return game.release_year ? String(game.release_year) : "Release TBA";
}

function sourceLabel(game: Game) {
  if (game.source) {
    if (game.source.toLowerCase() === "rawg") return "RAWG";
    if (game.source.toLowerCase() === "itch") return "itch.io";
    return game.source;
  }
  const store = game.stores?.find((item) => item.name || item.slug);
  return store?.name ?? store?.slug ?? "GameLog catalog";
}

function fullDescription(game: Game) {
  return (game.description || game.summary || "").replace(/\s+/g, " ").trim();
}

function uniqueList(values: Array<string | null | undefined>, limit = 12) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])].slice(0, limit);
}

function sourceHref(game: Game) {
  return game.source_url ?? game.stores?.find((store) => store.url)?.url ?? null;
}

export default function GameSwipeDeck({ signedIn = false }: { signedIn?: boolean }) {
  const [sessionId, setSessionId] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [savingAction, setSavingAction] = useState<SwipeAction | null>(null);
  const [feedError, setFeedError] = useState("");
  const [actionError, setActionError] = useState("");
  const [empty, setEmpty] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [personalized, setPersonalized] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dragX, setDragX] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const suppressClick = useRef(false);

  const currentGame = games[0] ?? null;
  const nextGame = games[1] ?? null;

  const meta = useMemo(() => {
    if (!currentGame) return null;
    return {
      platforms: uniqueList(currentGame.platforms ?? [], 3),
      genres: uniqueList([...(currentGame.genres ?? []), currentGame.genre], 3),
      year: releaseYear(currentGame),
    };
  }, [currentGame]);

  async function loadFeed(id = sessionId, options: { append?: boolean } = {}) {
    if (!id) return;
    options.append ? setFetchingMore(true) : setInitialLoading(true);
    setFeedError("");

    try {
      const response = await fetch(`/api/games/feed?sessionId=${encodeURIComponent(id)}&limit=24`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load games.");

      const nextGames = (data.games ?? []) as Game[];
      setPersonalized(Boolean(data.personalized));
      setGames((current) => {
        const base = options.append ? current : [];
        const existingIds = new Set(base.map((game) => game.id));
        return [...base, ...nextGames.filter((game) => !existingIds.has(game.id))];
      });
      if (!options.append) setEmpty(nextGames.length === 0);
    } catch (caught) {
      setFeedError(caught instanceof Error ? caught.message : "Could not load games.");
    } finally {
      setInitialLoading(false);
      setFetchingMore(false);
    }
  }

  async function choose(action: SwipeAction) {
    if (!currentGame || !sessionId || savingAction) return;
    const chosenGame = currentGame;
    const shouldRefill = games.length <= 8;

    setSavingAction(action);
    setActionError("");
    setNotice(null);
    setDetailOpen(false);
    setDragX(action === "skipped" ? -520 : 520);
    await new Promise((resolve) => window.setTimeout(resolve, 150));
    setGames((current) => current.slice(1));
    setDragX(0);

    try {
      const response = await fetch("/api/games/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, gameId: chosenGame.id, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save that choice.");

      if (action === "skipped") {
        setNotice({ message: "Skipped. Your feed is already adjusting." });
      } else if (data.shelfSaved) {
        const shelfName = action === "saved" ? "Wishlist" : action === "liked" ? "Want to Play" : "Completed";
        setNotice({ message: `${chosenGame.title} is now on your ${shelfName} shelf.`, href: "/app/profile", linkLabel: "View shelf" });
      } else if (data.needsOnboarding) {
        setNotice({ message: "Choice saved. Finish your profile to sync it to a shelf.", href: "/app/onboarding", linkLabel: "Finish profile" });
      } else {
        rememberGuestAction(chosenGame, action);
        setNotice({ message: "Saved on this device. Sign in to sync your shelves.", href: "/app/profile", linkLabel: "Sign in" });
      }

      if (shouldRefill) await loadFeed(sessionId, { append: true });
    } catch (caught) {
      setGames((current) => [chosenGame, ...current.filter((game) => game.id !== chosenGame.id)]);
      setActionError(caught instanceof Error ? caught.message : "Could not save that choice.");
    } finally {
      setSavingAction(null);
    }
  }

  function startFresh() {
    const id = makeSessionId();
    window.localStorage.setItem(sessionKey, id);
    setSessionId(id);
    setGames([]);
    setEmpty(false);
    setNotice(null);
    void loadFeed(id);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (savingAction) return;
    dragStartX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (dragStartX.current === null || savingAction) return;
    const next = event.clientX - dragStartX.current;
    setDragX(Math.max(-180, Math.min(180, next)));
    if (Math.abs(next) > 8) suppressClick.current = true;
  }

  function onPointerUp() {
    dragStartX.current = null;
    if (Math.abs(dragX) >= 82) {
      void choose(dragX < 0 ? "skipped" : "liked");
    } else {
      setDragX(0);
    }
  }

  function openDetails() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setDetailOpen(true);
  }

  useEffect(() => {
    const id = getSessionId();
    setSessionId(id);
    void loadFeed(id);
  }, []);

  useEffect(() => {
    for (const game of games.slice(1, 4)) {
      if (!game.cover_url) continue;
      const image = new Image();
      image.src = game.cover_url;
    }
  }, [games]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!detailOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setDetailOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailOpen]);

  return (
    <main className="swipe-page-v34">
      <section className="swipe-shell-v34" aria-live="polite">
        <header className="swipe-topbar-v34">
          <div>
            <p className="swipe-eyebrow-v34">GameLog · Early Beta</p>
            <h1>Discover</h1>
          </div>
          <div className="swipe-feed-status-v34">
            <span className="swipe-count-v34"><Sparkles size={13} /> {personalized ? "For your taste" : "Popular picks"}</span>
            {!signedIn ? <span className="swipe-guest-v34">Guest mode</span> : null}
          </div>
        </header>

        {initialLoading && !currentGame ? (
          <SwipeSkeleton />
        ) : feedError && !currentGame ? (
          <StatePanel icon={<RotateCcw size={24} />} title="The feed hit a snag" body={feedError} actionLabel="Try again" onAction={() => void loadFeed(sessionId)} />
        ) : empty || !currentGame || !meta ? (
          <StatePanel icon={<Gamepad2 size={25} />} title="You caught up" body="You cleared this mix. Start a fresh stack while the Early Beta catalog keeps growing." actionLabel="Start a fresh mix" onAction={startFresh} />
        ) : (
          <>
            <div className="swipe-stack-v34">
              {nextGame ? <CardBackdrop game={nextGame} /> : null}
              <article
                className="swipe-card-v34"
                style={{ transform: `translateX(${dragX}px) rotate(${dragX / 24}deg)`, transition: dragStartX.current === null ? "transform 180ms ease" : "none" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClick={openDetails}
                tabIndex={0}
                role="button"
                onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && setDetailOpen(true)}
                aria-label={`Open details for ${currentGame.title}`}
              >
                <div className={`swipe-gesture-stamp-v34 swipe-gesture-skip-v34 ${dragX < -25 ? "is-visible" : ""}`}>Skip</div>
                <div className={`swipe-gesture-stamp-v34 swipe-gesture-want-v34 ${dragX > 25 ? "is-visible" : ""}`}>Want it</div>
                <div className="swipe-art-v34">
                  {currentGame.cover_url ? <img src={currentGame.cover_url} alt={`${currentGame.title} box art`} draggable={false} /> : <div className="swipe-art-empty-v34"><Gamepad2 size={42} /><span>Box art coming soon</span></div>}
                  <div className="swipe-art-fade-v34" />
                  <span className="swipe-match-v34"><Sparkles size={14} /> {currentGame.taste_match}% Taste Match</span>
                  <div className="swipe-card-body-v34">
                    <h2>{currentGame.title}</h2>
                    <div className="swipe-meta-v34"><span>{meta.year}</span>{meta.platforms.map((platform) => <span key={platform}>{platform}</span>)}</div>
                    {meta.genres.length ? <div className="swipe-genre-row-v34">{meta.genres.map((genre) => <span key={genre}>{genre}</span>)}</div> : null}
                  </div>
                </div>
              </article>
            </div>

            <p className="swipe-hint-v34"><span>Swipe left to skip</span><span>Swipe right to want</span></p>
            {actionError ? <div className="swipe-error-v34"><span>{actionError}</span><button onClick={() => setActionError("")}>Dismiss</button></div> : null}
            {feedError ? <div className="swipe-error-v34"><span>{feedError}</span><button onClick={() => void loadFeed(sessionId, { append: true })}>Retry</button></div> : null}

            <div className="swipe-actions-v34" aria-label="Game actions">
              <ActionButton label="Skip" action="skipped" busy={savingAction === "skipped"} disabled={Boolean(savingAction)} onClick={choose} icon={<X size={21} />} />
              <ActionButton label="Save" action="saved" busy={savingAction === "saved"} disabled={Boolean(savingAction)} onClick={choose} icon={<Bookmark size={20} />} />
              <ActionButton label="Want to Play" action="liked" busy={savingAction === "liked"} disabled={Boolean(savingAction)} onClick={choose} icon={<Sparkles size={20} />} />
              <ActionButton label="Played" action="played" busy={savingAction === "played"} disabled={Boolean(savingAction)} onClick={choose} icon={<CheckCircle2 size={21} />} />
            </div>
            {fetchingMore ? <p className="swipe-loading-more-v34"><Loader2 className="swipe-spin-v34" size={14} /> Loading more picks</p> : null}

            {detailOpen ? <GameDetailModal game={currentGame} savingAction={savingAction} onClose={() => setDetailOpen(false)} onAction={(action) => void choose(action)} /> : null}
          </>
        )}
      </section>

      {notice ? <div className="swipe-toast-v34" role="status"><span>{notice.message}</span>{notice.href ? <Link href={notice.href}>{notice.linkLabel}<LogIn size={14} /></Link> : null}</div> : null}
    </main>
  );
}

function CardBackdrop({ game }: { game: Game }) {
  return <div className="swipe-card-backdrop-v34" aria-hidden="true">{game.cover_url ? <img src={game.cover_url} alt="" /> : null}</div>;
}

function ActionButton({ label, action, busy, disabled, icon, onClick }: { label: string; action: SwipeAction; busy: boolean; disabled: boolean; icon: ReactNode; onClick: (action: SwipeAction) => void }) {
  return <button className={`swipe-action-v34 swipe-action-${action}-v34`} onClick={() => onClick(action)} disabled={busy || disabled}>{busy ? <Loader2 className="swipe-spin-v34" size={20} /> : icon}<span>{label}</span></button>;
}

function GameDetailModal({ game, savingAction, onClose, onAction }: { game: Game; savingAction: SwipeAction | null; onClose: () => void; onAction: (action: SwipeAction) => void }) {
  const genres = uniqueList([...(game.genres ?? []), game.genre]);
  const tags = uniqueList(game.tags ?? [], 10);
  const platforms = uniqueList(game.platforms ?? [], 10);
  const description = fullDescription(game);
  const href = sourceHref(game);

  return (
    <div className="swipe-modal-backdrop-v34" role="presentation" onClick={onClose}>
      <section className="swipe-modal-v34" role="dialog" aria-modal="true" aria-labelledby="swipe-detail-title" onClick={(event) => event.stopPropagation()}>
        <header className="swipe-modal-header-v34"><div><p className="swipe-eyebrow-v34">{game.taste_match}% Taste Match · {sourceLabel(game)}</p><h2 id="swipe-detail-title">{game.title}</h2></div><button className="swipe-modal-close-v34" type="button" onClick={onClose} aria-label="Close details"><X size={20} /></button></header>
        <div className="swipe-modal-art-v34">{game.cover_url ? <img src={game.cover_url} alt={`${game.title} box art`} /> : <div className="swipe-art-empty-v34">Artwork has not been imported yet.</div>}</div>
        <div className="swipe-detail-grid-v34"><DetailBlock label="Release" value={formatDate(game)} /><DetailBlock label="Taste Match" value={`${game.taste_match}%`} /></div>
        <ChipSection title="Platforms" values={platforms} fallback="No platforms imported yet." />
        <ChipSection title="Genres" values={genres} fallback="No genres imported yet." />
        <ChipSection title="Tags" values={tags} fallback="No tags imported yet." />
        <section className="swipe-detail-copy-v34"><h3>Why you might play it</h3><p>{description || "This catalog entry is still being enriched. Use the quick actions now and check back for more detail."}</p></section>
        {href ? <a className="swipe-source-link-v34" href={href} target="_blank" rel="noreferrer"><ExternalLink size={17} />Open source page</a> : null}
        <div className="swipe-modal-actions-v34">
          <ActionButton label="Skip" action="skipped" busy={savingAction === "skipped"} disabled={Boolean(savingAction)} onClick={onAction} icon={<X size={20} />} />
          <ActionButton label="Save" action="saved" busy={savingAction === "saved"} disabled={Boolean(savingAction)} onClick={onAction} icon={<Bookmark size={20} />} />
          <ActionButton label="Want to Play" action="liked" busy={savingAction === "liked"} disabled={Boolean(savingAction)} onClick={onAction} icon={<Sparkles size={20} />} />
          <ActionButton label="Played" action="played" busy={savingAction === "played"} disabled={Boolean(savingAction)} onClick={onAction} icon={<CheckCircle2 size={20} />} />
        </div>
      </section>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return <div className="swipe-detail-block-v34"><span>{label}</span><strong>{value}</strong></div>;
}

function ChipSection({ title, values, fallback }: { title: string; values: string[]; fallback: string }) {
  return <section className="swipe-detail-section-v34"><h3>{title}</h3>{values.length ? <div className="swipe-detail-chip-row-v34">{values.map((value) => <span key={value}>{value}</span>)}</div> : <p className="swipe-detail-fallback-v34">{fallback}</p>}</section>;
}

function SwipeSkeleton() {
  return <div className="swipe-skeleton-wrap-v34" aria-label="Loading game recommendations"><div className="swipe-skeleton-card-v34"><div className="swipe-skeleton-match-v34" /><div className="swipe-skeleton-copy-v34"><span /><span /><span /></div></div><div className="swipe-skeleton-actions-v34">{[0, 1, 2, 3].map((item) => <span key={item} />)}</div></div>;
}

function StatePanel({ icon, title, body, actionLabel, onAction }: { icon: ReactNode; title: string; body: string; actionLabel: string; onAction: () => void }) {
  return <div className="swipe-state-v34"><div className="swipe-state-icon-v34">{icon}</div><h2>{title}</h2><p>{body}</p><button className="swipe-refresh-v34" onClick={onAction}>{actionLabel}</button></div>;
}

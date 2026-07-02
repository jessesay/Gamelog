"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Bookmark, CheckCircle2, ExternalLink, Gamepad2, Loader2, LogIn, RotateCcw, Settings2, Sparkles, X } from "lucide-react";
import DiscoveryPreferenceSetup from "@/components/DiscoveryPreferenceSetup";
import GameCoverArt from "@/components/GameCoverArt";
import { emptyDiscoveryPreferences, normalizeDiscoveryPreferences, type DiscoveryPreferences } from "@/lib/discoveryPreferences";
import { track } from "@vercel/analytics";

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
  match_reasons: string[];
};

type Notice = { message: string; href?: string; linkLabel?: string };
type DiscoveryEventName = "save" | "skip" | "played" | "want_to_play" | "card_viewed" | "signin_prompt_clicked";
type GuestEvent = { event: DiscoveryEventName; gameId?: string; title?: string; createdAt: string };

const sessionKey = "gamelog_swipe_session_id";
const guestShelfKey = "gamelog_guest_discovery_shelf";
const guestEventsKey = "gamelog_guest_discovery_events";
const guestPreferencesKey = "gamelog_guest_discovery_preferences";
const actionEventNames: Record<SwipeAction, DiscoveryEventName> = { skipped: "skip", saved: "save", liked: "want_to_play", played: "played" };

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
    next.unshift({
      gameId: game.id, title: game.title, slug: game.slug, coverUrl: game.cover_url,
      releaseYear: game.release_year, platforms: game.platforms ?? [], genres: game.genres ?? [], genre: game.genre,
      action, status: action === "played" ? "completed" : "want_to_play", rating: null, notes: "", hoursPlayed: null,
      savedAt: new Date().toISOString(),
    });
    window.localStorage.setItem(guestShelfKey, JSON.stringify(next.slice(0, 100)));
  } catch {
    window.localStorage.removeItem(guestShelfKey);
  }
}

function readGuestEvents() {
  try {
    const value = JSON.parse(window.localStorage.getItem(guestEventsKey) ?? "[]");
    return Array.isArray(value) ? value as GuestEvent[] : [];
  } catch {
    return [];
  }
}

function recordGuestEvent(event: DiscoveryEventName, game?: Game) {
  const events = readGuestEvents();
  events.push({ event, gameId: game?.id, title: game?.title, createdAt: new Date().toISOString() });
  const next = events.slice(-300);
  window.localStorage.setItem(guestEventsKey, JSON.stringify(next));
  return next;
}

function readGuestPreferences() {
  try {
    return normalizeDiscoveryPreferences(JSON.parse(window.localStorage.getItem(guestPreferencesKey) ?? "null"));
  } catch {
    return emptyDiscoveryPreferences;
  }
}

function saveGuestPreferences(preferences: DiscoveryPreferences) {
  window.localStorage.setItem(guestPreferencesKey, JSON.stringify(preferences));
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
  const [preferences, setPreferences] = useState<DiscoveryPreferences>(emptyDiscoveryPreferences);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [showPreferenceSetup, setShowPreferenceSetup] = useState(false);
  const [guestActionCount, setGuestActionCount] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const viewedGameId = useRef("");

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

  function feedUrl(id: string, activePreferences: DiscoveryPreferences, guestEvents = readGuestEvents()) {
    const params = new URLSearchParams({ sessionId: id, limit: "24" });
    if (!signedIn) {
      params.set("platforms", activePreferences.favorite_platforms.join("|"));
      params.set("genres", activePreferences.favorite_genres.join("|"));
      params.set("favoriteGames", activePreferences.favorite_games.join("|"));
      params.set("styles", activePreferences.discovery_styles.join("|"));
      params.set("moods", activePreferences.favorite_moods.join("|"));
      if (activePreferences.completed) params.set("tuned", "1");
      const eventGroups: Record<string, string[]> = { savedIds: [], wantedIds: [], playedIds: [], skippedIds: [], viewedIds: [] };
      for (const event of guestEvents.slice(-120)) {
        if (!event.gameId) continue;
        const key = event.event === "save" ? "savedIds" : event.event === "want_to_play" ? "wantedIds" : event.event === "played" ? "playedIds" : event.event === "skip" ? "skippedIds" : event.event === "card_viewed" ? "viewedIds" : null;
        if (key && !eventGroups[key].includes(event.gameId)) eventGroups[key].push(event.gameId);
      }
      for (const [key, ids] of Object.entries(eventGroups)) params.set(key, ids.slice(-20).join("|"));
    }
    return `/api/games/feed?${params.toString()}`;
  }

  async function loadFeed(id = sessionId, options: { append?: boolean } = {}, activePreferences = preferences, guestEvents?: GuestEvent[]) {
    if (!id) return;
    options.append ? setFetchingMore(true) : setInitialLoading(true);
    setFeedError("");

    try {
      const response = await fetch(feedUrl(id, activePreferences, guestEvents), { cache: "no-store" });
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

    if (!signedIn) {
      const guestEvents = recordGuestEvent(actionEventNames[action], chosenGame);
      rememberGuestAction(chosenGame, action);
      const nextActionCount = guestEvents.filter((event) => ["save", "skip", "played", "want_to_play"].includes(event.event)).length;
      setGuestActionCount(nextActionCount);
      setNotice(action === "skipped"
        ? { message: "Skipped. Taste Match is learning on this device." }
        : nextActionCount >= 4
          ? { message: "Your taste profile is taking shape. Sign in to keep it.", href: "/app/profile", linkLabel: "Sign in" }
          : { message: "Saved on this device. Keep swiping to tune your taste." });
      if (shouldRefill) await loadFeed(sessionId, { append: true }, preferences, guestEvents);
      setSavingAction(null);
      return;
    }

    try {
      const response = await fetch("/api/games/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, gameId: chosenGame.id, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save that choice.");
      track("discovery_swipe", { action, signed_in: signedIn });
      if (action === "saved" || action === "liked") track("game_saved", { source: "discovery", action });

      if (action === "skipped") {
        setNotice({ message: "Skipped. Your feed is already adjusting." });
      } else if (data.shelfSaved) {
        const shelfName = action === "saved" ? "Wishlist" : action === "liked" ? "Want to Play" : "Completed";
        setNotice({ message: `${chosenGame.title} is now on your ${shelfName} shelf.`, href: "/app/profile", linkLabel: "View shelf" });
      } else if (data.needsOnboarding) {
        setNotice({ message: "Choice saved. Finish your profile to sync it to a shelf.", href: "/app/onboarding", linkLabel: "Finish profile" });
      } else {
        setNotice({ message: "Choice recorded. Your recommendations will keep learning." });
      }

      if (shouldRefill) await loadFeed(sessionId, { append: true });
    } catch (caught) {
      setGames((current) => [chosenGame, ...current.filter((game) => game.id !== chosenGame.id)]);
      setActionError(caught instanceof Error ? caught.message : "Could not save that choice.");
    } finally {
      setSavingAction(null);
    }
  }

  function trackAuxiliaryEvent(event: "card_viewed" | "signin_prompt_clicked", game?: Game) {
    if (!signedIn) {
      recordGuestEvent(event, game);
      return;
    }
    void fetch("/api/discovery/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, gameId: game?.id, sessionId, metadata: { source: "discovery_feed" } }),
    }).catch(() => undefined);
  }

  async function savePreferences(nextPreferences: DiscoveryPreferences) {
    const completed = { ...nextPreferences, completed: true };
    saveGuestPreferences(completed);
    if (signedIn) {
      try {
        const response = await fetch("/api/discovery/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(completed),
        });
        const data = await response.json();
        if (!response.ok) return data.error ?? "Could not sync your taste profile.";
      } catch {
        return "Your choices are safe on this device, but account sync is temporarily unavailable.";
      }
    }
    setPreferences(completed);
    setShowPreferenceSetup(false);
    setGames([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    await loadFeed(sessionId, {}, completed);
    setNotice({ message: signedIn ? "Taste profile saved. Your next stack is tuned." : "Taste profile saved on this device." });
    return null;
  }

  function skipPreferences() {
    const skipped = { ...preferences, completed: true };
    saveGuestPreferences(skipped);
    if (signedIn) {
      void fetch("/api/discovery/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skipped),
      }).catch(() => undefined);
    }
    setPreferences(skipped);
    setShowPreferenceSetup(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!games.length) void loadFeed(sessionId, {}, skipped);
  }

  function startFresh() {
    const id = makeSessionId();
    window.localStorage.setItem(sessionKey, id);
    setSessionId(id);
    setGames([]);
    setEmpty(false);
    setNotice(null);
    void loadFeed(id, {}, preferences);
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
    setGuestActionCount(readGuestEvents().filter((event) => ["save", "skip", "played", "want_to_play"].includes(event.event)).length);

    async function bootstrap() {
      let resolved = readGuestPreferences();
      if (signedIn) {
        try {
          const response = await fetch("/api/discovery/preferences", { cache: "no-store" });
          const data = await response.json();
          if (response.ok) resolved = normalizeDiscoveryPreferences(data.preferences);
        } catch {
          // Guest-device preferences remain a safe fallback if account loading fails.
        }
      }
      setPreferences(resolved);
      const retake = new URLSearchParams(window.location.search).get("retake") === "1";
      setShowPreferenceSetup(retake || !resolved.completed);
      setPreferencesReady(true);
      await loadFeed(id, {}, resolved);
    }

    void bootstrap();
  }, [signedIn]);

  useEffect(() => {
    if (!preferencesReady || showPreferenceSetup || !currentGame || viewedGameId.current === currentGame.id) return;
    viewedGameId.current = currentGame.id;
    trackAuxiliaryEvent("card_viewed", currentGame);
  }, [currentGame, preferencesReady, showPreferenceSetup]);

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
        {!preferencesReady ? <SwipeSkeleton /> : showPreferenceSetup ? (
          <DiscoveryPreferenceSetup initialPreferences={preferences} signedIn={signedIn} onSave={savePreferences} onSkip={skipPreferences} />
        ) : <>
        <header className="swipe-topbar-v34">
          <div>
            <p className="swipe-eyebrow-v34">GameLog · Early Beta</p>
            <h1>Discover</h1>
          </div>
          <div className="swipe-feed-status-v34">
            <span className="swipe-count-v34"><Sparkles size={13} /> {personalized ? "For your taste" : "Popular picks"}</span>
            <button className="swipe-retune-v310" onClick={() => setShowPreferenceSetup(true)}><Settings2 size={12} /> Tune</button>
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
                  <GameCoverArt src={currentGame.cover_url} title={currentGame.title} genre={currentGame.genre ?? currentGame.genres?.[0]} />
                  <div className="swipe-art-fade-v34" />
                  <div className="swipe-card-spectrum-v321" aria-hidden="true" />
                  <span className="swipe-card-kicker-v321">Next discovery</span>
                  <span className="swipe-match-v34"><Sparkles size={14} /> {currentGame.taste_match}% Taste Match</span>
                  <div className="swipe-card-body-v34">
                    <h2>{currentGame.title}</h2>
                    <div className="swipe-meta-v34"><span>{meta.year}</span>{meta.platforms.map((platform) => <span key={platform}>{platform}</span>)}</div>
                    {meta.genres.length ? <div className="swipe-genre-row-v34">{meta.genres.map((genre) => <span key={genre}>{genre}</span>)}</div> : null}
                    <div className="swipe-why-v310"><strong>Why this game?</strong>{(currentGame.match_reasons ?? ["New recommendation for your shelf"]).slice(0, 3).map((reason) => <span key={reason}>{reason}</span>)}</div>
                  </div>
                </div>
              </article>
            </div>

            <p className="swipe-hint-v34"><span>Swipe left to skip</span><span>Swipe right to want</span></p>
            {!signedIn && guestActionCount >= 4 ? <div className="swipe-signin-nudge-v310"><div><strong>Your taste profile is getting smarter.</strong><span>Sign in to keep it and sync your shelves.</span></div><Link href="/app/profile" onClick={() => trackAuxiliaryEvent("signin_prompt_clicked", currentGame)}><LogIn size={15} /> Sign in</Link></div> : null}
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
        </>}
      </section>

      {notice ? <div className="swipe-toast-v34" role="status"><span>{notice.message}</span>{notice.href ? <Link href={notice.href} onClick={() => notice.linkLabel === "Sign in" && trackAuxiliaryEvent("signin_prompt_clicked", currentGame ?? undefined)}>{notice.linkLabel}<LogIn size={14} /></Link> : null}</div> : null}
    </main>
  );
}

function CardBackdrop({ game }: { game: Game }) {
  return <div className="swipe-card-backdrop-v34" aria-hidden="true"><GameCoverArt src={game.cover_url} title={game.title} genre={game.genre ?? game.genres?.[0]} decorative /></div>;
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
        <div className="swipe-modal-art-v34"><GameCoverArt src={game.cover_url} title={game.title} genre={game.genre ?? game.genres?.[0]} /></div>
        <div className="swipe-detail-grid-v34"><DetailBlock label="Release" value={formatDate(game)} /><DetailBlock label="Taste Match" value={`${game.taste_match}%`} /></div>
        <ChipSection title="Platforms" values={platforms} fallback="No platforms imported yet." />
        <ChipSection title="Genres" values={genres} fallback="No genres imported yet." />
        <ChipSection title="Tags" values={tags} fallback="No tags imported yet." />
        <ChipSection title="Why this game?" values={game.match_reasons ?? []} fallback="A fresh recommendation for your shelf." />
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

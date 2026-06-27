"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, ExternalLink, Heart, Loader2, RotateCcw, SkipForward, Sparkles, X } from "lucide-react";

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
};

const sessionKey = "gamelog_swipe_session_id";

function getSessionId() {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(sessionKey);
  if (existing) return existing;

  const next = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  window.localStorage.setItem(sessionKey, next);
  return next;
}

function formatDate(game: Game) {
  if (game.release_date) {
    const date = new Date(game.release_date);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
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
  return store?.name ?? store?.slug ?? "Imported";
}

function shortDescription(game: Game) {
  const text = (game.description || game.summary || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > 190 ? `${text.slice(0, 187).trim()}...` : text;
}

function fullDescription(game: Game) {
  return (game.description || game.summary || "").replace(/\s+/g, " ").trim();
}

function uniqueList(values: Array<string | null | undefined>, limit = 12) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])].slice(0, limit);
}

function sourceHref(game: Game) {
  if (game.source_url) return game.source_url;
  return game.stores?.find((store) => store.url)?.url ?? null;
}

function sourceLinkLabel(game: Game) {
  const store = game.stores?.find((item) => item.url && item.name);
  return store?.name ? `Open on ${store.name}` : `Open ${sourceLabel(game)}`;
}

export default function GameSwipeDeck() {
  const [sessionId, setSessionId] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<SwipeAction | null>(null);
  const [error, setError] = useState("");
  const [empty, setEmpty] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const currentGame = games[0] ?? null;
  const remainingCount = games.length;

  const meta = useMemo(() => {
    if (!currentGame) return null;
    const platforms = currentGame.platforms?.filter(Boolean).slice(0, 3) ?? [];
    const genres = [
      ...(currentGame.genres?.filter(Boolean) ?? []),
      currentGame.genre,
    ].filter(Boolean) as string[];

    return {
      platforms,
      genres: [...new Set(genres)].slice(0, 3),
      source: sourceLabel(currentGame),
      release: formatDate(currentGame),
      description: shortDescription(currentGame),
    };
  }, [currentGame]);

  async function loadFeed(id = sessionId, options: { append?: boolean } = {}) {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/games/feed?sessionId=${encodeURIComponent(id)}&limit=24`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load games.");
      }

      const nextGames = (data.games ?? []) as Game[];
      setGames((current) => {
        const existingIds = new Set(options.append ? current.map((game) => game.id) : []);
        const uniqueGames = nextGames.filter((game) => !existingIds.has(game.id));
        return options.append ? [...current, ...uniqueGames] : uniqueGames;
      });
      setEmpty(nextGames.length === 0 && !options.append);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load games.");
    } finally {
      setLoading(false);
    }
  }

  async function swipe(action: SwipeAction) {
    if (!currentGame || !sessionId || savingAction) return;

    const swipedGame = currentGame;
    setSavingAction(action);
    setError("");
    setDetailOpen(false);
    setGames((current) => current.slice(1));

    try {
      const response = await fetch("/api/games/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          gameId: swipedGame.id,
          action,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not save that swipe.");
      }

      if (games.length <= 5) {
        await loadFeed(sessionId, { append: true });
      }
    } catch (caught) {
      setGames((current) => [swipedGame, ...current]);
      setError(caught instanceof Error ? caught.message : "Could not save that swipe.");
    } finally {
      setSavingAction(null);
    }
  }

  useEffect(() => {
    const id = getSessionId();
    setSessionId(id);
    void loadFeed(id);
  }, []);

  useEffect(() => {
    if (!detailOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailOpen]);

  return (
    <main className="swipe-page-v34">
      <section className="swipe-shell-v34" aria-live="polite">
        <header className="swipe-topbar-v34">
          <div>
            <p className="swipe-eyebrow-v34">GameLog discovery</p>
            <h1>Swipe your next game</h1>
          </div>
          <span className="swipe-count-v34">{remainingCount} queued</span>
        </header>

        {loading && !currentGame ? (
          <StatePanel
            icon={<Loader2 className="swipe-spin-v34" size={24} />}
            title="Loading your feed"
            body="Pulling imported games from Supabase."
          />
        ) : error && !currentGame ? (
          <StatePanel
            icon={<RotateCcw size={24} />}
            title="Could not load games"
            body={error}
            actionLabel="Try again"
            onAction={() => void loadFeed(sessionId)}
          />
        ) : empty || !currentGame || !meta ? (
          <StatePanel
            icon={<Sparkles size={24} />}
            title="No more games for now"
            body="You have cleared this discovery queue. Import or reseed more games to keep swiping."
            actionLabel="Refresh"
            onAction={() => void loadFeed(sessionId)}
          />
        ) : (
          <>
            <button className="swipe-card-v34" type="button" onClick={() => setDetailOpen(true)}>
              <div className="swipe-art-v34">
                {currentGame.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentGame.cover_url} alt={`${currentGame.title} cover art`} />
                ) : (
                  <div className="swipe-art-empty-v34">Cover art pending</div>
                )}
                <div className="swipe-art-fade-v34" />
              </div>

              <div className="swipe-card-body-v34">
                <div className="swipe-chip-row-v34">
                  <span>{meta.source}</span>
                  {meta.platforms.map((platform) => (
                    <span key={platform}>{platform}</span>
                  ))}
                </div>

                <h2>{currentGame.title}</h2>

                <div className="swipe-meta-v34">
                  <span>{meta.release}</span>
                  {currentGame.rating ? <span>{Number(currentGame.rating).toFixed(1)} rating</span> : null}
                  {currentGame.metacritic ? <span>{currentGame.metacritic} meta</span> : null}
                </div>

                {meta.genres.length > 0 ? (
                  <div className="swipe-genre-row-v34">
                    {meta.genres.map((genre) => (
                      <span key={genre}>{genre}</span>
                    ))}
                  </div>
                ) : null}

                {meta.description ? <p>{meta.description}</p> : <p className="swipe-muted-v34">No short description is available yet.</p>}
              </div>
            </button>

            {error ? <p className="swipe-error-v34">{error}</p> : null}

            <div className="swipe-actions-v34">
              <ActionButton label="Skip" action="skipped" busy={savingAction === "skipped"} disabled={Boolean(savingAction)} onClick={swipe} icon={<SkipForward size={18} />} />
              <ActionButton label="Like" action="liked" busy={savingAction === "liked"} disabled={Boolean(savingAction)} onClick={swipe} icon={<Heart size={18} />} />
              <ActionButton label="Wishlist" action="saved" busy={savingAction === "saved"} disabled={Boolean(savingAction)} onClick={swipe} icon={<Sparkles size={18} />} />
              <ActionButton label="Played" action="played" busy={savingAction === "played"} disabled={Boolean(savingAction)} onClick={swipe} icon={<CheckCircle2 size={18} />} />
            </div>

            {detailOpen ? (
              <GameDetailModal
                game={currentGame}
                savingAction={savingAction}
                onClose={() => setDetailOpen(false)}
                onAction={(action) => void swipe(action)}
              />
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

function ActionButton({
  label,
  action,
  busy,
  disabled = false,
  icon,
  onClick,
}: {
  label: string;
  action: SwipeAction;
  busy: boolean;
  disabled?: boolean;
  icon: ReactNode;
  onClick: (action: SwipeAction) => void;
}) {
  return (
    <button className={`swipe-action-v34 swipe-action-${action}-v34`} onClick={() => onClick(action)} disabled={busy || disabled}>
      {busy ? <Loader2 className="swipe-spin-v34" size={18} /> : icon}
      <span>{label}</span>
    </button>
  );
}

function GameDetailModal({
  game,
  savingAction,
  onClose,
  onAction,
}: {
  game: Game;
  savingAction: SwipeAction | null;
  onClose: () => void;
  onAction: (action: SwipeAction) => void;
}) {
  const genres = uniqueList([...(game.genres ?? []), game.genre]);
  const tags = uniqueList(game.tags ?? [], 10);
  const platforms = uniqueList(game.platforms ?? [], 10);
  const description = fullDescription(game);
  const href = sourceHref(game);

  return (
    <div className="swipe-modal-backdrop-v34" role="presentation" onClick={onClose}>
      <section
        className="swipe-modal-v34"
        role="dialog"
        aria-modal="true"
        aria-labelledby="swipe-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="swipe-modal-header-v34">
          <div>
            <p className="swipe-eyebrow-v34">{sourceLabel(game)}</p>
            <h2 id="swipe-detail-title">{game.title}</h2>
          </div>
          <button className="swipe-modal-close-v34" type="button" onClick={onClose} aria-label="Close details">
            <X size={20} />
          </button>
        </header>

        <div className="swipe-modal-art-v34">
          {game.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.cover_url} alt={`${game.title} cover art`} />
          ) : (
            <div className="swipe-art-empty-v34">Artwork has not been imported yet.</div>
          )}
        </div>

        <div className="swipe-detail-grid-v34">
          <DetailBlock label="Release" value={formatDate(game)} />
          <DetailBlock label="Source" value={sourceLabel(game)} />
        </div>

        <ChipSection title="Genres" values={genres} fallback="No genres imported yet." />
        <ChipSection title="Tags" values={tags} fallback="No tags imported yet." />
        <ChipSection title="Platforms" values={platforms} fallback="No platforms imported yet." />

        <section className="swipe-detail-copy-v34">
          <h3>Description</h3>
          <p>{description || "No description is available yet. Reimporting or enriching the catalog can fill this in later."}</p>
        </section>

        {href ? (
          <a className="swipe-source-link-v34" href={href} target="_blank" rel="noreferrer">
            <ExternalLink size={17} />
            {sourceLinkLabel(game)}
          </a>
        ) : (
          <p className="swipe-detail-fallback-v34">No source or store link is available for this import yet.</p>
        )}

        <div className="swipe-modal-actions-v34">
          <ActionButton label="Skip" action="skipped" busy={savingAction === "skipped"} disabled={Boolean(savingAction)} onClick={onAction} icon={<SkipForward size={18} />} />
          <ActionButton label="Like" action="liked" busy={savingAction === "liked"} disabled={Boolean(savingAction)} onClick={onAction} icon={<Heart size={18} />} />
          <ActionButton label="Wishlist" action="saved" busy={savingAction === "saved"} disabled={Boolean(savingAction)} onClick={onAction} icon={<Sparkles size={18} />} />
          <ActionButton label="Played" action="played" busy={savingAction === "played"} disabled={Boolean(savingAction)} onClick={onAction} icon={<CheckCircle2 size={18} />} />
        </div>
      </section>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="swipe-detail-block-v34">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ChipSection({ title, values, fallback }: { title: string; values: string[]; fallback: string }) {
  return (
    <section className="swipe-detail-section-v34">
      <h3>{title}</h3>
      {values.length ? (
        <div className="swipe-detail-chip-row-v34">
          {values.map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
      ) : (
        <p className="swipe-detail-fallback-v34">{fallback}</p>
      )}
    </section>
  );
}

function StatePanel({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="swipe-state-v34">
      <div className="swipe-state-icon-v34">{icon}</div>
      <h2>{title}</h2>
      <p>{body}</p>
      {actionLabel && onAction ? (
        <button className="swipe-refresh-v34" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Layers3, Star } from "lucide-react";
import ReviewActions from "@/components/ReviewActions";
import { gameStatusLabel, normalizeGameStatus } from "@/lib/gameStatus";
import { displayStars, gamePath } from "@/lib/social";

type ShelfProps = {
  logs: any[];
  reviews: any[];
  lists: any[];
  editable?: boolean;
  listsHref?: string;
};

const shelfLimit = 6;

export default function ProfileStatusShelves({ logs, reviews, lists, editable = false, listsHref }: ShelfProps) {
  const statusGroups = {
    playing: logs.filter((log) => normalizeGameStatus(log.status) === "playing"),
    want: logs.filter((log) => normalizeGameStatus(log.status) === "want_to_play"),
    wishlist: logs.filter((log) => normalizeGameStatus(log.status) === "wishlist"),
    completed: logs.filter((log) => ["played", "completed"].includes(normalizeGameStatus(log.status) ?? "")),
    dropped: logs.filter((log) => normalizeGameStatus(log.status) === "dropped"),
  };
  const recentlyReviewed = reviews
    .filter((review) => String(review.review ?? review.body ?? "").trim())
    .sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime());
  const topRated = reviews
    .filter((review) => review.rating !== null && review.rating !== undefined)
    .sort((a, b) => Number(b.rating) - Number(a.rating) || new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime());

  return (
    <div className="profile-shelves-v39">
      <GameShelf title="Currently Playing" eyebrow="In progress" items={statusGroups.playing} empty="Nothing in progress right now." />
      <GameShelf title="Want to Play" eyebrow="Up next" items={statusGroups.want} empty="No games queued yet." />
      <GameShelf title="Wishlist" eyebrow="Saved for later" items={statusGroups.wishlist} empty="No wishlist games yet." />
      <GameShelf title="Completed" eyebrow="Finished journeys" items={statusGroups.completed} empty="No completed games yet." />
      <GameShelf title="Dropped" eyebrow="Not for me" items={statusGroups.dropped} empty="No dropped games." />
      <ReviewShelf title="Recently Reviewed" eyebrow="Latest takes" items={recentlyReviewed} editable={editable} empty="No written reviews yet." />
      <GameShelf title="Top Rated" eyebrow="Personal hall of fame" items={topRated} showRating empty="No rated games yet." />
      <ListShelf lists={lists} href={listsHref} editable={editable} />
    </div>
  );
}

function ShelfFrame({ id, eyebrow, title, count, children, expanded, onToggle, canExpand, actionHref, actionLabel }: {
  id: string;
  eyebrow: string;
  title: string;
  count: number;
  children: React.ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
  canExpand?: boolean;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="profile-shelf-v39" id={id}>
      <header className="profile-shelf-head-v39">
        <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><span>{count} {count === 1 ? "item" : "items"}</span></div>
        {actionHref ? <Link className="profile-view-all-v39" href={actionHref}>{actionLabel ?? "View all"}<ChevronRight size={15} /></Link> : canExpand ? (
          <button className="profile-view-all-v39" onClick={onToggle}>{expanded ? "Show less" : "View all"}<ChevronRight size={15} /></button>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function GameShelf({ title, eyebrow, items, empty, showRating = false }: { title: string; eyebrow: string; items: any[]; empty: string; showRating?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, shelfLimit);
  return (
    <ShelfFrame id={`shelf-${title.toLowerCase().replace(/\s+/g, "-")}`} eyebrow={eyebrow} title={title} count={items.length} expanded={expanded} onToggle={() => setExpanded((value) => !value)} canExpand={items.length > shelfLimit}>
      {visible.length ? <div className="profile-game-shelf-v39">{visible.map((item) => <GameTile key={`${title}:${item.id}`} item={item} showRating={showRating} />)}</div> : <div className="profile-shelf-empty-v39">{empty}</div>}
    </ShelfFrame>
  );
}

function GameTile({ item, showRating }: { item: any; showRating?: boolean }) {
  const game = item.games;
  if (!game) return null;
  const year = game.release_year ?? (game.release_date ? new Date(game.release_date).getFullYear() : null);
  return (
    <Link className="profile-game-tile-v39" href={gamePath(game)}>
      <span className="profile-game-cover-v39">{game.cover_url ? <img src={game.cover_url} alt={`${game.title} cover art`} /> : <b>GL</b>}</span>
      <span className="profile-game-copy-v39">
        <strong>{game.title}</strong>
        <small>{showRating ? <><Star size={12} /> {displayStars(item.rating)}</> : `${year ?? "TBA"}${game.platforms?.[0] ? ` · ${game.platforms[0]}` : ""}`}</small>
        {!showRating && item.status ? <em>{gameStatusLabel(item.status)}</em> : null}
      </span>
    </Link>
  );
}

function ReviewShelf({ title, eyebrow, items, editable, empty }: { title: string; eyebrow: string; items: any[]; editable: boolean; empty: string }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, shelfLimit);
  return (
    <ShelfFrame id="shelf-recently-reviewed" eyebrow={eyebrow} title={title} count={items.length} expanded={expanded} onToggle={() => setExpanded((value) => !value)} canExpand={items.length > shelfLimit}>
      {visible.length ? <div className="profile-review-grid-v39">{visible.map((review) => {
        const text = String(review.review ?? review.body ?? "");
        return (
          <article className="profile-review-card-v39" key={review.id}>
            {review.games ? <Link className="profile-review-cover-v39" href={gamePath(review.games)}>{review.games.cover_url ? <img src={review.games.cover_url} alt="" /> : <b>GL</b>}</Link> : null}
            <div><Link href={review.games ? gamePath(review.games) : "#"}><strong>{review.games?.title ?? "Unknown game"}</strong></Link><small>{displayStars(review.rating)}</small><p>{text}</p>
              {editable && review.log_id ? <ReviewActions reviewId={review.log_id} initialReview={text} initialRating={review.rating} /> : null}
            </div>
          </article>
        );
      })}</div> : <div className="profile-shelf-empty-v39">{empty}</div>}
    </ShelfFrame>
  );
}

function ListShelf({ lists, href, editable }: { lists: any[]; href?: string; editable: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? lists : lists.slice(0, shelfLimit);
  return (
    <ShelfFrame id="shelf-lists" eyebrow="Curated collections" title="Lists" count={lists.length} actionHref={href} actionLabel={editable ? "Manage" : "View all"} expanded={expanded} onToggle={() => setExpanded((value) => !value)} canExpand={!href && lists.length > shelfLimit}>
      {visible.length ? <div className="profile-list-grid-v39">{visible.map((list) => {
        const items = [...(list.list_items ?? [])].sort((a: any, b: any) => Number(a.position ?? 9999) - Number(b.position ?? 9999));
        const cover = items.find((item: any) => item.games?.cover_url)?.games;
        return <Link className="profile-list-tile-v39" href={`/l/${list.id}`} key={list.id}><span>{cover?.cover_url ? <img src={cover.cover_url} alt="" /> : <Layers3 size={20} />}</span><span><strong>{list.title}</strong><small>{editable && list.is_public === false ? "Private · " : ""}{items.length} {items.length === 1 ? "game" : "games"}</small></span><ChevronRight size={17} /></Link>;
      })}</div> : <div className="profile-shelf-empty-v39">{editable ? "Create a list to start curating your library." : "No public lists yet."}</div>}
    </ShelfFrame>
  );
}

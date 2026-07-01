"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Globe2, Lock, Pencil, Trash2 } from "lucide-react";
import { gamePath } from "@/lib/social";
import GameCoverArt from "@/components/GameCoverArt";

type ListItem = {
  id: string;
  position?: number | null;
  created_at?: string | null;
  games?: any;
};

type ManagedList = {
  id: string;
  title: string;
  description?: string | null;
  is_public?: boolean | null;
  list_items?: ListItem[] | null;
};

function orderedItems(items: ListItem[] | null | undefined) {
  return [...(items ?? [])].sort((a, b) => (
    Number(a.position ?? 9999) - Number(b.position ?? 9999)
    || new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
  ));
}

export default function ListManager({ list }: { list: ManagedList }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description ?? "");
  const [isPublic, setIsPublic] = useState(list.is_public !== false);
  const [items, setItems] = useState(() => orderedItems(list.list_items));
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setTitle(list.title);
    setDescription(list.description ?? "");
    setIsPublic(list.is_public !== false);
    setItems(orderedItems(list.list_items));
  }, [list]);

  async function saveList() {
    setBusy("save");
    setMessage("");
    try {
      const response = await fetch("/api/social/lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: list.id, title, description, is_public: isPublic }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update list.");
      setEditing(false);
      setMessage("List updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update list.");
    } finally {
      setBusy("");
    }
  }

  async function deleteList() {
    if (!window.confirm(`Delete “${list.title}”? This cannot be undone.`)) return;
    setBusy("delete");
    setMessage("");
    try {
      const response = await fetch(`/api/social/lists?listId=${encodeURIComponent(list.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not delete list.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete list.");
      setBusy("");
    }
  }

  async function removeItem(itemId: string) {
    setBusy(`remove:${itemId}`);
    setMessage("");
    try {
      const response = await fetch(`/api/social/lists?listId=${encodeURIComponent(list.id)}&itemId=${encodeURIComponent(itemId)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not remove that game.");
      setItems((current) => current.filter((item) => item.id !== itemId));
      setMessage("Game removed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove that game.");
    } finally {
      setBusy("");
    }
  }

  async function moveItem(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= items.length) return;
    const previous = items;
    const reordered = [...items];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    setItems(reordered);
    setBusy("reorder");
    setMessage("");
    try {
      const response = await fetch("/api/social/lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "reorder", listId: list.id, itemIds: reordered.map((item) => item.id) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not reorder list.");
      setMessage("Order saved.");
      router.refresh();
    } catch (error) {
      setItems(previous);
      setMessage(error instanceof Error ? error.message : "Could not reorder list.");
    } finally {
      setBusy("");
    }
  }

  const coverGame = items.find((item) => item.games?.cover_url)?.games ?? items[0]?.games;

  return (
    <article className="social-card-v35 list-manager-v37">
      <div className="list-manager-head-v37">
        <div className="list-cover-v37">
          {coverGame ? <GameCoverArt src={coverGame.cover_url} title={coverGame.title} genre={coverGame.genre} compact decorative /> : <span>{list.title.slice(0, 2).toUpperCase()}</span>}
        </div>
        <div className="list-manager-copy-v37">
          <div className="list-title-row-v37">
            <div>
              <div className="tag-row">
                <span className="tag">{isPublic ? <Globe2 size={13} /> : <Lock size={13} />}{isPublic ? "Public" : "Private"}</span>
                <span className="tag">{items.length} {items.length === 1 ? "game" : "games"}</span>
              </div>
              <h2>{list.title}</h2>
              <p className="muted">{list.description || "No description yet."}</p>
            </div>
            <div className="list-owner-actions-v37">
              <Link className="secondary" href={`/l/${list.id}`}><ExternalLink size={15} /> Open</Link>
              <button className="secondary" onClick={() => setEditing((current) => !current)} disabled={Boolean(busy)}><Pencil size={15} /> Edit</button>
              <button className="danger" onClick={deleteList} disabled={Boolean(busy)}><Trash2 size={15} /> {busy === "delete" ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="list-edit-panel-v37">
          <label><span>Title</span><input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label>
          <label><span>Description</span><textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} /></label>
          <label className="list-privacy-toggle-v37">
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
            <span><strong>{isPublic ? "Public list" : "Private list"}</strong><small>{isPublic ? "Shareable and shown on your profile." : "Visible only to you."}</small></span>
          </label>
          <div className="list-owner-actions-v37">
            <button className="primary" onClick={saveList} disabled={busy === "save" || !title.trim()}>{busy === "save" ? "Saving..." : "Save changes"}</button>
            <button className="secondary" onClick={() => setEditing(false)} disabled={busy === "save"}>Cancel</button>
          </div>
        </div>
      ) : null}

      <div className="list-item-editor-v37">
        {items.length ? items.map((item, index) => item.games ? (
          <div className="list-item-row-v37" key={item.id}>
            <span className="list-rank-v37">{index + 1}</span>
            <Link className="list-item-cover-v37" href={gamePath(item.games)}>
              <GameCoverArt src={item.games.cover_url} title={item.games.title} genre={item.games.genre} compact decorative />
            </Link>
            <div className="list-item-copy-v37"><strong>{item.games.title}</strong><small>{item.games.release_year ?? "Release TBA"}</small></div>
            <div className="list-reorder-actions-v37">
              <button aria-label={`Move ${item.games.title} up`} onClick={() => moveItem(index, -1)} disabled={Boolean(busy) || index === 0}><ArrowUp size={16} /></button>
              <button aria-label={`Move ${item.games.title} down`} onClick={() => moveItem(index, 1)} disabled={Boolean(busy) || index === items.length - 1}><ArrowDown size={16} /></button>
              <button className="danger" aria-label={`Remove ${item.games.title}`} onClick={() => removeItem(item.id)} disabled={Boolean(busy)}>{busy === `remove:${item.id}` ? "..." : <Trash2 size={16} />}</button>
            </div>
          </div>
        ) : null) : (
          <div className="list-empty-v37"><strong>This list is waiting for its first game.</strong><p className="muted">Open any game page and choose “Add to List.”</p></div>
        )}
      </div>
      {message ? <p className="list-message-v37" role="status">{message}</p> : null}
    </article>
  );
}

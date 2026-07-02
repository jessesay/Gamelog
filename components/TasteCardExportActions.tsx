"use client";

import { useState } from "react";
import { Clipboard, Download, Link2, Loader2, Share2 } from "lucide-react";
import { track } from "@vercel/analytics";

type Action = "download" | "copy" | "share" | "";

export default function TasteCardExportActions({ targetId, username, shareUrl, analyticsSurface = "taste_card" }: { targetId: string; username: string; shareUrl: string; analyticsSurface?: "taste_card" | "play_next" }) {
  const [busy, setBusy] = useState<Action>("");
  const [message, setMessage] = useState("");

  async function renderImage() {
    const node = document.getElementById(targetId);
    if (!node) throw new Error("Taste Card is not ready yet.");
    if (document.fonts?.ready) await document.fonts.ready;
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(node, {
      backgroundColor: "#090c14",
      cacheBust: true,
      pixelRatio: 2,
      skipFonts: true,
      imagePlaceholder: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23151b29'/%3E%3C/svg%3E",
    });
    if (!blob) throw new Error("Could not render this Taste Card.");
    return blob;
  }

  function absoluteUrl() { return new URL(shareUrl, window.location.origin).toString(); }

  async function copyLink(fallbackMessage = "Link copied.") {
    const url = absoluteUrl();
    try { await navigator.clipboard.writeText(url); }
    catch {
      const field = document.createElement("textarea"); field.value = url; field.style.position = "fixed"; field.style.opacity = "0";
      document.body.appendChild(field); field.select(); document.execCommand("copy"); field.remove();
    }
    setMessage(fallbackMessage);
  }

  async function download() {
    setBusy("download"); setMessage("");
    try {
      const blob = await renderImage();
      const href = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = href; anchor.download = `gamelog-${username.replace(/[^a-z0-9_-]/gi, "-")}-${analyticsSurface}.png`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      track("taste_card_download", { surface: analyticsSurface }); setMessage("Taste Card downloaded.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not download the image."); }
    finally { setBusy(""); }
  }

  async function copyImage() {
    setBusy("copy"); setMessage("");
    try {
      if (!("ClipboardItem" in window) || !navigator.clipboard?.write) { await copyLink("Image copy is unavailable here, so the link was copied."); track("taste_card_copy", { surface: analyticsSurface, fallback: "link" }); return; }
      const blob = await renderImage();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      track("taste_card_copy", { surface: analyticsSurface, fallback: "none" }); setMessage("Image copied. Paste it anywhere.");
    } catch { await copyLink("Image copy was blocked, so the link was copied."); track("taste_card_copy", { surface: analyticsSurface, fallback: "link" }); }
    finally { setBusy(""); }
  }

  async function share() {
    setBusy("share"); setMessage("");
    const eventName = analyticsSurface === "play_next" ? "play_next_share" : "taste_card_share";
    try {
      const blob = await renderImage(); const file = new File([blob], `gamelog-${username}.png`, { type: "image/png" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: "My GameLog Taste Card", text: "See what I should play next on GameLog.", url: absoluteUrl(), files: [file] });
        track(eventName, { mode: "native_image" }); setMessage("Shared."); return;
      }
      if (navigator.share) { await navigator.share({ title: "My GameLog Taste Card", text: "See my GameLog picks.", url: absoluteUrl() }); track(eventName, { mode: "native_link" }); return; }
      await copyLink(); track(eventName, { mode: "copy_link" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyLink("Share was unavailable, so the link was copied."); track(eventName, { mode: "copy_link_fallback" });
    } finally { setBusy(""); }
  }

  return <div className="taste-export-actions-v320">
    <button className="primary" onClick={() => void download()} disabled={Boolean(busy)}>{busy === "download" ? <Loader2 className="swipe-spin-v34" size={16} /> : <Download size={16} />}Download Taste Card</button>
    <button className="secondary" onClick={() => void copyImage()} disabled={Boolean(busy)}>{busy === "copy" ? <Loader2 className="swipe-spin-v34" size={16} /> : <Clipboard size={16} />}Copy Image</button>
    <button className="secondary" onClick={() => void share()} disabled={Boolean(busy)}>{busy === "share" ? <Loader2 className="swipe-spin-v34" size={16} /> : <Share2 size={16} />}Share</button>
    <button className="taste-copy-link-v320" onClick={() => void copyLink()} disabled={Boolean(busy)}><Link2 size={14} />Copy link</button>
    {message ? <p role="status">{message}</p> : null}
  </div>;
}

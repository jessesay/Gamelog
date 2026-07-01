"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { track } from "@vercel/analytics";

export default function ShareButton({ title, text, url, label = "Share" }: { title: string; text: string; url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    track("share_button_clicked", { surface: title });
    const absoluteUrl = new URL(url, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Native sharing still works when clipboard permission is unavailable.
    }
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: absoluteUrl });
        return;
      } catch {
        // Desktop browsers and automated contexts can expose Web Share without
        // completing it. Copying the link keeps the action useful everywhere.
      }
    }
  }
  return <button className="secondary viral-share-button-v315" onClick={() => void share()}><Share2 size={16} />{copied ? "Link copied" : label}</button>;
}

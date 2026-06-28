"use client";

import { useState } from "react";
import { Gamepad2 } from "lucide-react";

function toneFor(title: string) {
  return [...title].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 6;
}

function initials(title: string) {
  return title.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "GL";
}

export default function GameCoverArt({ src, title, genre, decorative = false }: { src?: string | null; title: string; genre?: string | null; decorative?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (src && failedSrc !== src) return <img src={src} alt={decorative ? "" : `${title} box art`} draggable={false} onError={() => setFailedSrc(src)} />;

  return (
    <div className={`game-cover-fallback-v311 tone-${toneFor(title)}`} role="img" aria-label={decorative ? undefined : `${title} fallback cover art`} aria-hidden={decorative || undefined}>
      <span className="game-cover-orbit-v311" />
      <Gamepad2 size={24} />
      <strong>{initials(title)}</strong>
      <div><b>{title}</b><small>{genre || "GameLog catalog"}</small></div>
    </div>
  );
}

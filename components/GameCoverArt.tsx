"use client";

import { useState } from "react";
import { Gamepad2 } from "lucide-react";

function toneFor(title: string) {
  return [...title].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 6;
}

function initials(title: string) {
  return title.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "GL";
}

export default function GameCoverArt({ src, title, genre, platforms, decorative = false, compact = false }: { src?: string | null; title: string; genre?: string | null; platforms?: string[] | null; decorative?: boolean; compact?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [landscapeSrc, setLandscapeSrc] = useState<string | null>(null);
  if (src && failedSrc !== src) {
    const isLandscape = landscapeSrc === src;
    return <span className={`game-cover-image-frame-v312 ${isLandscape ? "is-landscape" : ""} ${compact ? "is-compact" : ""}`}>
      {isLandscape ? <img className="game-cover-image-backdrop-v312" src={src} alt="" aria-hidden="true" /> : null}
      <img
        className="game-cover-image-main-v312"
        src={src}
        alt={decorative ? "" : `${title} box art`}
        draggable={false}
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth > image.naturalHeight * 1.12) setLandscapeSrc(src);
        }}
        onError={() => setFailedSrc(src)}
      />
    </span>;
  }

  return (
    <div className={`game-cover-fallback-v311 tone-${toneFor(title)} ${compact ? "is-compact" : ""}`} role="img" aria-label={decorative ? undefined : `${title} fallback cover art`} aria-hidden={decorative || undefined}>
      <span className="game-cover-orbit-v311" />
      <Gamepad2 size={24} />
      <strong>{initials(title)}</strong>
      <div><b>{title}</b><small>{genre || platforms?.slice(0, 2).join(" · ") || "GameLog catalog"}</small></div>
    </div>
  );
}

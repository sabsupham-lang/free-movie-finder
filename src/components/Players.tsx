"use client";

import { useState } from "react";
import { IconPlay } from "./Icons";

// Players load nothing from third parties until the viewer presses play.
// That keeps pages fast and avoids YouTube or Archive cookies on page view.

export function TrailerPlayer({ youtubeKey, title }: { youtubeKey: string; title: string }) {
  const [active, setActive] = useState(false);
  return (
    <div className="player">
      {active ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeKey)}?autoplay=1&rel=0`}
          title={`Trailer: ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" className="player-facade" onClick={() => setActive(true)}>
          <span className="play">
            <IconPlay size={28} />
          </span>
          <span>Play trailer for {title}</span>
          <small>Loads the official trailer from YouTube</small>
        </button>
      )}
    </div>
  );
}

type Source = { kind: "archive"; id: string } | { kind: "commons"; url: string; mime: string };

export function PublicDomainPlayer({ title, sources, poster }: { title: string; sources: Source[]; poster: string | null }) {
  const [active, setActive] = useState<Source | null>(null);
  if (!sources.length) return null;
  return (
    <div>
      <div className="player">
        {active?.kind === "archive" && (
          <iframe src={`https://archive.org/embed/${encodeURIComponent(active.id)}`} title={`${title} (Internet Archive player)`} allow="fullscreen" />
        )}
        {active?.kind === "commons" && (
          <video controls autoPlay preload="metadata" aria-label={title}>
            <source src={active.url} type={active.mime} />
            Your browser cannot play this video format. Use the Wikimedia Commons link below instead.
          </video>
        )}
        {!active && (
          <button
            type="button"
            className="player-facade"
            onClick={() => setActive(sources[0])}
            style={poster ? { backgroundImage: `url("${poster}")` } : undefined}
          >
            <span className="play">
              <IconPlay size={28} />
            </span>
            <span>Watch {title} free</span>
            <small>Plays from the {sources[0].kind === "archive" ? "Internet Archive" : "Wikimedia Commons"}</small>
          </button>
        )}
      </div>
      {sources.length > 1 && (
        <p className="source-note" style={{ marginTop: 8 }}>
          Copy not playing well?{" "}
          {sources.map((s) => (
            <button key={s.kind} type="button" className="btn btn-small" style={{ marginRight: 6 }} onClick={() => setActive(s)} aria-pressed={active?.kind === s.kind}>
              Play from {s.kind === "archive" ? "Internet Archive" : "Wikimedia Commons"}
            </button>
          ))}
        </p>
      )}
    </div>
  );
}

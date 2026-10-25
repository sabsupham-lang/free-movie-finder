"use client";

import Link from "next/link";
import { useState } from "react";
import { Poster } from "@/components/MovieCard";
import { useMovieList, type ListName } from "@/lib/storage";

const TABS: { name: ListName; label: string }[] = [
  { name: "watchlist", label: "Watchlist" },
  { name: "favorites", label: "Favorites" },
];

export default function ListsPage() {
  const [tab, setTab] = useState<ListName>("watchlist");
  const [confirmClear, setConfirmClear] = useState(false);
  const list = useMovieList(tab);

  return (
    <>
      <h1>My lists</h1>
      <p style={{ color: "var(--text-muted)" }}>
        Saved on this device only. No account needed, and nothing is sent to our servers. Clearing your browser data
        removes these lists.
      </p>
      <div className="tabs" role="tablist" aria-label="Lists">
        {TABS.map((t) => (
          <button
            key={t.name}
            type="button"
            role="tab"
            id={`tab-${t.name}`}
            aria-selected={tab === t.name}
            aria-controls="list-panel"
            tabIndex={tab === t.name ? 0 : -1}
            onClick={() => {
              setTab(t.name);
              setConfirmClear(false);
            }}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              const next = TABS[(TABS.findIndex((x) => x.name === tab) + 1) % TABS.length];
              setTab(next.name);
              document.getElementById(`tab-${next.name}`)?.focus();
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="list-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {list.items.length === 0 ? (
          <p>
            Nothing here yet. Open any film and use the {tab === "watchlist" ? "Add to watchlist" : "Add to favorites"} button.{" "}
            <Link href="/browse/free">Find something free to watch</Link>.
          </p>
        ) : (
          <>
            <p className="results-status" aria-live="polite">
              {list.items.length} {list.items.length === 1 ? "film" : "films"}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {list.items.map((m) => (
                <li key={m.id} className="list-item">
                  <Poster movie={m} />
                  <div>
                    <Link href={`/movie/${m.id}`}>
                      <strong>{m.title}</strong>
                    </Link>
                    <div className="source-note">
                      {m.year ?? "Year unknown"}
                      {m.publicDomain ? " · Public domain, free to watch" : ""}
                    </div>
                  </div>
                  <button type="button" className="btn btn-small" onClick={() => list.remove(m.id)}>
                    Remove<span className="visually-hidden"> {m.title}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="actions">
              {confirmClear ? (
                <>
                  <span role="alert">Remove every film from this list?</span>
                  <button type="button" className="btn btn-small" onClick={() => { list.clear(); setConfirmClear(false); }}>
                    Yes, clear it
                  </button>
                  <button type="button" className="btn btn-small" onClick={() => setConfirmClear(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-small" onClick={() => setConfirmClear(true)}>
                  Clear list
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

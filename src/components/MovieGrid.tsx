"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MovieSummary, Page } from "@/lib/types";
import { MovieCard } from "./MovieCard";

type Props = {
  initial: Page<MovieSummary>;
  // Query string for /api/movies without the page number.
  query: string;
  label: string;
};

// Infinite scroll with a real button underneath. The observer clicks
// "Load more" for you as you near the end; keyboard and screen-reader users
// can press it directly, and nothing loads unless one of those happens.
export function MovieGrid({ initial, query, label }: Props) {
  const [items, setItems] = useState(initial.items);
  const [page, setPage] = useState(initial.page);
  const [totalPages, setTotalPages] = useState(initial.totalPages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = page < totalPages;

  useEffect(() => {
    setItems(initial.items);
    setPage(initial.page);
    setTotalPages(initial.totalPages);
    setError(null);
  }, [initial, query]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/movies?${query}&page=${page + 1}`);
      if (!res.ok) throw new Error(String(res.status));
      const next: Page<MovieSummary> = await res.json();
      setItems((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...next.items.filter((m) => !seen.has(m.id))];
      });
      setPage(next.page);
      setTotalPages(next.totalPages);
    } catch {
      setError("Could not load more films. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, query]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || error) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, error]);

  if (!items.length) {
    return <p className="results-status">No films match. Try removing a filter or searching for something else.</p>;
  }

  return (
    <section aria-label={label}>
      <p className="results-status" aria-live="polite">
        Showing {items.length.toLocaleString()} of {initial.totalResults.toLocaleString()} films
      </p>
      <ul className="grid">
        {items.map((m, i) => (
          <li key={m.id}>
            <MovieCard movie={m} eager={i < 6} />
          </li>
        ))}
      </ul>
      <div ref={sentinel} />
      {error && (
        <p role="alert" className="results-status">
          {error}
        </p>
      )}
      {hasMore && (
        <div className="load-more">
          <button type="button" className="btn" onClick={loadMore} disabled={loading} aria-busy={loading}>
            {loading ? "Loading..." : "Load more films"}
          </button>
        </div>
      )}
    </section>
  );
}

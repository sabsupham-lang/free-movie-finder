"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { MovieSummary } from "./types";

// Watchlist and favorites live only in this browser's localStorage. No
// account, nothing sent to a server. Entries keep a small snapshot of the
// film so the lists page renders without any network calls.
export type ListName = "watchlist" | "favorites";
export type StoredMovie = Pick<MovieSummary, "id" | "title" | "year" | "posterUrl" | "publicDomain"> & { addedAt: string };

const KEY = (name: ListName) => `fmf:${name}:v1`;
const EVENT = "fmf-list-change";
const cache = new Map<string, { raw: string | null; parsed: StoredMovie[] }>();
const EMPTY: StoredMovie[] = [];

export function parseStored(raw: string | null): StoredMovie[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (m): m is StoredMovie => m && typeof m.id === "string" && /^(tmdb-\d+|pd-Q\d+)$/.test(m.id) && typeof m.title === "string",
    );
  } catch {
    return [];
  }
}

function read(name: ListName): StoredMovie[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY(name));
  } catch {
    return EMPTY;
  }
  // useSyncExternalStore needs a stable reference while nothing changed.
  const hit = cache.get(name);
  if (hit && hit.raw === raw) return hit.parsed;
  const parsed = parseStored(raw);
  cache.set(name, { raw, parsed });
  return parsed;
}

function write(name: ListName, items: StoredMovie[]) {
  try {
    localStorage.setItem(KEY(name), JSON.stringify(items));
  } catch {
    // Storage full or blocked (private mode): the list just won't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb); // other tabs
  window.addEventListener(EVENT, cb); // this tab
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function useMovieList(name: ListName) {
  const items = useSyncExternalStore(subscribe, () => read(name), () => EMPTY);
  const has = useCallback((id: string) => items.some((m) => m.id === id), [items]);
  const toggle = useCallback(
    (movie: Omit<StoredMovie, "addedAt">) => {
      const current = read(name);
      write(
        name,
        current.some((m) => m.id === movie.id)
          ? current.filter((m) => m.id !== movie.id)
          : [{ ...movie, addedAt: new Date().toISOString() }, ...current],
      );
    },
    [name],
  );
  const remove = useCallback((id: string) => write(name, read(name).filter((m) => m.id !== id)), [name]);
  const clear = useCallback(() => write(name, []), [name]);
  return { items, has, toggle, remove, clear };
}

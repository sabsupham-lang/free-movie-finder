import { GENRES, LANGUAGES } from "./genres";

export type SearchMode = "title" | "person";
export type SortKey = "default" | "popularity" | "rating" | "newest" | "oldest" | "title";

export type Filters = {
  q: string | null;
  mode: SearchMode;
  genre: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  language: string | null;
  minRating: number | null;
  runtimeMin: number | null;
  runtimeMax: number | null;
  freeOnly: boolean;
  providers: string[]; // "tmdb:8", "pd:archive", "pd:commons", "wd:tubi"
  sort: SortKey;
};

export const EMPTY_FILTERS: Filters = {
  q: null,
  mode: "title",
  genre: null,
  yearFrom: null,
  yearTo: null,
  language: null,
  minRating: null,
  runtimeMin: null,
  runtimeMax: null,
  freeOnly: false,
  providers: [],
  sort: "default",
};

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function getAll(src: ParamSource, key: string): string[] {
  if (src instanceof URLSearchParams) return src.getAll(key);
  const v = src[key];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}
const get = (src: ParamSource, key: string) => getAll(src, key)[0] ?? null;

function int(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

const SORTS: SortKey[] = ["default", "popularity", "rating", "newest", "oldest", "title"];
const PROVIDER_RE = /^(tmdb:\d{1,6}|pd:(archive|commons)|wd:(tubi|kanopy|hoopla))$/;

// Untrusted query-string input in, validated Filters out. Anything that
// does not match an allowed value is dropped rather than passed upstream.
export function parseFilters(src: ParamSource): Filters {
  const q = get(src, "q")?.trim().slice(0, 100) || null;
  const genre = get(src, "genre");
  const language = get(src, "language");
  const sort = get(src, "sort") as SortKey | null;
  let yearFrom = int(get(src, "yearFrom"), 1870, 2100);
  let yearTo = int(get(src, "yearTo"), 1870, 2100);
  if (yearFrom && yearTo && yearFrom > yearTo) [yearFrom, yearTo] = [yearTo, yearFrom];
  const ratingRaw = get(src, "minRating");
  const minRating = ratingRaw ? Math.min(10, Math.max(0, Number(ratingRaw))) || null : null;
  return {
    q,
    mode: get(src, "mode") === "person" ? "person" : "title",
    genre: GENRES.some((g) => g.name === genre) ? genre : null,
    yearFrom,
    yearTo,
    language: LANGUAGES.some((l) => l.code === language) ? language : null,
    minRating,
    runtimeMin: int(get(src, "runtimeMin"), 0, 600),
    runtimeMax: int(get(src, "runtimeMax"), 0, 600),
    freeOnly: get(src, "free") === "1",
    providers: [...new Set(getAll(src, "provider").filter((p) => PROVIDER_RE.test(p)))].slice(0, 10),
    sort: sort && SORTS.includes(sort) ? sort : "default",
  };
}

export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.q && f.mode !== "title") p.set("mode", f.mode);
  if (f.genre) p.set("genre", f.genre);
  if (f.yearFrom) p.set("yearFrom", String(f.yearFrom));
  if (f.yearTo) p.set("yearTo", String(f.yearTo));
  if (f.language) p.set("language", f.language);
  if (f.minRating) p.set("minRating", String(f.minRating));
  if (f.runtimeMin) p.set("runtimeMin", String(f.runtimeMin));
  if (f.runtimeMax) p.set("runtimeMax", String(f.runtimeMax));
  if (f.freeOnly) p.set("free", "1");
  for (const prov of f.providers) p.append("provider", prov);
  if (f.sort !== "default") p.set("sort", f.sort);
  return p;
}

export function activeFilterCount(f: Filters): number {
  return [
    f.genre,
    f.yearFrom,
    f.yearTo,
    f.language,
    f.minRating,
    f.runtimeMin,
    f.runtimeMax,
    f.freeOnly || null,
    f.providers.length || null,
    f.sort !== "default" || null,
  ].filter(Boolean).length;
}

import "server-only";
import { config } from "./config";
import type { Filters } from "./filters";
import { genreIdByName } from "./genres";
import type { Availability, MovieSummary, OfferKind, Page, Person, ProviderOption, WatchOffer } from "./types";

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
export const TMDB_TAG = "tmdb";

export class TmdbError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

// Every TMDB call goes through here so the token never leaves the server and
// responses are cached by Next's data cache (cleared via /api/revalidate).
async function tmdb<T>(path: string, params: Params = {}, revalidate = 3600): Promise<T> {
  if (!config.tmdbToken) throw new TmdbError(401, "TMDB_READ_TOKEN is not set");
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const res = await fetch(`${API}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${config.tmdbToken}`, Accept: "application/json" },
    next: { revalidate, tags: [TMDB_TAG] },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new TmdbError(res.status, `TMDB ${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

export const poster = (path: string | null, size = "w342") => (path ? `${IMG}/${size}${path}` : null);

type TmdbMovie = {
  id: number;
  title: string;
  release_date?: string | null;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  original_language?: string;
};
type TmdbList = { page: number; total_pages: number; total_results: number; results: TmdbMovie[] };

export function toSummary(m: TmdbMovie, isPublicDomain: (tmdbId: number) => boolean): MovieSummary {
  const year = m.release_date ? Number(m.release_date.slice(0, 4)) || null : null;
  return {
    id: `tmdb-${m.id}`,
    title: m.title,
    year,
    posterUrl: poster(m.poster_path),
    // A score from a handful of votes is noise; hide it rather than mislead.
    rating: m.vote_count >= 10 ? { value: Math.round(m.vote_average * 10) / 10, votes: m.vote_count, source: "TMDB users" } : null,
    publicDomain: isPublicDomain(m.id),
  };
}

function toPage(list: TmdbList, pd: (id: number) => boolean, notices: string[] = []): Page<MovieSummary> {
  return {
    items: list.results.map((m) => toSummary(m, pd)),
    page: list.page,
    // TMDB serves at most 500 pages for list endpoints.
    totalPages: Math.min(list.total_pages, 500),
    totalResults: list.total_results,
    notices,
  };
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const SORT_MAP: Record<string, string> = {
  popularity: "popularity.desc",
  rating: "vote_average.desc",
  newest: "primary_release_date.desc",
  oldest: "primary_release_date.asc",
  title: "title.asc",
};

export function discoverParams(category: string, f: Filters, region: string, page: number): Params {
  const p: Params = { include_adult: false, include_video: false, page, sort_by: "popularity.desc" };
  const today = new Date();
  switch (category) {
    case "top-rated":
      Object.assign(p, { sort_by: "vote_average.desc", "vote_count.gte": 1000 });
      break;
    case "recent": {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 6);
      Object.assign(p, { "primary_release_date.gte": isoDate(from), "primary_release_date.lte": isoDate(today), "vote_count.gte": 20 });
      break;
    }
    case "classics":
      Object.assign(p, { "primary_release_date.lte": "1979-12-31", sort_by: "vote_average.desc", "vote_count.gte": 500 });
      break;
    case "family":
      p.with_genres = 10751;
      break;
    case "documentaries":
      p.with_genres = 99;
      break;
    case "free":
      Object.assign(p, { with_watch_monetization_types: "free|ads", watch_region: region });
      break;
  }

  const genreId = f.genre ? genreIdByName(f.genre) : null;
  if (genreId) p.with_genres = p.with_genres ? `${p.with_genres},${genreId}` : genreId;
  if (f.yearFrom) p["primary_release_date.gte"] = `${f.yearFrom}-01-01`;
  if (f.yearTo) p["primary_release_date.lte"] = `${f.yearTo}-12-31`;
  if (f.language) p.with_original_language = f.language;
  if (f.minRating) {
    p["vote_average.gte"] = f.minRating;
    p["vote_count.gte"] = Math.max(Number(p["vote_count.gte"] ?? 0), 50);
  }
  if (f.runtimeMin) p["with_runtime.gte"] = f.runtimeMin;
  if (f.runtimeMax) p["with_runtime.lte"] = f.runtimeMax;
  if (f.freeOnly) Object.assign(p, { with_watch_monetization_types: "free|ads", watch_region: region });
  const providerIds = f.providers.filter((x) => x.startsWith("tmdb:")).map((x) => x.slice(5));
  if (providerIds.length) Object.assign(p, { with_watch_providers: providerIds.join("|"), watch_region: region });
  if (f.sort !== "default" && SORT_MAP[f.sort]) {
    p.sort_by = SORT_MAP[f.sort];
    // Sorting by score without a vote floor surfaces 1-vote 10/10 titles.
    if (f.sort === "rating") p["vote_count.gte"] = Math.max(Number(p["vote_count.gte"] ?? 0), 200);
  }
  return p;
}

export async function listCategory(
  category: string,
  f: Filters,
  region: string,
  page: number,
  pd: (id: number) => boolean,
): Promise<Page<MovieSummary>> {
  const filtersActive =
    f.genre || f.yearFrom || f.yearTo || f.language || f.minRating || f.runtimeMin || f.runtimeMax || f.freeOnly || f.providers.length || f.sort !== "default";
  if (category === "trending" && !filtersActive) {
    return toPage(await tmdb<TmdbList>("/trending/movie/week", { page }, 1800), pd);
  }
  const notices = category === "trending" ? ["Weekly trending can't be combined with filters, so these are popular films that match them."] : [];
  return toPage(await tmdb<TmdbList>("/discover/movie", discoverParams(category, f, region, page)), pd, notices);
}

// Title search. TMDB's search endpoint only supports a year filter, so the
// other filters are applied to each page of matches.
export async function searchTitles(f: Filters, page: number, pd: (id: number) => boolean): Promise<Page<MovieSummary>> {
  const list = await tmdb<TmdbList>("/search/movie", {
    query: f.q ?? "",
    page,
    include_adult: false,
    primary_release_year: f.yearFrom && f.yearFrom === f.yearTo ? f.yearFrom : undefined,
  });
  const genreId = f.genre ? genreIdByName(f.genre) : null;
  const results = list.results.filter((m) => {
    const year = m.release_date ? Number(m.release_date.slice(0, 4)) : null;
    if (f.yearFrom && (!year || year < f.yearFrom)) return false;
    if (f.yearTo && (!year || year > f.yearTo)) return false;
    if (genreId && !m.genre_ids?.includes(genreId)) return false;
    if (f.language && m.original_language !== f.language) return false;
    if (f.minRating && (m.vote_count < 10 || m.vote_average < f.minRating)) return false;
    return true;
  });
  const notices: string[] = [];
  if (f.runtimeMin || f.runtimeMax || f.freeOnly || f.providers.length || f.sort !== "default")
    notices.push("Runtime, free-to-watch, service and sort filters work when browsing or searching by person. Title search ignores them.");
  return { ...toPage({ ...list, results }, pd, notices), totalResults: list.total_results };
}

type TmdbPerson = { id: number; name: string; known_for_department: string; popularity: number };

// Person search: find the best-matching person, then list their films with
// discover, which supports every filter.
export async function searchPerson(
  f: Filters,
  region: string,
  page: number,
  pd: (id: number) => boolean,
): Promise<Page<MovieSummary> & { person: { id: number; name: string; department: string } | null; alternatives: { id: number; name: string }[] }> {
  const people = await tmdb<{ results: TmdbPerson[] }>("/search/person", { query: f.q ?? "", include_adult: false });
  const [top, ...rest] = people.results;
  if (!top) return { items: [], page: 1, totalPages: 1, totalResults: 0, notices: [], person: null, alternatives: [] };
  const params = discoverParams("search", f, region, page);
  params.with_people = top.id;
  if (f.sort === "default") params.sort_by = "popularity.desc";
  const list = await tmdb<TmdbList>("/discover/movie", params);
  return {
    ...toPage(list, pd),
    person: { id: top.id, name: top.name, department: top.known_for_department },
    alternatives: rest.slice(0, 4).map((p) => ({ id: p.id, name: p.name })),
  };
}

type ProviderEntry = { provider_id: number; provider_name: string; logo_path: string | null; display_priority: number };
type RegionProviders = { link?: string; flatrate?: ProviderEntry[]; free?: ProviderEntry[]; ads?: ProviderEntry[]; rent?: ProviderEntry[]; buy?: ProviderEntry[] };

// Notes for providers whose access rules are worth spelling out.
function providerNote(name: string): string | undefined {
  if (/kanopy|hoopla/i.test(name)) return "Free with a participating library card";
  return undefined;
}

export function mapAvailability(region: string, entry: RegionProviders | undefined): Availability {
  if (!entry) return { region, status: "none", source: "JustWatch via TMDB", link: null, offers: [] };
  const kinds: [keyof RegionProviders, OfferKind][] = [
    ["free", "free"],
    ["ads", "ads"],
    ["flatrate", "subscription"],
    ["rent", "rent"],
    ["buy", "buy"],
  ];
  const offers: WatchOffer[] = [];
  for (const [key, kind] of kinds) {
    const list = (entry[key] as ProviderEntry[] | undefined) ?? [];
    for (const p of [...list].sort((a, b) => a.display_priority - b.display_priority)) {
      offers.push({ kind, providerId: `tmdb:${p.provider_id}`, providerName: p.provider_name, logoUrl: poster(p.logo_path, "w92"), note: providerNote(p.provider_name) });
    }
  }
  return { region, status: offers.length ? "known" : "none", source: "JustWatch via TMDB", link: entry.link ?? null, offers };
}

export type TmdbDetail = {
  id: number;
  title: string;
  original_title: string;
  tagline: string | null;
  overview: string | null;
  release_date: string | null;
  runtime: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  spoken_languages: { iso_639_1: string; english_name: string }[];
  original_language: string;
  production_countries: { iso_3166_1: string; name: string }[];
  imdb_id: string | null;
  credits: { cast: { id: number; name: string; character: string; order: number }[]; crew: { id: number; name: string; job: string }[] };
  videos: { results: { key: string; site: string; type: string; official: boolean; name: string; published_at: string }[] };
  "watch/providers": { results: Record<string, RegionProviders> };
};

export async function getDetail(id: number): Promise<TmdbDetail | null> {
  try {
    // Availability changes more often than credits, so a shorter cache.
    return await tmdb<TmdbDetail>(`/movie/${id}`, { append_to_response: "credits,videos,watch/providers" }, 6 * 3600);
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) return null;
    throw err;
  }
}

export function pickTrailer(videos: TmdbDetail["videos"]["results"]): { youtubeKey: string; name: string } | null {
  const yt = videos.filter((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));
  yt.sort((a, b) => Number(b.official) - Number(a.official) || Number(b.type === "Trailer") - Number(a.type === "Trailer") || a.published_at.localeCompare(b.published_at));
  return yt[0] ? { youtubeKey: yt[0].key, name: yt[0].name } : null;
}

export function credits(d: TmdbDetail): { directors: Person[]; cast: Person[] } {
  return {
    directors: d.credits.crew.filter((c) => c.job === "Director").map((c) => ({ id: c.id, name: c.name, role: "Director" })),
    cast: [...d.credits.cast].sort((a, b) => a.order - b.order).slice(0, 15).map((c) => ({ id: c.id, name: c.name, role: c.character || undefined })),
  };
}

export async function listProviders(region: string): Promise<ProviderOption[]> {
  const data = await tmdb<{ results: (ProviderEntry & { display_priorities?: Record<string, number> })[] }>(
    "/watch/providers/movie",
    { watch_region: region },
    24 * 3600,
  );
  return data.results
    .map((p) => ({ p, prio: p.display_priorities?.[region] ?? p.display_priority }))
    .sort((a, b) => a.prio - b.prio)
    .slice(0, 40)
    .map(({ p }) => ({ id: `tmdb:${p.provider_id}`, name: p.provider_name, logoUrl: poster(p.logo_path, "w92") }));
}

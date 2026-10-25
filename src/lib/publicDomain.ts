import type { Filters } from "./filters";
import type { CategorySlug } from "./categories";
import type { MovieDetail, MovieSummary, Page, PublicDomainCopy, WatchOffer } from "./types";

// Shape of data/public-domain.json (written by scripts/refresh-public-domain.mjs).
export type PdFilm = {
  id: string; // "pd-Q123" (Wikidata catalog) or "ia-<identifier>" (Archive library)
  wikidataId: string | null;
  title: string;
  year: number | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  imdbId: string | null;
  tmdbId: number | null;
  directors: string[];
  cast: string[];
  genres: string[];
  tags: string[];
  languages: { code: string | null; name: string }[];
  countries: string[];
  shortDescription: string | null;
  synopsis: string | null;
  synopsisSource: string | null;
  poster: { url: string; source: string } | null;
  rating: { value: number; outOf: number; votes: number; source: string } | null;
  popularity: number;
  archive: { identifier: string; downloads: number; avgRating: number | null; numReviews: number; alternates: number } | null;
  commonsVideo: { file: string; url: string; mime: string; durationSeconds: number | null } | null;
  rights: {
    status: "public-domain" | "creative-commons";
    jurisdiction: string;
    basis: string; // plain-language reason shown on the film page
    reason?: "age" | "us-gov" | "prelinger" | "uploader-pd" | "cc"; // Archive library only
    license?: string; // Creative Commons license URL
  };
  // Archive library only: which shelf the film is browsed under.
  shelf?: "classic" | "vintage" | "government" | "open";
};

export type PdCatalog = {
  schemaVersion: number;
  generatedAt: string;
  stats: Record<string, number>;
  films: PdFilm[];
};

export const RIGHTS_NOTE =
  "Listed as public domain in the United States on Wikidata. Copyright terms differ by country, so check the rules where you live.";

const COUNTRY_NOTE = " Rules differ by country, so check the rules where you live.";

export function rightsNote(f: PdFilm): string {
  if (f.wikidataId) return RIGHTS_NOTE;
  const takedown = " If you hold rights to this film, use the contact on the Terms page and we will remove it.";
  return f.rights.basis + COUNTRY_NOTE + takedown;
}

export function freeLabel(f: PdFilm): string {
  if (f.rights.status === "creative-commons") return "Free · Creative Commons";
  if (f.rights.reason === "us-gov") return "Free · US government film";
  return "Free · Public domain";
}

function freeHeading(f: PdFilm): string {
  if (f.rights.status === "creative-commons") return "Free: Creative Commons";
  if (f.rights.reason === "us-gov") return "Free: US government film";
  return "Free: public domain in the US";
}

export function pdToSummary(f: PdFilm): MovieSummary {
  return {
    id: f.id,
    title: f.title,
    year: f.year,
    posterUrl: f.poster?.url ?? null,
    rating: f.rating ? { value: f.rating.value, votes: f.rating.votes, source: f.rating.source } : null,
    publicDomain: true,
    freeLabel: freeLabel(f),
  };
}

export function pdCopy(f: PdFilm): PublicDomainCopy {
  return {
    archiveId: f.archive?.identifier ?? null,
    archiveDownloads: f.archive?.downloads ?? null,
    commonsVideo: f.commonsVideo ? { url: f.commonsVideo.url, file: f.commonsVideo.file, mime: f.commonsVideo.mime } : null,
    rightsNote: rightsNote(f),
    heading: freeHeading(f),
  };
}

export function pdOffers(f: PdFilm): WatchOffer[] {
  const offers: WatchOffer[] = [];
  const note = `${f.rights.status === "creative-commons" ? "Creative Commons" : "Public domain"}, no account needed`;
  if (f.archive) offers.push({ kind: "free", providerId: "pd:archive", providerName: "Internet Archive", logoUrl: null, note });
  if (f.commonsVideo) offers.push({ kind: "free", providerId: "pd:commons", providerName: "Wikimedia Commons", logoUrl: null, note });
  return offers;
}

export function pdToDetail(f: PdFilm, region: string): MovieDetail {
  return {
    ...pdToSummary(f),
    originalTitle: null,
    tagline: null,
    synopsis: f.synopsis ?? f.shortDescription,
    synopsisSource: f.synopsis ? f.synopsisSource : f.shortDescription ? (f.wikidataId ? "Wikidata description" : "Internet Archive") : null,
    releaseDate: f.releaseDate,
    runtimeMinutes: f.runtimeMinutes,
    genres: f.genres,
    languages: f.languages,
    countries: f.countries,
    directors: f.directors.map((name) => ({ name, role: "Director" })),
    cast: f.cast.map((name) => ({ name })),
    backdropUrl: null,
    trailer: null,
    availability: {
      region,
      status: "unknown",
      source: null,
      link: null,
      offers: [],
    },
    publicDomainCopy: pdCopy(f),
    externalIds: { imdb: f.imdbId, tmdb: f.tmdbId, wikidata: f.wikidataId },
    metadataSource: f.wikidataId ? "Wikidata and Internet Archive" : "the Internet Archive (uploader-provided)",
  };
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function matchesFilters(f: PdFilm, flt: Filters): boolean {
  if (flt.q) {
    const needle = norm(flt.q);
    const hay = flt.mode === "person" ? [...f.directors, ...f.cast] : [f.title];
    if (!hay.some((h) => norm(h).includes(needle))) return false;
  }
  if (flt.genre && !f.genres.includes(flt.genre)) return false;
  if (flt.yearFrom && (f.year === null || f.year < flt.yearFrom)) return false;
  if (flt.yearTo && (f.year === null || f.year > flt.yearTo)) return false;
  if (flt.language && !f.languages.some((l) => l.code === flt.language)) return false;
  if (flt.minRating && (!f.rating || f.rating.value < flt.minRating)) return false;
  if (flt.runtimeMin && (f.runtimeMinutes === null || f.runtimeMinutes < flt.runtimeMin)) return false;
  if (flt.runtimeMax && (f.runtimeMinutes === null || f.runtimeMinutes > flt.runtimeMax)) return false;
  const pdProviders = flt.providers.filter((p) => p.startsWith("pd:"));
  if (pdProviders.length) {
    const has = (p: string) => (p === "pd:archive" ? Boolean(f.archive) : Boolean(f.commonsVideo));
    if (!pdProviders.some(has)) return false;
  }
  return true;
}

type Sorter = (a: PdFilm, b: PdFilm) => number;
const byPopularity: Sorter = (a, b) => b.popularity - a.popularity;
const byRating: Sorter = (a, b) => (b.rating?.value ?? -1) - (a.rating?.value ?? -1) || byPopularity(a, b);
const byNewest: Sorter = (a, b) => (b.year ?? 0) - (a.year ?? 0) || byPopularity(a, b);
const byOldest: Sorter = (a, b) => (a.year ?? 9999) - (b.year ?? 9999) || byPopularity(a, b);
const byTitle: Sorter = (a, b) => a.title.localeCompare(b.title);

// How each category behaves when only the public-domain catalog is
// available. Notices say plainly when a category is an approximation.
// Feature films and cartoons, not ads, training reels or government footage.
const isMovieShelf = (f: PdFilm) => !f.shelf || f.shelf === "classic" || f.shelf === "open";

const CATEGORY_RULES: Record<CategorySlug, { filter?: (f: PdFilm) => boolean; sort: Sorter; notice?: string }> = {
  "public-domain": { filter: isMovieShelf, sort: byPopularity },
  vintage: { filter: (f) => f.shelf === "vintage", sort: byPopularity },
  government: { filter: (f) => f.shelf === "government", sort: byPopularity },
  free: { filter: isMovieShelf, sort: byPopularity },
  popular: { filter: isMovieShelf, sort: byPopularity, notice: "Ranked by Internet Archive views." },
  trending: { filter: isMovieShelf, sort: byPopularity, notice: "Weekly trends need a TMDB key. Showing the most viewed public-domain films instead." },
  "top-rated": { filter: (f) => isMovieShelf(f) && f.rating !== null, sort: byRating, notice: "Ranked by Internet Archive user reviews (films with 3 or more reviews)." },
  recent: { filter: isMovieShelf, sort: byNewest, notice: "New releases need a TMDB key. Showing the newest films in the public-domain catalog." },
  classics: { filter: (f) => isMovieShelf(f) && (f.year ?? 9999) < 1980, sort: byPopularity },
  family: { filter: (f) => isMovieShelf(f) && (f.genres.includes("Family") || f.genres.includes("Animation")), sort: byPopularity },
  documentaries: { filter: (f) => f.genres.includes("Documentary"), sort: byPopularity },
};

const SORTERS: Record<string, Sorter> = {
  popularity: byPopularity,
  rating: byRating,
  newest: byNewest,
  oldest: byOldest,
  title: byTitle,
};

export function queryPublicDomain(
  films: PdFilm[],
  opts: { category: CategorySlug | "search"; filters: Filters; page: number; pageSize?: number },
): Page<MovieSummary> {
  const pageSize = opts.pageSize ?? 24;
  const rule = opts.category === "search" ? { sort: byPopularity } : CATEGORY_RULES[opts.category];
  const sorter = SORTERS[opts.filters.sort] ?? rule.sort;
  const matched = films.filter((f) => (!("filter" in rule) || !rule.filter || rule.filter(f)) && matchesFilters(f, opts.filters));
  matched.sort(sorter);
  const totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
  const page = Math.min(Math.max(1, opts.page), totalPages);
  return {
    items: matched.slice((page - 1) * pageSize, page * pageSize).map(pdToSummary),
    page,
    totalPages,
    totalResults: matched.length,
    notices: "notice" in rule && rule.notice ? [rule.notice] : [],
  };
}

export function indexByTmdbId(films: PdFilm[]): Map<number, PdFilm> {
  const map = new Map<number, PdFilm>();
  for (const f of films) if (f.tmdbId) map.set(f.tmdbId, f);
  return map;
}

import "server-only";
import rawCatalog from "../../data/public-domain.json";
import { hasTmdb } from "./config";
import type { CategorySlug } from "./categories";
import type { Filters } from "./filters";
import { indexByTmdbId, pdOffers, pdToDetail, queryPublicDomain, type PdCatalog, type PdFilm } from "./publicDomain";
import * as tmdb from "./tmdb";
import type { MovieDetail, MovieSummary, Page, ProviderOption } from "./types";

export const pdCatalog = rawCatalog as unknown as PdCatalog;
const pdById = new Map(pdCatalog.films.map((f) => [f.id, f]));
const pdByTmdb = indexByTmdbId(pdCatalog.films);
const isPd = (tmdbId: number) => pdByTmdb.has(tmdbId);

export const DEMO_NOTICE =
  "Demo mode: no TMDB key is configured, so only the public-domain catalog is shown. See the README to enable the full catalog.";

export type ListResult = Page<MovieSummary> & {
  source: "tmdb" | "public-domain";
  person?: { id: number; name: string; department: string } | null;
  alternatives?: { id: number; name: string }[];
};

function local(category: CategorySlug | "search", filters: Filters, page: number, extra: string[] = []): ListResult {
  const res = queryPublicDomain(pdCatalog.films, { category, filters, page });
  return { ...res, notices: [...extra, ...res.notices], source: "public-domain" };
}

// One entry point for every list in the app: categories, search, filters.
export async function listMovies(category: CategorySlug | "search", filters: Filters, region: string, page: number): Promise<ListResult> {
  const onlyPdProviders = filters.providers.length > 0 && filters.providers.every((p) => p.startsWith("pd:"));
  if (category === "public-domain" || onlyPdProviders) return local(category, filters, page);
  if (!hasTmdb()) return local(category, filters, page, [DEMO_NOTICE]);

  try {
    if (category === "search") {
      if (!filters.q) return { items: [], page: 1, totalPages: 1, totalResults: 0, notices: [], source: "tmdb" };
      if (filters.mode === "person") return { ...(await tmdb.searchPerson(filters, region, page, isPd)), source: "tmdb" };
      return { ...(await tmdb.searchTitles(filters, page, isPd)), source: "tmdb" };
    }
    return { ...(await tmdb.listCategory(category, filters, region, page, isPd)), source: "tmdb" };
  } catch (err) {
    console.error("TMDB request failed", err);
    return local(category, filters, page, ["The movie database is not responding right now, so only the public-domain catalog is shown."]);
  }
}

function mergeTmdb(d: tmdb.TmdbDetail, region: string, pd: PdFilm | undefined): MovieDetail {
  const { directors, cast } = tmdb.credits(d);
  const availability = tmdb.mapAvailability(region, d["watch/providers"]?.results?.[region]);
  const base = pd ? pdToDetail(pd, region) : null;
  return {
    ...tmdb.toSummary(d, isPd),
    id: pd ? pd.id : `tmdb-${d.id}`,
    originalTitle: d.original_title !== d.title ? d.original_title : null,
    tagline: d.tagline || null,
    synopsis: d.overview || base?.synopsis || null,
    synopsisSource: d.overview ? "TMDB" : (base?.synopsisSource ?? null),
    releaseDate: d.release_date || null,
    runtimeMinutes: d.runtime || base?.runtimeMinutes || null,
    genres: d.genres.map((g) => g.name),
    languages: d.spoken_languages.map((l) => ({ code: l.iso_639_1, name: l.english_name })),
    countries: d.production_countries.map((c) => c.name),
    directors: directors.length ? directors : (base?.directors ?? []),
    cast: cast.length ? cast : (base?.cast ?? []),
    backdropUrl: tmdb.poster(d.backdrop_path, "w780"),
    trailer: tmdb.pickTrailer(d.videos?.results ?? []),
    availability,
    publicDomainCopy: base?.publicDomainCopy ?? null,
    externalIds: { imdb: d.imdb_id, tmdb: d.id, wikidata: pd?.wikidataId ?? null },
    metadataSource: pd ? "TMDB, Wikidata and Internet Archive" : "TMDB",
  };
}

export async function getMovie(id: string, region: string): Promise<MovieDetail | null> {
  if (id.startsWith("pd-")) {
    const pd = pdById.get(id);
    if (!pd) return null;
    if (pd.tmdbId && hasTmdb()) {
      try {
        const d = await tmdb.getDetail(pd.tmdbId);
        if (d) return mergeTmdb(d, region, pd);
      } catch (err) {
        console.error("TMDB detail failed, using public-domain record", err);
      }
    }
    return pdToDetail(pd, region);
  }
  const m = /^tmdb-(\d{1,9})$/.exec(id);
  if (!m || !hasTmdb()) return null;
  const d = await tmdb.getDetail(Number(m[1]));
  return d ? mergeTmdb(d, region, pdByTmdb.get(d.id)) : null;
}

export async function providerOptions(region: string): Promise<ProviderOption[]> {
  const pd: ProviderOption[] = [
    { id: "pd:archive", name: "Internet Archive (public domain)", logoUrl: null },
    { id: "pd:commons", name: "Wikimedia Commons (public domain)", logoUrl: null },
  ];
  if (!hasTmdb()) return pd;
  try {
    return [...(await tmdb.listProviders(region)), ...pd];
  } catch {
    return pd;
  }
}

export { pdOffers };

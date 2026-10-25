import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, parseFilters } from "@/lib/filters";
import { pdOffers, pdToDetail, queryPublicDomain, type PdFilm } from "@/lib/publicDomain";

function film(overrides: Partial<PdFilm>): PdFilm {
  return {
    id: "pd-Q1",
    wikidataId: "Q1",
    title: "Untitled",
    year: 1930,
    releaseDate: "1930-01-01",
    runtimeMinutes: 90,
    imdbId: null,
    tmdbId: null,
    directors: [],
    cast: [],
    genres: [],
    tags: [],
    languages: [{ code: "en", name: "English" }],
    countries: [],
    shortDescription: null,
    synopsis: null,
    synopsisSource: null,
    poster: null,
    rating: null,
    popularity: 0,
    archive: { identifier: "x", downloads: 0, avgRating: null, numReviews: 0, alternates: 0 },
    commonsVideo: null,
    rights: { status: "public-domain", jurisdiction: "US", basis: "test" },
    ...overrides,
  };
}

const films: PdFilm[] = [
  film({ id: "pd-Q1", title: "The General", year: 1926, directors: ["Buster Keaton"], cast: ["Buster Keaton"], genres: ["Comedy"], popularity: 500, rating: { value: 8.6, outOf: 10, votes: 40, source: "IA" } }),
  film({ id: "pd-Q2", title: "Nosferatu", year: 1922, genres: ["Horror"], languages: [{ code: "de", name: "German" }], popularity: 900, runtimeMinutes: 94 }),
  film({ id: "pd-Q3", title: "Le Voyage dans la Lune", year: 1902, genres: ["Science Fiction"], popularity: 300, runtimeMinutes: 14, archive: null, commonsVideo: { file: "f.webm", url: "u", mime: "video/webm", durationSeconds: 840 } }),
  film({ id: "pd-Q4", title: "Charade", year: 1963, cast: ["Audrey Hepburn", "Cary Grant"], genres: ["Mystery", "Romance"], popularity: 800, rating: { value: 7.2, outOf: 10, votes: 12, source: "IA" } }),
  film({ id: "pd-Q5", title: "Gulliver's Travels", year: 1939, genres: ["Animation", "Family"], popularity: 100 }),
];

const q = (category: Parameters<typeof queryPublicDomain>[1]["category"], params = "", page = 1, pageSize = 24) =>
  queryPublicDomain(films, { category, filters: parseFilters(new URLSearchParams(params)), page, pageSize });

describe("queryPublicDomain", () => {
  it("sorts the public-domain category by views", () => {
    expect(q("public-domain").items.map((m) => m.title)).toEqual(["Nosferatu", "Charade", "The General", "Le Voyage dans la Lune", "Gulliver's Travels"]);
  });

  it("top-rated only includes films with a rating and says where it comes from", () => {
    const r = q("top-rated");
    expect(r.items.map((m) => m.title)).toEqual(["The General", "Charade"]);
    expect(r.notices[0]).toMatch(/Internet Archive/);
  });

  it("is honest that trending is an approximation", () => {
    expect(q("trending").notices[0]).toMatch(/TMDB key/);
  });

  it("filters classics, family and documentaries by year and genre", () => {
    expect(q("classics").items.map((m) => m.id)).toEqual(["pd-Q2", "pd-Q4", "pd-Q1", "pd-Q3", "pd-Q5"]);
    expect(q("family").items.map((m) => m.id)).toEqual(["pd-Q5"]);
    expect(q("documentaries").totalResults).toBe(0);
  });

  it("searches titles ignoring case and accents", () => {
    expect(q("search", "q=voyage").items.map((m) => m.id)).toEqual(["pd-Q3"]);
    expect(q("search", "q=CHARADE").items.map((m) => m.id)).toEqual(["pd-Q4"]);
  });

  it("searches cast and directors in person mode", () => {
    expect(q("search", "q=keaton&mode=person").items.map((m) => m.id)).toEqual(["pd-Q1"]);
    expect(q("search", "q=keaton").totalResults).toBe(0);
  });

  it("applies genre, year, language, rating and runtime filters", () => {
    expect(q("public-domain", "genre=Horror").items.map((m) => m.id)).toEqual(["pd-Q2"]);
    expect(q("public-domain", "yearFrom=1930&yearTo=1970").items.map((m) => m.id)).toEqual(["pd-Q4", "pd-Q5"]);
    expect(q("public-domain", "language=de").items.map((m) => m.id)).toEqual(["pd-Q2"]);
    expect(q("public-domain", "minRating=8").items.map((m) => m.id)).toEqual(["pd-Q1"]);
    expect(q("public-domain", "runtimeMax=60").items.map((m) => m.id)).toEqual(["pd-Q3"]);
  });

  it("filters by public-domain source", () => {
    expect(q("public-domain", "provider=pd:commons").items.map((m) => m.id)).toEqual(["pd-Q3"]);
  });

  it("honors explicit sort", () => {
    expect(q("public-domain", "sort=oldest").items[0].id).toBe("pd-Q3");
    expect(q("public-domain", "sort=title").items[0].title).toBe("Charade");
  });

  it("paginates and clamps out-of-range pages", () => {
    const p2 = q("public-domain", "", 2, 2);
    expect(p2.totalPages).toBe(3);
    expect(p2.items.map((m) => m.id)).toEqual(["pd-Q1", "pd-Q3"]);
    expect(q("public-domain", "", 99, 2).page).toBe(3);
  });
});

describe("public-domain details", () => {
  it("marks streaming availability unknown instead of inventing it", () => {
    const d = pdToDetail(films[0], "GB");
    expect(d.availability).toMatchObject({ region: "GB", status: "unknown", offers: [] });
    expect(d.publicDomainCopy?.rightsNote).toMatch(/United States/);
  });

  it("offers only the verified copies", () => {
    expect(pdOffers(films[2]).map((o) => o.providerId)).toEqual(["pd:commons"]);
    expect(pdOffers(films[0]).map((o) => o.providerId)).toEqual(["pd:archive"]);
  });

  it("uses EMPTY_FILTERS safely", () => {
    expect(queryPublicDomain([], { category: "free", filters: EMPTY_FILTERS, page: 1 })).toMatchObject({ items: [], totalPages: 1 });
  });
});

describe("Archive library shelves and labels", () => {
  const lib: PdFilm[] = [
    film({ id: "ia-a", wikidataId: null, title: "Duck and Cover", shelf: "government", popularity: 9000, rights: { status: "public-domain", jurisdiction: "US", basis: "Made by a US federal agency.", reason: "us-gov" } }),
    film({ id: "ia-b", wikidataId: null, title: "Design for Dreaming", shelf: "vintage", popularity: 8000, rights: { status: "public-domain", jurisdiction: "US", basis: "Prelinger.", reason: "prelinger" } }),
    film({ id: "ia-c", wikidataId: null, title: "Big Buck Bunny", shelf: "open", popularity: 7000, rights: { status: "creative-commons", jurisdiction: "US", basis: "CC.", reason: "cc", license: "https://creativecommons.org/licenses/by/3.0/" } }),
  ];
  const all = [...films, ...lib];

  it("keeps ads and government footage out of the public-domain shelf", () => {
    const ids = queryPublicDomain(all, { category: "public-domain", filters: EMPTY_FILTERS, page: 1 }).items.map((m) => m.id);
    expect(ids).toContain("ia-c");
    expect(ids).not.toContain("ia-a");
    expect(ids).not.toContain("ia-b");
  });

  it("serves the vintage and government shelves", () => {
    expect(queryPublicDomain(all, { category: "vintage", filters: EMPTY_FILTERS, page: 1 }).items.map((m) => m.id)).toEqual(["ia-b"]);
    expect(queryPublicDomain(all, { category: "government", filters: EMPTY_FILTERS, page: 1 }).items.map((m) => m.id)).toEqual(["ia-a"]);
  });

  it("finds Archive films in title search", () => {
    const f = parseFilters(new URLSearchParams({ q: "bunny" }));
    expect(queryPublicDomain(all, { category: "search", filters: f, page: 1 }).items.map((m) => m.id)).toEqual(["ia-c"]);
  });

  it("labels each copy with its actual reason", () => {
    const cc = pdToDetail(lib[2], "US");
    expect(cc.freeLabel).toBe("Free · Creative Commons");
    expect(cc.publicDomainCopy?.heading).toBe("Free: Creative Commons");
    expect(cc.publicDomainCopy?.rightsNote).toContain("CC.");
    expect(pdToDetail(lib[0], "US").publicDomainCopy?.heading).toBe("Free: US government film");
    expect(pdToDetail(films[0], "US").publicDomainCopy?.heading).toBe("Free: public domain in the US");
    expect(pdOffers(lib[2])[0].note).toBe("Creative Commons, no account needed");
  });
});

describe("streaming directory films", () => {
  const tubi = film({
    id: "wd-Q99",
    wikidataId: "Q99",
    title: "Popular Thriller",
    year: 2012,
    archive: null,
    commonsVideo: null,
    shelf: "streaming",
    popularity: 60000,
    rights: { status: "licensed", jurisdiction: "US", basis: "Licensed to the streaming service." },
    streaming: [
      { service: "tubi", name: "Tubi", url: "https://tubitv.com/movies/1", kind: "ads", note: "Free with ads, no subscription", status: "verified" },
      { service: "kanopy", name: "Kanopy", url: "https://www.kanopy.com/product/2", kind: "free", note: "Free with a library card", status: "unchecked" },
    ],
  });
  const all = [...films, tubi];

  it("never claims to play on this site", () => {
    const d = pdToDetail(tubi, "US");
    expect(d.publicDomain).toBe(false);
    expect(d.publicDomainCopy).toBeNull();
    expect(d.freeLabel).toBe("Free on Tubi");
  });

  it("links each service and flags unconfirmed listings", () => {
    const d = pdToDetail(tubi, "US");
    expect(d.availability.status).toBe("known");
    expect(d.availability.offers.map((o) => [o.kind, o.url])).toEqual([
      ["ads", "https://tubitv.com/movies/1"],
      ["free", "https://www.kanopy.com/product/2"],
    ]);
    expect(d.availability.offers[1].note).toContain("not confirmed");
  });

  it("has its own shelf and filter", () => {
    expect(queryPublicDomain(all, { category: "streaming", filters: EMPTY_FILTERS, page: 1 }).items.map((m) => m.id)).toEqual(["wd-Q99"]);
    expect(queryPublicDomain(all, { category: "public-domain", filters: EMPTY_FILTERS, page: 1 }).items.map((m) => m.id)).not.toContain("wd-Q99");
    const f = parseFilters(new URLSearchParams({ provider: "wd:kanopy" }));
    expect(queryPublicDomain(all, { category: "search", filters: f, page: 1 }).items.map((m) => m.id)).toEqual(["wd-Q99"]);
  });
});

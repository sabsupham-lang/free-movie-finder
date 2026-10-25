import { describe, expect, it } from "vitest";
import { parseFilters } from "@/lib/filters";
import { discoverParams, mapAvailability, pickTrailer, toSummary } from "@/lib/tmdb";

const f = (qs = "") => parseFilters(new URLSearchParams(qs));

describe("discoverParams", () => {
  it("asks for free and ad-supported titles in the visitor's region", () => {
    expect(discoverParams("free", f(), "GB", 1)).toMatchObject({ with_watch_monetization_types: "free|ads", watch_region: "GB" });
  });

  it("maps filters onto TMDB discover parameters", () => {
    const p = discoverParams("popular", f("genre=Comedy&yearFrom=1980&yearTo=1989&language=fr&runtimeMax=100&provider=tmdb:8&provider=tmdb:9"), "US", 3);
    expect(p).toMatchObject({
      page: 3,
      with_genres: 35,
      "primary_release_date.gte": "1980-01-01",
      "primary_release_date.lte": "1989-12-31",
      with_original_language: "fr",
      "with_runtime.lte": 100,
      with_watch_providers: "8|9",
      watch_region: "US",
      include_adult: false,
    });
  });

  it("adds a vote floor so a rating filter is meaningful", () => {
    expect(discoverParams("popular", f("minRating=8"), "US", 1)["vote_count.gte"]).toBe(50);
    expect(discoverParams("popular", f("sort=rating"), "US", 1)["vote_count.gte"]).toBe(200);
    expect(discoverParams("top-rated", f("minRating=8"), "US", 1)["vote_count.gte"]).toBe(1000);
  });

  it("combines a category genre with a filter genre", () => {
    expect(discoverParams("family", f("genre=Animation"), "US", 1).with_genres).toBe("10751,16");
  });

  it("ignores public-domain provider ids", () => {
    expect(discoverParams("popular", f("provider=pd:archive"), "US", 1).with_watch_providers).toBeUndefined();
  });
});

describe("mapAvailability", () => {
  it("groups offers by how you pay and adds library notes", () => {
    const a = mapAvailability("US", {
      link: "https://www.themoviedb.org/movie/1/watch?locale=US",
      free: [{ provider_id: 191, provider_name: "Kanopy", logo_path: "/k.png", display_priority: 2 }],
      ads: [{ provider_id: 73, provider_name: "Tubi TV", logo_path: null, display_priority: 1 }],
      buy: [{ provider_id: 2, provider_name: "Apple TV", logo_path: "/a.png", display_priority: 1 }],
    });
    expect(a.status).toBe("known");
    expect(a.offers.map((o) => [o.kind, o.providerName])).toEqual([
      ["free", "Kanopy"],
      ["ads", "Tubi TV"],
      ["buy", "Apple TV"],
    ]);
    expect(a.offers[0].note).toMatch(/library card/);
    expect(a.link).toContain("themoviedb.org");
  });

  it("reports no offers for a region without inventing any", () => {
    expect(mapAvailability("NZ", undefined)).toMatchObject({ status: "none", offers: [] });
  });
});

describe("pickTrailer", () => {
  it("prefers official YouTube trailers", () => {
    const t = pickTrailer([
      { key: "fan", site: "YouTube", type: "Trailer", official: false, name: "Fan cut", published_at: "2020-01-01" },
      { key: "vimeo", site: "Vimeo", type: "Trailer", official: true, name: "Vimeo", published_at: "2020-01-01" },
      { key: "teaser", site: "YouTube", type: "Teaser", official: true, name: "Teaser", published_at: "2019-01-01" },
      { key: "official", site: "YouTube", type: "Trailer", official: true, name: "Official Trailer", published_at: "2020-02-01" },
    ]);
    expect(t?.youtubeKey).toBe("official");
  });

  it("returns null when there is no trailer", () => {
    expect(pickTrailer([])).toBeNull();
  });
});

describe("toSummary", () => {
  it("hides ratings based on too few votes", () => {
    const m = { id: 1, title: "X", release_date: "2001-05-01", poster_path: null, vote_average: 10, vote_count: 2 };
    expect(toSummary(m, () => false)).toMatchObject({ id: "tmdb-1", year: 2001, rating: null, publicDomain: false });
  });
});

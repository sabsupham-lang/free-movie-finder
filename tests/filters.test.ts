import { describe, expect, it } from "vitest";
import { activeFilterCount, EMPTY_FILTERS, filtersToParams, parseFilters } from "@/lib/filters";

describe("parseFilters", () => {
  it("returns empty filters for an empty query", () => {
    expect(parseFilters(new URLSearchParams())).toEqual(EMPTY_FILTERS);
  });

  it("keeps valid values and drops invalid ones", () => {
    const f = parseFilters(
      new URLSearchParams("q=  casablanca &genre=Drama&language=xx&minRating=7.5&free=1&provider=tmdb:8&provider=evil.com&provider=pd:archive&sort=hack"),
    );
    expect(f.q).toBe("casablanca");
    expect(f.genre).toBe("Drama");
    expect(f.language).toBeNull();
    expect(f.minRating).toBe(7.5);
    expect(f.freeOnly).toBe(true);
    expect(f.providers).toEqual(["tmdb:8", "pd:archive"]);
    expect(f.sort).toBe("default");
  });

  it("rejects genres that are not in the list", () => {
    expect(parseFilters({ genre: "<script>" }).genre).toBeNull();
  });

  it("swaps a reversed year range and clamps out-of-range values", () => {
    const f = parseFilters({ yearFrom: "1999", yearTo: "1950", runtimeMax: "99999" });
    expect([f.yearFrom, f.yearTo]).toEqual([1950, 1999]);
    expect(f.runtimeMax).toBe(600);
  });

  it("only accepts person mode explicitly", () => {
    expect(parseFilters({ q: "x", mode: "person" }).mode).toBe("person");
    expect(parseFilters({ q: "x", mode: "anything" }).mode).toBe("title");
  });

  it("caps query length", () => {
    expect(parseFilters({ q: "a".repeat(500) }).q).toHaveLength(100);
  });

  it("round-trips through URL params", () => {
    const original = parseFilters(new URLSearchParams("q=keaton&mode=person&genre=Comedy&yearFrom=1920&yearTo=1930&provider=pd:commons&sort=oldest"));
    expect(parseFilters(filtersToParams(original))).toEqual(original);
  });

  it("counts active filters, not the search text", () => {
    expect(activeFilterCount(parseFilters({ q: "x" }))).toBe(0);
    expect(activeFilterCount(parseFilters({ genre: "Horror", free: "1" }))).toBe(2);
  });
});

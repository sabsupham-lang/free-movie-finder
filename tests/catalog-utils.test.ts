import { describe, expect, it } from "vitest";
import { cleanDescription, normalizeGenres } from "../scripts/catalog-utils.mjs";
import { parseStored } from "@/lib/storage";

describe("normalizeGenres", () => {
  it("maps Wikidata labels onto TMDB genre names and keeps format tags", () => {
    const r = normalizeGenres(["comedy film", "silent film", "romantic comedy", "film noir", "black-and-white film"]);
    expect(r.genres).toEqual(["Comedy", "Crime", "Romance"]);
    expect(r.tags).toEqual(["black-and-white", "silent"]);
  });
});

describe("cleanDescription", () => {
  it("strips HTML, entities and URLs", () => {
    expect(cleanDescription("<p>A <b>great</b> film &amp; more. See https://example.com now please.</p>")).toBe("A great film & more. See now please.");
  });

  it("drops text too short to be useful", () => {
    expect(cleanDescription("ok")).toBeNull();
    expect(cleanDescription(null)).toBeNull();
  });

  it("trims long text at a sentence end", () => {
    const long = "First sentence here. ".repeat(60);
    const out = cleanDescription(long, 100);
    expect(out!.length).toBeLessThanOrEqual(100);
    expect(out!.endsWith(".")).toBe(true);
  });
});

describe("parseStored", () => {
  it("ignores corrupt or tampered storage", () => {
    expect(parseStored("not json")).toEqual([]);
    expect(parseStored('{"a":1}')).toEqual([]);
    expect(parseStored('[{"id":"javascript:alert(1)","title":"x"},{"id":"tmdb-5","title":"Ok","year":1999,"posterUrl":null,"publicDomain":false,"addedAt":"t"}]')).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { classifyArchiveItem, isAdultItem, cleanDescription, normalizeGenres, parseLanguages, parseRuntime, parseYear } from "../scripts/catalog-utils.mjs";
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

describe("archive library helpers", () => {
  it("parses free-text runtimes", () => {
    expect(parseRuntime("01:23:45")).toBe(84);
    expect(parseRuntime("09:30")).toBe(10);
    expect(parseRuntime("83 min")).toBe(83);
    expect(parseRuntime("1h 23m")).toBe(83);
    expect(parseRuntime(["5 minutes"])).toBe(5);
    expect(parseRuntime("unknown")).toBeNull();
    expect(parseRuntime(undefined)).toBeNull();
  });

  it("reads the first plausible year", () => {
    expect(parseYear("1925", null)).toBe(1925);
    expect(parseYear(undefined, "1931-05-02T00:00:00Z")).toBe(1931);
    expect(parseYear("0", "n.d.")).toBeNull();
  });

  it("maps language names and codes", () => {
    expect(parseLanguages(["English", "eng", "fre"])).toEqual([
      { code: "en", name: "English" },
      { code: "fr", name: "French" },
    ]);
  });

  it("only lists items with a stated reason", () => {
    expect(classifyArchiveItem({ collection: ["feature_films"], year: "1925" })).toEqual({ basis: "age", shelf: "classic" });
    expect(classifyArchiveItem({ collection: ["feature_films"], year: "1950" })).toBeNull();
    expect(classifyArchiveItem({ collection: ["FedFlix"], creator: "Department of Defense" })?.basis).toBe("us-gov");
    expect(classifyArchiveItem({ collection: ["FedFlix"], creator: "New Mexico State University" })).toBeNull();
    expect(classifyArchiveItem({ collection: ["prelinger"] })?.shelf).toBe("vintage");
    expect(classifyArchiveItem({ collection: ["feature_films"], licenseurl: "http://creativecommons.org/publicdomain/mark/1.0/" })?.basis).toBe("uploader-pd");
    expect(classifyArchiveItem({ collection: ["short_films"], licenseurl: "http://creativecommons.org/licenses/by/3.0/" })?.basis).toBe("cc");
    // Uploads outside the curated film collections are never listed on a label alone.
    expect(classifyArchiveItem({ collection: ["opensource_movies"], licenseurl: "http://creativecommons.org/licenses/by/3.0/" })).toBeNull();
  });
});

describe("isAdultItem", () => {
  it("leaves out explicit material but keeps ordinary titles", () => {
    expect(isAdultItem({ title: "1940s French stag film" })).toBe(true);
    expect(isAdultItem({ title: "Short", subject: ["Burlesque", "1950s"] })).toBe(true);
    expect(isAdultItem({ title: "Sex Madness" })).toBe(false);
    expect(isAdultItem({ title: "His Girl Friday", subject: "comedy" })).toBe(false);
  });
});

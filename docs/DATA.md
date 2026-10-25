# Data sources and catalog schema

## Sources

| Source | What we take | Key needed | Terms |
| --- | --- | --- | --- |
| TMDB API | Titles, posters, synopses, credits, ratings, trailers (YouTube keys) | Yes, free | Free for non-commercial use, attribution required |
| JustWatch (via TMDB `watch/providers`) | Offers per country: free, ads, flatrate, rent, buy | Same TMDB token | Credit JustWatch where shown |
| Wikidata SPARQL | Public-domain status (P6216 with jurisdiction P1001 = United States), credits, genres, languages, TMDB and IMDb ids, Archive ids (P724), Commons videos (P10), posters (P3383) | No | CC0 |
| Internet Archive advanced search | Is the item live, view counts, user ratings, uploader description | No | Item metadata; the film's status comes from Wikidata |
| Wikimedia Commons API | Is the video file present, direct URL, MIME type, duration | No | Per file license |

We do not scrape any website. Everything above is a documented public API.

## How a film gets into the public-domain catalog

1. Wikidata says it is a film with copyright status "public domain" **and** the statement's jurisdiction is the United States. Films marked public domain with no jurisdiction or another one are left out.
2. It has at least one Internet Archive identifier or Commons video file.
3. The refresh script confirms at least one of those copies is live right now. Archive items that have been withdrawn ("dark") are dropped. When there are several Archive copies, the most viewed one is used.
4. It has an English title on Wikidata.

## Schema: `data/public-domain.json`

TypeScript source of truth: `PdCatalog` and `PdFilm` in `src/lib/publicDomain.ts`. Enforced by `scripts/validate-catalog.mjs`.

```jsonc
{
  "schemaVersion": 1,
  "generatedAt": "2026-10-25T20:00:00.000Z",  // ISO timestamp of the refresh
  "sources": [{ "name": "Wikidata", "url": "...", "license": "CC0" }],
  "stats": { "candidates": 2453, "kept": 2393, "withArchive": 1534, "withCommonsVideo": 1595 },
  "films": [
    {
      "id": "pd-Q166089",            // "pd-" + Wikidata QID, stable and unique
      "wikidataId": "Q166089",
      "title": "Abraham Lincoln",
      "year": 1930,                  // null if unknown
      "releaseDate": "1930-01-01",   // earliest release date on Wikidata, or null
      "runtimeMinutes": 97,          // Wikidata duration, else Commons file length, else null
      "imdbId": "tt0020620",         // or null
      "tmdbId": 130816,              // or null; used to merge with TMDB
      "directors": ["D. W. Griffith"],         // up to 4
      "cast": ["Walter Huston", "Una Merkel"], // up to 12, Wikidata order
      "genres": ["Drama", "History"],          // TMDB genre names (see scripts/catalog-utils.mjs)
      "tags": ["silent", "black-and-white"],   // Wikidata genres that aren't TMDB genres
      "languages": [{ "code": "en", "name": "English" }],  // code is ISO 639-1 or null
      "countries": ["United States"],
      "shortDescription": "1930 film by D. W. Griffith",  // Wikidata description or null
      "synopsis": "A biography of ...",       // cleaned Archive description or null
      "synopsisSource": "Internet Archive item description (written by the uploader)",
      "poster": { "url": "https://...", "source": "Internet Archive thumbnail" },  // or null
      "rating": { "value": 7.1, "outOf": 10, "votes": 16, "source": "Internet Archive user reviews" }, // null under 3 reviews
      "popularity": 817173,          // Archive view count, used for sorting
      "archive": { "identifier": "abraham_lincoln", "downloads": 817173, "avgRating": 3.55, "numReviews": 16, "alternates": 2 },
      "commonsVideo": { "file": "....webm", "url": "https://upload.wikimedia.org/...", "mime": "video/webm", "durationSeconds": 5606 },
      "rights": { "status": "public-domain", "jurisdiction": "US", "basis": "Wikidata copyright status (P6216) ..." }
    }
  ]
}
```

Rules enforced by the validator: unique `pd-Q` ids, sane years, https posters, ratings 0 to 10 with at least 3 votes and a source, at least one playable copy per film, Commons URLs only on upload.wikimedia.org, and at least 500 films (`CATALOG_MIN_FILMS` to change).

## Why there is no SQL database

The only server-side data is this catalog, which is read-only between refreshes and small enough to load into memory. User data (lists, theme) stays on the device. A database would add cost and a backup chore with no gain. If the catalog grows past roughly 50,000 films, move it to SQLite (for example Turso's free tier) with a table per section of the schema above.

## Running a refresh

```bash
CATALOG_CONTACT="https://your-site.example" npm run refresh:catalog
```

```bash
npm run validate:catalog
```

The refresh takes 10 to 20 minutes. It waits between requests, honors `Retry-After` on HTTP 429, and splits any Archive batch the search API rejects. For a quick test run add `-- --limit 50`.

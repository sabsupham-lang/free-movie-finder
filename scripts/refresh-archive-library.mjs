#!/usr/bin/env node
// Builds data/archive-library.json.gz: films on the Internet Archive that can
// be listed and played legally, beyond the Wikidata-verified catalog in
// data/public-domain.json. Every item records why it is allowed:
//
//   age          dated 1930 or earlier in a curated film collection
//                (US copyright has expired for works published before 1931)
//   us-gov       FedFlix films made by US federal agencies (17 U.S.C. 105)
//   prelinger    Prelinger Archives (ads, educational and industrial films)
//   uploader-pd  marked public domain by the uploader, curated film collections only
//   cc           Creative Commons license chosen by the uploader, curated collections only
//
// See scripts/catalog-utils.mjs (classifyArchiveItem) for the exact rules.
// Only the Archive's documented scrape API is used. Takes a few minutes.
//
// Usage: node scripts/refresh-archive-library.mjs [--limit 500]

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  asArray,
  classifyArchiveItem,
  isAdultItem,
  cleanDescription,
  COLLECTION_GENRES,
  CURATED_COLLECTIONS,
  normalizeGenres,
  parseLanguages,
  parseRuntime,
  parseYear,
} from "./catalog-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "archive-library.json.gz");
const PD_CATALOG = path.join(ROOT, "data", "public-domain.json");
const CONTACT = process.env.CATALOG_CONTACT || "set CATALOG_CONTACT";
const UA = `FreeMovieFinder/0.1 (archive library refresh; ${CONTACT})`;
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;
const MIN_ITEMS = Number(process.env.ARCHIVE_MIN_ITEMS ?? 5000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const curated = `collection:(${CURATED_COLLECTIONS.join(" OR ")})`;

// Queries are broad on purpose; classifyArchiveItem decides per item.
const QUERIES = [
  { name: "curated, dated 1930 or earlier", q: `mediatype:movies AND ${curated} AND year:[1870 TO 1930]` },
  { name: "FedFlix", q: "mediatype:movies AND collection:FedFlix" },
  { name: "Prelinger Archives", q: "mediatype:movies AND collection:prelinger" },
  { name: "curated, marked public domain", q: `mediatype:movies AND ${curated} AND licenseurl:*publicdomain*` },
  { name: "curated, Creative Commons", q: `mediatype:movies AND ${curated} AND licenseurl:*creativecommons*` },
];

const FIELDS = [
  "identifier", "title", "year", "date", "creator", "subject", "language", "description",
  "downloads", "avg_rating", "num_reviews", "runtime", "licenseurl", "collection",
];

async function fetchJson(url, attempts = 7) {
  for (let i = 1; ; i++) {
    let retryAfter = 0;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(120_000) });
      if (res.status === 429 || res.status >= 500) {
        retryAfter = Number(res.headers.get("retry-after")) * 1000 || 0;
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.slice(0, 160)}`);
      return await res.json();
    } catch (err) {
      if (i >= attempts) throw err;
      const wait = Math.max(retryAfter, Math.min(2000 * i * i, 90_000));
      console.warn(`  retry ${i} after ${wait}ms: ${err.message}`);
      await sleep(wait);
    }
  }
}

// The scrape API pages with a cursor and allows up to 10,000 rows per call.
async function scrape(q) {
  const items = [];
  let cursor;
  do {
    const params = new URLSearchParams({ q, fields: FIELDS.join(","), count: "10000" });
    if (cursor) params.set("cursor", cursor);
    const json = await fetchJson(`https://archive.org/services/search/v1/scrape?${params}`);
    if (!Array.isArray(json.items)) throw new Error(`Unexpected scrape response: ${JSON.stringify(json).slice(0, 200)}`);
    items.push(...json.items);
    cursor = json.cursor;
    await sleep(500);
  } while (cursor && items.length < LIMIT);
  return items;
}

const BASIS_TEXT = {
  age: "Dated 1930 or earlier on the Internet Archive. Works published in the US before 1931 are in the public domain there.",
  "us-gov": "Made by a US federal agency (FedFlix collection). Works of the US federal government are not protected by copyright in the US.",
  prelinger: "From the Prelinger Archives, which Rick Prelinger released for free public use.",
  "uploader-pd": "Marked as public domain by the person who uploaded it to the Internet Archive.",
  cc: "Shared under a Creative Commons license chosen by the uploader.",
};

function cleanTitle(t) {
  const s = String(asArray(t)[0] ?? "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.length > 140 ? `${s.slice(0, 137).trimEnd()}...` : s;
}

function toRecord(item, rights) {
  const identifier = String(item.identifier);
  const title = cleanTitle(item.title);
  if (!title) return null;
  const collections = asArray(item.collection).map(String);
  const labels = [...asArray(item.subject).flatMap((s) => String(s).split(/[;,]/)), ...collections.map((c) => COLLECTION_GENRES[c]).filter(Boolean)]
    .map((s) => s.trim())
    .filter((s) => s && s.length <= 40);
  const { genres, tags } = normalizeGenres(labels);
  const year = parseYear(item.year, item.date);
  const downloads = Number(item.downloads) || 0;
  const avg = Number(item.avg_rating) || null;
  const reviews = Number(item.num_reviews) || 0;
  const creator = cleanTitle(item.creator);
  const description = cleanDescription(item.description, 400);
  const shelfTag = { vintage: "Prelinger Archives", government: "US government film", open: "Creative Commons" }[rights.shelf];
  return {
    id: `ia-${identifier}`,
    wikidataId: null,
    title,
    year,
    releaseDate: null,
    runtimeMinutes: parseRuntime(item.runtime),
    imdbId: null,
    tmdbId: null,
    directors: [],
    cast: [],
    genres,
    tags: [...new Set([...(shelfTag ? [shelfTag] : []), ...tags.slice(0, 5)])],
    languages: parseLanguages(item.language),
    countries: [],
    shortDescription: creator ? `From ${creator}` : null,
    synopsis: description,
    synopsisSource: description ? "Internet Archive item description (written by the uploader)" : null,
    poster: { url: `https://archive.org/services/img/${encodeURIComponent(identifier)}`, source: "Internet Archive thumbnail" },
    rating: avg && reviews >= 3 ? { value: Math.round(avg * 20) / 10, outOf: 10, votes: reviews, source: "Internet Archive user reviews" } : null,
    popularity: downloads,
    archive: { identifier, downloads, avgRating: avg, numReviews: reviews, alternates: 0 },
    commonsVideo: null,
    rights: {
      status: rights.basis === "cc" ? "creative-commons" : "public-domain",
      jurisdiction: "US",
      basis: BASIS_TEXT[rights.basis],
      reason: rights.basis,
      ...(rights.license ? { license: rights.license } : {}),
    },
    shelf: rights.shelf,
  };
}

async function main() {
  const started = Date.now();
  const pd = JSON.parse(await readFile(PD_CATALOG, "utf8"));
  const alreadyListed = new Set(pd.films.map((f) => f.archive?.identifier).filter(Boolean));

  const seen = new Map();
  for (const { name, q } of QUERIES) {
    const items = await scrape(q);
    let added = 0;
    let adult = 0;
    for (const item of items) {
      if (!item.identifier || seen.has(item.identifier) || alreadyListed.has(item.identifier)) continue;
      if (isAdultItem(item)) {
        adult++;
        continue;
      }
      const rights = classifyArchiveItem(item);
      if (!rights) continue;
      const rec = toRecord(item, rights);
      if (!rec) continue;
      seen.set(item.identifier, rec);
      added++;
    }
    console.log(`${name}: ${items.length} items found, ${added} new kept, ${adult} left out as adult content`);
  }

  const films = [...seen.values()].sort((a, b) => b.popularity - a.popularity || a.title.localeCompare(b.title));
  const byReason = {};
  const byShelf = {};
  for (const f of films) {
    byReason[f.rights.reason] = (byReason[f.rights.reason] ?? 0) + 1;
    byShelf[f.shelf] = (byShelf[f.shelf] ?? 0) + 1;
  }
  if (!Number.isFinite(LIMIT) && films.length < MIN_ITEMS) {
    throw new Error(`Only ${films.length} items; expected at least ${MIN_ITEMS}. Not writing a shrunken library.`);
  }

  const out = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sources: [{ name: "Internet Archive", url: "https://archive.org", license: "Item metadata; rights per item (see rights.reason)" }],
    stats: { kept: films.length, ...Object.fromEntries(Object.entries(byReason).map(([k, v]) => [`reason:${k}`, v])), ...Object.fromEntries(Object.entries(byShelf).map(([k, v]) => [`shelf:${k}`, v])) },
    films,
  };
  await mkdir(path.dirname(OUT), { recursive: true });
  const gz = gzipSync(JSON.stringify(out), { level: 9 });
  await writeFile(OUT, gz);
  console.log(`Wrote ${films.length} films (${(gz.length / 1e6).toFixed(1)} MB gzipped) to ${path.relative(ROOT, OUT)} in ${Math.round((Date.now() - started) / 1000)}s`);
  console.log(JSON.stringify(out.stats));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

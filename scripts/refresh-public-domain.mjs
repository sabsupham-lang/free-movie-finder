#!/usr/bin/env node
// Builds data/public-domain.json from two open sources:
//   1. Wikidata: films whose copyright status is "public domain" with the
//      United States as the applicable jurisdiction, plus their credits.
//   2. Internet Archive: checks each linked item is still live (items get
//      withdrawn) and adds view counts, user ratings and the uploader text.
// Wikimedia Commons video files linked from Wikidata are verified too.
// A film is kept only if at least one verified, playable copy exists.
//
// Usage: node scripts/refresh-public-domain.mjs [--limit 200]
// Set CATALOG_CONTACT to a URL or email so Wikidata can reach you if the
// script misbehaves (their User-Agent policy asks for this).

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeGenres, cleanDescription } from "./catalog-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "public-domain.json");
const CONTACT = process.env.CATALOG_CONTACT || "set CATALOG_CONTACT";
const UA = `FreeMovieFinder/0.1 (catalog refresh; ${CONTACT})`;
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, init = {}, attempts = 7) {
  for (let i = 1; ; i++) {
    let retryAfter = 0;
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": UA, Accept: "application/json", ...init.headers },
        signal: AbortSignal.timeout(90_000),
      });
      if (res.status === 429 || res.status >= 500) {
        retryAfter = Number(res.headers.get("retry-after")) * 1000 || 0;
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.slice(0, 120)}`);
      return await res.json();
    } catch (err) {
      if (i >= attempts) throw err;
      // Honor the server's Retry-After; otherwise back off quadratically.
      const wait = Math.max(retryAfter, Math.min(2000 * i * i, 90_000));
      console.warn(`  retry ${i} after ${wait}ms: ${err.message}`);
      await sleep(wait);
    }
  }
}

async function sparql(query) {
  const body = new URLSearchParams({ query });
  const json = await fetchJson("https://query.wikidata.org/sparql", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/sparql-results+json",
    },
  });
  return json.results.bindings;
}

const qid = (uri) => uri.slice(uri.lastIndexOf("/") + 1);
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const commonsFileName = (uri) => decodeURIComponent(uri.slice(uri.lastIndexOf("/") + 1)).replace(/_/g, " ");

// Step 1: base list of films public domain in the US with a playable source.
async function loadBase() {
  console.log("Wikidata: loading public-domain film list...");
  const rows = await sparql(`
    SELECT ?film ?filmLabel ?filmDescription ?ia ?video ?date ?runtime ?imdb ?tmdb ?poster ?image WHERE {
      ?film wdt:P31/wdt:P279* wd:Q11424 ; p:P6216 ?st .
      ?st ps:P6216 wd:Q19652 ; pq:P1001 wd:Q30 .
      { ?film wdt:P724 ?ia } UNION { ?film wdt:P10 ?video }
      OPTIONAL { ?film wdt:P577 ?date }
      OPTIONAL { ?film wdt:P2047 ?runtime }
      OPTIONAL { ?film wdt:P345 ?imdb }
      OPTIONAL { ?film wdt:P4947 ?tmdb }
      OPTIONAL { ?film wdt:P3383 ?poster }
      OPTIONAL { ?film wdt:P18 ?image }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`);

  const films = new Map();
  for (const r of rows) {
    const id = qid(r.film.value);
    let f = films.get(id);
    if (!f) {
      f = {
        wikidataId: id,
        title: r.filmLabel?.value ?? id,
        description: r.filmDescription?.value ?? null,
        dates: new Set(),
        runtime: null,
        imdbId: null,
        tmdbId: null,
        archiveIds: new Set(),
        videos: new Set(),
        posterFile: null,
        imageFile: null,
      };
      films.set(id, f);
    }
    if (r.ia) f.archiveIds.add(r.ia.value.trim());
    if (r.video) f.videos.add(commonsFileName(r.video.value));
    if (r.date) f.dates.add(r.date.value.slice(0, 10));
    if (r.runtime && !f.runtime) f.runtime = Math.round(Number(r.runtime.value)) || null;
    if (r.imdb && !f.imdbId) f.imdbId = r.imdb.value;
    if (r.tmdb && !f.tmdbId) f.tmdbId = Number(r.tmdb.value) || null;
    if (r.poster && !f.posterFile) f.posterFile = commonsFileName(r.poster.value);
    if (r.image && !f.imageFile) f.imageFile = commonsFileName(r.image.value);
  }
  // Labels that are still bare QIDs mean Wikidata has no English title.
  return [...films.values()].filter((f) => !/^Q\d+$/.test(f.title));
}

// Step 2: credits and attributes, batched with VALUES to keep queries small.
const PROPS = {
  directors: "P57",
  cast: "P161",
  genres: "P136",
  countries: "P495",
};

async function loadAttributes(films) {
  const byId = new Map(films.map((f) => [f.wikidataId, f]));
  for (const f of films) {
    for (const k of Object.keys(PROPS)) f[k] = [];
    f.languages = [];
  }
  const batches = chunk(films.map((f) => f.wikidataId), 200);
  for (const [i, ids] of batches.entries()) {
    console.log(`Wikidata: credits batch ${i + 1}/${batches.length}`);
    const values = ids.map((id) => `wd:${id}`).join(" ");
    for (const [key, prop] of Object.entries(PROPS)) {
      const rows = await sparql(`
        SELECT ?film ?vLabel WHERE {
          VALUES ?film { ${values} }
          ?film wdt:${prop} ?v .
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }`);
      for (const r of rows) {
        const label = r.vLabel?.value;
        const f = byId.get(qid(r.film.value));
        if (f && label && !/^Q\d+$/.test(label) && !f[key].includes(label)) f[key].push(label);
      }
      await sleep(300);
    }
    const langRows = await sparql(`
      SELECT ?film ?vLabel ?code WHERE {
        VALUES ?film { ${values} }
        ?film wdt:P364 ?v .
        OPTIONAL { ?v wdt:P218 ?code }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }`);
    for (const r of langRows) {
      const f = byId.get(qid(r.film.value));
      const name = r.vLabel?.value;
      if (!f || !name || /^Q\d+$/.test(name)) continue;
      if (!f.languages.some((l) => l.name === name)) f.languages.push({ code: r.code?.value ?? null, name });
    }
    await sleep(300);
  }
}

// Step 3: keep only Internet Archive items that are still public and live.
async function verifyArchive(films) {
  const all = [...new Set(films.flatMap((f) => [...f.archiveIds]))];
  const live = new Map();
  const batches = chunk(all, 50);
  // The search API rejects a whole batch if one identifier breaks its query
  // parser, so a failed batch is split in half until the bad one is isolated.
  async function check(ids) {
    const q = `identifier:(${ids.map((id) => `"${id.replace(/["\\]/g, "")}"`).join(" OR ")}) AND mediatype:movies`;
    const params = new URLSearchParams({ q, rows: "100", output: "json" });
    for (const fl of ["identifier", "title", "downloads", "avg_rating", "num_reviews", "description"]) params.append("fl[]", fl);
    const json = await fetchJson(`https://archive.org/advancedsearch.php?${params}`);
    await sleep(250);
    if (json.response?.docs) {
      for (const d of json.response.docs) live.set(d.identifier, d);
    } else if (ids.length > 1) {
      const mid = Math.ceil(ids.length / 2);
      await check(ids.slice(0, mid));
      await check(ids.slice(mid));
    } else {
      console.warn(`  skipped unsearchable identifier: ${ids[0]}`);
    }
  }
  for (const [i, ids] of batches.entries()) {
    if (i % 5 === 0) console.log(`Internet Archive: checking batch ${i + 1}/${batches.length}`);
    await check(ids);
  }
  console.log(`Internet Archive: ${live.size} of ${all.length} linked items are live`);
  for (const f of films) {
    const candidates = [...f.archiveIds].map((id) => live.get(id)).filter(Boolean);
    candidates.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
    const best = candidates[0];
    f.archive = best
      ? {
          identifier: best.identifier,
          downloads: best.downloads ?? 0,
          avgRating: best.avg_rating ? Number(best.avg_rating) : null,
          numReviews: best.num_reviews ? Number(best.num_reviews) : 0,
          alternates: candidates.length - 1,
        }
      : null;
    f.archiveDescription = best ? cleanDescription(best.description) : null;
  }
}

// Step 4: confirm Commons video files exist and get their direct URLs.
async function verifyCommons(films) {
  const names = [...new Set(films.flatMap((f) => [...f.videos]))];
  const found = new Map();
  for (const batch of chunk(names, 25)) {
    const params = new URLSearchParams({
      action: "query",
      prop: "imageinfo",
      iiprop: "url|mime|size",
      format: "json",
      formatversion: "2",
      titles: batch.map((n) => `File:${n}`).join("|"),
    });
    const json = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
    const normalized = new Map((json.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const p of json.query.pages ?? []) {
      const info = p.imageinfo?.[0];
      if (p.missing || !info || !String(info.mime).startsWith("video/")) continue;
      const original = (normalized.get(p.title) ?? p.title).replace(/^File:/, "");
      found.set(original, { file: p.title.replace(/^File:/, ""), url: info.url.split("?")[0], mime: info.mime, durationSeconds: info.duration ? Math.round(info.duration) : null });
    }
    await sleep(1500);
  }
  console.log(`Wikimedia Commons: ${found.size} of ${names.length} linked video files verified`);
  for (const f of films) {
    f.commonsVideo = [...f.videos].map((n) => found.get(n)).find(Boolean) ?? null;
  }
}

const commonsThumb = (file) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, "_"))}?width=342`;

function toRecord(f) {
  const dates = [...f.dates].sort();
  const releaseDate = dates[0] ?? null;
  const { genres, tags } = normalizeGenres(f.genres);
  let poster = null;
  if (f.posterFile) poster = { url: commonsThumb(f.posterFile), source: "Wikimedia Commons (film poster)" };
  else if (f.archive) poster = { url: `https://archive.org/services/img/${f.archive.identifier}`, source: "Internet Archive thumbnail" };
  else if (f.imageFile) poster = { url: commonsThumb(f.imageFile), source: "Wikimedia Commons (image)" };

  const rating =
    f.archive && f.archive.avgRating && f.archive.numReviews >= 3
      ? { value: Math.round(f.archive.avgRating * 20) / 10, outOf: 10, votes: f.archive.numReviews, source: "Internet Archive user reviews" }
      : null;

  return {
    id: `pd-${f.wikidataId}`,
    wikidataId: f.wikidataId,
    title: f.title,
    year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
    releaseDate,
    runtimeMinutes: f.runtime ?? (f.commonsVideo?.durationSeconds ? Math.round(f.commonsVideo.durationSeconds / 60) : null),
    imdbId: f.imdbId,
    tmdbId: f.tmdbId,
    directors: f.directors.slice(0, 4),
    cast: f.cast.slice(0, 12),
    genres,
    tags,
    languages: f.languages,
    countries: f.countries,
    shortDescription: f.description,
    synopsis: f.archiveDescription,
    synopsisSource: f.archiveDescription ? "Internet Archive item description (written by the uploader)" : null,
    poster,
    rating,
    popularity: f.archive?.downloads ?? 0,
    archive: f.archive,
    commonsVideo: f.commonsVideo,
    rights: {
      status: "public-domain",
      jurisdiction: "US",
      basis: "Wikidata copyright status (P6216) with applies-to-jurisdiction United States",
    },
  };
}

async function main() {
  const started = Date.now();
  let films = await loadBase();
  console.log(`Wikidata: ${films.length} candidate films`);
  if (Number.isFinite(LIMIT)) films = films.slice(0, LIMIT);
  await loadAttributes(films);
  await verifyArchive(films);
  await verifyCommons(films);

  const records = films
    .filter((f) => f.archive || f.commonsVideo)
    .map(toRecord)
    .sort((a, b) => b.popularity - a.popularity || a.title.localeCompare(b.title));

  const out = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sources: [
      { name: "Wikidata", url: "https://www.wikidata.org", license: "CC0" },
      { name: "Internet Archive", url: "https://archive.org", license: "Item metadata; rights per item" },
      { name: "Wikimedia Commons", url: "https://commons.wikimedia.org", license: "Per file" },
    ],
    stats: {
      candidates: films.length,
      kept: records.length,
      withArchive: records.filter((r) => r.archive).length,
      withCommonsVideo: records.filter((r) => r.commonsVideo).length,
    },
    films: records,
  };
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));
  console.log(`Wrote ${records.length} films to ${path.relative(ROOT, OUT)} in ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
// Builds data/streaming-directory.json.gz: films that Wikidata links to a
// title page on Tubi (free with ads), Kanopy or Hoopla (free with a
// participating library card). These films do NOT play on this site; each
// record links to the service's own page.
//
// Wikidata is community-maintained and does not track when a title leaves a
// service, so every link is checked. A link counts as "verified" when the
// service returns the title page, "gone" on 404/410 or a redirect away from
// the title, and "unchecked" when the service refuses automated checks.
// Gone links are dropped; unchecked ones are kept and labeled as such.
// With a TMDB token configured, film pages show live JustWatch data instead.
//
// Usage: node scripts/refresh-streaming-directory.mjs [--limit 300] [--no-verify]

import { writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeGenres } from "./catalog-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "streaming-directory.json.gz");
const CONTACT = process.env.CATALOG_CONTACT || "set CATALOG_CONTACT";
const UA = `FreeMovieFinder/0.1 (streaming directory refresh; ${CONTACT})`;
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;
const VERIFY = !process.argv.includes("--no-verify");
const MIN_ITEMS = Number(process.env.STREAMING_MIN_ITEMS ?? 3000);

export const SERVICES = {
  tubi: {
    prop: "P7760",
    name: "Tubi",
    url: (id) => `https://tubitv.com/movies/${encodeURIComponent(id)}`,
    kind: "ads",
    note: "Free with ads, no subscription",
  },
  kanopy: {
    prop: "P7985",
    name: "Kanopy",
    url: (id) => `https://www.kanopy.com/product/${encodeURIComponent(id)}`,
    kind: "free",
    note: "Free with a participating library or university card",
  },
  hoopla: {
    prop: "P5680",
    name: "Hoopla",
    url: (id) => `https://www.hoopladigital.com/title/${encodeURIComponent(id)}`,
    kind: "free",
    note: "Free with a participating library card",
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const qid = (uri) => uri.slice(uri.lastIndexOf("/") + 1);
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const commonsFileName = (uri) => decodeURIComponent(uri.slice(uri.lastIndexOf("/") + 1)).replace(/_/g, " ");
const commonsThumb = (file) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, "_"))}?width=342`;

async function sparql(query, attempts = 6) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch("https://query.wikidata.org/sparql", {
        method: "POST",
        body: new URLSearchParams({ query }),
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/sparql-results+json" },
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()).results.bindings;
    } catch (err) {
      if (i >= attempts) throw err;
      const wait = Math.min(3000 * i * i, 90_000);
      console.warn(`  retry ${i} after ${wait}ms: ${err.message}`);
      await sleep(wait);
    }
  }
}

async function loadBase() {
  const films = new Map();
  for (const [key, svc] of Object.entries(SERVICES)) {
    const rows = await sparql(`
      SELECT ?film ?filmLabel ?filmDescription ?id ?date ?runtime ?imdb ?tmdb ?poster ?links WHERE {
        ?film wdt:${svc.prop} ?id ; wdt:P31/wdt:P279* wd:Q11424 ; wikibase:sitelinks ?links .
        OPTIONAL { ?film wdt:P577 ?date }
        OPTIONAL { ?film wdt:P2047 ?runtime }
        OPTIONAL { ?film wdt:P345 ?imdb }
        OPTIONAL { ?film wdt:P4947 ?tmdb }
        OPTIONAL { ?film wdt:P3383 ?poster }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }`);
    let n = 0;
    for (const r of rows) {
      const id = qid(r.film.value);
      const title = r.filmLabel?.value;
      if (!title || /^Q\d+$/.test(title)) continue;
      let f = films.get(id);
      if (!f) {
        f = { wikidataId: id, title, description: r.filmDescription?.value ?? null, dates: new Set(), runtime: null, imdbId: null, tmdbId: null, posterFile: null, sitelinks: Number(r.links?.value) || 0, services: new Map() };
        films.set(id, f);
      }
      if (!f.services.has(key)) {
        f.services.set(key, r.id.value.trim());
        n++;
      }
      if (r.date) f.dates.add(r.date.value.slice(0, 10));
      if (r.runtime && !f.runtime) f.runtime = Math.round(Number(r.runtime.value)) || null;
      if (r.imdb && !f.imdbId) f.imdbId = r.imdb.value;
      if (r.tmdb && !f.tmdbId) f.tmdbId = Number(r.tmdb.value) || null;
      if (r.poster && !f.posterFile) f.posterFile = commonsFileName(r.poster.value);
    }
    console.log(`Wikidata: ${n} films with a ${svc.name} id`);
    await sleep(1000);
  }
  return [...films.values()];
}

const PROPS = { directors: "P57", cast: "P161", genres: "P136", countries: "P495" };

async function loadAttributes(films) {
  const byId = new Map(films.map((f) => [f.wikidataId, f]));
  for (const f of films) {
    for (const k of Object.keys(PROPS)) f[k] = [];
    f.languages = [];
  }
  const batches = chunk(films.map((f) => f.wikidataId), 250);
  for (const [i, ids] of batches.entries()) {
    if (i % 10 === 0) console.log(`Wikidata: details batch ${i + 1}/${batches.length}`);
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
      await sleep(250);
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
      if (f && name && !/^Q\d+$/.test(name) && !f.languages.some((l) => l.name === name)) f.languages.push({ code: r.code?.value ?? null, name });
    }
    await sleep(250);
  }
}

// One check per link. Returns "verified", "gone" or "unchecked".
async function checkLink(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(20_000),
    });
    res.body?.cancel().catch(() => {});
    if (res.status === 404 || res.status === 410) return "gone";
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location") ?? "";
      const target = new URL(loc, url);
      const original = new URL(url);
      // Same title page under a slightly different path is fine; a bounce
      // to the home page or a search page means the title is gone.
      const keepsId = target.pathname.split("/").filter(Boolean).pop() === original.pathname.split("/").filter(Boolean).pop();
      if (keepsId || target.pathname.includes(original.pathname.split("/").pop())) return "verified";
      return target.pathname === "/" || /search|browse|home|404|not-found/i.test(target.pathname) ? "gone" : "unchecked";
    }
    if (res.status === 200) return "verified";
    return "unchecked"; // 401/403/429/5xx: the service would not tell us
  } catch {
    return "unchecked";
  }
}

async function verifyLinks(films) {
  const jobs = films.flatMap((f) => [...f.services.entries()].map(([key, id]) => ({ f, key, url: SERVICES[key].url(id) })));
  const results = {};
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      job.status = await checkLink(job.url);
      results[job.key] ??= { verified: 0, gone: 0, unchecked: 0 };
      results[job.key][job.status]++;
      if (next % 1000 === 0) console.log(`Links: checked ${next}/${jobs.length}`);
      await sleep(150);
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  for (const job of jobs) (job.f.checks ??= new Map()).set(job.key, job.status);
  console.log(`Links: ${JSON.stringify(results)}`);
  // If a service blocks nearly everything, "gone" answers are unreliable too.
  for (const [key, r] of Object.entries(results)) {
    const total = r.verified + r.gone + r.unchecked;
    if (r.verified < total * 0.05) {
      console.warn(`  ${SERVICES[key].name} refused most checks; keeping its links as unchecked`);
      for (const job of jobs) if (job.key === key) job.f.checks.set(key, "unchecked");
    }
  }
  return results;
}

function toRecord(f) {
  const releaseDate = [...f.dates].sort()[0] ?? null;
  const { genres, tags } = normalizeGenres(f.genres);
  const streaming = [...f.services.entries()]
    .map(([key, id]) => ({ service: key, name: SERVICES[key].name, url: SERVICES[key].url(id), kind: SERVICES[key].kind, note: SERVICES[key].note, status: f.checks?.get(key) ?? "unchecked" }))
    .filter((s) => s.status !== "gone");
  if (!streaming.length) return null;
  return {
    id: `wd-${f.wikidataId}`,
    wikidataId: f.wikidataId,
    title: f.title,
    year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
    releaseDate,
    runtimeMinutes: f.runtime,
    imdbId: f.imdbId,
    tmdbId: f.tmdbId,
    directors: f.directors.slice(0, 4),
    cast: f.cast.slice(0, 8),
    genres,
    tags,
    languages: f.languages,
    countries: f.countries,
    shortDescription: f.description,
    synopsis: null,
    synopsisSource: null,
    poster: f.posterFile ? { url: commonsThumb(f.posterFile), source: "Wikimedia Commons (film poster)" } : null,
    rating: null,
    // Wikipedia language editions about the film: a rough, stable fame signal.
    popularity: f.sitelinks * 1000,
    archive: null,
    commonsVideo: null,
    rights: { status: "licensed", jurisdiction: "US", basis: "Licensed to the streaming service; it plays on the service's own site." },
    shelf: "streaming",
    streaming,
  };
}

async function main() {
  const started = Date.now();
  let films = await loadBase();
  console.log(`Wikidata: ${films.length} films with at least one service id`);
  films.sort((a, b) => b.sitelinks - a.sitelinks);
  if (Number.isFinite(LIMIT)) films = films.slice(0, LIMIT);
  await loadAttributes(films);
  const linkStats = VERIFY ? await verifyLinks(films) : null;
  const records = films.map(toRecord).filter(Boolean);
  if (!Number.isFinite(LIMIT) && records.length < MIN_ITEMS) throw new Error(`Only ${records.length} films; expected at least ${MIN_ITEMS}.`);

  const perService = {};
  for (const r of records) for (const s of r.streaming) perService[s.service] = (perService[s.service] ?? 0) + 1;
  const out = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sources: [{ name: "Wikidata", url: "https://www.wikidata.org", license: "CC0" }],
    stats: { kept: records.length, ...perService, ...(linkStats ? { checks: linkStats } : {}) },
    films: records,
  };
  await mkdir(path.dirname(OUT), { recursive: true });
  const gz = gzipSync(JSON.stringify(out), { level: 9 });
  await writeFile(OUT, gz);
  console.log(`Wrote ${records.length} films (${(gz.length / 1e6).toFixed(1)} MB gzipped) in ${Math.round((Date.now() - started) / 1000)}s`);
  console.log(JSON.stringify(out.stats));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

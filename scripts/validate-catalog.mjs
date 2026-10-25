#!/usr/bin/env node
// Checks data/public-domain.json against the catalog schema before it is
// committed or deployed. Exits non-zero with a list of problems.
// The schema is documented in docs/DATA.md and typed in src/lib/publicDomain.ts.

import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2] ?? path.join(ROOT, "data", "public-domain.json");
const MIN_FILMS = Number(process.env.CATALOG_MIN_FILMS ?? 500);

const errors = [];
const fail = (msg) => errors.length < 50 && errors.push(msg);
const isStr = (v) => typeof v === "string" && v.length > 0;
const isNullableStr = (v) => v === null || typeof v === "string";
const isNullableNum = (v) => v === null || (typeof v === "number" && Number.isFinite(v));
const isHttps = (v) => typeof v === "string" && v.startsWith("https://");

const data = JSON.parse(await readFile(file, "utf8"));
if (data.schemaVersion !== 1) fail(`schemaVersion must be 1, got ${data.schemaVersion}`);
if (Number.isNaN(Date.parse(data.generatedAt))) fail("generatedAt is not a valid date");
if (!Array.isArray(data.films)) fail("films must be an array");

const ids = new Set();
for (const [i, f] of (data.films ?? []).entries()) {
  const at = `films[${i}] (${f?.title ?? "?"})`;
  if (!/^pd-Q\d+$/.test(f.id)) fail(`${at}: bad id ${f.id}`);
  if (ids.has(f.id)) fail(`${at}: duplicate id`);
  ids.add(f.id);
  if (!isStr(f.title)) fail(`${at}: missing title`);
  if (f.year !== null && !(Number.isInteger(f.year) && f.year >= 1870 && f.year <= new Date().getFullYear())) fail(`${at}: bad year ${f.year}`);
  if (!isNullableNum(f.runtimeMinutes)) fail(`${at}: bad runtime`);
  if (f.tmdbId !== null && !Number.isInteger(f.tmdbId)) fail(`${at}: bad tmdbId`);
  if (f.imdbId !== null && !/^tt\d+$/.test(f.imdbId)) fail(`${at}: bad imdbId`);
  for (const k of ["directors", "cast", "genres", "tags", "countries", "languages"]) if (!Array.isArray(f[k])) fail(`${at}: ${k} must be an array`);
  if (!isNullableStr(f.synopsis) || !isNullableStr(f.shortDescription)) fail(`${at}: bad text fields`);
  if (f.poster && !isHttps(f.poster.url)) fail(`${at}: poster must be https`);
  if (f.rating && !(f.rating.value >= 0 && f.rating.value <= 10 && f.rating.votes >= 3 && isStr(f.rating.source))) fail(`${at}: rating out of range or unsourced`);
  if (!f.archive && !f.commonsVideo) fail(`${at}: no verified playable copy`);
  if (f.archive && !isStr(f.archive.identifier)) fail(`${at}: archive identifier missing`);
  if (f.commonsVideo && !f.commonsVideo.url?.startsWith("https://upload.wikimedia.org/")) fail(`${at}: commons url must be on upload.wikimedia.org`);
  if (f.rights?.status !== "public-domain" || f.rights?.jurisdiction !== "US") fail(`${at}: rights must be public-domain / US`);
}
if ((data.films?.length ?? 0) < MIN_FILMS) fail(`only ${data.films?.length} films; expected at least ${MIN_FILMS} (set CATALOG_MIN_FILMS to change)`);

// The optional Internet Archive library (data/archive-library.json.gz).
const libFile = path.join(ROOT, "data", "archive-library.json.gz");
let lib = null;
try {
  lib = JSON.parse(gunzipSync(await readFile(libFile)).toString("utf8"));
} catch (err) {
  if (err.code !== "ENOENT") fail(`archive library unreadable: ${err.message}`);
}
if (lib) {
  const REASONS = ["age", "us-gov", "prelinger", "uploader-pd", "cc"];
  const SHELVES = ["classic", "vintage", "government", "open"];
  const pdArchiveIds = new Set((data.films ?? []).map((f) => f.archive?.identifier).filter(Boolean));
  if (lib.schemaVersion !== 1) fail(`library schemaVersion must be 1, got ${lib.schemaVersion}`);
  if (!Array.isArray(lib.films)) fail("library films must be an array");
  const libIds = new Set();
  for (const [i, f] of (lib.films ?? []).entries()) {
    const at = `library[${i}] (${f?.title ?? "?"})`;
    if (!/^ia-\S+$/.test(f.id) || f.id !== `ia-${f.archive?.identifier}`) fail(`${at}: id must be ia-<archive identifier>`);
    if (libIds.has(f.id)) fail(`${at}: duplicate id`);
    libIds.add(f.id);
    if (pdArchiveIds.has(f.archive?.identifier)) fail(`${at}: already in the Wikidata catalog`);
    if (!isStr(f.title)) fail(`${at}: missing title`);
    if (f.year !== null && !(Number.isInteger(f.year) && f.year >= 1870 && f.year <= new Date().getFullYear())) fail(`${at}: bad year ${f.year}`);
    if (!REASONS.includes(f.rights?.reason) || !isStr(f.rights?.basis)) fail(`${at}: missing rights reason`);
    if (f.rights?.reason === "cc" && !String(f.rights.license).includes("creativecommons.org/licenses/")) fail(`${at}: cc without license`);
    if (!SHELVES.includes(f.shelf)) fail(`${at}: bad shelf ${f.shelf}`);
    if (f.poster && !isHttps(f.poster.url)) fail(`${at}: poster must be https`);
    if (f.rating && !(f.rating.value >= 0 && f.rating.value <= 10 && f.rating.votes >= 3)) fail(`${at}: bad rating`);
  }
  const minLib = Number(process.env.ARCHIVE_MIN_ITEMS ?? 5000);
  if ((lib.films?.length ?? 0) < minLib) fail(`library has only ${lib.films?.length} films; expected at least ${minLib}`);
}

// The optional streaming directory (data/streaming-directory.json.gz).
let dir = null;
try {
  dir = JSON.parse(gunzipSync(await readFile(path.join(ROOT, "data", "streaming-directory.json.gz"))).toString("utf8"));
} catch (err) {
  if (err.code !== "ENOENT") fail(`streaming directory unreadable: ${err.message}`);
}
if (dir) {
  const HOSTS = { tubi: "https://tubitv.com/", kanopy: "https://www.kanopy.com/", hoopla: "https://www.hoopladigital.com/" };
  const dirIds = new Set();
  for (const [i, f] of (dir.films ?? []).entries()) {
    const at = `directory[${i}] (${f?.title ?? "?"})`;
    if (!/^wd-Q\d+$/.test(f.id) || f.id !== `wd-${f.wikidataId}`) fail(`${at}: bad id`);
    if (dirIds.has(f.id)) fail(`${at}: duplicate id`);
    dirIds.add(f.id);
    if (!isStr(f.title)) fail(`${at}: missing title`);
    if (f.archive || f.commonsVideo) fail(`${at}: directory films must not claim a playable copy`);
    if (f.shelf !== "streaming" || f.rights?.status !== "licensed") fail(`${at}: wrong shelf or rights`);
    if (!Array.isArray(f.streaming) || !f.streaming.length) fail(`${at}: no streaming links`);
    for (const l of f.streaming ?? []) {
      if (!HOSTS[l.service] || !String(l.url).startsWith(HOSTS[l.service])) fail(`${at}: bad ${l.service} link ${l.url}`);
      if (!["verified", "unchecked"].includes(l.status)) fail(`${at}: bad link status ${l.status}`);
    }
  }
}

if (errors.length) {
  console.error(`Catalog invalid (${errors.length}${errors.length === 50 ? "+" : ""} problems):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`Catalog OK: ${data.films.length} films, generated ${data.generatedAt}`);
if (dir) console.log(`Streaming directory OK: ${dir.films.length} films, generated ${dir.generatedAt}`);
if (lib) console.log(`Archive library OK: ${lib.films.length} films, generated ${lib.generatedAt}`);

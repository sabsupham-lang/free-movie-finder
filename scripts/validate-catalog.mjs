#!/usr/bin/env node
// Checks data/public-domain.json against the catalog schema before it is
// committed or deployed. Exits non-zero with a list of problems.
// The schema is documented in docs/DATA.md and typed in src/lib/publicDomain.ts.

import { readFile } from "node:fs/promises";
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

if (errors.length) {
  console.error(`Catalog invalid (${errors.length}${errors.length === 50 ? "+" : ""} problems):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`Catalog OK: ${data.films.length} films, generated ${data.generatedAt}`);

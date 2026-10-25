import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import type { PdCatalog } from "./publicDomain";

// Large generated catalogs are read from disk on first use and kept in
// memory. They are too big to bundle as JSON imports, so next.config.ts adds
// them to every server function's files.
//   data/archive-library.json.gz      scripts/refresh-archive-library.mjs
//   data/streaming-directory.json.gz  scripts/refresh-streaming-directory.mjs
const cache = new Map<string, PdCatalog>();

function load(file: string): PdCatalog {
  const hit = cache.get(file);
  if (hit) return hit;
  let data: PdCatalog;
  try {
    data = JSON.parse(gunzipSync(readFileSync(path.join(process.cwd(), "data", file))).toString("utf8")) as PdCatalog;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") console.error(`Could not read data/${file}`, err);
    data = { schemaVersion: 1, generatedAt: new Date(0).toISOString(), stats: {}, films: [] };
  }
  cache.set(file, data);
  return data;
}

export const archiveLibrary = () => load("archive-library.json.gz");
export const streamingDirectory = () => load("streaming-directory.json.gz");

import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import type { PdCatalog } from "./publicDomain";

// data/archive-library.json.gz (written by scripts/refresh-archive-library.mjs)
// is read on first use and kept in memory. It is too large to bundle as a
// JSON import, so next.config.ts adds it to every server function's files.
let cached: PdCatalog | null = null;

export function archiveLibrary(): PdCatalog {
  if (cached) return cached;
  const file = path.join(process.cwd(), "data", "archive-library.json.gz");
  try {
    cached = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")) as PdCatalog;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") console.error("Could not read the archive library", err);
    cached = { schemaVersion: 1, generatedAt: new Date(0).toISOString(), stats: {}, films: [] };
  }
  return cached;
}

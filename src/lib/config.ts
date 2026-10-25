import "server-only";
import { normalizeRegion } from "./regions";

export const config = {
  tmdbToken: process.env.TMDB_READ_TOKEN?.trim() || null,
  defaultRegion: normalizeRegion(process.env.DEFAULT_REGION, "US"),
  revalidateSecret: process.env.REVALIDATE_SECRET?.trim() || null,
};

export const hasTmdb = () => config.tmdbToken !== null;

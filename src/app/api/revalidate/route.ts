import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";
import { TMDB_TAG } from "@/lib/tmdb";

// POST /api/revalidate with "Authorization: Bearer <REVALIDATE_SECRET>"
// marks every cached TMDB response stale, so the next visitor gets fresh
// availability. Disabled unless REVALIDATE_SECRET is set.
export async function POST(req: NextRequest) {
  const secret = config.revalidateSecret;
  if (!secret) return NextResponse.json({ error: "Revalidation is not configured" }, { status: 404 });
  const given = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  revalidateTag(TMDB_TAG, "max");
  return NextResponse.json({ revalidated: TMDB_TAG, at: new Date().toISOString() });
}

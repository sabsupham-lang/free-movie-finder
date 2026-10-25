import { NextResponse, type NextRequest } from "next/server";
import { listMovies } from "@/lib/catalog";
import { getCategory, type CategorySlug } from "@/lib/categories";
import { config } from "@/lib/config";
import { parseFilters } from "@/lib/filters";
import { normalizeRegion } from "@/lib/regions";

// Paged JSON for infinite scroll. Region is an explicit parameter (not a
// cookie) so identical requests can share a CDN cache entry.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rawCategory = sp.get("category") ?? "popular";
  const category: CategorySlug | "search" | null = rawCategory === "search" ? "search" : (getCategory(rawCategory)?.slug ?? null);
  if (!category) return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  const page = Math.min(500, Math.max(1, Number(sp.get("page")) || 1));
  const region = normalizeRegion(sp.get("region"), config.defaultRegion);
  const result = await listMovies(category, parseFilters(sp), region, page);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
  });
}

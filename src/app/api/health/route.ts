import { NextResponse } from "next/server";
import { libraryStats, pdCatalog } from "@/lib/catalog";
import { hasTmdb } from "@/lib/config";

// Read-only status for uptime checks and the refresh workflow. Reports
// configuration and data age, never secrets.
export async function GET() {
  const ageDays = Math.floor((Date.now() - Date.parse(pdCatalog.generatedAt)) / 86_400_000);
  return NextResponse.json(
    {
      ok: true,
      mode: hasTmdb() ? "full" : "demo",
      publicDomainCatalog: { generatedAt: pdCatalog.generatedAt, ageDays, films: pdCatalog.films.length, stale: ageDays > 14 },
      library: libraryStats(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

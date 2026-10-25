import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Notices } from "@/components/Notice";
import { ThemeSelect } from "@/components/ThemeToggle";
import { config } from "@/lib/config";
import { getRegion } from "@/lib/region-server";
import { normalizeRegion, REGION_CODES, REGION_COOKIE, regionName } from "@/lib/regions";

export const metadata: Metadata = { title: "Settings" };

async function saveRegion(formData: FormData) {
  "use server";
  const region = normalizeRegion(String(formData.get("region") ?? ""), config.defaultRegion);
  (await cookies()).set(REGION_COOKIE, region, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/settings?saved=1");
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const region = await getRegion();
  const saved = (await searchParams).saved === "1";
  const options = [...REGION_CODES].map((code) => ({ code, name: regionName(code) })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <h1>Settings</h1>
      {saved && (
        <div role="status">
          <Notices tone="info" notices={[`Country saved: ${regionName(region)}.`]} />
        </div>
      )}
      <section className="section" aria-labelledby="country">
        <h2 id="country">Your country</h2>
        <p>
          Streaming catalogs differ by country, so free and paid offers are shown for the country you pick. We do not
          detect your location. This choice is stored in a cookie on your device.
        </p>
        <form action={saveRegion} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "1 1 240px" }}>
            <label htmlFor="region">Country</label>
            <select id="region" name="region" defaultValue={region}>
              {options.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            Save country
          </button>
        </form>
        <p className="source-note" style={{ marginTop: 8 }}>
          Public-domain status shown on this site is for the United States. It can differ where you live.
        </p>
      </section>
      <section className="section" aria-labelledby="appearance">
        <h2 id="appearance">Appearance</h2>
        <ThemeSelect />
      </section>
    </>
  );
}

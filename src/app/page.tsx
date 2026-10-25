import Link from "next/link";
import { MovieCard } from "@/components/MovieCard";
import { Notices } from "@/components/Notice";
import { SearchForm } from "@/components/SearchForm";
import { DEMO_NOTICE, listMovies } from "@/lib/catalog";
import { CATEGORIES, type CategorySlug } from "@/lib/categories";
import { hasTmdb } from "@/lib/config";
import { EMPTY_FILTERS } from "@/lib/filters";
import { getRegion } from "@/lib/region-server";
import { regionName } from "@/lib/regions";

const DEMO_ROWS: CategorySlug[] = ["public-domain", "top-rated", "family", "vintage", "government", "documentaries", "recent"];
const DEMO_BLURBS: Partial<Record<CategorySlug, string>> = {
  "public-domain": "The most watched public-domain films on the Internet Archive.",
  "top-rated": "Best reviewed by Internet Archive users (3 or more reviews).",
  family: "Public-domain family films and cartoons.",
  documentaries: "Public-domain documentaries.",
  vintage: "Old ads, classroom and industrial films from the Prelinger Archives.",
  government: "Films by US federal agencies, from the FedFlix collection.",
  recent: "The newest films in the public-domain catalog.",
};

export default async function HomePage() {
  const region = await getRegion();
  const tmdb = hasTmdb();
  // In demo mode free, popular, trending and classics would all repeat the
  // public-domain row, so only rows that show something different appear.
  const shown = tmdb ? CATEGORIES : CATEGORIES.filter((c) => DEMO_ROWS.includes(c.slug));
  const rows = await Promise.all(
    shown.map(async (c) => ({ category: c, result: await listMovies(c.slug, EMPTY_FILTERS, region, 1) })),
  );

  return (
    <>
      <h1>Find a film you can watch for free tonight</h1>
      <p style={{ color: "var(--text-muted)", maxWidth: "60ch" }}>
        Public-domain classics you can play right here, and films on free services in {regionName(region)}, such as
        ad-supported apps and library services. Each film page lists every legal way to watch it.
      </p>
      <SearchForm />
      {!tmdb && <Notices notices={[DEMO_NOTICE]} />}
      {rows.map(({ category, result }) =>
        result.items.length ? (
          <section key={category.slug} className="row" aria-labelledby={`row-${category.slug}`}>
            <div className="row-head">
              <h2 id={`row-${category.slug}`}>{!tmdb && category.slug === "recent" ? "Newest in the catalog" : category.title}</h2>
              <Link href={`/browse/${category.slug}`}>
                See all<span className="visually-hidden"> {category.title}</span>
              </Link>
            </div>
            <p className="row-head">
              <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                {tmdb ? category.blurb : (DEMO_BLURBS[category.slug] ?? category.blurb)}
              </span>
            </p>
            <ul className="row-scroller">
              {result.items.slice(0, 12).map((m, i) => (
                <li key={m.id}>
                  <MovieCard movie={m} eager={i < 3} />
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </>
  );
}

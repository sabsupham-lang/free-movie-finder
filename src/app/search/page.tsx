import type { Metadata } from "next";
import Link from "next/link";
import { FilterForm } from "@/components/FilterForm";
import { MovieGrid } from "@/components/MovieGrid";
import { Notices } from "@/components/Notice";
import { SearchForm } from "@/components/SearchForm";
import { CATEGORIES } from "@/lib/categories";
import { listMovies, providerOptions } from "@/lib/catalog";
import { filtersToParams, parseFilters } from "@/lib/filters";
import { getRegion } from "@/lib/region-server";
import { regionName } from "@/lib/regions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = parseFilters(await searchParams).q;
  return { title: q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage({ searchParams }: Props) {
  const filters = parseFilters(await searchParams);
  const region = await getRegion();

  if (!filters.q) {
    return (
      <>
        <h1>Search</h1>
        <SearchForm autoFocus />
        <h2>Or browse a category</h2>
        <ul className="chips">
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link href={`/browse/${c.slug}`}>{c.title}</Link>
            </li>
          ))}
        </ul>
      </>
    );
  }

  const [result, providers] = await Promise.all([listMovies("search", filters, region, 1), providerOptions(region)]);
  const query = filtersToParams(filters);
  query.set("category", "search");
  query.set("region", region);

  return (
    <>
      <h1>
        Results for <q>{filters.q}</q>
      </h1>
      <SearchForm q={filters.q} mode={filters.mode} />
      {result.person && (
        <p>
          Showing films with {result.person.name}
          {result.person.department ? ` (known for ${result.person.department.toLowerCase()})` : ""}.
          {result.alternatives && result.alternatives.length > 0 && (
            <>
              {" "}
              Did you mean{" "}
              {result.alternatives.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ", "}
                  <Link href={`/search?mode=person&q=${encodeURIComponent(a.name)}`}>{a.name}</Link>
                </span>
              ))}
              ?
            </>
          )}
        </p>
      )}
      {filters.mode === "person" && result.source === "tmdb" && !result.person && <p>No person found with that name.</p>}
      <Notices notices={result.notices} />
      <FilterForm action="/search" filters={filters} providers={providers} regionLabel={regionName(region)} keepSearch />
      <MovieGrid initial={result} query={query.toString()} label="Search results" />
    </>
  );
}

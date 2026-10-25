import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilterForm } from "@/components/FilterForm";
import { MovieGrid } from "@/components/MovieGrid";
import { Notices } from "@/components/Notice";
import { listMovies, providerOptions } from "@/lib/catalog";
import { getCategory } from "@/lib/categories";
import { filtersToParams, parseFilters } from "@/lib/filters";
import { getRegion } from "@/lib/region-server";
import { regionName } from "@/lib/regions";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCategory((await params).category);
  return { title: c?.title ?? "Browse" };
}

export default async function BrowsePage({ params, searchParams }: Props) {
  const category = getCategory((await params).category);
  if (!category) notFound();
  const filters = parseFilters(await searchParams);
  const region = await getRegion();
  const [result, providers] = await Promise.all([listMovies(category.slug, filters, region, 1), providerOptions(region)]);
  const query = filtersToParams(filters);
  query.set("category", category.slug);
  query.set("region", region);

  return (
    <>
      <h1>{category.slug === "free" ? `Free to watch in ${regionName(region)}` : category.title}</h1>
      <p style={{ color: "var(--text-muted)" }}>{category.blurb}</p>
      {category.slug === "free" && result.source === "tmdb" && (
        <Notices
          tone="info"
          notices={[
            "Free services usually show ads and some need a free account or a library card. Offers change often, so the film page links to the current listing.",
          ]}
        />
      )}
      <Notices notices={result.notices} />
      <FilterForm action={`/browse/${category.slug}`} filters={filters} providers={providers} regionLabel={regionName(region)} />
      <MovieGrid initial={result} query={query.toString()} label={`${category.title} films`} />
    </>
  );
}

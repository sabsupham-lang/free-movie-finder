export type CategorySlug =
  | "popular"
  | "top-rated"
  | "trending"
  | "recent"
  | "classics"
  | "family"
  | "documentaries"
  | "free"
  | "public-domain";

export type Category = {
  slug: CategorySlug;
  title: string;
  blurb: string;
};

export const CATEGORIES: Category[] = [
  { slug: "free", title: "Free to watch", blurb: "Films listed as free or free with ads in your country." },
  { slug: "public-domain", title: "Public domain", blurb: "Films out of copyright in the US, playable right here." },
  { slug: "popular", title: "Popular", blurb: "The most popular films on TMDB right now." },
  { slug: "trending", title: "Trending this week", blurb: "Films getting the most attention on TMDB this week." },
  { slug: "top-rated", title: "Highly rated", blurb: "Top TMDB user scores among films with at least 1,000 votes." },
  { slug: "recent", title: "Recent releases", blurb: "Films released in the last six months." },
  { slug: "classics", title: "Classics", blurb: "Well-rated films released before 1980." },
  { slug: "family", title: "Family", blurb: "Films tagged Family on TMDB." },
  { slug: "documentaries", title: "Documentaries", blurb: "Films tagged Documentary on TMDB." },
];

export const getCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug) ?? null;

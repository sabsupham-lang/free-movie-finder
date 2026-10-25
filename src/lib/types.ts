export type Rating = {
  value: number; // on a 0 to 10 scale
  votes: number;
  source: string; // who produced the number, shown next to it
};

export type MovieSummary = {
  id: string; // "tmdb-603" or "pd-Q151599"
  title: string;
  year: number | null;
  posterUrl: string | null;
  rating: Rating | null;
  publicDomain: boolean; // a verified public-domain copy exists
};

export type Person = { name: string; role?: string; id?: number };

export type OfferKind = "free" | "ads" | "subscription" | "rent" | "buy";

export type WatchOffer = {
  kind: OfferKind;
  providerId: string;
  providerName: string;
  logoUrl: string | null;
  note?: string;
};

export type Availability = {
  region: string;
  // known: offers listed for the region. none: source lists nothing there.
  // unknown: no availability source configured (demo mode).
  status: "known" | "none" | "unknown";
  source: string | null;
  link: string | null; // the source's own page listing every offer
  offers: WatchOffer[];
};

export type PublicDomainCopy = {
  archiveId: string | null;
  archiveDownloads: number | null;
  commonsVideo: { url: string; file: string; mime: string } | null;
  rightsNote: string;
};

export type MovieDetail = MovieSummary & {
  originalTitle: string | null;
  tagline: string | null;
  synopsis: string | null;
  synopsisSource: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  genres: string[];
  languages: { code: string | null; name: string }[];
  countries: string[];
  directors: Person[];
  cast: Person[];
  backdropUrl: string | null;
  trailer: { youtubeKey: string; name: string } | null;
  availability: Availability;
  publicDomainCopy: PublicDomainCopy | null;
  externalIds: { imdb: string | null; tmdb: number | null; wikidata: string | null };
  metadataSource: string;
};

export type Page<T> = {
  items: T[];
  page: number;
  totalPages: number;
  totalResults: number;
  notices: string[];
};

export type ProviderOption = { id: string; name: string; logoUrl: string | null };

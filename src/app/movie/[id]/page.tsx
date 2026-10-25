import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { IconExternal } from "@/components/Icons";
import { ListButtons } from "@/components/ListButtons";
import { Poster } from "@/components/MovieCard";
import { PublicDomainPlayer, TrailerPlayer } from "@/components/Players";
import { WatchOptions } from "@/components/WatchOptions";
import { getMovie } from "@/lib/catalog";
import { hasTmdb } from "@/lib/config";
import { getRegion } from "@/lib/region-server";

type Props = { params: Promise<{ id: string }> };

const load = cache(async (id: string) => getMovie(id, await getRegion()));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const movie = await load((await params).id);
  if (!movie) return { title: "Film not found" };
  return {
    title: movie.year ? `${movie.title} (${movie.year})` : movie.title,
    description: movie.synopsis?.slice(0, 160) ?? undefined,
  };
}

function runtime(min: number | null) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  return h ? `${h} h ${min % 60} min` : `${min} min`;
}

export default async function MoviePage({ params }: Props) {
  const { id } = await params;
  if (id.startsWith("tmdb-") && !hasTmdb()) {
    return (
      <>
        <h1>This film needs the full catalog</h1>
        <p>Details for this film come from TMDB, which is not configured on this site. Public-domain films still work.</p>
        <Link href="/browse/public-domain">Browse public-domain films</Link>
      </>
    );
  }
  const movie = await load(id);
  if (!movie) notFound();

  const pd = movie.publicDomainCopy;
  const sources = [
    ...(pd?.archiveId ? [{ kind: "archive" as const, id: pd.archiveId }] : []),
    ...(pd?.commonsVideo ? [{ kind: "commons" as const, url: pd.commonsVideo.url, mime: pd.commonsVideo.mime }] : []),
  ];
  const facts = [
    movie.year ? String(movie.year) : "Year unknown",
    runtime(movie.runtimeMinutes) ?? "Runtime unknown",
    movie.languages.length ? movie.languages.map((l) => l.name).join(", ") : null,
  ].filter(Boolean);

  return (
    <article>
      <div className="detail-hero">
        <Poster movie={movie} eager />
        <div>
          <h1>{movie.title}</h1>
          {movie.originalTitle && <p className="source-note">Original title: {movie.originalTitle}</p>}
          {movie.tagline && <p><em>{movie.tagline}</em></p>}
          <p className="facts">
            {facts.map((f) => (
              <span key={f}>{f}</span>
            ))}
          </p>
          {movie.genres.length > 0 && (
            <ul className="chips" aria-label="Genres">
              {movie.genres.map((g) => (
                <li key={g}>
                  <Link href={`/browse/${pd ? "public-domain" : "popular"}?genre=${encodeURIComponent(g)}`}>{g}</Link>
                </li>
              ))}
            </ul>
          )}
          <p>
            {movie.rating ? (
              <>
                <strong>{movie.rating.value.toFixed(1)}/10</strong>{" "}
                <span className="source-note">
                  from {movie.rating.votes.toLocaleString()} {movie.rating.source}
                </span>
              </>
            ) : (
              <span className="source-note">No rating available from our sources.</span>
            )}
          </p>
          {movie.directors.length > 0 && (
            <p>
              Directed by{" "}
              {movie.directors.map((d, i) => (
                <span key={d.name}>
                  {i > 0 && ", "}
                  <Link href={`/search?mode=person&q=${encodeURIComponent(d.name)}`}>{d.name}</Link>
                </span>
              ))}
            </p>
          )}
          <div className="actions">
            <ListButtons movie={{ id: movie.id, title: movie.title, year: movie.year, posterUrl: movie.posterUrl, publicDomain: movie.publicDomain }} />
          </div>
        </div>
      </div>

      {sources.length > 0 && (
        <section className="section" aria-labelledby="watch-now">
          <h2 id="watch-now">Watch now, free</h2>
          <PublicDomainPlayer title={movie.title} sources={sources} poster={movie.backdropUrl} />
        </section>
      )}

      <section className="section" aria-labelledby="where">
        <h2 id="where">Where to watch</h2>
        <WatchOptions movie={movie} />
      </section>

      <section className="section" aria-labelledby="about-film">
        <h2 id="about-film">Synopsis</h2>
        {movie.synopsis ? (
          <>
            <p className="prose">{movie.synopsis}</p>
            {movie.synopsisSource && <p className="source-note">Source: {movie.synopsisSource}</p>}
          </>
        ) : (
          <p>No synopsis available.</p>
        )}
      </section>

      {movie.trailer && (
        <section className="section" aria-labelledby="trailer">
          <h2 id="trailer">Trailer</h2>
          <TrailerPlayer youtubeKey={movie.trailer.youtubeKey} title={movie.title} />
        </section>
      )}

      {movie.cast.length > 0 && (
        <section className="section" aria-labelledby="cast">
          <h2 id="cast">Cast</h2>
          <ul className="cast-list">
            {movie.cast.map((c) => (
              <li key={`${c.name}-${c.role ?? ""}`}>
                <Link href={`/search?mode=person&q=${encodeURIComponent(c.name)}`}>{c.name}</Link>
                {c.role && <small>{c.role}</small>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section">
        <h2>More information</h2>
        <ul className="chips">
          {movie.externalIds.imdb && (
            <li>
              <a href={`https://www.imdb.com/title/${movie.externalIds.imdb}/`} target="_blank" rel="noopener noreferrer">
                IMDb <IconExternal size={12} />
              </a>
            </li>
          )}
          {movie.externalIds.tmdb && (
            <li>
              <a href={`https://www.themoviedb.org/movie/${movie.externalIds.tmdb}`} target="_blank" rel="noopener noreferrer">
                TMDB <IconExternal size={12} />
              </a>
            </li>
          )}
          {movie.externalIds.wikidata && (
            <li>
              <a href={`https://www.wikidata.org/wiki/${movie.externalIds.wikidata}`} target="_blank" rel="noopener noreferrer">
                Wikidata <IconExternal size={12} />
              </a>
            </li>
          )}
        </ul>
        <p className="source-note">Film details from {movie.metadataSource}.</p>
      </section>
    </article>
  );
}

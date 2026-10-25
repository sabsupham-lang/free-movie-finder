import Link from "next/link";
import type { MovieSummary } from "@/lib/types";

export function Poster({ movie, eager = false }: { movie: Pick<MovieSummary, "title" | "year" | "posterUrl" | "publicDomain" | "freeLabel">; eager?: boolean }) {
  return (
    <div className="poster">
      {movie.posterUrl ? (
        // Plain img: TMDB and Commons already serve sized images, so no
        // optimizer (and no image-optimization quota) is needed.
        <img
          src={movie.posterUrl}
          alt=""
          width={342}
          height={513}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="poster-fallback" aria-hidden="true">
          No poster available
        </div>
      )}
      {movie.publicDomain && <span className="badge badge-free">{movie.freeLabel ?? "Free · Public domain"}</span>}
    </div>
  );
}

// The poster is decorative (alt=""), because the link text already names
// the film. Screen readers hear one link per card, not two.
export function MovieCard({ movie, eager }: { movie: MovieSummary; eager?: boolean }) {
  return (
    <Link href={`/movie/${movie.id}`} className="card">
      <Poster movie={movie} eager={eager} />
      <span className="card-title">{movie.title}</span>
      <span className="card-meta">
        <span>{movie.year ?? "Year unknown"}</span>
        {movie.rating ? (
          <span>
            <span className="visually-hidden">Rated </span>
            {movie.rating.value.toFixed(1)}/10
            <span className="visually-hidden"> by {movie.rating.source}</span>
          </span>
        ) : (
          <span>Not rated</span>
        )}
      </span>
    </Link>
  );
}

"use client";

import { useMovieList, type StoredMovie } from "@/lib/storage";
import { IconBookmark, IconHeart } from "./Icons";

export function ListButtons({ movie }: { movie: Omit<StoredMovie, "addedAt"> }) {
  const watchlist = useMovieList("watchlist");
  const favorites = useMovieList("favorites");
  const inWatchlist = watchlist.has(movie.id);
  const inFavorites = favorites.has(movie.id);
  return (
    <>
      <button type="button" className="btn" aria-pressed={inWatchlist} onClick={() => watchlist.toggle(movie)}>
        <IconBookmark filled={inWatchlist} size={18} />
        {inWatchlist ? "On your watchlist" : "Add to watchlist"}
      </button>
      <button type="button" className="btn" aria-pressed={inFavorites} onClick={() => favorites.toggle(movie)}>
        <IconHeart filled={inFavorites} size={18} />
        {inFavorites ? "Favorite" : "Add to favorites"}
      </button>
    </>
  );
}

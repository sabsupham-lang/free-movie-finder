import type { Metadata } from "next";
import { libraryStats, pdCatalog } from "@/lib/catalog";
import { hasTmdb } from "@/lib/config";

export const metadata: Metadata = { title: "About and data sources" };

export default function AboutPage() {
  const generated = new Date(pdCatalog.generatedAt);
  const stats = libraryStats();
  const archiveDate = new Date(stats.archive.generatedAt);
  return (
    <div className="prose">
      <h1>About Free Movie Finder</h1>
      <p>
        Free Movie Finder helps you find films you can watch legally without paying: public-domain films you can play
        here, and films on free services such as ad-supported apps and library apps. For everything else it shows where a
        film can be streamed, rented or bought in your country.
      </p>

      <h2>What we link to</h2>
      <p>
        This site does not host, upload or download any film. It links to or embeds only sources that are authorized to
        show the film:
      </p>
      <ul>
        <li>Public-domain films, played through the official embed player of the Internet Archive or from Wikimedia Commons.</li>
        <li>Official trailers published on YouTube and listed by TMDB.</li>
        <li>Licensed streaming, rental and purchase services, as listed by JustWatch.</li>
      </ul>
      <p>We never link to unauthorized copies. If you believe a listing is wrong, please tell us so we can remove it.</p>

      <h2>Where the data comes from</h2>
      <ul>
        <li>
          <strong>TMDB</strong> (The Movie Database): titles, posters, synopses, cast, crew, ratings and trailers.{" "}
          {hasTmdb() ? "Connected." : "Not connected on this site, so it is running in demo mode."} This product uses
          the TMDB API but is not endorsed or certified by TMDB.
        </li>
        <li>
          <strong>JustWatch</strong>, through TMDB: which services offer a film in each country, and whether it is free,
          free with ads, included in a subscription, or for rent or sale.
        </li>
        <li>
          <strong>Wikidata</strong>: which films are recorded as public domain in the United States, plus their credits.
        </li>
        <li>
          <strong>Internet Archive</strong> and <strong>Wikimedia Commons</strong>: the playable public-domain copies.
          Every copy is checked to be online when the catalog is refreshed.
        </li>
        <li>
          <strong>Free streaming directory</strong>: {stats.streaming.films.toLocaleString()} films that Wikidata links to
          a title page on Tubi, Kanopy or Hoopla. They play on those services, not here. Each link is checked weekly to make
          sure the title page still opens, but a page that opens is not a promise the film is playable: services add and
          remove titles often, Kanopy and Hoopla titles depend on what your library licenses, and some titles are US-only.
        </li>
        <li>
          <strong>Internet Archive library</strong>: more films from the Archive, each listed for a stated reason shown
          on its page: dated 1930 or earlier, made by a US federal agency (FedFlix), part of the Prelinger Archives, or
          marked public domain or Creative Commons by the uploader in the Archive&apos;s curated film collections.
          Uploader labels can be wrong; rights holders can ask us to remove a film using the contact on the Terms page.
        </li>
      </ul>

      <h2>How current is it?</h2>
      <p>
        Streaming offers are cached for up to 6 hours and lists for up to 1 hour. The public-domain catalog was last
        rebuilt on{" "}
        <time dateTime={pdCatalog.generatedAt}>
          {generated.toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}
        </time>{" "}
        and has {pdCatalog.films.length.toLocaleString()} films.
        {stats.archive.films > 0 && (
          <>
            {" "}The Internet Archive library adds {stats.archive.films.toLocaleString()} more and was last rebuilt on{" "}
            <time dateTime={stats.archive.generatedAt}>
              {archiveDate.toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}
            </time>
            . In total, {stats.playable.toLocaleString()} films play on this site.
          </>
        )}
      </p>

      <h2>Things to know</h2>
      <ul>
        <li>Availability changes often and differs by country. Always check the service before you plan a movie night.</li>
        <li>
          Public-domain status here means public domain in the United States, as recorded on Wikidata. Copyright terms
          differ between countries, and a film can be free in one country and protected in another.
        </li>
        <li>
          Ratings are labeled with their source. Public-domain films use Internet Archive user reviews when there are at
          least 3; otherwise they show as not rated.
        </li>
        <li>When we do not know something, such as a runtime or a rating, we say so instead of guessing.</li>
      </ul>
    </div>
  );
}

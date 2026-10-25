import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { IconFilm, IconGlobe } from "@/components/Icons";
import { BottomNav, TopNav } from "@/components/Nav";
import { ThemeToggle, themeInitScript } from "@/components/ThemeToggle";
import { getRegion } from "@/lib/region-server";
import { regionName } from "@/lib/regions";
import "./globals.css";

const TMDB_LOGO_URL =
  "https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Free Movie Finder", template: "%s | Free Movie Finder" },
  description:
    "Find movies you can watch legally for free: public-domain films, free ad-supported services and library apps, with availability for your country.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#111213" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const region = await getRegion();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="container bar">
            <Link href="/" className="brand">
              <IconFilm size={24} />
              <span>Free Movie Finder</span>
            </Link>
            <TopNav />
            <div className="header-actions">
              <Link href="/settings" className="btn btn-small" aria-label={`Country: ${regionName(region)}. Change country`}>
                <IconGlobe size={18} />
                <span aria-hidden="true">{region}</span>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="main" className="container" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <div className="container">
            <nav aria-label="Footer">
              <Link href="/about">About and data sources</Link>
              <Link href="/browse/public-domain">Public domain films</Link>
              <Link href="/privacy">Privacy policy</Link>
              <Link href="/terms">Terms</Link>
            </nav>
            <p>
              What you can stream changes often and differs by country. Availability shown here is for{" "}
              {regionName(region)}. This site does not host any video. It only links to or embeds sources that are
              authorized to show the film: public-domain archives, official trailers and licensed streaming services.
            </p>
            <a className="tmdb-credit" href="https://www.themoviedb.org/" rel="noopener" target="_blank">
              {/* Official TMDB attribution logo, served by TMDB (see themoviedb.org/about/logos-attribution). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TMDB_LOGO_URL} alt="TMDB" width={92} height={12} loading="lazy" />
            </a>
            <p>
              This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability data is
              provided by JustWatch through TMDB. Public-domain listings come from Wikidata, the Internet Archive and
              Wikimedia Commons.
            </p>
          </div>
        </footer>
        <BottomNav />
      </body>
    </html>
  );
}
